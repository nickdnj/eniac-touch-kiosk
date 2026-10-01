import { test } from "node:test";
import assert from "node:assert/strict";
import { otherUnits } from "./fakes.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CaptionTracker, fill, settledVars } from "../../src/web/app/run/captions.ts";
import type { MachineState, MissionCompiled } from "../../src/web/app/protocol.ts";

const mission: MissionCompiled = JSON.parse(readFileSync(join(import.meta.dirname, "mock", "missions", "squares.json"), "utf8"));
const run = mission.content.run;

const m = (a1prog = "000000000000"): MachineState => ({
  ...otherUnits(),
  cycle: { pos: 0, mode: "C" },
  init: "000000000000000",
  acc: { "1": { sign: "P", digits: "0000000000", value: 0, carry: "0000000000", rep: 0, prog: a1prog } },
  ct: "0".repeat(30),
});
const P6 = "000001000000";
const P5 = "000010000000";

test("fill and settledVars: {a1} x {a1} = {a2}", () => {
  assert.equal(fill(run.tape ?? "", settledVars({ 1: 3, 2: 9 })), "3 x 3 = 9");
  assert.equal(fill("{a1} {zz}", { a1: 1 }), "1 {zz}");
});

test("headlines: before, while running, and after each press", () => {
  const c = new CaptionTracker(run);
  assert.equal(c.prompt(false), "Press INIT");
  assert.equal(c.sub(), "INIT is the Initiating Pulse, ENIAC's GO button.");
  c.onPress();
  assert.equal(c.prompt(true), "Watch the lamps");
  assert.equal(c.sub(), "");
  assert.equal(c.prompt(false), "Press INIT again");
  c.onPress();
  assert.equal(c.prompt(false), "Again!");
  c.onPress();
  c.onPress();
  assert.equal(c.prompt(false), "Again!", "later presses keep the last headline");
});

test("beats fire in order on real lamp changes and the run event, never on a timer", () => {
  const c = new CaptionTracker(run);
  c.onPress();
  assert.equal(c.onRun("busy", m()), null);
  assert.equal(c.onMachine(m()), null, "nothing lit yet");
  assert.equal(c.onMachine(m(P6)), "Accumulator 1 sends its number: 0, twice.");
  assert.equal(c.onMachine(m(P6)), null, "fires once");
  assert.equal(c.onMachine(m(P5)), "Now everyone adds 1.");
  assert.equal(c.onRun("idle", m(), { 1: 1, 2: 1 }), "1 x 1 = 1");
});

test("a beat missed at speed is skipped, but later beats still fire; never backwards", () => {
  const c = new CaptionTracker(run);
  c.onPress();
  c.onPress();
  assert.equal(c.onMachine(m(P5)), "Now add 1.");
  assert.equal(c.onMachine(m(P6)), null, "no going back");
  assert.equal(c.onRun("idle", m(), { 1: 2, 2: 4 }), "2 x 2 = 4");
});

test("after the scripted presses captions stop; CLEAR restarts the script", () => {
  const c = new CaptionTracker(run);
  for (let i = 0; i < 4; i++) c.onPress();
  assert.equal(c.onMachine(m(P6)), null);
  c.onClear();
  assert.equal(c.prompt(false), "Press INIT");
  c.onPress();
  assert.equal(c.onMachine(m(P6)), "Accumulator 1 sends its number: 0, twice.");
});
