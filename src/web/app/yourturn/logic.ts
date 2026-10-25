// Your turn (Difference): the guess-the-next-row question and the first-table
// versus your-table comparison. Pure: no DOM. Every number comes from the
// visitor's own punched cards (no demo fallback): a card that cannot be read,
// cards out of order, or cards that disagree with the rule (row = row above +
// its change) mean there is no question, never a guessed one.

import type { PunchCard } from "../protocol.ts";
import { cardValue } from "../run/cards.ts";

/** One punched row: card number, the table value, and the change added on that row. */
export interface Row {
  n: number;
  v: number;
  d: number;
}

/** What the app remembers between the first run and the visitor's own run. */
export interface YourTurnState {
  /** The first table, read from the first run's cards (nothing else is kept). */
  first: Row[];
  /** The steady number the first run used (the step's own value, "6"). */
  firstSteady: string;
  /** The number the visitor chose for their own run; null until they have chosen. */
  steady: string | null;
}

/**
 * The rows the cards prove, in order from card 1. Stops at the first card
 * that is missing, out of order or unreadable.
 */
export function readRows(cards: PunchCard[], value: number[], change: number[]): Row[] {
  const out: Row[] = [];
  for (const c of cards) {
    if (c.n !== out.length + 1) break;
    const v = cardValue(c, value);
    const d = cardValue(c, change);
    if (v === null || d === null) break;
    out.push({ n: c.n, v, d });
  }
  return out;
}

export interface Question {
  /** The rows shown before the question. */
  shown: Row[];
  /** The row asked for (card number), its real value, and the value and change it comes from. */
  row: number;
  v: number;
  from: number;
  d: number;
  /** Three answers, one right, in a fixed order. */
  options: number[];
}

/**
 * Ask for the row after the first `show` rows. Null unless the real cards
 * support it: enough rows, in order, and row = row above + its change.
 */
export function question(rows: Row[], show: number): Question | null {
  if (show < 2 || rows.length < show + 1) return null;
  const prev = rows[show - 1];
  const target = rows[show];
  if (prev.v + prev.d !== target.v) return null;
  // The two slips people make: subtracting the change, and using the change from the row above.
  const slips = [prev.v - prev.d, prev.v + rows[show - 2].d, prev.v, prev.v + 2 * prev.d, target.v + 100];
  const wrong: number[] = [];
  for (const s of slips) if (s !== target.v && !wrong.includes(s) && wrong.length < 2) wrong.push(s);
  const options = [target.v, ...wrong];
  // Rotate so the right answer is not always first (stable for a given run).
  const r = target.n % options.length;
  return { shown: rows.slice(0, show), row: target.n, v: target.v, from: prev.v, d: prev.d, options: options.slice(r).concat(options.slice(0, r)) };
}

export interface CompareRow {
  n: number;
  first: number;
  yours: number | null; // null until that card is punched
  differs: boolean;
}

export interface Comparison {
  rows: CompareRow[];
  /** How many rows from the top match. */
  matching: number;
  /** True if every row compared matches (the visitor chose the original number, or has not diverged yet). */
  identical: boolean;
}

/** The first table beside the visitor's own, for the first `upTo` rows. */
export function compare(first: Row[], yours: Row[], upTo: number): Comparison {
  const rows: CompareRow[] = [];
  let matching = 0;
  let diverged = false;
  for (let i = 0; i < Math.min(upTo, first.length); i++) {
    const y = yours[i];
    const differs = y !== undefined && y.v !== first[i].v;
    if (!diverged && y !== undefined && !differs) matching++;
    if (differs) diverged = true;
    rows.push({ n: first[i].n, first: first[i].v, yours: y ? y.v : null, differs });
  }
  return { rows, matching, identical: rows.every((r) => r.yours !== null && !r.differs) };
}
