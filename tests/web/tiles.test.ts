// Squares tile figures (docs/handoff-squares-tiles.md): the pure timelines
// behind the briefing and plan stage animations.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { briefingTimeline, finalState, grownGrid, mathTerms, planTimeline, stateAt, BRIEF_GAP, PLAN_LOOP_MS } from "../../src/web/app/stage/tiles.ts";
import type { MissionCompiled } from "../../src/web/app/protocol.ts";

const mission: MissionCompiled = JSON.parse(readFileSync(join(import.meta.dirname, "mock", "missions", "squares.json"), "utf8"));

test("grownGrid: 3x3 base, bottom row left to right, right column top to bottom, corner", () => {
  const g = grownGrid(3);
  assert.equal(g.length, 16);
  assert.deepEqual(
    g.filter((t) => t.part === "row").map((t) => [t.r, t.c]),
    [[3, 0], [3, 1], [3, 2]],
  );
  assert.deepEqual(
    g.filter((t) => t.part === "col").map((t) => [t.r, t.c]),
    [[0, 3], [1, 3], [2, 3]],
  );
  assert.deepEqual(g.filter((t) => t.part === "corner").map((t) => [t.r, t.c]), [[3, 3]]);
  assert.equal(g.filter((t) => t.part === "base").length, 9);
  // Every cell of the 4x4 exactly once.
  assert.equal(new Set(g.map((t) => `${t.r},${t.c}`)).size, 16);
});

test("briefing: 9 tiles one at a time, about 350 ms apart, counting captions, then loops", () => {
  const tl = briefingTimeline();
  const tileBeats = tl.beats.filter((b) => b.tiles);
  assert.equal(tileBeats.length, 9);
  for (let i = 1; i < tileBeats.length; i++) assert.equal(tileBeats[i].at - tileBeats[i - 1].at, BRIEF_GAP);
  assert.equal(BRIEF_GAP, 350);
  assert.deepEqual(
    tl.beats.map((b) => b.caption),
    ["1 tile", "2 tiles", "3 tiles", "4 tiles", "5 tiles", "6 tiles", "7 tiles", "8 tiles", "9 tiles", "3 rows of 3 = 9 tiles", "The square of 3 is 9"],
  );
  assert.ok(tl.loopMs > tl.beats.at(-1)!.at, "the last caption shows before the loop restarts");
  assert.equal(stateAt(tl, 0).tiles.size, 0);
  assert.equal(stateAt(tl, tileBeats[3].at).tiles.size, 4);
  assert.equal(stateAt(tl, tileBeats[3].at).caption, "4 tiles");
  assert.equal(finalState(tl).tiles.size, 9);
  assert.equal(finalState(tl).caption, "The square of 3 is 9");
});

test("plan: the handoff beat table (base 0.3 s, row 1.8 s, column 3.6 s, corner 5.4 s, = 16 at 6.6 s), loop at 11 s", () => {
  const tl = planTimeline();
  const g = grownGrid();
  const firstAt = (pred: (b: (typeof tl.beats)[number]) => boolean) => tl.beats.find(pred)!.at;
  const tileAt = (part: string) => firstAt((b) => !!b.tiles?.some((i) => g[i].part === part));
  assert.equal(tileAt("base"), 300);
  assert.equal(tileAt("row"), 1800);
  assert.equal(tileAt("col"), 3600);
  assert.equal(tileAt("corner"), 5400);
  // Each piece lights its own equation term, in order.
  assert.equal(firstAt((b) => !!b.terms?.includes("row")), 1800);
  assert.equal(firstAt((b) => !!b.terms?.includes("col")), 3600);
  assert.equal(firstAt((b) => !!b.terms?.includes("corner")), 5400);
  assert.equal(firstAt((b) => !!b.terms?.includes("total")), 6600);
  assert.ok(firstAt((b) => !!b.terms?.includes("base")) < 1800);
  assert.equal(tl.loopMs, PLAN_LOOP_MS);
  assert.equal(PLAN_LOOP_MS, 11_000);
  // Row tiles light left to right, column tiles top to bottom.
  const order = tl.beats.flatMap((b) => b.tiles ?? []).map((i) => g[i]);
  const row = order.filter((t) => t.part === "row").map((t) => t.c);
  const col = order.filter((t) => t.part === "col").map((t) => t.r);
  assert.deepEqual(row, [0, 1, 2]);
  assert.deepEqual(col, [0, 1, 2]);
  // Mid-animation: base + row, not yet the column.
  const mid = stateAt(tl, 2500);
  assert.equal(mid.tiles.size, 12);
  assert.deepEqual([...mid.terms].sort(), ["base", "row"]);
  assert.deepEqual([...mid.labels], ["row"]);
});

test("plan: +3 / +1 labels appear with their piece (a second cue beside colour, UX 6.4)", () => {
  const tl = planTimeline();
  for (const [part, term] of [["row", "row"], ["col", "col"], ["corner", "corner"]] as const) {
    const b = tl.beats.find((x) => x.labels?.includes(part))!;
    assert.ok(b.terms?.includes(term), `${part} label lights with its term`);
  }
});

test("reduced motion: the finished plan has all 16 tiles, all labels and all five terms", () => {
  const f = finalState(planTimeline());
  assert.equal(f.tiles.size, 16);
  assert.deepEqual([...f.terms].sort(), ["base", "col", "corner", "row", "total"]);
  assert.deepEqual([...f.labels].sort(), ["col", "corner", "row"]);
});

test("mathTerms: the mission's plan math maps to base, row, col, corner, total", () => {
  const t = mathTerms(mission.content.plan.math!)!;
  assert.deepEqual(
    t.map((x) => [x.text, x.term]),
    [["9", "base"], ["+", null], ["3", "row"], ["+", null], ["3", "col"], ["+", null], ["1", "corner"], ["=", null], ["16", "total"]],
  );
  assert.equal(mathTerms("1 + 2 = 3"), null);
  assert.equal(mathTerms(""), null);
});

test("Squares copy: the briefing and plan follow the handoff (fact-check softened)", () => {
  assert.equal(mission.content.briefing.headline, "What is a square?");
  assert.match(mission.content.briefing.body, /^Picture tiles on a floor\./);
  assert.match(mission.content.plan.body, /add a row, add a column, and add 1 tile in the corner/);
  assert.match(mission.content.plan.body, /ENIAC was very fast at adding\.$/);
  assert.doesNotMatch(mission.content.plan.body, /what it did best/);
});
