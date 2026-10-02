// The panorama's panel art and its lamps (explore/panorama.ts, panels/roomart.ts):
// every lamp the core can report for every unit in the room has a node to
// light, every lamp node belongs to a reported lamp set (nothing decorative
// can look lit), and the markup is CSP-safe (no inline styles).

import { test } from "node:test";
import assert from "node:assert/strict";
import { unitPanels } from "../../src/web/app/explore/panorama.ts";
import { ROOM } from "../../src/web/app/explore/room.ts";
import { lampUnit, unitLamps } from "../../src/web/app/lamps/derive.ts";
import { planSvg } from "../../src/web/app/explore/plan.ts";
import type { MachineState } from "../../src/web/app/protocol.ts";

const markup = ROOM.flatMap((u) => unitPanels(u)).join("");
const ids = new Set([...markup.matchAll(/id="(lamp:[^"]+)"/g)].map((m) => m[1]));

/** Every lamp a machine state can light, by brute force over the value ranges the core reports. */
function everyLamp(): Set<string> {
  const out = new Set<string>();
  const add = (units: string[], m: MachineState) => units.forEach((u) => unitLamps(u, m).forEach((id) => out.add(id)));
  const accUnits = Array.from({ length: 20 }, (_, i) => `acc.${i + 1}`);
  for (let v = 0; v <= 9; v++) {
    const acc: MachineState["acc"] = {};
    for (let n = 1; n <= 20; n++) acc[String(n)] = { sign: v % 2 ? "M" : "P", digits: String(v).repeat(10), value: 0, carry: "1111111111", rep: v, prog: "111111111111" };
    const ft: MachineState["ft"] = {};
    for (let n = 1; n <= 3; n++) ft[String(n)] = { arg: `${v}${v}`, ring: v - 3, add: 1, sub: 1, argff: 1 };
    const m: MachineState = {
      cycle: { pos: v * 4, mode: "C" },
      init: "111111111111111",
      acc,
      mp: { stage: String(v % 6).repeat(10), dec: String(v).repeat(20), inff: "1".repeat(10) },
      ft,
      ct: "1".repeat(30),
      mult: { stage: v, ff: "1".repeat(24), r1: 1, r3: 1 },
      div: { place: v, prog: v, progff: "11111111", flags: "1".repeat(30) },
    };
    add([...accUnits, "cyc", "init", "mp", "ft", "ct", "mult", "div"], m);
    // The upper ends of the rings.
    add(["mult", "div", "cyc"], { ...m, mult: { ...m.mult, stage: 13 - v }, div: { ...m.div, place: 11 - v }, cycle: { pos: 39 - v * 4, mode: "C" } });
  }
  // Function table rings run -3 to 9 (13 stages, K = ring + 3).
  for (let ring = -3; ring <= 9; ring++) {
    const f = { arg: "00", ring, add: 0, sub: 0, argff: 0 };
    unitLamps("ft", { ft: { 1: f, 2: f, 3: f } } as unknown as MachineState).forEach((id) => out.add(id));
  }
  return out;
}

test("every lamp the core reports, for all 20 accumulators, 3 function tables and every other unit, is drawn", () => {
  const reportable = everyLamp();
  assert.ok(reportable.size > 3000, `${reportable.size} lamps`);
  const missing = [...reportable].filter((id) => !ids.has(id));
  assert.deepEqual(missing, []);
});

test("every lamp drawn belongs to a lamp set the core reports (no decorative lamp can light)", () => {
  const reportable = everyLamp();
  const orphan = [...ids].filter((id) => !reportable.has(id));
  assert.deepEqual(orphan, []);
  assert.deepEqual([...new Set([...ids].map(lampUnit).map((u) => (u.startsWith("acc.") ? "acc" : u)))].sort(), ["acc", "ct", "cyc", "div", "ft", "init", "mp", "mult"]);
});

test("the panels: one SVG per panel, at the kit's 300 x 680; CSP-safe (no inline style attributes)", () => {
  for (const u of ROOM) {
    const p = unitPanels(u);
    assert.equal(p.length, u.n, u.id);
    for (const svg of p) assert.match(svg, /viewBox="0 0 300 680"/);
  }
  assert.doesNotMatch(markup, /\sstyle="/);
  assert.doesNotMatch(planSvg({ visible: [0, 7] }), /\sstyle="/);
});
