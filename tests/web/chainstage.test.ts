// The chain stage's big numbers wait for a settled accumulator: mid-addition
// the real machine's digits are not a number (4444444411), so the readout keeps
// the last settled value while a program or carry lamp is lit.

import { test } from "node:test";
import assert from "node:assert/strict";
import { settledValue } from "../../src/web/app/run/chainstage.ts";

const acc = (value: number, prog = "000000000000", carry = "0000000000") => ({ value, prog, carry });

test("an idle accumulator reports its value", () => {
  assert.equal(settledValue(acc(-527)), -527);
  assert.equal(settledValue(acc(0)), 0);
});

test("a program lamp or a carry lamp lit means mid-addition: no value", () => {
  assert.equal(settledValue(acc(4444444411, "000010000000")), null);
  assert.equal(settledValue(acc(3333333339, "000000000000", "0000100000")), null);
});

test("no accumulator state, no value", () => {
  assert.equal(settledValue(undefined), null);
});
