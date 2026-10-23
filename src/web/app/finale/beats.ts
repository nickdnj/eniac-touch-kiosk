// S8 Finale (UX 14.5, PRD FR-45): the pure parts. Which beat comes next and
// when, what F1 may say from this visit's real numbers, and which units and
// panels the visitor used. No DOM, no socket, injectable clock; tested in
// tests/web/finale.test.ts.
//
// Honesty (UX 14.1 rule 3, 14.5.3): every figure comes from the visit store
// (state/visit.ts), which holds only numbers read from the bridge. A figure
// that was never seen is not shown: the plate says the mission's words.

import type { MissionRecord, VisitSummary } from "../state/visit.ts";
import { FINALE } from "../content/finale.ts";
import { ROOM, missionTargets } from "../explore/room.ts";

export type Beat = 1 | 2 | 3 | 4 | 5;
export const BEATS: Beat[] = [1, 2, 3, 4, 5];

/** UX 14.5.2: 15 + 15 + 15 + 20 + 20 = 85 s at most. F5 holds 20 s without a touch, then S1. */
export const BEAT_MS: Record<Beat, number> = { 1: 15_000, 2: 15_000, 3: 15_000, 4: 20_000, 5: 20_000 };

/** {m} is shown only inside this range (UX 14.5.2 F1). */
export const MINUTES_SHOWN = { min: 3, max: 30 } as const;

export interface SequencerDeps {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(h: unknown): void;
  /** F2 needs the room with a core (UX 14.5.3): false skips it. Asked when F2 would start. */
  canShowRoom(): boolean;
  /** Draw this beat. */
  show(b: Beat): void;
  /** F5 held 20 s with no touch: back to S1. */
  end(): void;
}

/**
 * The beat clock. Each beat advances on Next, a touch, or its timer; Skip
 * goes to F5; F5 holds and then ends. Timers are not motion: reduced motion
 * keeps them (UX 14.5.3).
 */
export class BeatSequencer {
  beat: Beat | null = null;
  private t: unknown = null;
  private d: SequencerDeps;

  constructor(d: SequencerDeps) {
    this.d = d;
  }

  /** Starts on a beat (1 for a new finale; 5 when coming back from Explore or S16). */
  start(b: Beat = 1): void {
    this.go(b === 2 && !this.d.canShowRoom() ? 3 : b);
  }

  /** The beat after the current one (F2 skipped without the room); null on F5. */
  following(): Beat | null {
    if (this.beat === null || this.beat === 5) return null;
    let n = (this.beat + 1) as Beat;
    if (n === 2 && !this.d.canShowRoom()) n = 3;
    return n;
  }

  /** Next, a touch on the beat, or the timer. Nothing on F5 (it holds). */
  next(): void {
    const n = this.following();
    if (n !== null) this.go(n);
  }

  /** Skip to the end (F5). */
  skip(): void {
    if (this.beat !== null && this.beat !== 5) this.go(5);
  }

  /** A touch on F5: the 20 s hold starts again. */
  hold(): void {
    if (this.beat === 5) this.arm(5);
  }

  stop(): void {
    this.clear();
    this.beat = null;
  }

  private go(b: Beat): void {
    this.beat = b;
    this.d.show(b);
    if (this.beat === b) this.arm(b); // show() may have left the finale
  }

  private arm(b: Beat): void {
    this.clear();
    this.t = this.d.setTimeout(() => {
      this.t = null;
      if (this.beat !== b) return;
      if (b === 5) {
        this.beat = null;
        this.d.end();
      } else this.next();
    }, BEAT_MS[b]);
  }

  private clear(): void {
    if (this.t !== null) this.d.clearTimeout(this.t);
    this.t = null;
  }
}

// ---------------------------------------------------------------- F1

export interface MissionInfo {
  id: string;
  order: number;
  title: string;
  /** This mission's sentence, from its YAML `finale:` block (bridge /api/missions). */
  finale?: { words: string; figure?: string };
}

export interface F1Plate {
  id: string;
  order: number;
  title: string;
  /** The sentence under the title: a real figure, or the mission's words. */
  text: string;
  /** True when `text` carries a real number from this visit. */
  figure: boolean;
}

export interface F1Content {
  /** "In 1946 ... a day or more." plus "You did it in about {m} minutes." only when {m} is 3 to 30. */
  line: string;
  minutes: number | null;
  plates: F1Plate[];
  /** "You placed {c} cables and set {s} switches yourself.", or null when nothing was placed by hand. */
  hand: string | null;
}

const fmt = (n: number) => n.toLocaleString("en-US");

/** The real numbers this visit produced for a mission, by placeholder name. Absent means never seen. */
function figureVars(r: MissionRecord | undefined): Record<string, string> {
  const v: Record<string, string> = {};
  if (r?.squares) Object.assign(v, { n: fmt(r.squares.n), square: fmt(r.squares.square) });
  if (r?.cards && r.cards.cards > 0) {
    v.cards = fmt(r.cards.cards);
    if (r.cards.last !== undefined) v.last = fmt(r.cards.last);
  }
  if (r?.flight && r.flight.hops > 0) v.hops = fmt(r.flight.hops);
  return v;
}

/**
 * A mission's `figure` template filled from the visit. A sentence whose
 * placeholders were not all seen is dropped; null when nothing is left.
 */
export function fillFigure(template: string, vars: Record<string, string>): string | null {
  const kept = template
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => [...sentence.matchAll(/\{(\w+)\}/g)].every((m) => m[1] in vars))
    .map((sentence) => sentence.replace(/\{(\w+)\}/g, (_, k: string) => vars[k]));
  return kept.length ? kept.join(" ") : null;
}

function plateText(m: MissionInfo, s: VisitSummary): { text: string; figure: boolean } {
  const f = m.finale;
  if (!f) return { text: FINALE.f1.otherWords, figure: false };
  const filled = f.figure ? fillFigure(f.figure, figureVars(s.missions[m.id])) : null;
  return filled ? { text: filled, figure: true } : { text: f.words, figure: false };
}

/** F1 from the visit summary: one plate per mission done, in mission order. */
export function f1Content(s: VisitSummary, missions: MissionInfo[]): F1Content {
  const m = s.minutes;
  const showM = m !== null && m >= MINUTES_SHOWN.min && m <= MINUTES_SHOWN.max;
  const done = new Set(s.done);
  const plates = missions
    .filter((x) => done.has(x.id))
    .sort((a, b) => a.order - b.order)
    .map((x) => ({ id: x.id, order: x.order, title: x.title, ...plateText(x, s) }));
  return {
    line: showM ? `${FINALE.f1.then} ${FINALE.f1.you(m)}` : FINALE.f1.then,
    minutes: showM ? m : null,
    plates,
    hand: s.handCables + s.handSwitches > 0 ? FINALE.f1.hand(s.handCables, s.handSwitches) : null,
  };
}

// ---------------------------------------------------------------- F2

/**
 * The room targets (unit ids, and the trays "dt"/"pt") used by all these
 * missions, from their compiled `units` lists (derived by the bridge from
 * the programs, never typed). Same rules as Explore's mission view.
 */
export function unitsUsed(unitLists: string[][]): Set<string> {
  const out = new Set<string>();
  for (const l of unitLists) for (const t of missionTargets(l)) out.add(t);
  return out;
}

/** Panels the used units stand in (of 40): a unit's whole width counts once. */
export function panelsUsed(targets: Set<string>): number {
  let n = 0;
  for (const u of ROOM) if (targets.has(u.id)) n += u.n;
  return n;
}

/** F2's caption from the real count, or without a count when a unit list is missing. */
export function f2Caption(panels: number | null): string {
  return `${panels === null ? FINALE.f2.usedNoCount : FINALE.f2.used(panels)} ${FINALE.f2.how}`;
}
