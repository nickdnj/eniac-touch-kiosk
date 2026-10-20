// The Difference plan figure's numbers come from the method of differences,
// not from typed-in rows (src/web/app/stage/diffig.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { differenceTable, DIFF_START } from "../../src/web/app/stage/diffig.ts";

test("the table is built by adding down the chain: the cubes, only climbing", () => {
  assert.deepEqual(differenceTable(5), [
    [0, 1, 6, 6],
    [1, 7, 12, 6],
    [8, 19, 18, 6],
    [27, 37, 24, 6],
    [64, 61, 30, 6],
  ]);
});

test("every f is x cubed, every change is positive, and the start matches the mission's program", () => {
  differenceTable(12).forEach((r, x) => {
    assert.equal(r[0], x ** 3, `x=${x}`);
    assert.ok(r[1] > 0 && r[2] > 0 && r[3] > 0, `x=${x}: every change is positive, so every step is an addition`);
  });
  assert.deepEqual([...DIFF_START], [0, 1, 6, 6]);
});
