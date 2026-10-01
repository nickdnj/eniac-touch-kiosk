// M1-18 / #13: the production bundle contains no fixture or demo data, no
// mock code and no dev shortcuts (architecture 5.8, "no demo fallback").

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error: plain ESM build script without types
import { build } from "../../src/web/scripts/build.mjs";

// Markers that must never appear in a release bundle.
export const FORBIDDEN = [
  "tests/",
  "fakecore",
  "golden",
  "mock",
  "MockBridge",
  "__mock",
  "FIXTURE",
  "squares.json",
  "demo",
  "Accumulator 1 sends its number", // mission copy must come from the bridge, not the bundle
  "?mission=",
];

test("production bundle is fixture-free and built only from src/web/app", async () => {
  const dir: string = await build(await mkdtemp(join(tmpdir(), "eniac-web-")));
  const js = await readFile(join(dir, "app.js"), "utf8");
  for (const m of FORBIDDEN) assert.ok(!js.toLowerCase().includes(m.toLowerCase()), `bundle contains "${m}"`);
  const inputs: string[] = JSON.parse(await readFile(join(dir, "inputs.json"), "utf8"));
  // Only the app itself, plus the bridge's generated protocol types (#8).
  for (const i of inputs)
    assert.match(i, /^((.*\/)?(src\/web\/)?app\/[^.][^/]*(\/[^/]+)*\.ts|(.*\/)?bridge\/internal\/(protocol|mission)\/[a-z]+\.gen\.ts)$/, `unexpected bundle input ${i}`);
  for (const i of inputs) assert.ok(!i.includes("tests/") && !i.includes("node_modules"), `unexpected bundle input ${i}`);
  const html = await readFile(join(dir, "index.html"), "utf8");
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /default-src 'self'/);
});
