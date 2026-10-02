// The visit store (src/web/app/state/visit.ts): what the finale may show
// (UX 14.5, FR-45). Every figure must come from real data (tape rows, punched
// cards, step_applied acks), only grow within a visit, and vanish at reset.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Visit } from "../../src/web/app/state/visit.ts";
import { CardLog } from "../../src/web/app/run/cards.ts";
import type { PunchCard } from "../../src/web/app/protocol.ts";

function mk() {
  let t = 1_000_000;
  const v = new Visit(() => t);
  return { v, advance: (ms: number) => (t += ms) };
}

const plug = (id: string) => ({ id, kind: "plug" as const });
const sw = (id: string) => ({ id, kind: "switch" as const });

/** A card with 16 five-character fields; `vals` puts numbers into chosen fields. */
function card(n: number, vals: Record<number, string>): PunchCard {
  const fields = Array.from({ length: 16 }, (_, i) => vals[i] ?? "     ");
  return { n, text: fields.join(""), fields } as PunchCard;
}

test("empty visit: nothing is invented", () => {
  const { v } = mk();
  assert.deepEqual(v.summary(), { done: [], missions: {}, handCables: 0, handSwitches: 0, minutes: null });
  assert.equal(v.get("squares"), undefined);
  assert.equal(v.allDone(["squares", "primes", "trajectory"]), false);
  assert.equal(v.allDone([]), false);
});

test("reached: in order, the finale trigger needs every mission", () => {
  const { v } = mk();
  v.reached("primes");
  v.done.add("squares"); // App.done is the same set (the result screen adds to it)
  assert.deepEqual(v.summary().done, ["primes", "squares"]);
  assert.equal(v.allDone(["squares", "primes", "trajectory"]), false);
  v.reached("trajectory");
  assert.equal(v.allDone(["squares", "primes", "trajectory"]), true);
  assert.deepEqual(v.get("squares"), { id: "squares", reached: true });
});

test("hand-placed counts: assisted and repeated acks never count; kinds are split", () => {
  const { v } = mk();
  v.stepApplied("s1", sw("j1-one"), false);
  v.stepApplied("s1", plug("const-to-trunk1"), false);
  v.stepApplied("s1", plug("const-to-trunk1"), false); // duplicate ack
  v.stepApplied("s1", plug("trunk1-to-a1"), true); // "Do it for me"
  v.stepApplied("s1", undefined, false); // unknown step id
  assert.equal(v.handSwitches, 1);
  assert.equal(v.handCables, 1);
  // A retry is a new session: the visitor really placed it again.
  v.stepApplied("s2", plug("const-to-trunk1"), false);
  assert.equal(v.handCables, 2);
});

test("Squares: the biggest square on the tape, kept after CLEAR or a shorter retry", () => {
  const { v } = mk();
  v.tape("squares", []);
  assert.equal(v.get("squares"), undefined);
  v.tape("squares", [{ x: 1, sq: 1 }, { x: 2, sq: 4 }, { x: 3, sq: 9 }]);
  assert.deepEqual(v.get("squares")!.squares, { n: 3, square: 9 });
  v.tape("squares", []); // CLEAR
  v.tape("squares", [{ x: 1, sq: 1 }]); // a retry that stopped early
  assert.deepEqual(v.get("squares")!.squares, { n: 3, square: 9 });
  v.tape("squares", [{ x: 7, sq: 49 }, { x: Number.NaN, sq: 0 }]);
  assert.deepEqual(v.get("squares")!.squares, { n: 7, square: 49 });
});

test("Primes: real count and the number on the newest card; never shrinks", () => {
  const { v } = mk();
  const log = new CardLog({ window: [56, 70], value: [12, 13], style: "stack", keep: 20 });
  v.cards("primes", log); // no cards yet
  assert.equal(v.get("primes"), undefined);
  const primes = [3, 5, 7, 11, 13];
  primes.forEach((p, i) => log.add(card(i + 1, { 12: "00000", 13: String(p).padStart(5, "0") })));
  v.cards("primes", log);
  assert.deepEqual(v.get("primes")!.cards, { cards: 5, last: 13 });
  // A later attempt with fewer cards does not replace the real 5.
  const retry = new CardLog({ window: [56, 70], value: [12, 13], style: "stack", keep: 20 });
  retry.add(card(1, { 12: "00000", 13: "00003" }));
  v.cards("primes", retry);
  assert.deepEqual(v.get("primes")!.cards, { cards: 5, last: 13 });
});

test("Primes: an unreadable newest card gives the count without a value (never guessed)", () => {
  const { v } = mk();
  const log = new CardLog({ window: [56, 70], value: [12, 13], style: "stack", keep: 20 });
  log.add(card(1, { 12: "00000", 13: "0?0?3" }));
  v.cards("primes", log);
  assert.deepEqual(v.get("primes")!.cards, { cards: 1 });
});

test("Trajectory: a flight is recorded only at the landing card", () => {
  const { v } = mk();
  const log = new CardLog({ window: [21, 80], value: [5], hop: [5], style: "film", keep: 40 }, { x: [10, 11], y: [14, 15] });
  const ys = [100, 300, 400, 350, 150];
  ys.forEach((y, i) => log.add(card(i + 1, { 5: String(i + 1).padStart(5, "0"), 10: "00000", 11: String((i + 1) * 100).padStart(5, "0"), 14: "00000", 15: String(y).padStart(5, "0") })));
  v.cards("trajectory", log);
  assert.equal(v.get("trajectory"), undefined, "still flying: nothing to say yet");
  // Landing card: "up" below zero, overpunched minus ('J' = 11 over 1).
  log.add(card(6, { 5: "00006", 10: "00000", 11: "00600", 14: "-0000", 15: "00050" }));
  v.cards("trajectory", log);
  assert.deepEqual(v.get("trajectory")!.flight, { hops: 6, along: 600, top: 400 });
});

test("minutes: from the first mission start; reset clears everything", () => {
  const { v, advance } = mk();
  assert.equal(v.minutes(), null);
  v.begin();
  advance(4 * 60_000 + 20_000);
  v.begin(); // a second mission does not restart the clock
  advance(60_000);
  assert.equal(v.minutes(), 5);
  v.reached("squares");
  v.stepApplied("s", plug("p"), false);
  v.tape("squares", [{ x: 2, sq: 4 }]);
  v.reset();
  assert.deepEqual(v.summary(), { done: [], missions: {}, handCables: 0, handSwitches: 0, minutes: null });
});

test("get and summary return copies: the finale cannot change the store", () => {
  const { v } = mk();
  v.tape("squares", [{ x: 3, sq: 9 }]);
  const r = v.get("squares")!;
  r.squares!.n = 99;
  v.summary().missions.squares.squares!.n = 98;
  assert.deepEqual(v.get("squares")!.squares, { n: 3, square: 9 });
});
