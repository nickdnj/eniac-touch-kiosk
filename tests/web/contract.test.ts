// Web-side protocol contract (architecture 11.3 "Protocol contract").
//  1. The bridge's recorded fixtures (tests/fixtures/protocol/*.json) are
//     consumed correctly by the UI's pure modules.
//  2. The dev mock (tests/web/mock) sends messages of the same shape as the
//     fixtures, so the Playwright suite exercises the real contract.
//  3. The mock's compiled mission agrees with missions/squares.yaml.
// Paths default to the repo layout after m1-bridge is merged; override with
// ENIAC_FIXTURES=<dir> and ENIAC_MISSIONS=<dir>. Missing inputs -> skipped.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { Mirror } from "../../src/web/app/state/machine.ts";
import { accLamps } from "../../src/web/app/lamps/derive.ts";
import { toView } from "../../src/web/app/mission/view.ts";
import { PROTOCOL_VERSION, type MachineState, type MissionCompiled } from "../../src/web/app/protocol.ts";
// @ts-expect-error: plain ESM mock without types
import { MockBridge, SQUARES, PRIMES, TRAJECTORY } from "./mock/bridge.mjs";

const repo = join(import.meta.dirname, "..", "..");
const FIXTURES = process.env.ENIAC_FIXTURES ?? join(repo, "tests", "fixtures", "protocol");
const MISSIONS = process.env.ENIAC_MISSIONS ?? join(repo, "missions");
const haveFixtures = existsSync(FIXTURES);
const fx = (name: string) => JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8"));

// ---------------------------------------------------------------- shape compare

type Diff = string[];
const kind = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/** Every key the fixture has must exist in `got` with the same JSON kind. */
function sameShape(want: unknown, got: unknown, path: string, out: Diff, optional: Set<string>): void {
  if (kind(want) !== kind(got)) {
    // null is how optional objects are absent (state.session / machine).
    if (!(kind(want) === "null" || kind(got) === "null")) out.push(`${path}: fixture ${kind(want)}, mock ${kind(got)}`);
    return;
  }
  if (kind(want) === "array") {
    const a = want as unknown[], b = got as unknown[];
    if (a.length && b.length) sameShape(a[0], b[0], `${path}[0]`, out, optional);
    return;
  }
  if (kind(want) !== "object") return;
  const w = want as Record<string, unknown>, g = got as Record<string, unknown>;
  for (const k of Object.keys(w)) {
    if (!(k in g)) {
      if (!optional.has(k) && !optional.has(`${path}.${k}`)) out.push(`${path}.${k}: missing in mock`);
      continue;
    }
    sameShape(w[k], g[k], `${path}.${k}`, out, optional);
  }
}

// ---------------------------------------------------------------- 1. fixtures -> UI

test("fixtures: hello/health/state/frame/session/run are consumed by the UI", { skip: !haveFixtures && `no fixtures at ${FIXTURES}` }, () => {
  const names = readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  for (const n of names) assert.equal(fx(n).t, n, `${n}.json has t=${n}`);

  const hello = fx("hello");
  assert.equal(hello.protocol, PROTOCOL_VERSION);
  for (const k of ["setupS", "runS", "countdownS"]) assert.equal(typeof hello.config.idle[k], "number");
  assert.deepEqual(Object.keys(hello.config.admin.tapZone).sort(), ["corner", "heightPx", "taps", "widthPx"]);

  const mirror = new Mirror();
  mirror.onLink(true);
  const { t: _h, ...health } = fx("health");
  mirror.onHealth(health);
  assert.equal(mirror.health.core, "up");

  const state = fx("state");
  mirror.onState(state.session ?? null, state.seq, state.machine, state.run);
  if (state.session && state.machine) {
    const m = mirror.machine as MachineState;
    assert.ok(m, "a state with a session is drawable");
    const lit = accLamps("1", m);
    for (let d = 1; d <= 10; d++) assert.equal([...lit].filter((id) => id.startsWith(`lamp:acc.1.d.${d}.`)).length, 1);
    assert.equal(Number(m.acc["1"].digits), m.acc["1"].value);
  } else assert.equal(mirror.machine, null, "no session -> nothing to draw");

  const frame = fx("frame");
  assert.equal(typeof frame.seq, "number");
  assert.equal(typeof frame.d, "object");

  const session = fx("session");
  for (const k of ["id", "mission", "mode", "state", "applied", "remaining"]) assert.ok(k in session, `session.${k}`);
  const run = fx("run");
  assert.ok(run.state === "busy" || run.state === "idle");
  if (run.state === "idle") assert.equal(typeof run.settled["1"], "number");
  const sa = fx("step_applied");
  for (const k of ["step", "assisted", "remaining"]) assert.ok(k in sa, `step_applied.${k}`);
  assert.equal(typeof fx("setup_complete").skipped, "number");
  assert.equal(typeof fx("checkpoint").id, "string");
  assert.ok(["BUSY", "BAD_STATE", "UNKNOWN_STEP", "NOT_ALLOWED", "BAD_MESSAGE"].includes(fx("error").code));
  assert.equal(fx("pong").t, "pong");
});

test("fixtures: a state with no session has null session and machine (v0.2)", { skip: !haveFixtures && "no fixtures" }, () => {
  const mirror = new Mirror();
  mirror.onLink(true);
  mirror.onHealth({ core: "up" });
  mirror.onState(null, 5, null, { state: "idle", inits: 0 });
  assert.equal(mirror.machine, null);
  assert.equal(mirror.onFrame(4, { acc: {} }), null, "older seq dropped");
});

// ---------------------------------------------------------------- 2. mock == fixtures

class FakeWs {
  readyState = 1;
  sent: any[] = [];
  handlers: Record<string, (d: unknown) => void> = {};
  send(s: string) {
    this.sent.push(JSON.parse(s));
  }
  on(ev: string, fn: (d: unknown) => void) {
    this.handlers[ev] = fn;
  }
  terminate() {}
  client(m: unknown) {
    this.handlers.message(JSON.stringify(m));
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("mock messages have the fixtures' shapes", { skip: !haveFixtures && "no fixtures" }, async () => {
  const b = new MockBridge();
  b.speedMs = { slow: 5, full: 2 };
  const ws = new FakeWs();
  b.accept(ws);
  ws.client({ t: "ping", id: 1 });
  ws.client({ t: "attract_start", id: 20 });
  ws.client({ t: "attract_stop", id: 21, reason: "touch" });
  ws.client({ t: "start_mission", id: 2, mission: "squares", mode: "visitor" });
  await sleep(450);
  ws.client({ t: "apply_step", id: 3, step: "j1-one", assisted: false });
  await sleep(50);
  ws.client({ t: "skip_setup", id: 4 });
  await sleep(50);
  ws.client({ t: "button", id: 5, b: "init" });
  await sleep(400);
  ws.client({ t: "button", id: 6, b: "read" });
  await sleep(50);
  // Primes: one INIT punches cards (punch messages, M2).
  b.sieveMs = { slow: 2, full: 2 };
  ws.client({ t: "start_mission", id: 7, mission: "primes", mode: "visitor" });
  await sleep(450);
  ws.client({ t: "skip_setup", id: 8 });
  await sleep(50);
  ws.client({ t: "button", id: 9, b: "init" });
  await sleep(100);
  b.fault({ recoverAfterMs: 100 });
  await sleep(200);
  b.close();

  const byType = new Map<string, any>();
  for (const m of ws.sent) {
    // Prefer the richest example of each type (a state with a session, an idle run).
    const cur = byType.get(m.t);
    const richer = !cur || (m.t === "state" && m.session && !cur.session) || (m.t === "run" && m.settled && !cur.settled) || (m.t === "session" && m.applied?.length > (cur.applied?.length ?? 0));
    if (richer) byType.set(m.t, m);
  }
  // attract: session/holdMs/landing only exist mid-flight and on landing (the mock never flies).
  const optional = new Set(["re", "session.t", "code", "detail", "attempt", "of", "final", "attract.session", "attract.holdMs", "attract.landing", "state.attract"]);
  const diffs: string[] = [];
  for (const f of readdirSync(FIXTURES).filter((x) => x.endsWith(".json"))) {
    const want = JSON.parse(readFileSync(join(FIXTURES, f), "utf8"));
    const got = byType.get(want.t);
    if (!got) {
      diffs.push(`${want.t}: mock never sent one`);
      continue;
    }
    if (want.t === "frame") {
      sameShape({ t: "", seq: 0, d: {} }, got, "frame", diffs, optional);
      continue;
    }
    sameShape(want, got, want.t, diffs, optional);
  }
  assert.deepEqual(diffs, []);
});

// ---------------------------------------------------------------- 3. mock missions == missions/*.yaml

const strip = (o: any): any => {
  if (Array.isArray(o)) return o.map(strip);
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).filter(([k]) => k !== "review").map(([k, v]) => [k, strip(v)]));
  return o;
};

for (const [id, mock] of [["squares", SQUARES], ["primes", PRIMES], ["trajectory", TRAJECTORY]] as const) {
  const yamlPath = join(MISSIONS, `${id}.yaml`);
  test(`mock compiled mission agrees with missions/${id}.yaml`, { skip: !existsSync(yamlPath) && `no ${yamlPath}` }, () => {
    const require = createRequire(join(repo, "src", "web", "package.json"));
    const YAML = require("yaml");
    const y = YAML.parse(readFileSync(yamlPath, "utf8"));
    const c = mock as MissionCompiled;
    assert.equal(c.id, y.id);
    assert.equal(c.title, y.title);
    assert.equal(c.summary, y.summary);
    assert.equal(c.result, y.result);
    assert.deepEqual(c.checkpoints, y.checkpoints.map((k: { id: string }) => k.id));
    assert.deepEqual(c.run.buttons, y.run.buttons);
    assert.deepEqual(c.run.watch, y.run.watch);
    assert.deepEqual([...c.run.speeds].sort(), Object.keys(y.run.speeds).sort());
    assert.equal(c.run.defaultSpeed, y.run.defaultSpeed);
    assert.deepEqual(strip(c.content), strip(y.content));
    assert.deepEqual(c.steps.map((s) => s.id), y.steps.map((s: { id: string }) => s.id));
    for (const [i, ys] of y.steps.entries()) {
      const s = c.steps[i];
      const line = s.kind === "plug" ? `p ${s.from} ${s.to}` : `s ${s.switch} ${s.value}`;
      // The compiled mission uses canonical terms (initiating-unit jacks in lower case, like initplug).
      const canon = (l: string) => l.replace(/\bi\.([A-Za-z])/g, (_m, c: string) => `i.${c.toLowerCase()}`);
      assert.equal(line, canon(ys.line), `step ${s.id} line`);
      assert.deepEqual(strip(s.text), strip(ys.text), `step ${s.id} text`);
      if (ys.choices) assert.deepEqual(s.choices, ys.choices, `step ${s.id} choices`);
    }
    const v = toView(c);
    assert.equal(v.steps.length, y.steps.length);
    assert.equal(v.config.filter((x) => x.owner === "preset" && x.kind === "plug").length, c.counts.presetCables);
    assert.equal(v.config.filter((x) => x.owner === "preset" && x.kind === "switch").length, c.counts.presetSwitches);
    if (y.run.cards) assert.deepEqual(strip(c.run.cards), strip(y.run.cards));
  });
}
