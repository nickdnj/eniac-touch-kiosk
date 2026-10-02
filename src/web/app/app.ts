// App controller: owns the link, the mirror, the idle timer and the router.
// Decides which screen shows. Error states (S10) take precedence over the
// visitor flow, and recovery always returns to the start screen (FR-51).

import type {
  ClientMsg,
  CompiledMission,
  HelloConfig,
  MissionSummary,
  ServerMsg,
} from "./protocol.ts";
import { Link, type SocketLike } from "./net/ws.ts";
import { fetchMission, fetchMissions } from "./net/api.ts";
import { Mirror } from "./state/machine.ts";
import { IdleTimer, type IdleMode } from "./idle.ts";
import { installGuards } from "./ui/guards.ts";
import { installTapDispatcher, type TapPoint } from "./ui/tap.ts";
import { h, clear } from "./ui/dom.ts";
import { COPY } from "./copy.ts";
import { CardLog } from "./run/cards.ts";
import { Visit } from "./state/visit.ts";
import { AttractController, AttractStore } from "./attract/store.ts";

export type ViewName = "boot" | "start" | "picker" | "waking" | "mission" | "run" | "result" | "error" | "honor" | "explore" | "glossary" | "tubes" | "finale";

/** Views that keep a running attract session (S1, Explore with its glossary, honor and tubes links, and the finale's F2 room). */
const ATTRACT_KEEPS = new Set<string>(["start", "explore", "glossary", "honor", "tubes", "finale"]);
export interface View {
  name: ViewName;
  /** Where a new session lands: the briefing, or straight to step 1 (retry). */
  entry?: "briefing" | "step1";
  /** S11: the page to open (1 to 4). */
  page?: number;
  /** S8 Finale: the beat to open (1 to 5; 5 when coming back from Explore or S16). */
  beat?: 1 | 2 | 3 | 4 | 5;
  /** S11: where Back returns (default: the picker). */
  back?: View;
  /** S14 Explore ENIAC / S15 Glossary: where it was opened from and what to show (screens/explore.ts). */
  explore?: ExploreOpen;
  /** S16 Keeping ENIAC alive: where it was opened from and what to show (screens/tubes.ts). */
  tubes?: TubesOpen;
}

/** How S16 "Keeping ENIAC alive" was opened (docs/tubes.md 2.2; UX 14.11). */
export interface TubesOpen {
  /** For the back button and the tubes_open metric: explore, glossary, finale, ... */
  from: string;
  /** Where Back, X and Finish return (default: Explore ENIAC, restored where the visitor was). */
  back?: View;
  /** Open this card (1 to 5; default 1). */
  card?: number;
  /** Back from S16's own glossary trip: not a new visit (no tubes_open again). */
  restore?: boolean;
}

/** How Explore ENIAC (S14) or the Glossary (S15) was opened (UX 14.3.7, 14.9). */
export interface ExploreOpen {
  /** For the back button and the explore_open metric: picker, briefing, result, or another screen's name. */
  from: string;
  /** The view the back button returns to (default: the picker). */
  back?: View;
  /** Show this mission's units (state C), by mission id. */
  mission?: string;
  /** Open this card (a stop id from explore/room.ts: "acc", "pt", ...). */
  card?: string;
  /** Back from the glossary: restore the tour where the visitor left it. */
  restore?: boolean;
}

export interface Screen {
  el: HTMLElement;
  idle: IdleMode;
  mount?(): void;
  unmount?(): void;
  onMessage?(m: ServerMsg): void;
  /** Machine changed: touched lamp units, or null for "redraw everything". */
  onMachine?(units: string[] | null): void;
  /** Static screen that keeps working while the core is down (UX 14.7: S11). */
  coreOptional?: boolean;
}
export type ScreenFactory = (app: App, view: View) => Screen;

export interface TapeRow {
  x: number;
  sq: number;
  text: string;
}

declare const __DEV__: boolean | undefined;
declare const __BUILD__: string | undefined;
const DEV = typeof __DEV__ !== "undefined" && __DEV__;
const BUILD = typeof __BUILD__ !== "undefined" ? __BUILD__ : undefined;

export class App {
  readonly root: HTMLElement;
  readonly mirror = new Mirror();
  readonly link: Link;
  readonly idle: IdleTimer;
  config: HelloConfig = { idle: { setupS: 90, runS: 180, countdownS: 15, exploreS: 120 }, admin: { tapZone: { corner: "top-left", widthPx: 120, heightPx: 96, taps: 5 } } };
  missions: MissionSummary[] | null = null;
  mission: CompiledMission | null = null;
  view: View = { name: "boot" };
  /** Notebook tape for the current session (built from run.settled only). */
  tape: TapeRow[] = [];
  /** Which checkpoints fired in this session. */
  checkpoints = new Set<string>();
  /** Watched accumulator values when the result checkpoint fired. */
  answerAt: Record<string, number> | null = null;
  /** Punched cards of the current session (missions with run.cards). */
  cards: CardLog = new CardLog(null);
  /** This visit's missions and their real results (state/visit.ts); reset when S1 shows. */
  readonly visit = new Visit(() => this.now());
  /**
   * Missions whose result screen (S7) this visitor reached: the picker's
   * "Done" badges and "UP NEXT" chip (UX 8.4). In memory only; cleared
   * with the visit, never stored.
   */
  get done(): Set<string> {
    return this.visit.done;
  }
  /** Live attract (UX 14.2): the flight's status, cards and caption; S1 draws from it. */
  readonly attract = new AttractStore();
  /** Asks for attract while home (S1) and hands off on the visitor's touch. */
  readonly attractCtl: AttractController;
  errorCode: string | null = null;
  /** S1 saw no live attract status for 5 s (FR-36): S10 (E-ATTRACT) until a live frame arrives. */
  private attractDown = false;
  /** A mission the bridge listed failed to load (E-MISSION until the next hello). */
  missionBroken = false;
  scale = 1;
  private offset = { x: 0, y: 0 };
  private screen: Screen | null = null;
  private screenHost: HTMLElement;
  readonly overlay: HTMLElement;
  private helloSeen = false;
  private linkDown = false;
  private pendingMetrics: ClientMsg[] = [];
  private expectingSession = false;
  /** The session that existed when Start was tapped; S0 waits for a different one. */
  private priorSessionId: string | null = null;
  private screens: Record<string, ScreenFactory>;
  private overlayHooks: { onIdleWarn?: (s: number) => void; onIdleTick?: (s: number) => void; onIdleDismiss?: () => void } = {};

  constructor(root: HTMLElement, screens: Record<string, ScreenFactory>, makeSocket?: (url: string) => SocketLike) {
    this.root = root;
    this.screens = screens;
    this.screenHost = h("div", { id: "screen" });
    this.overlay = h("div", { id: "overlay" });
    root.append(
      this.screenHost,
      this.overlay,
      h("div", { id: "admin-zone", "aria-hidden": "true" }, COPY.wordmark),
      h("div", { id: "footer" }, COPY.credit),
    );
    this.idle = new IdleTimer(
      { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (t) => clearTimeout(t as number) },
      {
        onWarn: (s) => this.overlayHooks.onIdleWarn?.(s),
        onTick: (s) => this.overlayHooks.onIdleTick?.(s),
        onDismiss: () => this.overlayHooks.onIdleDismiss?.(),
        onExpire: () => this.idleExpired(),
      },
    );
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
    this.link = new Link({
      url,
      build: BUILD,
      makeSocket: makeSocket ?? ((u) => new WebSocket(u) as unknown as SocketLike),
      onMessage: (m) => this.onServer(m),
      onTransport: (up) => this.onTransport(up),
      onLinkDown: (down) => {
        this.linkDown = down;
        this.evaluate();
      },
      onReload: () => location.reload(),
    });
    this.attractCtl = new AttractController({ send: (m) => this.send(m), store: this.attract, fetchMission });
  }

  // ------------------------------------------------------------------ boot

  start(): void {
    installGuards(document);
    installTapDispatcher(this.root.parentElement ?? document.body, {
      toApp: (cx, cy) => this.toApp(cx, cy),
      onActivity: () => this.idle.touch(),
    });
    const fit = () => this.fit();
    window.addEventListener("resize", fit);
    fit();
    this.show({ name: "boot" });
    this.link.start();
  }

  fit(): void {
    const w = window.innerWidth, hgt = window.innerHeight;
    this.scale = Math.min(w / 1920, hgt / 1080);
    this.offset = { x: (w - 1920 * this.scale) / 2, y: (hgt - 1080 * this.scale) / 2 };
    this.root.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.scale})`;
  }

  toApp(cx: number, cy: number): TapPoint {
    return { x: (cx - this.offset.x) / this.scale, y: (cy - this.offset.y) / this.scale };
  }

  now(): number {
    return performance.now();
  }

  // ------------------------------------------------------------------ outbound

  send(m: ClientMsg): number | null {
    return this.link.send(m);
  }

  metric(m: ClientMsg): void {
    if (this.link.send(m) === null) this.pendingMetrics.push(m);
  }

  // ------------------------------------------------------------------ inbound

  private onTransport(up: boolean): void {
    this.mirror.onLink(up);
    if (up) {
      for (const m of this.pendingMetrics.splice(0)) this.link.send(m);
    }
    this.screen?.onMachine?.(null);
    this.evaluate();
  }

  private onServer(m: ServerMsg): void {
    this.attractCtl.onMessage(m, this.now());
    if (this.attractDown && ["live", "held"].includes(this.attract.liveness(this.now()))) this.attractDown = false; // live again: evaluate() returns to S1
    if (m.t === "attract" || m.t === "state") this.root.dataset.attract = this.attract.phase;
    switch (m.t) {
      case "hello":
        this.attractCtl.onHello();
        this.helloSeen = true;
        this.missionBroken = false;
        this.config = m.config;
        this.idle.setConfig(m.config.idle);
        this.applyTapZone(m.config.admin?.tapZone);
        this.mirror.onHealth(m.health);
        this.loadMissions();
        break;
      case "health": {
        const { t: _t, ...h } = m;
        this.mirror.onHealth(h);
        this.screen?.onMachine?.(null);
        break;
      }
      case "state": {
        const prior = this.mirror.session?.id ?? null;
        this.mirror.onState(m.session && m.session.state !== "none" ? m.session : null, m.seq, m.machine, m.run);
        // A new session (or a resync) replaces the cards with the bridge's
        // last 20; within the same session, never go backwards.
        if (this.mirror.session?.mode === "attract") this.cards.reset();
        else if (this.mirror.session && (this.mirror.session.id !== prior || (m.cards?.length && m.cards[m.cards.length - 1].n > this.cards.count))) this.cards.fromState(m.cards ?? []);
        else if (!this.mirror.session) this.cards.reset();
        this.afterSession();
        this.screen?.onMachine?.(null);
        break;
      }
      case "session": {
        const { t: _t, ...s } = m;
        const prior = this.mirror.session?.id ?? null;
        this.mirror.onSession(s.state === "none" ? null : s);
        if ((this.mirror.session?.id ?? null) !== prior) this.cards.reset();
        this.afterSession();
        break;
      }
      case "punch":
        // Cards belong to the current session only (no session: nothing drawn).
        // An attract flight's cards are not the visitor's: they live in app.attract only,
        // never in the mission's card log or the visit store.
        if (this.mirror.session && this.mirror.session.mode !== "attract") this.cards.add({ n: m.n, text: m.text, fields: m.fields });
        break;
      case "frame": {
        const units = this.mirror.onFrame(m.seq, m.d);
        if (units) this.screen?.onMachine?.(units);
        break;
      }
      case "run":
        this.mirror.onRun(m);
        break;
      case "checkpoint":
        this.checkpoints.add(m.id);
        if (this.mission && m.id === this.mission.result) {
          const mach = this.mirror.machine;
          const at: Record<string, number> = {};
          for (const w of this.mission.run.watch) {
            const v = mach?.acc?.[w]?.value;
            if (typeof v === "number") at[w] = v;
          }
          this.answerAt = at;
        }
        break;
    }
    this.evaluate();
    this.screen?.onMessage?.(m);
    this.noteVisit(m);
  }

  /** Feeds the visit store from real bridge data (after the screen built its tape). */
  private noteVisit(m: ServerMsg): void {
    const mission = this.mission, s = this.mirror.session;
    if (!mission || !s || s.mode === "attract" || this.view.name === "waking") return;
    if (m.t === "step_applied") this.visit.stepApplied(s.id, mission.steps.find((x) => x.id === m.step), m.assisted);
    else if (m.t === "run") this.visit.tape(mission.id, this.tape);
    else if (m.t === "punch" || m.t === "state") this.visit.cards(mission.id, this.cards);
  }

  private async loadMissions(): Promise<void> {
    try {
      this.missions = await fetchMissions();
    } catch {
      this.missions = null; // unknown, not "none available"
    }
    this.evaluate();
    if (this.view.name === "picker" && !this.errorCode) this.show({ name: "picker" });
  }

  // ------------------------------------------------------------------ flow

  /** Sizes the inert admin corner from hello.config.admin.tapZone (UX 7). */
  private applyTapZone(z: { widthPx: number; heightPx: number } | undefined): void {
    const el = this.root.querySelector<HTMLElement>("#admin-zone");
    if (!el || !z) return;
    el.style.width = `${z.widthPx}px`;
    el.style.height = `${z.heightPx}px`;
  }

  /**
   * Error precedence (FR-50) and recovery (FR-51). error_* metrics are
   * bridge-owned (architecture 8.3: NOT_ALLOWED from the UI), so none are
   * sent here; a UI-only E-LINK outage is therefore not logged (see PR).
   */
  private evaluate(): void {
    let code: string | null = null;
    if (this.linkDown) code = "E-LINK";
    else if (this.helloSeen && this.mirror.health.core === "down" && !(this.screen?.coreOptional && !this.errorCode)) code = this.mirror.health.code ?? "E-CORE-DOWN";
    else if (this.attractDown) code = "E-ATTRACT";
    else if (this.missionBroken || (this.missions && !this.missions.some((x) => x.available))) code = "E-MISSION";

    if (code && !this.errorCode) {
      this.errorCode = code;
      this.idle.stop();
      this.show({ name: "error" });
      return;
    }
    if (code && this.errorCode) {
      if (code !== this.errorCode) {
        this.errorCode = code; // code may change (e.g. E-LINK -> E-CORE-DOWN)
        this.screen?.onMachine?.(null);
      }
      return;
    }
    if (!code && this.errorCode) {
      this.errorCode = null;
      this.resetVisitor();
      this.show({ name: "start" });
      return;
    }
    if (this.view.name === "boot" && this.helloSeen && this.mirror.health.core !== "down" && this.link.isOpen) {
      this.show({ name: "start" });
      if (DEV) this.devAutostart();
    }
  }

  private afterSession(): void {
    const s = this.mirror.session;
    // The bridge may still report the previous visitor's session (running,
    // then ending) after start_mission: only a NEW session id counts.
    // An attract flight's session (mode attract) is never the visitor's.
    if (this.view.name === "waking" && s && s.state !== "starting" && s.id !== this.priorSessionId && s.mode !== "attract") {
      this.expectingSession = false;
      this.show({ name: "mission", entry: this.view.entry ?? "briefing" });
      return;
    }
    // The bridge ended the session under us (reaped, or ended elsewhere).
    if (!s && !this.expectingSession && ["mission", "run", "result"].includes(this.view.name) && !this.errorCode) {
      this.resetVisitor();
      this.show({ name: "start" });
    }
  }

  /** Start (or restart) a mission with a fresh core (ADR-002). */
  async startMission(id: string, entry: "briefing" | "step1"): Promise<void> {
    this.resetVisitor();
    this.visit.begin();
    this.cards = new CardLog(null);
    this.expectingSession = true;
    this.priorSessionId = this.mirror.session?.id ?? null;
    this.show({ name: "waking", entry });
    this.send({ t: "start_mission", mission: id, mode: "visitor" });
    try {
      this.mission = await fetchMission(id);
      this.cards = new CardLog(this.mission.run.cards, this.mission.run.plot);
    } catch {
      this.mission = null;
      // The bridge offered it but it can't be loaded or run: show S10, never a half-built screen.
      this.missionBroken = true;
      this.send({ t: "end_session", reason: "restart" });
      this.evaluate();
      return;
    }
    this.afterSession();
  }

  endSession(reason: "idle" | "menu" | "restart" | "done"): void {
    this.send({ t: "end_session", reason });
    this.resetVisitor();
  }

  /** Clean slate for the next visitor (FR-33). */
  resetVisitor(): void {
    this.tape = [];
    this.checkpoints.clear();
    this.answerAt = null;
    this.expectingSession = false;
    this.cards.reset();
  }

  private idleExpired(): void {
    this.metric({ t: "metric", ev: "idle_reset", screen: this.view.name });
    this.endSession("idle");
    this.overlayHooks.onIdleDismiss?.();
    this.show({ name: "start" });
  }

  /**
   * S1 (screens/attract.ts) saw no live attract status for 5 s (FR-36, UX
   * 14.2.4): S10 now. Attract stays wanted; the first live frame (or the
   * bridge's own recovery) clears it and evaluate() returns to S1.
   */
  attractLost(): void {
    if (this.attractDown || this.errorCode || this.view.name !== "start") return;
    this.attractDown = true;
    this.evaluate();
    this.attractCtl.enter(); // idempotent on the bridge: ask again in case it never started
  }

  setOverlayHooks(h: App["overlayHooks"]): void {
    this.overlayHooks = h;
  }

  show(view: View): void {
    // Waking and mission views need the compiled mission; wait for it.
    if (view.name === "mission" && !this.mission) {
      if (this.view.name !== "waking") this.show({ name: "waking", entry: view.entry });
      return;
    }
    // Home is attract (FR-30): S1 runs it; leaving S1 for the visitor flow is
    // the hand-off (FR-31: the bridge kills the attract core). The error
    // state leaves it running: the bridge resumes it after recovery (FR-51).
    // Explore ENIAC asks for attract too (its live lamps, explore/live.ts):
    // it keeps running through the glossary and the honor roll, and stops
    // when the visitor goes on to the picker or a mission ("menu").
    if (view.name === "start") this.attractCtl.enter();
    else if (!ATTRACT_KEEPS.has(view.name) && view.name !== "error" && view.name !== "boot") this.attractCtl.leave(this.view.name === "start" ? "touch" : "menu");
    this.screen?.unmount?.();
    clear(this.screenHost);
    // Attract is between visitors: the next one starts at mission 1 (FR-33).
    if (view.name === "start") this.visit.reset();
    this.view = view;
    const f = this.screens[view.name];
    this.screen = f ? f(this, view) : null;
    if (this.screen) {
      this.screenHost.append(this.screen.el);
      this.screen.mount?.();
      this.idle.setMode(this.screen.idle);
    } else this.idle.setMode("none");
    this.idle.touch();
    this.root.dataset.view = view.name;
    // Leaving a core-optional screen while the core is down: S10 now.
    if (!this.screen?.coreOptional && this.helloSeen && this.mirror.health.core === "down" && !this.errorCode) this.evaluate();
  }

  /** Open S16 "Keeping ENIAC alive" (docs/tubes.md 2.2): from Explore, the glossary or the finale (F2's chip). */
  openTubes(open: TubesOpen = { from: "other" }): void {
    this.show({ name: "tubes", tubes: open });
  }

  private devAutostart(): void {
    const id = new URLSearchParams(location.search).get("mission");
    if (id) this.startMission(id, "briefing");
  }
}
