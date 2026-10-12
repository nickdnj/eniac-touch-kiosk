// The hidden staff gesture (FR-70, UX 7.11; docs/original-ui-switch.md 6.7).

import { test } from "node:test";
import assert from "node:assert/strict";
import { TapCounter, inZone, TAP_WINDOW_MS } from "../../src/web/app/admin/tapcount.ts";

const zone = { widthPx: 120, heightPx: 96, taps: 5 };

test("five taps in the corner within 3 s open S12", () => {
  const c = new TapCounter();
  const hits = [0, 400, 800, 1200, 2900].map((t) => c.down(true, t));
  assert.deepEqual(hits, [false, false, false, false, true]);
  assert.equal(c.count, 0, "the count restarts after it fires");
});

test("four taps then a pause does nothing; the fifth tap after 3 s starts a new count", () => {
  const c = new TapCounter();
  for (const t of [0, 300, 600, 900]) assert.equal(c.down(true, t), false);
  assert.equal(c.down(true, TAP_WINDOW_MS + 1), false, "a tap in the 4th second is tap 1 again");
  assert.equal(c.count, 1);
  for (const t of [3100, 3200, 3300]) assert.equal(c.down(true, t), false);
  assert.equal(c.down(true, 3400), true);
});

test("a touch outside the corner resets the count", () => {
  const c = new TapCounter();
  for (const t of [0, 100, 200, 300]) c.down(true, t);
  assert.equal(c.down(false, 400), false);
  assert.equal(c.count, 0);
  for (const t of [500, 600, 700, 800]) assert.equal(c.down(true, t), false);
  assert.equal(c.down(true, 900), true);
});

test("taps comes from hello.config.admin.tapZone", () => {
  const c = new TapCounter();
  c.taps = 3;
  assert.deepEqual([0, 1, 2].map((t) => c.down(true, t)), [false, false, true]);
});

test("the corner is the top-left widthPx x heightPx", () => {
  assert.equal(inZone({ x: 0, y: 0 }, zone), true);
  assert.equal(inZone({ x: 119, y: 95 }, zone), true);
  assert.equal(inZone({ x: 120, y: 10 }, zone), false);
  assert.equal(inZone({ x: 10, y: 96 }, zone), false);
  assert.equal(inZone({ x: -1, y: 10 }, zone), false);
});
