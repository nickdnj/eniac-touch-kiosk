// Run-view caption beats (issue #19, UX 8.1.4 S6, architecture 5.9.2
// content.run). Pure. Triggers are evaluated in the UI against REAL machine
// state and `run` events, never on a timer:
//   {accProg: {acc: "1", program: 6}}  that program flip-flop is lit
//   {run: "idle" | "busy"}             the machine went idle / busy
// Beats may be skipped if a sample was missed at speed (lamps are 30 ms
// samples), but they never fire out of order. Placeholders {a1}, {a2} ...
// are settled accumulator values.

import type { Caption, MachineState, RunContent } from "../protocol.ts";

export function fill(tpl: string, vars: Record<string, number | string>): string {
  return tpl.replace(/\{([\w.]+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** {a1: 3, a2: 9} from settled {"1": 3, "2": 9}. */
export function settledVars(settled: Record<string, number>): Record<string, number> {
  const v: Record<string, number> = {};
  for (const [k, n] of Object.entries(settled)) v[`a${k}`] = n;
  return v;
}

function fires(c: Caption, m: MachineState | null, run: "busy" | "idle" | null): boolean {
  const t = c.trigger ?? {};
  if (t.run) return run === t.run;
  if (t.accProg && m) return m.acc?.[t.accProg.acc]?.prog?.[t.accProg.program - 1] === "1";
  return false;
}

export class CaptionTracker {
  press = 0; // presses since the run view opened or since CLEAR
  private beats: Caption[] = [];
  private next = 0;
  private vars: Record<string, number> = {};
  private run: RunContent;

  constructor(run: RunContent) {
    this.run = run;
  }

  onPress(): void {
    this.press++;
    this.beats = this.run.presses.find((p) => p.press === this.press)?.captions ?? [];
    this.next = 0;
  }

  onClear(): void {
    this.press = 0;
    this.beats = [];
    this.next = 0;
  }

  /**
   * Rail headline. Before any press: `before`. While press k runs: press k's
   * headline ("Watch the lamps" for press 1). Idle after press k: press
   * k+1's ("Press INIT again", "Again!"), then the last one keeps showing.
   */
  prompt(busy: boolean): string {
    if (this.press === 0) return this.run.before.headline;
    const byPress = (n: number) => this.run.presses.find((p) => p.press === n)?.headline;
    const last = this.run.presses[this.run.presses.length - 1]?.headline ?? "";
    return (busy ? byPress(this.press) : byPress(this.press + 1)) ?? last;
  }

  /** Sub-line under the headline (only before the first press). */
  sub(): string {
    return this.press === 0 ? (this.run.before.sub ?? "") : "";
  }

  onMachine(m: MachineState | null): string | null {
    return this.advance(m, null);
  }

  onRun(state: "busy" | "idle", m: MachineState | null, settled: Record<string, number> = {}): string | null {
    Object.assign(this.vars, settledVars(settled));
    return this.advance(m, state);
  }

  private advance(m: MachineState | null, run: "busy" | "idle" | null): string | null {
    let fired: string | null = null;
    for (let i = this.next; i < this.beats.length; i++) {
      if (fires(this.beats[i], m, run)) {
        fired = fill(this.beats[i].text, this.vars);
        this.next = i + 1;
      }
    }
    return fired;
  }
}
