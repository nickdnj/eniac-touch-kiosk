// This visit: which missions reached their result, and the real numbers
// they produced, for the picker (UX 8.4) and the finale (UX 14.5, FR-45).
// Pure: no DOM, no socket, injectable clock.
//
// Honesty rules (UX 14.1 rule 3, 14.5.3):
//  - every number here was read from the bridge: a settled tape row
//    (Squares), a punched card (Primes, Trajectory), or a step_applied ack
//    (hand-placed counts). Nothing is estimated, interpolated or defaulted;
//    a figure that was never seen is absent (undefined), never 0;
//  - figures only grow within a visit: a later, shorter attempt (a retry the
//    visitor walked away from) does not replace a better real result;
//  - the visit lives in memory only and ends when attract (S1) shows: the
//    idle reset, Finish / "Start over for the next visitor", error recovery
//    (App.show("start") calls reset()). Nothing is stored or sent.

import type { MissionStep } from "../protocol.ts";
import type { CardLog } from "../run/cards.ts";

/** Squares: the biggest square on the notebook tape, e.g. 7 x 7 = 49. */
export interface SquaresFigure {
  n: number;
  square: number;
}

/** A card mission (Primes): cards punched, and the number on the newest one. */
export interface CardsFigure {
  /** The highest card number seen (the bridge numbers cards 1, 2, 3...). */
  cards: number;
  /** The value punched on the newest card (Primes: the last prime), if readable. */
  last?: number;
}

/** A plotted flight (Trajectory) that reached its landing card. */
export interface FlightFigure {
  /** Hops = cards up to and including the landing card (S7's "{n} hops, {n} cards"). */
  hops: number;
  /** "Along" on the landing card, in the card's own units (no units are shown on screen). */
  along: number;
  /** The highest "up" punched (the apex card), if the flight turned over. */
  top?: number;
}

export interface MissionRecord {
  id: string;
  /** The visitor reached this mission's result screen (S7). */
  reached: boolean;
  squares?: SquaresFigure;
  cards?: CardsFigure;
  flight?: FlightFigure;
}

export interface VisitSummary {
  /** Mission ids that reached S7, in the order they were first reached. */
  done: string[];
  missions: Record<string, MissionRecord>;
  /** Steps the visitor placed by hand ("Do it for me" and skipped steps never count). */
  handCables: number;
  handSwitches: number;
  /** Whole minutes since the first mission started, or null before any. */
  minutes: number | null;
}

export class Visit {
  /** Missions that reached S7 this visit (the picker's Done badges, UX 8.4). */
  readonly done = new Set<string>();
  private records = new Map<string, Omit<MissionRecord, "reached">>();
  private hand = new Set<string>(); // "session:step" keys, each counted once
  handCables = 0;
  handSwitches = 0;
  startedAt: number | null = null;
  private now: () => number;

  constructor(now: () => number) {
    this.now = now;
  }

  /** Clears everything: the next visitor starts clean (FR-33). */
  reset(): void {
    this.done.clear();
    this.records.clear();
    this.hand.clear();
    this.handCables = this.handSwitches = 0;
    this.startedAt = null;
  }

  /** A mission is starting (the visit's clock starts with the first one). */
  begin(): void {
    if (this.startedAt === null) this.startedAt = this.now();
  }

  /** The visitor reached this mission's result screen (S7); same as done.add(id). */
  reached(id: string): void {
    this.done.add(id);
  }

  /** True when every id given has reached S7 this visit (the finale trigger, UX 14.5.1). */
  allDone(ids: string[]): boolean {
    return ids.length > 0 && ids.every((id) => this.done.has(id));
  }

  /**
   * A step_applied from the bridge. Counts the step if the visitor did it by
   * hand (`assisted` false), once per session and step.
   */
  stepApplied(sessionId: string, step: Pick<MissionStep, "id" | "kind"> | undefined, assisted: boolean): void {
    if (!step || assisted) return;
    const key = `${sessionId}:${step.id}`;
    if (this.hand.has(key)) return;
    this.hand.add(key);
    if (step.kind === "plug") this.handCables++;
    else this.handSwitches++;
  }

  /** Squares: the session's tape rows (real settled readings). Keeps the biggest square seen. */
  tape(id: string, rows: { x: number; sq: number }[]): void {
    let best: SquaresFigure | undefined;
    for (const r of rows) {
      if (!Number.isFinite(r.x) || !Number.isFinite(r.sq) || r.x <= 0) continue;
      if (!best || r.x > best.n) best = { n: r.x, square: r.sq };
    }
    if (!best) return;
    const rec = this.rec(id);
    if (!rec.squares || best.n > rec.squares.n) rec.squares = best;
  }

  /**
   * A card mission: the session's punched cards. A plotted mission records
   * its flight only once the landing card is punched; any other card mission
   * records the count and the newest card's value. A shorter attempt never
   * replaces a longer one.
   */
  cards(id: string, log: CardLog): void {
    if (log.count <= 0) return;
    if (log.plot) {
      const land = log.landed;
      if (!land) return;
      const rec = this.rec(id);
      const f: FlightFigure = { hops: land.n, along: land.x };
      if (log.apex) f.top = log.apex.y;
      if (!rec.flight || f.hops >= rec.flight.hops) rec.flight = f;
      return;
    }
    const rec = this.rec(id);
    const last = log.last;
    const fig: CardsFigure = { cards: log.count };
    const v = last ? log.valueOf(last) : null;
    if (v !== null) fig.last = v;
    if (!rec.cards || fig.cards > rec.cards.cards) rec.cards = fig;
  }

  /** A copy of one mission's record, or undefined if it never started producing anything nor reached S7. */
  get(id: string): MissionRecord | undefined {
    const r = this.records.get(id);
    if (!r && !this.done.has(id)) return undefined;
    return { ...structuredClone(r ?? { id }), id, reached: this.done.has(id) };
  }

  /** Whole minutes since the first mission started (rounded), or null. */
  minutes(): number | null {
    return this.startedAt === null ? null : Math.round((this.now() - this.startedAt) / 60_000);
  }

  /** A copy of everything the finale may show. */
  summary(): VisitSummary {
    const missions: Record<string, MissionRecord> = {};
    for (const id of new Set([...this.done, ...this.records.keys()])) missions[id] = this.get(id)!;
    return { done: [...this.done], missions, handCables: this.handCables, handSwitches: this.handSwitches, minutes: this.minutes() };
  }

  private rec(id: string): Omit<MissionRecord, "reached"> {
    let r = this.records.get(id);
    if (!r) {
      r = { id };
      this.records.set(id, r);
    }
    return r;
  }
}
