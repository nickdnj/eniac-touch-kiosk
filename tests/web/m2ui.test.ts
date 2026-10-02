// M2 UI logic (pure parts): the Primes "sharing evenly" figures, the
// per-mission Workbench, generated close-up clusters, the room plan's
// grouped markers and the M2 caption triggers.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { otherUnits } from "./fakes.ts";
import { briefAt, briefingBeats, fits, groupsLayout, planAt, planBeats, punchedBy, shareLayout, BRIEF_LOOP_MS, PLAN_LOOP_MS } from "../../src/web/app/stage/primesfig.ts";
import { workbenchPlan } from "../../src/web/app/stage/workbench.ts";
import { choiceLabel, dialClusterFor, jackClusterFor, plainLabel } from "../../src/web/app/stage/clusters.ts";
import { markerHas, unitsForPlan } from "../../src/web/app/stage/roomplan.ts";
import { CaptionTracker } from "../../src/web/app/run/captions.ts";
import { toView } from "../../src/web/app/mission/view.ts";
import { stepTargets } from "../../src/web/app/mission/runner.ts";
import type { MachineState, MissionCompiled } from "../../src/web/app/protocol.ts";

const load = (id: string): MissionCompiled => JSON.parse(readFileSync(join(import.meta.dirname, "mock", "missions", `${id}.json`), "utf8"));
const primes = load("primes");
const squares = load("squares");

test("sharing evenly: 12 in 3 groups of 4 fits; 7 always leaves one over", () => {
  const twelve = groupsLayout(12, 3);
  assert.equal(twelve.length, 12);
  assert.equal(twelve.filter((s) => s.left).length, 0);
  assert.deepEqual([...new Set(twelve.map((s) => s.r))], [0, 1, 2]);
  for (const g of [2, 3]) {
    const seven = groupsLayout(7, g);
    assert.equal(seven.filter((s) => s.left).length, 1, `7 in ${g} groups`);
  }
  // Leftovers hang over the last row in the briefing, sit in a row of their own in the checkers.
  assert.deepEqual(shareLayout(7, 3).find((s) => s.left), { r: 1, c: 3, left: true });
  assert.deepEqual(shareLayout(11, 7, false).filter((s) => s.left).map((s) => s.r), [1, 1, 1, 1]);
  assert.ok(fits(9, 3) && !fits(9, 5) && fits(15, 5) && !fits(11, 3));
});

test("briefing beats follow UX 8.2.3 in order and loop after about 11 s", () => {
  const b = briefingBeats();
  assert.deepEqual(b.map((x) => x.at), [300, 1500, 4000, 5200, 6600, 8200]);
  assert.deepEqual(b.map((x) => x.badge), [null, "fits", null, "x", "x", "prime"]);
  assert.equal(briefAt(b, 5300)?.caption, "2 groups: 1 left over");
  assert.equal(briefAt(b, 9000)?.caption, "7 won't split evenly. Prime!");
  assert.equal(briefAt(b, 100), null);
  assert.ok(BRIEF_LOOP_MS >= 10_000 && BRIEF_LOOP_MS <= 12_000);
});

test("plan beats: 9 out, 11 prime (punched), 15 out, then the math line; loops after about 13 s", () => {
  const p = planBeats();
  assert.equal(planAt(p, 2700)?.fate, "out");
  assert.equal(planAt(p, 5700)?.fate, "prime");
  assert.equal(planAt(p, 5700)?.n, 11);
  assert.equal(planAt(p, 8000)?.n, 15);
  assert.equal(planAt(p, 9999)?.math, false);
  assert.equal(planAt(p, 10_000)?.math, true);
  assert.deepEqual(punchedBy(p, 5000), []);
  assert.deepEqual(punchedBy(p, 12_000), [11]);
  assert.ok(PLAN_LOOP_MS >= 12_000 && PLAN_LOOP_MS <= 14_000);
});

test("workbench: Squares keeps its four cards and rails; Primes shows Init, Constant, Acc 1, Master Programmer", () => {
  const sq = workbenchPlan(toView(squares));
  assert.deepEqual(sq.units, ["i", "c", "a1", "a2"]);
  assert.deepEqual(sq.data, ["1", "2", "3"]);
  assert.deepEqual(sq.program, ["1-1", "1-2", "1-3", "1-4", "1-5"]);
  const pr = workbenchPlan(toView(primes));
  assert.deepEqual(pr.units, ["i", "c", "a1", "p"]);
  for (const t of ["1-4", "1-7", "1-9"]) assert.ok(pr.program.includes(t), `program rail has step trunk ${t}`);
  assert.ok(pr.program.length <= 7 && pr.data.length <= 4);
});

test("every Primes step target has a close-up cluster that holds it, with real neighbours", () => {
  for (const st of toView(primes).steps) {
    for (const id of stepTargets(st)) {
      if (id.startsWith("sw:")) {
        const c = dialClusterFor(id);
        assert.ok(c && c.dials.some((d) => d.id === id), id);
        assert.ok(c!.dials.length >= 4, `${id} has decoys`);
      } else {
        const c = jackClusterFor(id);
        assert.ok(c && c.jacks.some((j) => j.id === id), id);
        assert.ok(c!.jacks.length >= 3, `${id} has decoys`);
      }
    }
  }
  assert.deepEqual(jackClusterFor("jack:p.Adi")!.jacks.map((j) => j.id), ["jack:p.Ai", "jack:p.Adi", "jack:p.Acdi", "jack:p.A1o", "jack:p.A2o", "jack:p.A3o"]);
  assert.deepEqual(jackClusterFor("trunk:1-9")!.jacks.map((j) => j.id), ["trunk:1-7", "trunk:1-8", "trunk:1-9", "trunk:1-10", "trunk:1-11"]);
  assert.ok(jackClusterFor("jack:a19.5o")!.jacks.some((j) => j.id === "jack:a19.6o"), "6 out is the landing decoy (Trajectory)");
  assert.equal(dialClusterFor("sw:pr.6")!.family, "printer");
  assert.equal(choiceLabel("sw:pr.6", "pr.field", "P"), "Punch");
  assert.equal(choiceLabel("sw:pr.6", "pr.field", "0"), "Leave blank");
  assert.equal(plainLabel("jack:p.Adi"), "Master Programmer A DI");
  assert.equal(plainLabel("jack:i.pi"), "Initiating Unit PI (punch start)");
  assert.equal(plainLabel("sw:c.k1"), "K constant, digit 1");
});

test("room plan: Primes groups Accumulators 1 to 14 and the function tables; Squares is unchanged", () => {
  const sq = unitsForPlan(["i", "c", "a1", "a2", "trunks"]);
  assert.deepEqual(sq.map((u) => [u.id, u.panel]), [["i", 0], ["c", 34], ["a1", 6], ["a2", 7]]);
  const pr = unitsForPlan(toView(primes).units);
  const labels = pr.map((u) => u.label);
  assert.ok(labels.includes("Accumulators 1 to 14"));
  assert.ok(labels.includes("Function Tables"));
  assert.ok(labels.includes("Master Programmer"));
  assert.ok(markerHas("a1-14", "a7") && !markerHas("a1-14", "a19") && markerHas("ft", "f2"));
});

const machine = (o: Partial<MachineState> = {}): MachineState => ({
  ...otherUnits(),
  cycle: { pos: 0, mode: "C" },
  init: "000000000000000",
  acc: {},
  ct: "0".repeat(30),
  ...o,
});

test("Primes captions: busy, first card, the groups-of-3 checker's call, five cards; in order", () => {
  const c = new CaptionTracker(primes.content.run);
  c.onPress();
  assert.equal(c.prompt(true), "Watch the checkers");
  assert.equal(c.onRun("busy", machine()), "ENIAC gives each checker its group size.");
  const facts = (count: number) => ({ count, apex: false, landed: false });
  assert.equal(c.onCards(machine(), facts(1)), "3 won't split into equal groups. Nothing fits, so ENIAC punched a card.");
  const a1fits = machine({ acc: { "1": { sign: "P", digits: "0000000000", value: 0, carry: "0000000000", rep: 0, prog: "000000000001" } } });
  assert.equal(c.onMachine(a1fits), "9 splits into 3 groups of 3, so no card.");
  assert.equal(c.onCards(machine(), facts(4)), null);
  assert.equal(c.onCards(machine(), facts(5)), "Only primes get a card. Watch them pile up.");
});

test("M2 triggers: acc value, init lamp and derived events", () => {
  const c = new CaptionTracker(squares.content.run);
  c.begin([
    { text: "reader", trigger: { init: "rdff" } },
    { text: "card read", trigger: { acc: { acc: "1", eq: 97367 } } },
    { text: "apex", trigger: { derived: "apex" } },
    { text: "landed", trigger: { derived: "landed" } },
  ]);
  assert.equal(c.onMachine(machine({ init: "000000100000000" })), "reader");
  assert.equal(c.onMachine(machine({ acc: { "1": { sign: "P", digits: "0000097367", value: 97367, carry: "0000000000", rep: 0, prog: "000000000000" } } })), "card read");
  assert.equal(c.onCards(null, { count: 17, apex: true, landed: false }), "apex");
  assert.equal(c.onCards(null, { count: 34, apex: true, landed: true }), "landed");
});

test("S5 timeline: Squares unchanged (about 4 s); large presets in waves and blocks within 8 s", async () => {
  const { restPlan } = await import("../../src/web/app/screens/mission.ts");
  const sq = restPlan(8, 10);
  assert.equal(sq.total, 4000);
  assert.equal(sq.cableAt(7), 1750);
  assert.equal(sq.switchAt(0), 2200);
  for (const [n, m] of [[264, 285], [293, 1147]]) {
    const p = restPlan(n, m);
    assert.ok(p.total <= 8000, `${n}/${m}: ${p.total} ms`);
    assert.equal(new Set(Array.from({ length: n }, (_, i) => p.cableAt(i))).size, 8, "8 waves of cables");
    assert.equal(new Set(Array.from({ length: m }, (_, i) => p.switchAt(i))).size, 8, "8 blocks of dials");
    assert.equal(p.cablesBy(p.total), n);
    assert.equal(p.switchesBy(p.total), m);
    assert.equal(p.switchesBy(0), 0);
  }
});
