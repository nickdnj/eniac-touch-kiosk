// Punched cards (FR-21, UX 8.2.5 / 8.3.5, architecture 5.4 `punch`). Pure:
// no DOM. Every number here comes from the real `punch` lines of the core;
// nothing is ever shown before it is punched (no demo fallback).

import type { PunchCard } from "../protocol.ts";

/** Card pane spec from the compiled mission (run.cards). */
export interface CardPaneSpec {
  window: number[]; // [first, last] column shown, 1-based
  value: number[]; // field indices joined into the card's number
  hop?: number[];
  style: string; // "stack" | "film"
  keep: number;
  bars?: { per: number; upTo: number };
}

/** Plot spec (run.plot): x and y from card fields. */
export interface PlotSpec {
  x: number[];
  y: number[];
}

/** The text of the given 5-character fields, joined (e.g. [12, 13] -> cols 61-70). */
export function fieldText(card: PunchCard, fields: number[]): string {
  return fields.map((i) => card.fields?.[i] ?? "").join("");
}

/**
 * The number punched in those fields: "0000000163" -> 163, "-002951425" ->
 * -2951425, "J2345" -> -12345. A negative field carries an 11-row
 * overpunch on its first digit (printer.go sm2tenc): '-' is 11 over 0 and
 * J..R are 11 over 1..9. Null if the text is not a plain number in that
 * code (blank, garbage): a card that cannot be read is never guessed.
 */
export function numberIn(text: string): number | null {
  let t = text.trim();
  let neg = false;
  const z = OVERPUNCH_11.indexOf(t[0] ?? "");
  if (z >= 0 && t.length > 1) {
    neg = true;
    t = String(z) + t.slice(1);
  }
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isSafeInteger(n)) return null;
  return neg ? -n : n;
}

export const cardValue = (card: PunchCard, fields: number[]): number | null => numberIn(fieldText(card, fields));

/**
 * 11-zone overpunch characters, indexed by the digit punched under the 11:
 * '-' is 11 + 0, J..R are 11 + 1..9. Upstream printer.go sm2tenc() writes a
 * negative field this way ("sc := string('9' - s[0] - 1 + 'J')", with 'I'
 * turned into "-"); those, the digits 0-9 and blanks are the only
 * characters doprint() ever puts on a card, so there is no 12 zone here.
 */
export const OVERPUNCH_11 = "-JKLMNOPQR";

/**
 * The holes punched for one card column (Hollerith code), as card rows
 * (12, 11, 0..9): a digit punches its own row; '-' and J..R punch the 11
 * row plus their digit; a blank punches nothing. A character the core
 * cannot emit punches nothing (never guessed).
 */
export function holeRows(ch: string): string[] {
  if (ch >= "0" && ch <= "9") return [ch];
  const z = OVERPUNCH_11.indexOf(ch);
  if (z >= 0 && ch !== "") return ["11", String(z)];
  return [];
}

/** Rows top to bottom as printed on a card. */
export const CARD_ROWS = ["12", "11", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Characters of columns [first, last] (1-based), padded with spaces. */
export function columns(text: string, first: number, last: number): string[] {
  const out: string[] = [];
  for (let c = first; c <= last; c++) out.push(text[c - 1] ?? " ");
  return out;
}

/** Fill {n}, {v} and similar placeholders. */
export function fillCard(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** A number for display: thousands separated (2,801). */
export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

/** One dot of the plot. */
export interface Dot {
  n: number; // card number
  x: number;
  y: number;
}

/**
 * The session's cards, in order, as the UI knows them. Fed from `state`
 * (the bridge's last 20, on a new session or a resync) and `punch` messages
 * (every card, in order, never coalesced).
 */
export class CardLog {
  readonly spec: CardPaneSpec | null;
  readonly plot: PlotSpec | null;
  /** All cards seen this session (capped), oldest first. */
  cards: PunchCard[] = [];
  /** Highest card number seen (the count, even if older cards were dropped). */
  count = 0;
  /** Tally per bar (UX 8.2.5 "primes per hundred"). */
  bars: number[] = [];
  dots: Dot[] = [];
  apex: Dot | null = null; // derived: the previous dot when "up" first falls
  landed: Dot | null = null; // derived: the first dot below zero
  private static readonly MAX = 2000;

  constructor(spec: CardPaneSpec | null | undefined, plot?: PlotSpec | null) {
    this.spec = spec ?? null;
    this.plot = plot ?? null;
    this.reset();
  }

  reset(): void {
    this.cards = [];
    this.count = 0;
    this.dots = [];
    this.apex = this.landed = null;
    const b = this.spec?.bars;
    // One bar per hundred; the last also takes upTo itself (UX 8.2.5: 28
    // bars, 3-100 ... 2701-2801).
    this.bars = b ? new Array(Math.max(1, Math.ceil((b.upTo - 1) / b.per))).fill(0) : [];
  }

  /** Snapshot cards (the last 20). Rebuilds only what those cards prove. */
  fromState(cards: PunchCard[]): void {
    this.reset();
    for (const c of cards) this.add(c);
  }

  /** Adds a card. Returns false for a duplicate or out-of-order card. */
  add(card: PunchCard): boolean {
    if (!card || typeof card.n !== "number" || card.n <= this.count) return false;
    this.count = card.n;
    this.cards.push(card);
    if (this.cards.length > CardLog.MAX) this.cards.splice(0, this.cards.length - CardLog.MAX);
    const v = this.spec ? cardValue(card, this.spec.value) : null;
    const b = this.spec?.bars;
    if (b && v !== null && v >= 1 && v <= b.upTo) this.bars[Math.min(this.bars.length - 1, Math.floor((v - 1) / b.per))]++;
    if (this.plot) this.addDot(card);
    return true;
  }

  private addDot(card: PunchCard): void {
    const x = cardValue(card, this.plot!.x);
    const y = cardValue(card, this.plot!.y);
    if (x === null || y === null || this.landed) return; // nothing after the landing is part of the flight
    const d: Dot = { n: card.n, x, y };
    const prev = this.dots[this.dots.length - 1];
    this.dots.push(d);
    if (!this.apex && prev && y < prev.y) this.apex = prev;
    if (y < 0) this.landed = d;
  }

  get last(): PunchCard | null {
    return this.cards[this.cards.length - 1] ?? null;
  }

  /** The newest `keep` cards, newest first. */
  recent(keep = this.spec?.keep ?? 20): PunchCard[] {
    return this.cards.slice(-keep).reverse();
  }

  valueOf(card: PunchCard): number | null {
    return this.spec ? cardValue(card, this.spec.value) : null;
  }

  /**
   * Where the path crosses zero between the last two dots (straight line,
   * labelled as such in the UI), or null before the landing.
   */
  crossing(): { x: number; y: number } | null {
    if (!this.landed) return null;
    const i = this.dots.indexOf(this.landed);
    const a = this.dots[i - 1];
    if (!a) return { x: this.landed.x, y: 0 };
    const t = a.y / (a.y - this.landed.y);
    return { x: a.x + t * (this.landed.x - a.x), y: 0 };
  }
}
