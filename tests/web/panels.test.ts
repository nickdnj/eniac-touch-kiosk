// #14: SVG kit <-> ID grammar <-> mission contract (architecture 11.3).
// Parses the committed panels/*.svg and asserts every M1 lamp ID and every
// Squares target and config endpoint exists. (Issue #14 asks for a Go test;
// src/bridge is owned by the bridge track, so this Node test covers it until
// the Go version is added there.)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { staleFiles } from "../../src/web/scripts/gen-panels.ts";
import { INIT_LAMPS, MP_JACKS, MP_STEPPERS, accumulatorPanel } from "../../src/web/app/panels/art.ts";
import { termId, switchId } from "../../src/web/app/mission/ids.ts";

const dir = join(import.meta.dirname, "..", "..", "src", "web", "panels");
const files = readdirSync(dir).filter((f) => f.endsWith(".svg"));
const idsIn = (f: string) => new Set([...readFileSync(join(dir, f), "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const all = new Set<string>();
for (const f of files) for (const id of idsIn(f)) all.add(id);

export function m1LampIds(): string[] {
  const ids: string[] = [];
  for (const n of [1, 2]) {
    for (let d = 1; d <= 10; d++) for (let v = 0; v <= 9; v++) ids.push(`lamp:acc.${n}.d.${d}.${v}`);
    ids.push(`lamp:acc.${n}.sign.P`, `lamp:acc.${n}.sign.M`);
    for (let d = 1; d <= 10; d++) ids.push(`lamp:acc.${n}.carry.${d}`);
    for (let v = 0; v <= 9; v++) ids.push(`lamp:acc.${n}.rep.${v}`);
    for (let p = 1; p <= 12; p++) ids.push(`lamp:acc.${n}.prog.${p}`);
  }
  for (let k = 0; k < 20; k++) ids.push(`lamp:cyc.pulse.${k}`);
  ids.push("lamp:cyc.ccg", "lamp:cyc.tenp", "ind:cyc.mode");
  for (const [name] of INIT_LAMPS) ids.push(`lamp:init.${name}`);
  for (let p = 1; p <= 30; p++) ids.push(`lamp:ct.${p}`);
  return ids;
}

test("panels/*.svg are up to date with app/panels/art.ts", () => {
  assert.deepEqual(staleFiles(), []);
});

test("every M1 lamp ID from architecture 6.1 exists", () => {
  const missing = m1LampIds().filter((id) => !all.has(id));
  assert.deepEqual(missing, []);
});

test("every Squares step target and config endpoint exists", () => {
  const mission = JSON.parse(readFileSync(join(import.meta.dirname, "mock", "missions", "squares.json"), "utf8"));
  const want = new Set<string>([
    "jack:c.o", "trunk:1", "jack:a1.α", "jack:a1.A", "jack:a2.β", "jack:i.io", "trunk:1-1", "jack:a2.6o", "trunk:1-3", "sw:c.j1", "sw:a1.rp6",
  ]);
  for (const c of mission.config) {
    if (c.kind === "plug") {
      want.add(termId(c.from));
      want.add(termId(c.to));
    } else want.add(switchId(c.switch));
  }
  const missing = [...want].filter((id) => !all.has(id));
  assert.deepEqual(missing, []);
});

test("accumulator panels are the same art for a1 and a2", () => {
  const a = readFileSync(join(dir, "accumulator-1.svg"), "utf8").replace(/acc\.1\.|a1\.|ACCUMULATOR 1|unit-a1/g, "X");
  const b = readFileSync(join(dir, "accumulator-2.svg"), "utf8").replace(/acc\.2\.|a2\.|ACCUMULATOR 2|unit-a2/g, "X");
  assert.equal(a, b);
});

test("lamps are at least 12 px (NFR-06): workbench 14 px, run view 26 px", () => {
  const radius = (f: string, id: string) => {
    const s = readFileSync(join(dir, f), "utf8");
    const i = s.indexOf(`id="${id}"`);
    return Number(/r="([\d.]+)"/.exec(s.slice(i))![1]);
  };
  assert.ok(radius("accumulator-1.svg", "lamp:acc.1.d.5.5") * 2 >= 14);
  assert.ok(radius("accumulator-run-1.svg", "lamp:acc.1.d.5.5") * 2 >= 26);
  assert.ok(radius("constant.svg", "lamp:ct.26") * 2 >= 14);
});

export function m2LampIds(): string[] {
  const ids: string[] = [];
  for (let S = 0; S < 10; S++) {
    for (let k = 0; k <= 5; k++) ids.push(`lamp:mp.s.${S}.${k}`);
    ids.push(`lamp:mp.s.${S}.in`);
  }
  for (let D = 0; D < 20; D++) for (let v = 0; v <= 9; v++) ids.push(`lamp:mp.dec.${D}.${v}`);
  for (let u = 1; u <= 3; u++) {
    for (let k = 0; k <= 12; k++) ids.push(`lamp:ft.${u}.ring.${k}`);
    ids.push(`lamp:ft.${u}.add`, `lamp:ft.${u}.sub`, `lamp:ft.${u}.argset`);
    for (let v = 0; v <= 9; v++) ids.push(`lamp:ft.${u}.arg10.${v}`, `lamp:ft.${u}.arg1.${v}`);
  }
  for (let k = 0; k <= 13; k++) ids.push(`lamp:mult.stage.${k}`);
  for (let p = 1; p <= 24; p++) ids.push(`lamp:mult.prog.${p}`);
  ids.push("lamp:mult.r1", "lamp:mult.r3");
  return ids;
}

test("every M2 lamp ID family (MP, function tables, multiplier) exists", () => {
  const missing = m2LampIds().filter((id) => !all.has(id));
  assert.deepEqual(missing, []);
});

test("every Primes step target exists in the kit", () => {
  const want = ["sw:c.k1", "jack:a1.12o", "trunk:1-7", "jack:p.Adi", "trunk:1-9", "jack:i.pi", "jack:i.po", "trunk:1-4"];
  assert.deepEqual(want.filter((id) => !all.has(id)), []);
});

test("every Trajectory step target exists (Acc 19 is the runtime accumulator card)", () => {
  const a19 = accumulatorPanel(19);
  const ids = new Set([...all, ...Object.keys(a19.geom.jacks), ...Object.keys(a19.geom.switches)]);
  const want = ["jack:i.ro", "trunk:1-2", "sw:pr.6", "trunk:2-5", "jack:i.pi", "jack:a19.5o", "trunk:1-4", "jack:p.Hi"];
  assert.deepEqual(want.filter((id) => !ids.has(id)), []);
  assert.ok(a19.markup.includes('id="jack:a19.5o"'));
  assert.ok(a19.markup.includes('id="lamp:acc.19.prog.5"'));
});

test("master programmer jacks: p.<X>i|di|cdi|<1-6>o for X in A..K without I", () => {
  assert.equal(MP_STEPPERS.join(""), "ABCDEFGHJK");
  const missing: string[] = [];
  for (const X of MP_STEPPERS) for (const j of MP_JACKS) if (!all.has(`jack:p.${X}${j}`)) missing.push(`jack:p.${X}${j}`);
  assert.deepEqual(missing, []);
  assert.ok(![...all].some((id) => id.startsWith("jack:p.I")), "there is no stepper I");
});

test("printer switches: fields pr.1..16 (0/P) and couplings (0/C)", () => {
  const s = readFileSync(join(dir, "printer.svg"), "utf8");
  for (let f = 1; f <= 16; f++) assert.ok(s.includes(`id="sw:pr.${f}" class="dial" data-positions="0|P"`), `pr.${f}`);
  for (let k = 1; k <= 15; k += 2) assert.ok(s.includes(`id="sw:pr.${k}-${k + 1}" class="dial" data-positions="0|C"`), `pr.${k}-${k + 1}`);
});

test("M2 run-view lamps are at least 12 px; MP workbench decades at least 8 px", () => {
  const radius = (f: string, id: string) => {
    const s = readFileSync(join(dir, f), "utf8");
    const i = s.indexOf(`id="${id}"`);
    return Number(/r="([\d.]+)"/.exec(s.slice(i))![1]);
  };
  assert.ok(radius("ft-ring-2.svg", "lamp:ft.2.ring.4") * 2 >= 12);
  assert.ok(radius("multiplier-strip.svg", "lamp:mult.stage.3") * 2 >= 12);
  assert.ok(radius("multiplier-strip.svg", "lamp:mult.prog.3") * 2 >= 12);
  assert.ok(radius("mp-strip.svg", "lamp:mp.s.7.2") * 2 >= 12);
  assert.ok(radius("master-programmer.svg", "lamp:mp.s.7.2") * 2 >= 12);
  assert.ok(radius("master-programmer.svg", "lamp:mp.dec.3.4") * 2 >= 8);
});

test("accumulator lamp grids run 0 at the bottom and 9 at the top, in every drawing (Stuart and Crawford, 2026-10-11)", () => {
  for (const f of ["accumulator-1.svg", "accumulator-2.svg", "accumulator-compact-1.svg", "accumulator-run-1.svg", "accumulator-run-2.svg"]) {
    const y = new Map<number, number>();
    const svg = readFileSync(join(dir, f), "utf8");
    for (const m of svg.matchAll(/id="lamp:acc\.\d+\.d\.1\.(\d)"[^>]*>\s*<circle[^>]*cy="([\d.]+)"/g)) y.set(Number(m[1]), Number(m[2]));
    assert.equal(y.size, 10, `${f}: ten lamps in the first digit column`);
    for (let d = 0; d < 9; d++) assert.ok(y.get(d + 1)! < y.get(d)!, `${f}: digit ${d + 1} is above digit ${d}`);
  }
});
