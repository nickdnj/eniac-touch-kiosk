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

export type ViewName = "boot" | "start" | "picker" | "waking" | "mission" | "run" | "result" | "error";
export interface View {
  name: ViewName;
  /** Where a new session lands: the briefing, or straight to step 1 (retry). */
  entry?: "briefing" | "step1";
}

export interface Screen {
  el: HTMLElement;
  idle: IdleMode;
  mount?(): void;
  unmount?(): void;
  onMessage?(m: ServerMsg): void;
  /** Machine changed: touched lamp units, or null for "redraw everything". */
  onMachine?(units: string[] | null): void;
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
  config: HelloConfig = { idle: { setupS: 90, runS: 180, countdownS: 15 } };
  missions: MissionSummary[] | null = null;
  mission: CompiledMission | null = null;
  view: View = { name: "boot" };
  /** Notebook tape for the current session (built from run.settled only). */
  tape: TapeRow[] = [];
  /** Which checkpoints fired in this session. */
  checkpoints = new Set<string>();
  errorCode: string | null = null;
  scale = 1;
  private offset = { x: 0, y: 0 };
  private screen: Screen | null = null;
  private screenHost: HTMLElement;
  readonly overlay: HTMLElement;
  private helloSeen = false;
  private linkDown = false;
  private errorSince = 0;
  private pendingMetrics: ClientMsg[] = [];
  private expectingSession = false;
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
    switch (m.t) {
      case "hello":
        this.helloSeen = true;
        this.config = m.config;
        this.idle.setConfig(m.config.idle);
        this.mirror.onHealth(m.health);
        this.loadMissions();
        break;
      case "health": {
        const { t: _t, ...h } = m;
        this.mirror.onHealth(h);
        this.screen?.onMachine?.(null);
        break;
      }
      case "state":
        this.mirror.onState(m.session && m.session.state !== "none" ? m.session : null, m.seq, m.machine, m.run);
        this.afterSession();
        this.screen?.onMachine?.(null);
        break;
      case "session": {
        const { t: _t, ...s } = m;
        this.mirror.onSession(s.state === "none" ? null : s);
        this.afterSession();
        break;
      }
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
        break;
    }
    this.evaluate();
    this.screen?.onMessage?.(m);
  }

  private async loadMissions(): Promise<void> {
    try {
      this.missions = await fetchMissions();
    } catch {
      this.missions = null; // unknown, not "none available"
    }
    this.evaluate();
  }

  // ------------------------------------------------------------------ flow

  /** Error precedence (FR-50) and recovery (FR-51). */
  private evaluate(): void {
    let code: string | null = null;
    if (this.linkDown) code = "E-LINK";
    else if (this.helloSeen && this.mirror.health.core === "down") code = this.mirror.health.code ?? "E-CORE-DOWN";
    else if (this.missions && !this.missions.some((x) => x.available)) code = "E-MISSION";

    if (code && !this.errorCode) {
      this.errorCode = code;
      this.errorSince = this.now();
      this.idle.stop();
      this.metric({ t: "metric", ev: "error_enter", code });
      this.show({ name: "error" });
      return;
    }
    if (code && this.errorCode) {
      this.errorCode = code; // code may change (e.g. E-LINK -> E-CORE-DOWN)
      return;
    }
    if (!code && this.errorCode) {
      const durS = Math.round((this.now() - this.errorSince) / 1000);
      this.metric({ t: "metric", ev: "error_exit", code: this.errorCode, n: durS });
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
    if (this.view.name === "waking" && s && s.state !== "starting") {
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
    this.expectingSession = true;
    this.show({ name: "waking", entry });
    this.send({ t: "start_mission", mission: id, mode: "visitor" });
    try {
      this.mission = await fetchMission(id);
    } catch {
      this.mission = null;
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
    this.expectingSession = false;
  }

  private idleExpired(): void {
    this.metric({ t: "metric", ev: "idle_reset", step: this.view.name });
    this.endSession("idle");
    this.overlayHooks.onIdleDismiss?.();
    this.show({ name: "start" });
  }

  setOverlayHooks(h: App["overlayHooks"]): void {
    this.overlayHooks = h;
  }

  show(view: View): void {
    // Waking and mission views need the compiled mission; wait for it.
    if (view.name === "mission" && !this.mission) {
      this.view = { name: "waking", entry: view.entry };
      return;
    }
    this.screen?.unmount?.();
    clear(this.screenHost);
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
  }

  private devAutostart(): void {
    const id = new URLSearchParams(location.search).get("mission");
    if (id) this.startMission(id, "briefing");
  }
}
