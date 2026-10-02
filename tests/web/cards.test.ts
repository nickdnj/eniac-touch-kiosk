// M2 punched cards (FR-21, UX 8.2.5, 8.3.5): reading numbers out of real
// card lines, the card log (order, duplicates, per-hundred bars), the
// derived apex and landing, and the card graphic's holes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CardLog, cardValue, columns, fillCard, holeRow, numberIn } from "../../src/web/app/run/cards.ts";
import { cardSvg, holesOf } from "../../src/web/app/run/cardart.ts";
import type { PunchCard } from "../../src/web/app/protocol.ts";

const fieldsOf = (text: string) => Array.from({ length: 16 }, (_, i) => text.slice(i * 5, i * 5 + 5));
/** A sieve.e card (columns 61-70), as the real core punches it (tests/fixtures/protocol/punch.json). */
const sieveCard = (n: number, v: number): PunchCard => {
  const text = " ".repeat(60) + String(v).padStart(10, "0") + " ".repeat(10);
  return { n, text, fields: fieldsOf(text) };
};
/** A trajdemo.e card: hop (26-30), along (51-60), up (71-80). */
const trajCard = (n: number, along: string, up: string): PunchCard => {
  const text = " ".repeat(25) + String(n).padStart(5, "0") + " ".repeat(20) + along + " ".repeat(10) + up;
  return { n, text, fields: fieldsOf(text) };
};

test("the recorded punch fixture reads as prime 3", () => {
  const fx = JSON.parse(readFileSync(join(import.meta.dirname, "..", "fixtures", "protocol", "punch.json"), "utf8"));
  assert.equal(fx.text.length, 80);
  assert.equal(cardValue(fx, [12, 13]), 3);
});

test("numberIn: signed integers only; blank or garbage is never guessed", () => {
  assert.equal(numberIn("0000000163"), 163);
  assert.equal(numberIn("-002951425"), -2951425);
  assert.equal(numberIn("  0014128681 "), 14128681);
  assert.equal(numberIn("          "), null);
  assert.equal(numberIn("00x0000003"), null);
  assert.equal(numberIn("--1"), null);
});

test("holes follow the IBM card code: a digit punches its row, minus the 11 row, blank nothing", () => {
  assert.equal(holeRow("0"), "0");
  assert.equal(holeRow("7"), "7");
  assert.equal(holeRow("-"), "11");
  assert.equal(holeRow(" "), null);
  const c = sieveCard(1, 163);
  assert.deepEqual(columns(c.text, 61, 70).join(""), "0000000163");
  assert.deepEqual(holesOf(c.text, 51, 80), ["61:0", "62:0", "63:0", "64:0", "65:0", "66:0", "67:0", "68:1", "69:6", "70:3"]);
  const svg = cardSvg(c.text, { w: 480, h: 150, first: 51, last: 80 });
  assert.equal((svg.match(/class="hole"/g) ?? []).length, 10);
  assert.ok(svg.includes('data-cols="51-80"'));
  assert.ok(svg.includes('data-col="69" data-row="6"'));
  const neg = trajCard(34, "0390417741", "-002951425");
  assert.ok(holesOf(neg.text, 21, 80).includes("71:11"), "the sign of a negative 'up' is an 11-row hole");
});

test("card log: order, duplicates ignored, count, newest first, bars per hundred", () => {
  const log = new CardLog({ window: [51, 80], value: [12, 13], style: "stack", keep: 20, bars: { per: 100, upTo: 2801 } });
  assert.equal(log.bars.length, 28);
  const primes = [3, 5, 7, 11, 97, 101, 547, 2801];
  primes.forEach((p, i) => assert.equal(log.add(sieveCard(i + 1, p)), true));
  assert.equal(log.add(sieveCard(3, 7)), false, "a repeated card is ignored");
  assert.equal(log.add(sieveCard(2, 5)), false, "an older card is ignored");
  assert.equal(log.count, 8);
  assert.deepEqual(log.recent(3).map((c) => log.valueOf(c)), [2801, 547, 101]);
  assert.equal(log.bars[0], 5); // 3, 5, 7, 11, 97
  assert.equal(log.bars[1], 1); // 101
  assert.equal(log.bars[5], 1); // 547
  assert.equal(log.bars[27], 1); // 2801 (the last bar is 2701 to 2801)
  // A resync rebuilds from the bridge's last 20 only (never invents older cards).
  log.fromState([sieveCard(41, 179), sieveCard(42, 181)]);
  assert.equal(log.count, 42);
  assert.equal(log.cards.length, 2);
  assert.equal(log.bars[1], 2);
});

test("plot: dots from fields; apex is the dot before the first fall; landing is the first negative; crossing interpolated", () => {
  const log = new CardLog({ window: [21, 80], value: [10, 11], hop: [5], style: "film", keep: 20 }, { x: [10, 11], y: [14, 15] });
  log.add(trajCard(1, "0014128681", "0005693229"));
  log.add(trajCard(2, "0028100000", "0010946479"));
  const apex = () => log.apex?.n ?? null;
  const landed = () => log.landed?.n ?? null;
  assert.equal(apex(), null);
  log.add(trajCard(3, "0041000000", "0010000000"));
  assert.equal(apex(), 2);
  assert.equal(landed(), null);
  log.add(trajCard(4, "0050000000", "-000500000"));
  assert.equal(landed(), 4);
  const x = log.crossing()!;
  assert.ok(x.x > 41_000_000 && x.x < 50_000_000);
  assert.equal(x.y, 0);
  log.add(trajCard(5, "0060000000", "0001000000"));
  assert.equal(log.dots.length, 4, "nothing after the landing is part of the flight");
});

test("fillCard: placeholders from real values only", () => {
  assert.equal(fillCard("Prime number {n}: {v}", { n: 37, v: "163" }), "Prime number 37: 163");
  assert.equal(fillCard("Cards: {n} {zz}", { n: 1 }), "Cards: 1 {zz}");
});
