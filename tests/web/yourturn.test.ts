// Your turn (Difference): the question and the comparison come only from real cards (src/web/app/yourturn/logic.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, question, readRows } from "../../src/web/app/yourturn/logic.ts";
import type { PunchCard } from "../../src/web/app/protocol.ts";

// The real first rows of Stuart's table: f = 600, 511, 388, 237, 64, -125 and the change on each row.
const F = [600, 511, 388, 237, 64, -125];
const D = [-89, -123, -151, -173, -189, -199];
const pad = (n: number) => (n < 0 ? "-" + String(-n).padStart(9, "0") : String(n).padStart(10, "0"));
const card = (i: number, f = F[i], d = D[i]): PunchCard =>
  ({ n: i + 1, fields: ["", "", "", "", "", "", "", "", pad(f).slice(0, 5), pad(f).slice(5), pad(d).slice(0, 5), pad(d).slice(5)] }) as unknown as PunchCard;
const cards = F.map((_, i) => card(i));
const VALUE = [8, 9];
const CHANGE = [10, 11];

test("readRows reads the table value and the change from each card, in order", () => {
  const rows = readRows(cards, VALUE, CHANGE);
  assert.deepEqual(rows.map((r) => r.v), F);
  assert.deepEqual(rows.map((r) => r.d), D);
});

test("readRows stops at a card that is out of order or cannot be read; nothing is guessed", () => {
  assert.equal(readRows([cards[0], cards[2]], VALUE, CHANGE).length, 1);
  const bad = { ...cards[1], fields: cards[1].fields!.map(() => "xxxxx") } as PunchCard;
  assert.equal(readRows([cards[0], bad, cards[2]], VALUE, CHANGE).length, 1);
});

test("question: the row after the first four is 64, from 237 and the change -173, with three distinct answers", () => {
  const q = question(readRows(cards, VALUE, CHANGE), 4)!;
  assert.equal(q.row, 5);
  assert.equal(q.v, 64);
  assert.equal(q.from, 237);
  assert.equal(q.d, -173);
  assert.deepEqual(q.shown.map((r) => r.v), [600, 511, 388, 237]);
  assert.equal(q.options.length, 3);
  assert.equal(new Set(q.options).size, 3);
  assert.ok(q.options.includes(64));
  assert.ok(q.options.includes(410), "subtracting the change is offered as a slip (237 - (-173))");
  assert.ok(q.options.includes(86), "using the change from the row above is offered as a slip (237 + (-151))");
});

test("question: null when the cards do not support it", () => {
  const rows = readRows(cards, VALUE, CHANGE);
  assert.equal(question(rows.slice(0, 4), 4), null, "not enough rows");
  const broken = rows.map((r, i) => (i === 4 ? { ...r, v: 65 } : r)); // the cards disagree with the rule
  assert.equal(question(broken, 4), null);
});

test("the right answer is not always in the same place", () => {
  const rows = readRows(cards, VALUE, CHANGE);
  const places = [3, 4, 5].map((show) => {
    const q = question(rows, show)!;
    return q.options.indexOf(q.v);
  });
  assert.equal(new Set(places).size, 3, `positions ${places}`);
});

test("compare: the same table matches everywhere; a bent table matches then drifts", () => {
  const first = readRows(cards, VALUE, CHANGE);
  const same = compare(first, first, 6);
  assert.equal(same.matching, 6);
  assert.equal(same.identical, true);
  // steady number 0 instead of 6: 600, 511, 388, then 231 instead of 237
  const yours = first.map((r, i) => (i < 3 ? r : { ...r, v: r.v - 6 }));
  const c = compare(first, yours, 6);
  assert.equal(c.matching, 3);
  assert.equal(c.identical, false);
  assert.deepEqual(c.rows.map((r) => r.differs), [false, false, false, true, true, true]);
});

test("compare: rows your run has not punched yet are null, not guessed", () => {
  const first = readRows(cards, VALUE, CHANGE);
  const c = compare(first, first.slice(0, 2), 6);
  assert.equal(c.rows[3].yours, null);
  assert.equal(c.matching, 2);
});
