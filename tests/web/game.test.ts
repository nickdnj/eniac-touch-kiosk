import { test } from "node:test";
import assert from "node:assert/strict";
import { judge, landingFeet, cleanName, newRound, zones, rankFor, placeOn } from "../../src/web/app/game/logic.ts";

const game = {
  charges: [],
  elevations: [],
  targets: [{ id: "t1", feet: 12000 }, { id: "t2", feet: 20000 }],
  score: { max: 1000, hitFeet: 300, zeroFeet: 6000 },
  board: { ranks: [{ min: 1000, title: "Bullseye!" }, { min: 500, title: "Good shot" }, { min: 0, title: "Keep firing" }] },
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

test("zones nest around the flag, outermost first, and match the score line", () => {
  const z = zones(game, 12000);
  assert.deepEqual(z.map((x) => x.cls), ["red", "orange", "yellow", "green", "gold"]);
  assert.equal(z[4].lo, 11700);
  assert.equal(z[4].hi, 12300);
  // The edge of the 500+ zone is where the score line crosses 500.
  const edge = z[2].hi - 12000;
  assert.equal(judge(game, 12000, 12000 + edge).score, 500);
  assert.ok(z[0].lo >= 0);
  assert.ok(z.every((x, i) => i === 0 || (x.lo >= z[i - 1].lo && x.hi <= z[i - 1].hi)));
});

test("a zone near the gun does not run below zero", () => {
  assert.equal(zones(game, 2000)[0].lo, 0);
});

test("ranks and places", () => {
  assert.equal(rankFor(game, 1000), "Bullseye!");
  assert.equal(rankFor(game, 640), "Good shot");
  assert.equal(rankFor(game, 3), "Keep firing");
  const list = [{ score: 900 }, { score: 700 }, { score: 700 }, { score: 100 }] as never;
  assert.equal(placeOn(list, 950), 1);
  assert.equal(placeOn(list, 700), 2);
  assert.equal(placeOn(list, 50), 5);
});

test("a target with its own hit radius is judged and zoned by it", () => {
  // A big hull (400 ft) is hit from 350 ft away; the default radius (300) would miss.
  assert.equal(judge(game, 12000, 12350, 400).hit, true);
  assert.equal(judge(game, 12000, 12350).hit, false);
  const z = zones(game, 12000, 400);
  assert.equal(z[4].lo, 11600);
  assert.equal(z[4].hi, 12400);
  // The score line starts at the target's own radius, so the zone edges still match it.
  const edge = z[2].hi - 12000;
  assert.equal(judge(game, 12000, 12000 + edge, 400).score, 500);
});

test("a new round carries the target's name and radius", () => {
  const g = { ...(game as object), targets: [{ id: "t1", feet: 8000, name: "Enemy cruiser", hit: 350 }] } as never;
  const r = newRound(g, () => 0);
  assert.deepEqual([r.target, r.hit, r.name, r.ship], [8000, 350, "Enemy cruiser", null]);
});
