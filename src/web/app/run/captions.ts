// Run-view caption beats (issue #19, UX 8.1.4 S6). Pure.
// Captions fire on REAL machine changes (a program flip-flop lighting, the
// constant transmitter's program lamp, the machine going idle), never on a
// timer. Beats may be skipped if a sample was missed at speed (lamps are
// 30 ms samples), but they never fire out of order.

import type { MachineState, MissionScreens, RunBeat } from "../protocol.ts";

export function fill(tpl: string, vars: Record<string, number | string>): string {
  return tpl.replace(/\{([\w.]+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

function beatFires(b: RunBeat, m: MachineState | null, idle: boolean): boolean {
  const w = b.when as { accProg?: { acc: string; prog: number }; ct?: number; idle?: true };
  if (w.idle) return idle;
  if (!m) return false;
  if (w.accProg) return m.acc?.[w.accProg.acc]?.prog?.[w.accProg.prog - 1] === "1";
  if (w.ct !== undefined) return m.ct?.[w.ct - 1] === "1";
  return false;
}

export class CaptionTracker {
  press = 0; // presses since the run view opened or since CLEAR
  private beats: RunBeat[] = [];
  private next = 0;
  private vars: Record<string, number | string> = {};
  private run: MissionScreens["run"];

  constructor(run: MissionScreens["run"]) {
    this.run = run;
  }

  /** INIT pressed; `before` holds the settled values of the watched accumulators. */
  onPress(before: Record<string, number>): void {
    this.press++;
    this.beats = this.run.presses[this.press - 1]?.captions ?? [];
    this.next = 0;
    this.vars = {};
    for (const [k, v] of Object.entries(before)) this.vars[`before.${k}`] = v;
  }

  onClear(): void {
    this.press = 0;
    this.beats = [];
    this.next = 0;
  }

  /** Prompt headline for the rail. */
  prompt(busy: boolean): string {
    if (busy) return this.run.promptBusy;
    return this.run.presses[this.press]?.prompt ?? this.run.promptLater;
  }

  /** Returns the newest caption fired by this machine state, if any. */
  onMachine(m: MachineState | null): string | null {
    return this.advance(m, false, {});
  }

  /** Machine went idle with these settled values. */
  onIdle(m: MachineState | null, settled: Record<string, number>): string | null {
    return this.advance(m, true, settled);
  }

  private advance(m: MachineState | null, idle: boolean, settled: Record<string, number>): string | null {
    for (const [k, v] of Object.entries(settled)) this.vars[k] = v;
    let fired: string | null = null;
    for (let i = this.next; i < this.beats.length; i++) {
      if (beatFires(this.beats[i], m, idle)) {
        fired = fill(this.beats[i].text, this.vars);
        this.next = i + 1;
      }
    }
    return fired;
  }
}
