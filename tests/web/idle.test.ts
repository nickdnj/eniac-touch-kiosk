// IDLE-01..04 logic with a fake clock (test plan section 5).

import { test } from "node:test";
import assert from "node:assert/strict";
import { IdleTimer, PAUSE_CAP_MS } from "../../src/web/app/idle.ts";
import { FakeClock } from "./fakes.ts";

function mk() {
  const clock = new FakeClock();
  const ev: string[] = [];
  const t = new IdleTimer(clock, {
    onWarn: (s) => ev.push(`warn:${s}`),
    onTick: (s) => ev.push(`tick:${s}`),
    onDismiss: () => ev.push("dismiss"),
    onExpire: () => ev.push("expire"),
  });
  t.setConfig({ setupS: 90, runS: 180, countdownS: 15, exploreS: 120 });
  return { clock, ev, t };
}

test("setup: overlay at 90 s, countdown 15 to 1, then expire at 105 s", () => {
  const { clock, ev, t } = mk();
  t.setMode("setup");
  clock.advance(89_999);
  assert.deepEqual(ev, []);
  clock.advance(1);
  assert.deepEqual(ev, ["warn:15"]);
  clock.advance(14_000);
  assert.equal(ev.at(-1), "tick:1");
  assert.equal(ev.filter((e: string) => e.startsWith("tick")).length, 14);
  clock.advance(1000);
  assert.equal(ev.at(-1), "expire");
  assert.equal(t.mode, "none");
  clock.advance(1_000_000);
  assert.equal(ev.filter((e: string) => e === "expire").length, 1, "expires once");
});

test("run view: overlay at 180 s", () => {
  const { clock, ev, t } = mk();
  t.setMode("run");
  clock.advance(179_000);
  assert.deepEqual(ev, []);
  clock.advance(1000);
  assert.deepEqual(ev, ["warn:15"]);
});

test("any touch resets the timer; a touch on the overlay dismisses it and restores the full timeout", () => {
  const { clock, ev, t } = mk();
  t.setMode("setup");
  clock.advance(80_000);
  t.touch();
  clock.advance(80_000);
  assert.deepEqual(ev, [], "reset by the touch at 80 s");
  clock.advance(10_000);
  assert.deepEqual(ev, ["warn:15"]);
  clock.advance(5000);
  t.touch();
  assert.equal(ev.at(-1), "dismiss");
  clock.advance(89_000);
  assert.equal(ev.filter((e: string) => e.startsWith("warn")).length, 1);
  clock.advance(1000);
  assert.equal(ev.filter((e: string) => e.startsWith("warn")).length, 2);
});

test("S1 and other none-screens never time out", () => {
  const { clock, ev, t } = mk();
  t.setMode("none");
  clock.advance(3_600_000);
  t.touch();
  clock.advance(3_600_000);
  assert.deepEqual(ev, []);
});

test("Tell me more pauses the timer, for at most 2 minutes", () => {
  const { clock, ev, t } = mk();
  t.setMode("setup");
  clock.advance(60_000);
  t.pause();
  clock.advance(PAUSE_CAP_MS - 1000);
  assert.deepEqual(ev, [], "paused");
  clock.advance(1000); // cap reached: resumes with a full timeout
  assert.equal(t.paused, false);
  clock.advance(89_999);
  assert.deepEqual(ev, []);
  clock.advance(1);
  assert.deepEqual(ev, ["warn:15"]);
});

test("closing Tell me more restarts the full timeout", () => {
  const { clock, ev, t } = mk();
  t.setMode("setup");
  clock.advance(80_000);
  t.pause();
  clock.advance(30_000);
  t.resume();
  clock.advance(89_000);
  assert.deepEqual(ev, []);
});

test("switching to a none-screen while warning dismisses the overlay", () => {
  const { clock, ev, t } = mk();
  t.setMode("setup");
  clock.advance(90_000);
  t.setMode("none");
  assert.deepEqual(ev, ["warn:15", "dismiss"]);
  clock.advance(60_000);
  assert.ok(!ev.includes("expire"));
});

test("hello.config values are used", () => {
  const { clock, ev, t } = mk();
  t.setConfig({ setupS: 6, runS: 9, countdownS: 3, exploreS: 12 });
  t.setMode("setup");
  clock.advance(6000);
  assert.deepEqual(ev, ["warn:3"]);
  clock.advance(3000);
  assert.equal(ev.at(-1), "expire");
});

test("Explore ENIAC: 120 s (exploreS), longer than the picker's 90 s (FR-32 v0.4)", () => {
  const { clock, ev, t } = mk();
  t.setMode("explore");
  clock.advance(90_000);
  assert.deepEqual(ev, [], "no warning at the setup timeout");
  clock.advance(30_000);
  assert.deepEqual(ev, ["warn:15"]);
  const b = mk();
  b.t.setConfig({ setupS: 6, runS: 9, countdownS: 3, exploreS: 12 });
  b.t.setMode("explore");
  b.clock.advance(11_999);
  assert.deepEqual(b.ev, []);
  b.clock.advance(1);
  assert.deepEqual(b.ev, ["warn:3"]);
});
