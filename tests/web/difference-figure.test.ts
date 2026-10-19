// The Difference plan figure's numbers come from the method of differences,
// not from typed-in rows (src/web/app/stage/diffig.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { differenceTable, DIFF_START } from "../../src/web/app/stage/diffig.ts";

test("the table is built by adding down the chain, and matches Stuart's tutorial and the real core", () => {
  assert.deepEqual(differenceTable(5), [
    [600, -89, -34, 6],
    [511, -123, -28, 6],
    [388, -151, -22, 6],
    [237, -173, -16, 6],
    [64, -189, -10, 6],
  ]);
});

test("every f is the cubic f(x) = x^3 - 20x^2 - 70x + 600", () => {
  const f = (x: number) => x ** 3 - 20 * x ** 2 - 70 * x + 600;
  differenceTable(12).forEach((r, x) => assert.equal(r[0], f(x), `x=${x}`));
  assert.deepEqual([...DIFF_START], [600, -89, -34, 6]);
});
