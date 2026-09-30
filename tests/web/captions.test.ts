import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CaptionTracker, fill } from "../../src/web/app/run/captions.ts";
import type { CompiledMission, MachineState } from "../../src/web/app/protocol.ts";

const mission: CompiledMission = JSON.parse(readFileSync(join(import.meta.dirname, "mock", "missions", "squares.json"), "utf8"));
const run = mission.screens!.run;

const m = (a1prog = "000000000000", ct = "0".repeat(30)): MachineState => ({
  cycle: { pos: 0, mode: "C" },
  init: "000000000000000",
  acc: { "1": { sign: "P", digits: "0000000000", value: 0, carry: "0000000000", rep: 0, prog: a1prog } },
  ct,
});
const P6 = "000001000000";
const CT26 = "0".repeat(25) + "1" + "0000";

test("fill substitutes known vars and leaves unknown ones", () => {
  assert.equal(fill("{1} x {1} = {2} {z}", { 1: 3, 2: 9 }), "3 x 3 = 9 {z}");
});

test("beats fire in order on real lamp changes, never on a timer", () => {
  const c = new CaptionTracker(run);
  assert.equal(c.prompt(false), "Press INIT");
  c.onPress({ 1: 0, 2: 0 });
  assert.equal(c.prompt(true), "Watch the lamps");
  assert.equal(c.onMachine(m()), null, "nothing lit yet");
  assert.equal(c.onMachine(m(P6)), "Accumulator 1 sends its number: 0, twice.");
  assert.equal(c.onMachine(m(P6)), null, "fires once");
  assert.equal(c.onMachine(m("000000000000", CT26)), "Now everyone adds 1.");
  assert.equal(c.onIdle(m(), { 1: 1, 2: 1 }), "1 x 1 = 1");
  assert.equal(c.prompt(false), "Press INIT again");
});

test("a beat missed at speed is skipped, but later beats still fire", () => {
  const c = new CaptionTracker(run);
  c.onPress({ 1: 1, 2: 1 });
  c.onPress({ 1: 2, 2: 4 });
  assert.equal(c.onMachine(m("000000000000", CT26)), "Now add 1.");
  assert.equal(c.onMachine(m(P6)), null, "no going back");
  assert.equal(c.onIdle(m(), { 1: 3, 2: 9 }), "3 x 3 = 9");
});

test("after the scripted presses captions stop; CLEAR restarts the script", () => {
  const c = new CaptionTracker(run);
  for (let i = 0; i < 4; i++) c.onPress({ 1: i, 2: i * i });
  assert.equal(c.onMachine(m(P6)), null);
  assert.equal(c.prompt(false), "Keep going!");
  c.onClear();
  assert.equal(c.prompt(false), "Press INIT");
});
