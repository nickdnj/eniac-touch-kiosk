// Per-mission art (src/web/app/missions/registry.ts): a mission with no entry
// still gets a picker card and falls back to the room plan, so adding a mission
// never needs a web change.

import { test } from "node:test";
import assert from "node:assert/strict";
import { briefingFigureFor, pickerArtFor, planFigureFor } from "../../src/web/app/missions/registry.ts";

test("every mission has a picker card of the same size, drawn or generic", () => {
  for (const [id, order] of [["squares", 1], ["primes", 2], ["trajectory", 3], ["difference", 4], ["some-future-mission", 9]] as const) {
    const svg = pickerArtFor(id, order);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 480 200"/, id);
    assert.match(svg, /class="mc-art"/, id);
  }
});

test("a mission with no art gets a generic card showing its number", () => {
  assert.match(pickerArtFor("some-future-mission", 9), />9<\/text>/);
  assert.doesNotMatch(pickerArtFor("squares", 1), /<text/);
});

test("a mission with no animations falls back (null) instead of throwing", () => {
  assert.equal(briefingFigureFor("some-future-mission", false), null);
  assert.equal(planFigureFor("some-future-mission", "x", false), null);
  assert.equal(briefingFigureFor("difference", false), null);
});
