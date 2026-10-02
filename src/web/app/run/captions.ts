// Run-view caption beats (issue #19, UX 8.1.4 S6, 8.2.5, 8.3.5,
// architecture 5.9.2 content.run). Pure. Triggers are evaluated in the UI
// against REAL machine state, `run` events and punched cards, never on a
// timer:
//   {accProg: {acc: "1", program: 6}}  that program flip-flop is lit
//   {run: "idle" | "busy"}             the machine went idle / busy
//   {acc: {acc: "1", eq: 97367}}       that accumulator reads exactly eq
//   {punchCount: {gte: 5}}             that many cards have been punched
//   {init: "rdff"}                     that initiating-unit lamp is lit
//   {derived: "apex" | "landed"}       computed from successive cards
// Beats may be skipped if a sample was missed at speed (lamps are 30 ms
// samples), but they never fire out of order. Placeholders {a1}, {a2} ...
// are settled accumulator values.

import type { Caption, MachineState, RunContent } from "../protocol.ts";
import { INIT_LAMPS } from "../panels/art.ts";

/** What the card-based triggers need to know. */
export interface CardFacts {
  count: number;
  apex: boolean;
  landed: boolean;
}

export function fill(tpl: string, vars: Record<string, number | string>): string {
  return tpl.replace(/\{([\w.]+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** {a1: 3, a2: 9} from settled {"1": 3, "2": 9}. */
export function settledVars(settled: Record<string, number>): Record<string, number> {
  const v: Record<string, number> = {};
  for (const [k, n] of Object.entries(settled)) v[`a${k}`] = n;
  return v;
}

function fires(c: Caption, m: MachineState | null, run: "busy" | "idle" | null, cards: CardFacts): boolean {
  const t = c.trigger ?? {};
  if (t.run) return run === t.run;
  if (t.accProg && m) return m.acc?.[t.accProg.acc]?.prog?.[t.accProg.program - 1] === "1";
  if (t.acc && m) return m.acc?.[t.acc.acc]?.value === t.acc.eq;
  if (t.punchCount) return cards.count >= t.punchCount.gte;
  if (t.init && m) {
    const bit = INIT_LAMPS.find(([name]) => name === t.init)?.[1];
    return bit !== undefined && m.init?.[bit] === "1";
  }
  if (t.derived === "apex") return cards.apex;
  if (t.derived === "landed") return cards.landed;
  return false;
}

export class CaptionTracker {
  press = 0; // presses since the run view opened or since CLEAR
  private beats: Caption[] = [];
  private next = 0;
  private vars: Record<string, number> = {};
  private run: RunContent;
  private cards: CardFacts = { count: 0, apex: false, landed: false };

  constructor(run: RunContent) {
    this.run = run;
  }

  onPress(): void {
    this.press++;
    this.beats = this.run.presses.find((p) => p.press === this.press)?.captions ?? [];
    this.next = 0;
  }

  /** Runs a beat list outside the INIT presses (Trajectory's READ). */
  begin(beats: Caption[]): void {
    this.beats = beats;
    this.next = 0;
  }

  /** New card facts (count, apex, landing); may fire card triggers. */
  onCards(m: MachineState | null, cards: CardFacts): string | null {
    this.cards = cards;
    return this.advance(m, null);
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
      if (fires(this.beats[i], m, run, this.cards)) {
        fired = fill(this.beats[i].text, this.vars);
        this.next = i + 1;
      }
    }
    return fired;
  }
}
