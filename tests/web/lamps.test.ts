import { test } from "node:test";
import assert from "node:assert/strict";
import { accLamps, cycLamps, ctLamps, initLamps, lampUnit, unitLamps } from "../../src/web/app/lamps/derive.ts";
import { LampRenderer } from "../../src/web/app/lamps/render.ts";
import type { AccState, MachineState } from "../../src/web/app/protocol.ts";

const acc = (o: Partial<AccState> = {}): AccState => ({ sign: "P", digits: "0000000000", value: 0, carry: "0000000000", rep: 0, prog: "000000000000", ...o });
const m = (o: Partial<MachineState> = {}): MachineState => ({
  cycle: { pos: 0, mode: "C" },
  init: "000000000000000",
  acc: { "1": acc(), "2": acc() },
  ct: "0".repeat(30),
  ...o,
});

test("exactly one lit lamp per accumulator digit column, MSD first", () => {
  const lit = accLamps("2", m({ acc: { "2": acc({ digits: "0000000144", value: 144 }) } }));
  for (let d = 1; d <= 10; d++) {
    const col = [...lit].filter((id) => id.startsWith(`lamp:acc.2.d.${d}.`));
    assert.equal(col.length, 1, `column ${d}`);
  }
  assert.ok(lit.has("lamp:acc.2.d.8.1"));
  assert.ok(lit.has("lamp:acc.2.d.9.4"));
  assert.ok(lit.has("lamp:acc.2.d.10.4"));
  assert.ok(lit.has("lamp:acc.2.d.1.0"));
});

test("sign, carry, repeat and program lamps", () => {
  const lit = accLamps("1", m({ acc: { "1": acc({ sign: "M", carry: "0000000011", rep: 2, prog: "000001000001" }) } }));
  assert.ok(lit.has("lamp:acc.1.sign.M") && !lit.has("lamp:acc.1.sign.P"));
  assert.ok(lit.has("lamp:acc.1.carry.9") && lit.has("lamp:acc.1.carry.10") && !lit.has("lamp:acc.1.carry.1"));
  assert.ok(lit.has("lamp:acc.1.rep.2"));
  assert.ok(lit.has("lamp:acc.1.prog.6") && lit.has("lamp:acc.1.prog.12") && !lit.has("lamp:acc.1.prog.5"));
});

test("out-of-range values light nothing (never invented)", () => {
  const lit = accLamps("1", m({ acc: { "1": acc({ digits: "00000000x0", rep: 12 }) } }));
  assert.equal([...lit].filter((i) => i.includes(".d.10.")).length, 1);
  assert.equal([...lit].filter((i) => i.includes(".d.9.")).length, 0);
  assert.equal([...lit].filter((i) => i.includes(".rep.")).length, 0);
  assert.equal(accLamps("7", m()).size, 0, "missing unit");
});

test("cycling unit: pulse position, CCG 22-36, 10P on odd pos < 20", () => {
  const at = (pos: number) => cycLamps(m({ cycle: { pos, mode: "C" } }));
  assert.ok(at(0).has("lamp:cyc.pulse.0"));
  assert.ok(at(39).has("lamp:cyc.pulse.19"));
  assert.ok(at(7).has("lamp:cyc.pulse.3"));
  for (let p = 0; p < 40; p++) {
    assert.equal(at(p).has("lamp:cyc.ccg"), p >= 22 && p <= 36, `ccg @${p}`);
    assert.equal(at(p).has("lamp:cyc.tenp"), p < 20 && p % 2 === 1, `tenp @${p}`);
  }
  assert.equal(at(40).size, 0);
  assert.equal(at(-1).size, 0);
});

test("initiating unit bits map to named lamps (11 and 12 are unused)", () => {
  const lit = initLamps(m({ init: "100000100001111" }));
  assert.deepEqual([...lit].sort(), ["lamp:init.clear.1", "lamp:init.g66", "lamp:init.g69", "lamp:init.rdff"].sort());
  const all = initLamps(m({ init: "111111111111111" }));
  assert.equal(all.size, 13);
});

test("constant transmitter program lamps", () => {
  const ct = "0".repeat(25) + "1" + "0000";
  assert.deepEqual([...ctLamps(m({ ct }))], ["lamp:ct.26"]);
});

test("unit routing", () => {
  assert.equal(lampUnit("lamp:acc.12.d.3.4"), "acc.12");
  assert.equal(lampUnit("lamp:cyc.pulse.3"), "cyc");
  assert.equal(lampUnit("lamp:init.g66"), "init");
  assert.equal(lampUnit("lamp:ct.26"), "ct");
  assert.equal(unitLamps("mp", m()).size, 0);
});

// ---- renderer with a minimal fake DOM

class FakeEl {
  id: string;
  on = false;
  textContent = "";
  classList = { toggle: (_c: string, v: boolean) => (this.on = v) };
  constructor(id: string) {
    this.id = id;
  }
}

function fakeRoot(ids: string[]) {
  const els = ids.map((id) => new FakeEl(id));
  return {
    els,
    root: {
      querySelectorAll: (sel: string) => (sel.startsWith('[id^="lamp:"]') ? els.filter((e) => e.id.startsWith("lamp:")) : els.filter((e) => e.id === "ind:cyc.mode")),
    } as unknown as Element,
  };
}

test("renderer toggles only changed lamps and blanks when there is no machine", () => {
  (globalThis as any).requestAnimationFrame = () => 1;
  (globalThis as any).cancelAnimationFrame = () => {};
  const ids: string[] = ["ind:cyc.mode"];
  for (let d = 1; d <= 10; d++) for (let v = 0; v <= 9; v++) ids.push(`lamp:acc.1.d.${d}.${v}`);
  const { els, root } = fakeRoot(ids);
  let state: MachineState | null = m({ acc: { "1": acc({ digits: "0000000003" }) } });
  const r = new LampRenderer(root, () => state);
  r.flush();
  const lit = () => els.filter((e) => e.on).map((e) => e.id);
  assert.equal(lit().length, 10);
  assert.ok(lit().includes("lamp:acc.1.d.10.3"));
  assert.equal(els[0].textContent, "C");
  let toggles = 0;
  for (const e of els) {
    const orig = e.classList.toggle;
    e.classList.toggle = (c, v) => (toggles++, orig(c, v));
  }
  state = m({ acc: { "1": acc({ digits: "0000000004" }) } });
  r.invalidate(["acc.1"]);
  r.flush();
  assert.equal(toggles, 2, "only the changed column toggles");
  assert.ok(lit().includes("lamp:acc.1.d.10.4"));
  state = null;
  r.invalidate(null);
  r.flush();
  assert.equal(lit().length, 0, "no machine -> all dark");
  assert.equal(els[0].textContent, "-");
});
