// App controller: owns the link, the mirror, the idle timer and the router.
// Decides which screen shows. Error states (S10) take precedence over the
// visitor flow, and recovery always returns to the start screen (FR-51).

import type { YourTurnState } from "./yourturn/logic.ts";
import type { GameRound, GameVisit } from "./game/logic.ts";
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
import { playClick } from "./ui/sound.ts";
import { installTapDispatcher, onTap, type TapPoint } from "./ui/tap.ts";
import { h, clear, svgFromString } from "./ui/dom.ts";
import { confirm, dismissConfirms } from "./ui/overlays.ts";
import { COPY } from "./copy.ts";
import { CardLog } from "./run/cards.ts";
import { Visit } from "./state/visit.ts";
import { AttractController, AttractStore } from "./attract/store.ts";
import { TapCounter, inZone } from "./admin/tapcount.ts";
import { StaffLayer } from "./screens/admin.ts";
import type { SwitchingOpen } from "./screens/switching.ts";

export type ViewName = "boot" | "start" | "picker" | "waking" | "mission" | "run" | "result" | "yourturn" | "aim" | "error" | "honor" | "explore" | "glossary" | "tubes" | "finale" | "switching";

/**
 * Views that show the Home button (beside the wordmark, top left): every
 * visitor screen except S1 and the picker itself. Home goes to the picker.
 */
export const HOME_VIEWS = new Set<ViewName>(["mission", "run", "result", "yourturn", "aim", "explore", "glossary", "tubes", "honor", "finale"]);

/** Views that keep a running attract session (S1, Explore with its glossary, honor and tubes links, and the finale's F2 room). */
const ATTRACT_KEEPS = new Set<string>(["start", "explore", "glossary", "honor", "tubes", "finale"]);
export interface View {
  name: ViewName;
  /** Where a new session lands: the briefing, straight to step 1 (retry), or Your turn (choose a number, then run). */
  entry?: "briefing" | "step1" | "yourturn";
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
  /** The switching page to the original UI (screens/switching.ts): which door. */
  switching?: SwitchingOpen;
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
  /** The Home button on this screen (e.g. confirm before the cables come out); default: App.goHome. */
  home?(): void;
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
  config: HelloConfig = {
    idle: { setupS: 90, runS: 180, countdownS: 15, exploreS: 120 },
    admin: { tapZone: { corner: "top-left", widthPx: 120, heightPx: 96, taps: 5 } },
    originalUi: { available: false, tourIdleS: 300, interactiveIdleS: 900 },
  };
  missions: MissionSummary[] | null = null;
  mission: CompiledMission | null = null;
  /** Your turn: the first table (from the first run's cards) and the number the visitor chose. Null outside Your turn. */
  yourTurn: YourTurnState | null = null;
  /** Gunnery: this visitor's target and chosen shot. Null outside a game mission, and until the aim screen. */
  game: GameRound | null = null;
  /** Gunnery: shots fired and the best score while this visitor keeps playing. Cleared when the visit ends. */
  gameVisit: GameVisit = { shots: 0, best: 0 };
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
  private homeBtn: HTMLElement;
  readonly overlay: HTMLElement;
  private helloSeen = false;
  private linkDown = false;
  private pendingMetrics: ClientMsg[] = [];
  private expectingSession = false;
  /** The session that existed when Start was tapped; S0 waits for a different one. */
  private priorSessionId: string | null = null;
  private screens: Record<string, ScreenFactory>;
  /** The hidden staff gesture: 5 taps in the corner within 3 s (FR-70). */
  private readonly tapCounter = new TapCounter();
  /** S12/S13 over the current screen (screens/admin.ts), or null. */
  private staff: StaffLayer | null = null;
  private adminZone: HTMLElement;
  private overlayHooks: { onIdleWarn?: (s: number) => void; onIdleTick?: (s: number) => void; onIdleDismiss?: () => void } = {};

  constructor(root: HTMLElement, screens: Record<string, ScreenFactory>, makeSocket?: (url: string) => SocketLike) {
    this.root = root;
    this.screens = screens;
    this.screenHost = h("div", { id: "screen" });
    this.overlay = h("div", { id: "overlay" });
    this.homeBtn = h(
      "div",
      { id: "home-btn", class: "btn light outline hidden", role: "button" },
      svgFromString(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><path d="M4 15L16 4l12 11M8 12v15h6v-8h4v8h6V12" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
      ) as unknown as HTMLElement,
      COPY.home,
    );
    onTap(this.homeBtn, () => (this.screen?.home ? this.screen.home() : void this.goHome()));
    // The docents' touch point: it looks like a plain wordmark (no button
    // styling, hidden from assistive tech), and a tap asks to start over.
    const adminZone = h("div", { id: "admin-zone", "aria-hidden": "true" }, COPY.wordmark);
    onTap(adminZone, () => void this.startOver());
    this.adminZone = adminZone;
    root.append(
      this.screenHost,
      this.homeBtn,
      this.overlay,
      adminZone,
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
    const host = this.root.parentElement ?? document.body;
    installTapDispatcher(host, {
      toApp: (cx, cy) => this.toApp(cx, cy),
      onActivity: () => {
        this.idle.touch();
        this.staff?.touched();
      },
      onPress: () => playClick(),
    });
    // The staff gesture counts every first-finger touch-down: inside the
    // corner it counts, anywhere else it resets. The first tap still asks
    // to start over at once (ADR-OUI-13); the fifth opens S12.
    host.addEventListener(
      "pointerdown",
      (e) => {
        if (!e.isPrimary) return;
        if (this.tapCounter.down(inZone(this.toApp(e.clientX, e.clientY), this.config.admin.tapZone), this.now()) && !this.staff) this.openStaff();
      },
      { capture: true },
    );
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
        this.tapCounter.taps = m.config.admin?.tapZone?.taps || 5;
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
    if (!s && !this.expectingSession && ["mission", "run", "result", "aim"].includes(this.view.name) && !this.errorCode) {
      this.resetVisitor();
      this.show({ name: "start" });
    }
  }

  /** Start (or restart) a mission with a fresh core (ADR-002). */
  async startMission(id: string, entry: "briefing" | "step1" | "yourturn"): Promise<void> {
    // Your turn keeps the first table across the restart; every other start clears it.
    const keep = entry === "yourturn" ? this.yourTurn : null;
    this.resetVisitor();
    this.yourTurn = keep;
    if (this.yourTurn) this.yourTurn.steady = null;
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
    this.gameVisit = { shots: 0, best: 0 };
    this.send({ t: "end_session", reason });
    this.resetVisitor();
  }

  /** Clean slate for the next visitor (FR-33). */
  resetVisitor(): void {
    this.yourTurn = null;
    this.game = null;
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
      // The visitor idle timer stays off while the staff layer is up.
      this.idle.setMode(this.staff ? "none" : this.screen.idle);
    } else this.idle.setMode("none");
    this.idle.touch();
    this.root.dataset.view = view.name;
    const home = HOME_VIEWS.has(view.name);
    this.homeBtn.classList.toggle("hidden", !home);
    this.root.classList.toggle("has-home", home);
    // Leaving a core-optional screen while the core is down: S10 now.
    if (!this.screen?.coreOptional && this.helloSeen && this.mirror.health.core === "down" && !this.errorCode) this.evaluate();
  }

  /**
   * Home: the mission picker. A live visitor session ends first, as the
   * result screen's Menu does (Explore, the glossary, S16 and the honor roll
   * can be open on top of one); the visit itself (done ticks) carries on.
   * Cables placed in an unfinished mission come out, so that asks first.
   * Mission and run screens override this with their own Missions confirm.
   */
  async goHome(): Promise<void> {
    const s = this.mirror.session;
    const visitor = !!s && s.mode !== "attract";
    if (visitor && s.applied.length > 0 && s.state !== "result" && !(await confirm(this, COPY.confirm.textMenu, COPY.confirm.yesMenu))) return;
    if (visitor) this.endSession("menu");
    this.show({ name: "picker" });
  }

  private askingStartOver = false;

  /**
   * The docents' way back to S1 (the ENIAC wordmark, top left): for a visitor
   * who walked off mid-mission, without waiting for the idle timer. Always
   * asks first, since a stray tap would throw away a visitor's work. Then as
   * the idle reset: the session ends, the visit is wiped, attract starts.
   * Nothing on S1 itself or while an error screen is up.
   */
  async startOver(): Promise<void> {
    const v = this.view.name;
    if (v === "start" || v === "boot" || v === "error" || v === "switching" || this.errorCode || this.askingStartOver || this.staff) return;
    this.askingStartOver = true;
    const yes = await confirm(this, COPY.confirm.textStart, COPY.confirm.yes);
    this.askingStartOver = false;
    if (!yes || this.view.name === "start" || this.errorCode) return;
    const s = this.mirror.session;
    if (!s || s.mode !== "attract") this.endSession("menu");
    this.overlayHooks.onIdleDismiss?.();
    for (const el of [...this.overlay.querySelectorAll(".scrim")]) el.remove();
    this.show({ name: "start" });
  }

  /**
   * S12 (no token) or S13 (a valid token) on the staff layer, above the
   * current screen, which stays as it is underneath. An open Start-over
   * confirm is answered "No" (the 5th tap, ADR-OUI-13). The visitor idle
   * timer is off until the layer closes.
   */
  openStaff(token?: string): void {
    dismissConfirms();
    if (!this.staff) {
      this.staff = new StaffLayer(this);
      this.root.insertBefore(this.staff.el, this.adminZone);
      this.root.classList.add("staff-open");
      this.idle.setMode("none");
    }
    if (token) this.staff.showAdmin(token);
    else this.staff.showPin();
  }

  /** Closes S12/S13: back to the screen underneath, or to `then`. */
  closeStaff(then?: View): void {
    const st = this.staff;
    if (!st) return;
    this.staff = null;
    st.dispose();
    st.el.remove();
    this.root.classList.remove("staff-open");
    if (then) this.show(then);
    else {
      this.idle.setMode(this.screen?.idle ?? "none");
      this.idle.touch();
    }
  }

  /** True while S12 or S13 is up. */
  get staffOpen(): boolean {
    return this.staff !== null;
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
