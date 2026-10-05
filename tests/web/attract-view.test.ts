// S1 Attract, the pure part (attract/view.ts): the camera drift and the
// reduced-motion framings over the panorama, the LIVE chip, the FR-36 rule,
// the scene and the landing lines (UX 14.2).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ATTRACT_SCALE,
  ATTRACT_VIEW_W,
  DRIFT_END,
  DRIFT_MAX_PX_PER_S,
  DRIFT_MIN_PX_PER_S,
  DRIFT_PX_PER_S,
  FRAMINGS,
  ROOM_SCREEN,
  attractDown,
  chipOf,
  driftEnds,
  driftMs,
  landingLines,
  lampKey,
  lampUnitsAt,
  sceneOf,
} from "../../src/web/app/attract/view.ts";
import { LIVE_LOST_MS } from "../../src/web/app/attract/store.ts";
import { PITCH, ROOM, STRIP_W, visibleRange } from "../../src/web/app/explore/room.ts";

test("the attract panorama is the room at a 166 px pitch, about 11 panels across the 1,824 px window", () => {
  assert.equal(Math.round(PITCH * ATTRACT_SCALE), 166);
  assert.ok(Math.abs(ATTRACT_VIEW_W * ATTRACT_SCALE - ROOM_SCREEN.w) < 1);
  const [a, b] = visibleRange(0, ATTRACT_VIEW_W);
  assert.equal(a, 0);
  assert.ok(b - a + 1 >= 11 && b - a + 1 <= 12, `${b - a + 1} panels`);
  assert.equal(DRIFT_END, STRIP_W - ATTRACT_VIEW_W);
});

test("the drift alternates: odd flights left to right, even flights back, each starting where the last stopped", () => {
  assert.deepEqual(driftEnds(0), { from: 0, to: 0 });
  assert.deepEqual(driftEnds(1), { from: 0, to: DRIFT_END });
  assert.deepEqual(driftEnds(2), { from: DRIFT_END, to: 0 });
  for (let f = 1; f < 6; f++) assert.equal(driftEnds(f + 1).from, driftEnds(f).to);
});

test("the drift moves about 96 screen px a second: the whole U in about one flight (49 s on the Mac)", () => {
  const ms = driftMs(0, DRIFT_END);
  assert.equal(DRIFT_PX_PER_S, 96);
  assert.ok(ms > 45_000 && ms < 60_000, `${ms} ms`);
  assert.equal(driftMs(DRIFT_END, 0), ms);
  assert.equal(driftMs(100, 100), 0);
  // Half way takes half as long.
  assert.ok(Math.abs(driftMs(DRIFT_END / 2, DRIFT_END) - ms / 2) < 2);
});

test("after a landing, the drift spans one real flight (bridge flightMs), within 40 to 120 px a second", () => {
  // A slow box: a 100 s flight -> the next drift takes about 100 s (it never parks at the end).
  assert.ok(Math.abs(driftMs(0, DRIFT_END, 100_000) - 100_000) < 2);
  assert.ok(Math.abs(driftMs(DRIFT_END, 0, 60_000) - 60_000) < 2);
  // Half the room takes half the flight.
  assert.ok(Math.abs(driftMs(DRIFT_END / 2, DRIFT_END, 60_000) - 30_000) < 2);
  // Limits: never faster than 120 or slower than 40 screen px a second.
  const full = DRIFT_END * ATTRACT_SCALE;
  assert.equal(driftMs(0, DRIFT_END, 1_000), Math.round((full / DRIFT_MAX_PX_PER_S) * 1000));
  assert.equal(driftMs(0, DRIFT_END, 1_000_000), Math.round((full / DRIFT_MIN_PX_PER_S) * 1000));
  // No measurement (first flight, or a bad value): 80 px a second.
  assert.equal(driftMs(0, DRIFT_END, null), driftMs(0, DRIFT_END));
  assert.equal(driftMs(0, DRIFT_END, 0), driftMs(0, DRIFT_END));
});

test("reduced motion: four framings in room order, from the control end to the output end, all legal", () => {
  assert.equal(FRAMINGS.length, 4);
  assert.equal(FRAMINGS[0], 0);
  assert.equal(FRAMINGS[3], DRIFT_END);
  for (let i = 1; i < 4; i++) assert.ok(FRAMINGS[i] > FRAMINGS[i - 1]);
  for (const x of FRAMINGS) assert.ok(x >= 0 && x <= DRIFT_END && Number.isInteger(x));
  // The accumulator wall framing shows Accumulators 3 to 10 (panels 9 to 16).
  const [a, b] = visibleRange(FRAMINGS[1], ATTRACT_VIEW_W);
  assert.ok(a <= 9 && b >= 16, `${a}..${b}`);
  // The multiplier and tables framing shows the multiplier (17-19) and Function Tables 2 and 3 (28-31).
  const [c, d] = visibleRange(FRAMINGS[2], ATTRACT_VIEW_W);
  assert.ok(c <= 19 && d >= 28, `${c}..${d}`);
});

test("only the panels on screen update (UX 14.2.3): the lamp units in the window, with a margin", () => {
  const left = lampUnitsAt(0, 0);
  for (const u of ["init", "cyc", "mp", "ft", "acc.1", "acc.2", "div", "acc.3"]) assert.ok(left.has(u), u);
  assert.ok(!left.has("acc.20") && !left.has("mult") && !left.has("ct"));
  const right = lampUnitsAt(DRIFT_END, 0);
  for (const u of ["ft", "acc.19", "acc.20", "ct", "pr"]) assert.ok(right.has(u), u);
  assert.ok(!right.has("init") && !right.has("acc.1"));
  // A margin of 2 panels takes in the next units either side.
  const [, last] = visibleRange(0, ATTRACT_VIEW_W);
  const next = ROOM.find((u) => u.at === last + 1)!;
  assert.ok(!lampUnitsAt(0, 0).has(lampKey(next)), `${next.id} is just off screen`);
  assert.ok(lampUnitsAt(0, 2).has(lampKey(next)), `${next.id} is inside the margin`);
  // Keys use the lamp naming of lamps/derive.ts.
  assert.equal(lampKey(ROOM.find((u) => u.id === "a7")!), "acc.7");
  assert.equal(lampKey(ROOM.find((u) => u.id === "ft2")!), "ft");
  assert.equal(lampKey(ROOM.find((u) => u.id === "mult")!), "mult");
  // About 12 of the 40 panels: at most 16 lamp units at a time, never all of them.
  for (let x = 0; x <= DRIFT_END; x += 400) assert.ok(lampUnitsAt(x, 0).size <= 16, `x=${x}`);
});

test("the LIVE chip shows only while frames arrive: LIVE, then WAITING; hidden otherwise", () => {
  assert.equal(chipOf("live"), "live");
  assert.equal(chipOf("waiting"), "waiting");
  for (const l of ["off", "waking", "held", "lost", "error"] as const) assert.equal(chipOf(l), "hidden");
});

test("FR-36: lost is S10 at once; off or error count only after 5 s; live, waiting, held, waking never", () => {
  assert.equal(attractDown("lost", 0), true);
  for (const l of ["live", "waiting", "held", "waking"] as const) assert.equal(attractDown(l, 60_000), false);
  for (const l of ["off", "error"] as const) {
    assert.equal(attractDown(l, LIVE_LOST_MS - 1), false);
    assert.equal(attractDown(l, LIVE_LOST_MS + 1), true);
  }
});

test("scenes follow the bridge's phases", () => {
  assert.equal(sceneOf("off"), "waking");
  assert.equal(sceneOf("starting"), "waking");
  assert.equal(sceneOf("error"), "waking");
  assert.equal(sceneOf("reading"), "live");
  assert.equal(sceneOf("flying"), "live");
  assert.equal(sceneOf("landed"), "landed");
  assert.equal(sceneOf("recycling"), "between");
});

test("landing lines come from the landing card only; nothing without one", () => {
  const landing = { card: 34, hop: 34, along: 390417741, up: -2951425, text: "", flightMs: 48320 };
  assert.deepEqual(landingLines(landing), ["Landed on hop 34", "34 cards punched"]);
  assert.deepEqual(landingLines({ ...landing, card: 1, hop: 1 }), ["Landed on hop 1", "1 card punched"]);
  assert.equal(landingLines(null), null);
  assert.equal(landingLines({ ...landing, hop: 0 }), null, "a card that cannot be read is never guessed");
});
