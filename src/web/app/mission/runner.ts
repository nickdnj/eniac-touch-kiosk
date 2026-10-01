// Mission step runner (issue #16, architecture 7 / ADR-004, UX 5.2).
// Pure: no DOM, no socket. The browser decides whether a tap is right; only
// step IDs (apply_step) and anonymous wrong_tap metrics ever leave it.

import type { ClientMsg, CompiledMission, MissionStep } from "../protocol.ts";
import { kindOf, switchId, termId, termOf } from "./ids.ts";

export type Phase = "source" | "dest" | "dial" | "pick" | "pending" | "done";
export type StepStatus = "todo" | "done" | "assisted" | "skipped";

export type Feedback =
  | { kind: "ok-source"; id: string }
  | { kind: "ok"; id: string; assisted: boolean }
  | { kind: "open-picker"; id: string }
  | { kind: "wrong"; id: string | null; level: number; text: string; snapBack: boolean }
  | { kind: "neutral" }
  | { kind: "ignored"; reason: "debounce" | "pending" | "done" | "finished" };

export interface TapResult {
  feedback: Feedback;
  send: ClientMsg[];
}

export const DEBOUNCE_MS = 400;

export { termId, switchId };

/** Element ids of a step's targets: [source, destination] or [switch]. */
export function stepTargets(s: MissionStep): string[] {
  return s.kind === "plug" ? [termId(s.from), termId(s.to)] : [switchId(s.switch)];
}

export const LADDER_TEXT = {
  notQuite: "Not quite.",
  level2: "Look for the glowing ring.",
  level3: "Want us to do this one?",
  defaults: {
    wrongFrom: "Start with the glowing jack marked 1.",
    wrongTo: "That one does not match. Try the other glowing jack.",
    wrongSwitch: "Try the glowing one.",
    wrongValue: "Not that one. Try again.",
  } as Record<string, string>,
};

export class Runner {
  readonly mission: CompiledMission;
  readonly status: StepStatus[];
  index = 0;
  phase: Phase;
  wrong = 0;
  private lastTap = -Infinity;
  private now: () => number;

  constructor(mission: CompiledMission, now: () => number, applied: string[] = []) {
    this.mission = mission;
    this.now = now;
    this.status = mission.steps.map((s) => (applied.includes(s.id) ? "done" : "todo"));
    const first = this.status.indexOf("todo");
    this.index = first === -1 ? mission.steps.length : first;
    this.phase = this.initialPhase();
  }

  get step(): MissionStep | null {
    return this.mission.steps[this.index] ?? null;
  }
  get finished(): boolean {
    return this.index >= this.mission.steps.length;
  }
  get isLast(): boolean {
    return this.index === this.mission.steps.length - 1;
  }
  /** "Do it for me" turns filled after 3 wrong taps. */
  get doItFilled(): boolean {
    return this.wrong >= 3;
  }
  /** 0..3; the ring gets thicker and the chevron faster from 2. */
  get ringLevel(): number {
    return Math.min(this.wrong, 3);
  }
  /** Targets that currently carry a guide ring. */
  get activeTargets(): string[] {
    const s = this.step;
    if (!s) return [];
    const [a, b] = stepTargets(s);
    if (s.kind === "plug") {
      if (this.phase === "source") return [a];
      if (this.phase === "dest") return [b];
      return [];
    }
    return this.phase === "dial" || this.phase === "pick" ? [a] : [];
  }
  get remaining(): number {
    return this.status.filter((s) => s === "todo").length;
  }

  private initialPhase(): Phase {
    const s = this.step;
    if (!s) return "done";
    return s.kind === "plug" ? "source" : "dial";
  }

  private gate(): Feedback | null {
    if (this.finished) return { kind: "ignored", reason: "finished" };
    if (this.phase === "pending") return { kind: "ignored", reason: "pending" };
    if (this.phase === "done") return { kind: "ignored", reason: "done" };
    if (this.now() - this.lastTap < DEBOUNCE_MS) return { kind: "ignored", reason: "debounce" };
    return null;
  }

  /**
   * Which authored hint to show (architecture 5.9.2 content note): the
   * decoy's own byTarget text, else wrongKind if a data jack was tapped for
   * a program one (or the reverse), else the class hint for this phase
   * (wrongFrom / wrongTo / wrongSwitch / wrongValue), else a generic line.
   */
  private hintFor(id: string | null, classKey: string): string {
    const s = this.step!;
    const h = s.text.hints ?? {};
    if (id && h.byTarget?.[termOf(id)]) return h.byTarget[termOf(id)];
    if (id && s.kind === "plug" && h.wrongKind) {
      const [from, to] = stepTargets(s);
      const expected = classKey === "wrongFrom" ? from : to;
      if (kindOf(id) !== kindOf(expected)) return h.wrongKind;
    }
    const cls = (h as Record<string, unknown>)[classKey];
    if (typeof cls === "string" && cls) return cls;
    return LADDER_TEXT.defaults[classKey] ?? "";
  }

  private wrongTap(id: string | null, classKey: string, snapBack: boolean): TapResult {
    this.wrong++;
    let text: string;
    if (this.wrong === 1) {
      const specific = this.hintFor(id, classKey);
      text = `${LADDER_TEXT.notQuite} ${specific}`.trim();
    } else if (this.wrong === 2) text = LADDER_TEXT.level2;
    else text = LADDER_TEXT.level3;
    return {
      feedback: { kind: "wrong", id, level: Math.min(this.wrong, 3), text, snapBack },
      send: [{ t: "metric", ev: "wrong_tap", mission: this.mission.id, step: this.step!.id }],
    };
  }

  private applyMsg(assisted: boolean): ClientMsg {
    return { t: "apply_step", step: this.step!.id, assisted };
  }

  /**
   * A tap resolved by the hit tester to an element id (jack, trunk or dial),
   * or null for empty or dimmed space (neutral, never counted).
   */
  tap(id: string | null): TapResult {
    const g = this.gate();
    if (g) return { feedback: g, send: [] };
    if (id === null) return { feedback: { kind: "neutral" }, send: [] };
    this.lastTap = this.now();
    const s = this.step!;
    const [first, second] = stepTargets(s);
    if (s.kind === "plug") {
      if (this.phase === "source") {
        if (id === first) {
          this.phase = "dest";
          return { feedback: { kind: "ok-source", id }, send: [] };
        }
        return this.wrongTap(id, "wrongFrom", false);
      }
      // Destination phase: the source stays armed whatever happens.
      if (id === second) {
        this.phase = "pending";
        return { feedback: { kind: "ok", id, assisted: false }, send: [this.applyMsg(false)] };
      }
      if (id === first) return { feedback: { kind: "neutral" }, send: [] };
      return this.wrongTap(id, "wrongTo", true);
    }
    if (id === first) {
      this.phase = "pick";
      return { feedback: { kind: "open-picker", id }, send: [] };
    }
    return this.wrongTap(id, "wrongSwitch", false);
  }

  /** A value chosen in the switch picker. */
  pick(value: string): TapResult {
    const g = this.gate();
    if (g) return { feedback: g, send: [] };
    const s = this.step!;
    if (s.kind !== "switch" || this.phase !== "pick") return { feedback: { kind: "neutral" }, send: [] };
    this.lastTap = this.now();
    if (value === s.value) {
      this.phase = "pending";
      return { feedback: { kind: "ok", id: switchId(s.switch), assisted: false }, send: [this.applyMsg(false)] };
    }
    return this.wrongTap(null, "wrongValue", false);
  }

  /** "Do it for me": plays the step and sends apply_step {assisted:true}. */
  doItForMe(): TapResult {
    const g = this.gate();
    if (g && !(g.kind === "ignored" && g.reason === "debounce")) return { feedback: g, send: [] };
    this.lastTap = this.now();
    const t = stepTargets(this.step!);
    this.phase = "pending";
    return { feedback: { kind: "ok", id: t[t.length - 1], assisted: true }, send: [this.applyMsg(true)] };
  }

  /** step_applied from the bridge. True if it completed the current step. */
  ack(stepId: string, assisted: boolean): boolean {
    const s = this.step;
    if (!s || s.id !== stepId || this.phase !== "pending") return false;
    this.status[this.index] = assisted ? "assisted" : "done";
    this.phase = "done";
    return true;
  }

  /** "Next step" after a completed step. No auto-advance (UX 1.2). */
  next(): void {
    if (this.phase !== "done") return;
    this.index++;
    this.wrong = 0;
    this.lastTap = -Infinity;
    this.phase = this.initialPhase();
  }

  /** "Skip setup": marks the rest skipped and returns what to send. */
  skipAll(): { send: ClientMsg[]; stepsLeft: MissionStep[] } {
    // An apply already in flight reaches the (ordered) bridge before
    // skip_setup, so that step counts as the visitor's, not as skipped.
    if (this.phase === "pending" && !this.finished) this.status[this.index] = "done";
    const left: MissionStep[] = [];
    this.mission.steps.forEach((s, i) => {
      if (this.status[i] === "todo") {
        this.status[i] = "skipped";
        left.push(s);
      }
    });
    const atStep = this.step?.id ?? "none";
    this.index = this.mission.steps.length;
    this.phase = "done";
    return {
      send: [{ t: "skip_setup" }, { t: "metric", ev: "setup_skipped", mission: this.mission.id, step: atStep }],
      stepsLeft: left,
    };
  }
}
