import { test } from "node:test";
import assert from "node:assert/strict";
import { judge, landingFeet, cleanName, newRound } from "../../src/web/app/game/logic.ts";

const game = {
  charges: [],
  elevations: [],
  targets: [{ id: "t1", feet: 12000 }, { id: "t2", feet: 20000 }],
  score: { max: 1000, hitFeet: 300, zeroFeet: 6000 },
} as never;

test("landing is the crossing in whole feet", () => {
  assert.equal(landingFeet({ x: 366739552 }), 36674);
  assert.equal(landingFeet(null), null);
});

test("a miss within the hit radius scores the maximum", () => {
  const r = judge(game, 12000, 12250);
  assert.deepEqual([r.hit, r.score, r.side], [true, 1000, "hit"]);
});

test("the score falls in a line to zero", () => {
  assert.equal(judge(game, 12000, 12000 + 300 + 2850).score, 500);
  assert.equal(judge(game, 12000, 12000 - 6000).score, 0);
  assert.equal(judge(game, 12000, 60000).score, 0);
  assert.equal(judge(game, 12000, 9000).side, "short");
  assert.equal(judge(game, 12000, 15000).side, "long");
});

test("names are cleaned to the bridge's rule", () => {
  assert.equal(cleanName("  <b>Nick!</b> "), "bNickb");
  assert.equal(cleanName("ABCDEFGHIJK"), "ABCDEFGH");
});

test("the target comes from the mission's list", () => {
  assert.equal(newRound(game, () => 0).target, 12000);
  assert.equal(newRound(game, () => 0.99).target, 20000);
});
