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
import { INIT_LAMPS } from "../../src/web/app/panels/art.ts";
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
