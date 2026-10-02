// Explore ENIAC room geometry and mission derivation (explore/room.ts,
// UX 14.3.1, 14.3.2, 14.3.7) and the roomplan F12 fix.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PANELS,
  PITCH,
  ROOM,
  STOPS,
  STRIP_W,
  VIEW_W,
  accRuns,
  andList,
  centreOn,
  clampX,
  inMiddle,
  maxX,
  minimapBracket,
  minimapLetter,
  minimapToX,
  missionStops,
  missionTargets,
  missionUnitList,
  panMs,
  readout,
  stepX,
  stopOf,
  unitAtPanel,
  unitById,
  unitOfE,
  visibleRange,
  walkUnit,
  wallOf,
} from "../../src/web/app/explore/room.ts";
import { UNIT_PANELS, unitsForPlan } from "../../src/web/app/stage/roomplan.ts";

const mission = (id: string) => JSON.parse(readFileSync(new URL(`./mock/missions/${id}.json`, import.meta.url), "utf8"));

test("the room: 40 panels, 0-based, each on exactly one unit, as UX 14.3.1 (Stuart's vis/eniactk.go)", () => {
  const seen: string[] = [];
  for (const u of ROOM) for (let p = u.at; p < u.at + u.n; p++) seen[p] = u.id;
  assert.equal(seen.length, PANELS);
  assert.ok(seen.every(Boolean), "no gaps");
  assert.equal(ROOM.reduce((n, u) => n + u.n, 0), 40, "no overlaps");
  const at = (id: string) => [unitById(id)!.at, unitById(id)!.n];
  assert.deepEqual(at("init"), [0, 1]);
  assert.deepEqual(at("cyc"), [1, 1]);
  assert.deepEqual(at("mp"), [2, 2]);
  assert.deepEqual(at("ft1"), [4, 2]); // ftuoff[0] = 4
  assert.deepEqual(at("a1"), [6, 1]);
  assert.deepEqual(at("a2"), [7, 1]);
  assert.deepEqual(at("div"), [8, 1]);
  assert.deepEqual(at("a3"), [9, 1]);
  assert.deepEqual(at("a10"), [16, 1]); // the first panel of the back wall
  assert.deepEqual(at("mult"), [17, 3]);
  assert.deepEqual(at("a14"), [23, 1]);
  assert.deepEqual(at("a15"), [24, 1]); // the right wall starts
  assert.deepEqual(at("ft2"), [28, 2]); // ftuoff[1] = 28
  assert.deepEqual(at("ft3"), [30, 2]);
  assert.deepEqual(at("a19"), [32, 1]);
  assert.deepEqual(at("a20"), [33, 1]);
  assert.deepEqual(at("ct"), [34, 2]);
  assert.deepEqual(at("pr"), [36, 4]);
  assert.equal(ROOM.filter((u) => u.kind === "acc").length, 20);
  assert.equal(ROOM.filter((u) => u.kind === "ft").length, 3);
  assert.deepEqual([wallOf(15), wallOf(16), wallOf(23), wallOf(24)], ["left", "back", "back", "right"]);
  assert.equal(unitAtPanel(29).id, "ft2");
  assert.equal(unitOfE("f2")!.id, "ft2");
  assert.equal(unitOfE("c")!.id, "ct");
  assert.equal(unitOfE("ad"), undefined);
});

test("the room plan of the missions reads the same table (F12: 0-based, Function Table 1 at 4)", () => {
  assert.equal(UNIT_PANELS.i.panel, 0);
  assert.equal(UNIT_PANELS.f1.panel, 4);
  assert.equal(UNIT_PANELS.a1.panel, 6);
  assert.equal(UNIT_PANELS.c.panel, 34);
  assert.equal(UNIT_PANELS.m.panel, 18);
  assert.equal(UNIT_PANELS.pr.panel, 37);
  const marks = unitsForPlan(["a19"]);
  assert.deepEqual(marks.map((m) => m.panel), [32]);
});

test("position: clamping, centring, the visible range and the readout", () => {
  assert.equal(STRIP_W, 7360);
  assert.equal(maxX(), 6000);
  assert.equal(clampX(-50), 0);
  assert.equal(clampX(99_999), 6000);
  assert.deepEqual(visibleRange(0), [0, 7]);
  assert.deepEqual(readout(0), ["Initiating Unit", "Accumulator 2"]);
  assert.deepEqual(readout(maxX()), ["Accumulator 19", "Printer"]);
  // Centre the multiplier (17-19): its middle at 18.5 panels.
  assert.equal(centreOn(17, 3), Math.round(18.5 * PITCH - VIEW_W / 2));
  assert.equal(centreOn(0, 1), 0, "nearest legal position");
  assert.equal(centreOn(36, 4), 6000);
  // An arrow is 6 panels, clamped at the ends.
  assert.equal(stepX(0, 1), 6 * PITCH);
  assert.equal(stepX(0, -1), 0);
  assert.equal(stepX(5900, 1), 6000);
  // Pans: 450 ms a step, a long pan capped at 900 ms.
  assert.equal(panMs(0, 6 * PITCH), 450);
  assert.equal(panMs(0, 6000), 900);
  assert.equal(panMs(0, 100), 450);
  assert.equal(panMs(5, 5), 0);
  // The middle 60%: Accumulator 1 at x 0 is not (it is at 1104-1280 of a 1360 view).
  assert.equal(inMiddle({ at: 6, n: 1 }, 0), false);
  assert.equal(inMiddle({ at: 6, n: 1 }, centreOn(6, 1)), true);
});

test("minimap: letters on each unit's first panel, tap to centre, the bracket", () => {
  const letters = Array.from({ length: 40 }, (_, p) => minimapLetter(p));
  assert.deepEqual(letters.slice(0, 10), ["I", "C", "MP", "", "F", "", "A", "A", "÷", "A"]);
  assert.equal(letters[17], "×");
  assert.equal(letters[34], "CT");
  assert.equal(letters[36], "P");
  assert.equal(letters.filter((l) => l === "A").length, 20);
  assert.equal(minimapToX(0), 0);
  assert.equal(minimapToX(40 * 33), 6000);
  assert.equal(minimapToX(18.5 * 33), centreOn(17, 3));
  const b = minimapBracket(0);
  assert.equal(b.left, 0);
  assert.ok(Math.abs(b.width - (VIEW_W / PITCH) * 33) < 1e-9);
});

test("the walk: twelve stops in teaching order; any room target opens its stop", () => {
  assert.deepEqual([...STOPS], ["init", "cyc", "mp", "acc", "mult", "div", "ft", "pft", "ct", "pr", "dt", "pt"]);
  assert.equal(stopOf("a17"), "acc");
  assert.equal(stopOf("ft3"), "ft");
  assert.equal(stopOf("pft:ft1"), "pft");
  assert.equal(stopOf("dt"), "dt");
  assert.equal(stopOf("mult"), "mult");
  assert.equal(stopOf("nope"), null);
  assert.equal(walkUnit("acc")!.id, "a1");
  assert.equal(walkUnit("pft")!.id, "ft2");
  assert.equal(walkUnit("pt"), null);
});

test("missions: the units come from the compiled programs, never typed (UX 14.3.7)", () => {
  const sq = missionTargets(mission("squares").units);
  assert.deepEqual([...sq].sort(), ["a1", "a2", "ct", "dt", "init", "pt"]);
  const tr = missionTargets(mission("trajectory").units);
  assert.ok(tr.has("mult") && tr.has("ft2") && tr.has("mp") && tr.has("pr"));
  assert.ok(!tr.has("div") && !tr.has("ft3") && !tr.has("a3") && !tr.has("cyc"));
  assert.equal([...tr].filter((t) => /^a\d+$/.test(t)).length, 19);
  // sieve.e wires all three function tables (f2.A/B, f3.A/B and their program inputs).
  const pr = missionTargets(mission("primes").units);
  assert.ok(pr.has("ft1") && pr.has("ft2") && pr.has("ft3") && !pr.has("mult"));
  assert.ok(missionStops(tr).has("pft") && !missionStops(sq).has("pft"));
  assert.ok(!missionStops(tr).has("div") && !missionStops(tr).has("cyc"));
});

test("mission card text is built from the targets", () => {
  assert.equal(accRuns([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 19]), "1 to 14, and 19");
  assert.equal(accRuns([1, 2, ...Array.from({ length: 17 }, (_, i) => i + 4)]), "1, 2, and 4 to 20");
  assert.equal(accRuns([3]), "3");
  const sq = missionUnitList(missionTargets(mission("squares").units));
  assert.equal(sq.count, 4);
  assert.equal(andList(sq.names), "the Initiating Unit, the Constant Transmitter and Accumulators 1 and 2");
  const tr = missionUnitList(missionTargets(mission("trajectory").units));
  assert.equal(tr.count, 25);
  assert.equal(
    andList(tr.names),
    "the Initiating Unit, the Master Programmer, the High-Speed Multiplier, Function Table 2, the Constant Transmitter, the Printer and 19 accumulators: 1, 2, and 4 to 20",
  );
  const pr = missionUnitList(missionTargets(mission("primes").units));
  assert.equal(pr.count, 22);
  assert.ok(pr.names.includes("all three Function Tables"));
});
