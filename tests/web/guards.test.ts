import { test } from "node:test";
import assert from "node:assert/strict";
import { guard, installGuards, ALWAYS_BLOCK, type GuardEvent } from "../../src/web/app/ui/guards.ts";

function ev(type: string, extra: Partial<GuardEvent> = {}) {
  let prevented = false;
  const e: GuardEvent = { type, preventDefault: () => (prevented = true), ...extra };
  return { e, prevented: () => prevented };
}

test("context menu, selection, drag and gesture events are always blocked", () => {
  for (const t of ALWAYS_BLOCK) {
    const { e, prevented } = ev(t);
    assert.equal(guard(e), true, t);
    assert.equal(prevented(), true, t);
  }
});

test("second finger is blocked; any touchmove is blocked (no swipe or pull-to-refresh)", () => {
  const two = ev("touchstart", { touches: { length: 2 } });
  assert.equal(guard(two.e), true);
  const one = ev("touchstart", { touches: { length: 1 } });
  assert.equal(guard(one.e), false, "a single touch start must pass (fire on release)");
  const move = ev("touchmove", { touches: { length: 1 } });
  assert.equal(guard(move.e), true);
});

test("ctrl+wheel (trackpad pinch) and zoom/back shortcuts are blocked", () => {
  assert.equal(guard(ev("wheel", { ctrlKey: true }).e), true);
  assert.equal(guard(ev("wheel").e), false);
  assert.equal(guard(ev("keydown", { ctrlKey: true, key: "+" }).e), true);
  assert.equal(guard(ev("keydown", { altKey: true, key: "ArrowLeft" }).e), true);
  assert.equal(guard(ev("keydown", { key: "Backspace" }).e), true);
});

test("link navigation is blocked", () => {
  const target = { closest: (s: string) => (s === "a[href]" ? {} : null) };
  assert.equal(guard(ev("click", { target }).e), true);
  assert.equal(guard(ev("click", { target: { closest: () => null } }).e), false);
});

test("installGuards registers non-passive capture listeners", () => {
  const seen: [string, AddEventListenerOptions | undefined][] = [];
  installGuards({ addEventListener: (t, _fn, o) => seen.push([t, o]) });
  for (const t of ["contextmenu", "touchmove", "wheel", "gesturestart", "selectstart"]) {
    const hit = seen.find(([x]) => x === t);
    assert.ok(hit, t);
    assert.equal(hit![1]?.passive, false);
    assert.equal(hit![1]?.capture, true);
  }
});
