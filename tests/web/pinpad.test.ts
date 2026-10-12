// S12 PIN entry (UX 7.11; docs/original-ui-switch.md 6.7, 8).

import { test } from "node:test";
import assert from "node:assert/strict";
import { PinEntry, PIN_MAX, PIN_MIN } from "../../src/web/app/admin/pinpad.ts";

test("OK is disabled under 4 digits and enabled from 4 to 8", () => {
  const p = new PinEntry();
  assert.equal(PIN_MIN, 4);
  for (const d of "246") {
    p.press(d);
    assert.equal(p.canSubmit, false);
  }
  p.press("8");
  assert.equal(p.canSubmit, true, "a 4-digit PIN (the museum's) can be sent");
  assert.equal(p.value, "2468");
});

test("at most 8 digits", () => {
  const p = new PinEntry();
  for (const d of "1234567890") p.press(d);
  assert.equal(p.length, PIN_MAX);
  assert.equal(p.value, "12345678");
  assert.equal(p.press("9"), false);
});

test("Clear empties; only digits are accepted", () => {
  const p = new PinEntry();
  p.press("1");
  assert.equal(p.press("a"), false);
  assert.equal(p.press("12"), false);
  p.clear();
  assert.equal(p.value, "");
  assert.equal(p.canSubmit, false);
});

test("take() hands the PIN over once and forgets it", () => {
  const p = new PinEntry();
  for (const d of "2468") p.press(d);
  assert.equal(p.take(), "2468");
  assert.equal(p.value, "");
});
