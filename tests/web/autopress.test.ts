import { test } from "node:test";
import assert from "node:assert/strict";
import { AutoPress, type StopReason } from "../../src/web/app/run/autopress.ts";
import { FakeClock } from "./fakes.ts";

/** A fake bridge: each press is busy for `runMs`, then idle with x+1, (x+1)^2. */
function rig(opts: { runMs?: number; dropIdleAt?: number; answerAt?: number } = {}) {
  const clock = new FakeClock();
  let x = 0;
  let busy = false;
  let presses = 0;
  let doublePress = false;
  const stops: StopReason[] = [];
  const auto: AutoPress = new AutoPress({
    clock,
    gapMs: () => 100,
    watchdogMs: 2000,
    answerCheckpoint: "answer",
    press: () => {
      if (busy) doublePress = true;
      presses++;
      busy = true;
      clock.setTimeout(() => auto.onRun({ state: "busy", inits: presses }), 5);
      clock.setTimeout(() => {
        busy = false;
        x++;
        if (presses === opts.dropIdleAt) return; // the idle event is lost
        auto.onRun({ state: "idle", inits: presses, settled: { 1: x, 2: x * x } });
        if (x === (opts.answerAt ?? 12)) auto.onCheckpoint("answer");
      }, opts.runMs ?? 300);
      return true;
    },
    onStop: (r) => stops.push(r),
  });
  return { clock, auto, stops, presses: () => presses, x: () => x, doublePress: () => doublePress };
}

test("presses until the answer checkpoint (x = 12) and stops", () => {
  const r = rig();
  r.auto.start();
  r.clock.advance(60_000);
  assert.equal(r.presses(), 12);
  assert.equal(r.x(), 12);
  assert.deepEqual(r.stops, ["answer"]);
  assert.equal(r.doublePress(), false);
});

test("never presses while busy, even with a zero gap", () => {
  const r = rig({ runMs: 900 });
  r.auto.start();
  r.clock.advance(3000);
  assert.equal(r.doublePress(), false);
});

test("survives a dropped run event via the watchdog", () => {
  const r = rig({ dropIdleAt: 3 });
  r.auto.start();
  r.clock.advance(60_000);
  assert.equal(r.x(), 12);
  assert.deepEqual(r.stops, ["answer"]);
});

test("Stop, session end or fault stop the loop immediately", () => {
  const r = rig();
  r.auto.start();
  r.clock.advance(1000);
  r.auto.stop("user");
  const n = r.presses();
  r.clock.advance(10_000);
  assert.equal(r.presses(), n);
  assert.deepEqual(r.stops, ["user"]);
});

test("after the answer, start() stops at once; rearm() allows a new table", () => {
  const r = rig({ answerAt: 2 });
  r.auto.start();
  r.clock.advance(10_000);
  assert.deepEqual(r.stops, ["answer"]);
  r.auto.start();
  r.clock.advance(10);
  assert.deepEqual(r.stops, ["answer", "answer"]);
  r.auto.rearm();
  r.auto.start();
  r.clock.advance(1000);
  assert.ok(r.presses() > 2);
});
