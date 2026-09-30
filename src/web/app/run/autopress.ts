// "Keep pressing for me" / "Skip to the answer" (issue #20, architecture 5.6).
// A UI-side loop over the whitelisted INIT button: press, wait for run idle,
// check for the answer checkpoint, press again. It never presses while the
// machine is busy, and a dropped `run` event is survived by a watchdog.

import type { RunInfo } from "../protocol.ts";

export interface AutoClock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(h: unknown): void;
}

export interface AutoPressOptions {
  clock: AutoClock;
  /** Sends button {b:"init"}. Returns false if it could not be sent. */
  press: () => boolean;
  /** Gap between idle and the next press, ms (pacing; tune after spike #33). */
  gapMs: () => number;
  /** How long to wait for busy->idle before assuming a dropped event. */
  watchdogMs?: number;
  answerCheckpoint: string;
  /**
   * Fallback stop test on settled values. The bridge's checkpoint is
   * edge-triggered once per session, so after a CLEAR the loop must stop on
   * the value at which the checkpoint originally fired.
   */
  isDone?: (settled: Record<string, number>) => boolean;
  /** Hard cap on presses per start (belt and braces). */
  maxPresses?: number;
  onStop?: (reason: StopReason) => void;
}

export type StopReason = "answer" | "user" | "session" | "fault";

export class AutoPress {
  running = false;
  presses = 0;
  private busy = false;
  private reached = false;
  private timer: unknown = null;
  private watchdog: unknown = null;
  private o: AutoPressOptions;

  constructor(o: AutoPressOptions) {
    this.o = o;
  }

  /** Current machine run state (call on every `run` message and on mount). */
  setBusy(busy: boolean): void {
    this.busy = busy;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.presses = 0;
    this.schedule(0);
  }

  /** Forget a previous answer (after CLEAR the table starts again). */
  rearm(): void {
    this.reached = false;
  }

  stop(reason: StopReason): void {
    if (!this.running) return;
    this.running = false;
    this.clear();
    this.o.onStop?.(reason);
  }

  onRun(run: RunInfo): void {
    this.busy = run.state === "busy";
    if (!this.running) return;
    if (run.state === "busy") return;
    this.o.clock.clearTimeout(this.watchdog);
    this.watchdog = null;
    if (this.reached || (run.settled && this.o.isDone?.(run.settled))) {
      this.reached = true;
      this.stop("answer");
      return;
    }
    if (this.presses >= (this.o.maxPresses ?? 40)) {
      this.stop("user");
      return;
    }
    this.schedule(this.o.gapMs());
  }

  onCheckpoint(id: string): void {
    if (id !== this.o.answerCheckpoint) return;
    this.reached = true;
    if (this.running && !this.busy) this.stop("answer");
  }

  get answerReached(): boolean {
    return this.reached;
  }

  private schedule(ms: number): void {
    this.o.clock.clearTimeout(this.timer);
    this.timer = this.o.clock.setTimeout(() => this.tick(), ms);
  }

  private tick(): void {
    this.timer = null;
    if (!this.running) return;
    if (this.reached) {
      this.stop("answer");
      return;
    }
    if (this.busy) return; // wait for the idle event
    if (!this.o.press()) {
      this.stop("fault");
      return;
    }
    this.presses++;
    this.busy = true; // optimistic: never double press before `run busy` arrives
    this.watchdog = this.o.clock.setTimeout(() => {
      // Dropped run event: assume idle and carry on. The bridge's BUSY guard
      // makes a mistaken press harmless.
      this.watchdog = null;
      this.busy = false;
      if (this.running) this.schedule(0);
    }, this.o.watchdogMs ?? 15000);
  }

  private clear(): void {
    this.o.clock.clearTimeout(this.timer);
    this.o.clock.clearTimeout(this.watchdog);
    this.timer = this.watchdog = null;
  }
}
