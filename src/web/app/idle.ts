// Inactivity timers (issue #23, FR-32/FR-33, UX 7.8). Pure logic with an
// injectable clock; values come from hello.config.idle.

import type { HelloConfig } from "./protocol.ts";

export type IdleMode = "none" | "setup" | "run";

export interface IdleClock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(h: unknown): void;
}

export interface IdleCallbacks {
  onWarn(secondsLeft: number): void;
  onTick(secondsLeft: number): void;
  onDismiss(): void;
  onExpire(): void;
}

/** Max time "Tell me more" may hold the timer (UX 5.5). */
export const PAUSE_CAP_MS = 120_000;

export class IdleTimer {
  mode: IdleMode = "none";
  warning = false;
  paused = false;
  private cfg: HelloConfig["idle"] = { setupS: 90, runS: 180, countdownS: 15 };
  private t: unknown = null;
  private pauseCap: unknown = null;
  private left = 0;
  private clock: IdleClock;
  private cb: IdleCallbacks;

  constructor(clock: IdleClock, cb: IdleCallbacks) {
    this.clock = clock;
    this.cb = cb;
  }

  setConfig(c: HelloConfig["idle"]): void {
    this.cfg = c;
    this.restart();
  }

  setMode(m: IdleMode): void {
    if (m === this.mode) return;
    this.mode = m;
    if (this.warning && m === "none") this.dismiss();
    this.restart();
  }

  /** Any touch anywhere. A touch on the warning dismisses it. */
  touch(): void {
    if (this.mode === "none") return;
    if (this.warning) this.dismiss();
    this.restart();
  }

  /** "Tell me more" open: hold the timer, but never for more than 2 minutes. */
  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.clearT();
    this.pauseCap = this.clock.setTimeout(() => this.resume(), PAUSE_CAP_MS);
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.clock.clearTimeout(this.pauseCap);
    this.pauseCap = null;
    this.restart();
  }

  stop(): void {
    this.clearT();
    this.clock.clearTimeout(this.pauseCap);
    this.pauseCap = null;
    this.paused = false;
    if (this.warning) this.dismiss();
    this.mode = "none";
  }

  private dismiss(): void {
    this.warning = false;
    this.cb.onDismiss();
  }

  private clearT(): void {
    this.clock.clearTimeout(this.t);
    this.t = null;
  }

  private restart(): void {
    this.clearT();
    if (this.mode === "none" || this.paused || this.warning) return;
    const s = this.mode === "run" ? this.cfg.runS : this.cfg.setupS;
    this.t = this.clock.setTimeout(() => this.warn(), s * 1000);
  }

  private warn(): void {
    this.warning = true;
    this.left = this.cfg.countdownS;
    this.cb.onWarn(this.left);
    this.countdown();
  }

  private countdown(): void {
    this.t = this.clock.setTimeout(() => {
      this.left--;
      if (this.left <= 0) {
        this.warning = false;
        this.t = null;
        this.mode = "none";
        this.cb.onExpire();
        return;
      }
      this.cb.onTick(this.left);
      this.countdown();
    }, 1000);
  }
}
