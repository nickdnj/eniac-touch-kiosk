import { test } from "node:test";
import assert from "node:assert/strict";
import { otherUnits } from "./fakes.ts";
import { applyMergePatch, Mirror, touchedUnits } from "../../src/web/app/state/machine.ts";
import type { MachineState, SessionInfo } from "../../src/web/app/protocol.ts";

// RFC 7396 Appendix A test vectors.
const VECTORS: [unknown, unknown, unknown][] = [
  [{ a: "b" }, { a: "c" }, { a: "c" }],
  [{ a: "b" }, { b: "c" }, { a: "b", b: "c" }],
  [{ a: "b" }, { a: null }, {}],
  [{ a: "b", b: "c" }, { a: null }, { b: "c" }],
  [{ a: ["b"] }, { a: "c" }, { a: "c" }],
  [{ a: "c" }, { a: ["b"] }, { a: ["b"] }],
  [{ a: { b: "c" } }, { a: { b: "d", c: null } }, { a: { b: "d" } }],
  [{ a: [{ b: "c" }] }, { a: [1] }, { a: [1] }],
  [["a", "b"], ["c", "d"], ["c", "d"]],
  [{ a: "b" }, ["c"], ["c"]],
  [{ a: "foo" }, null, null],
  [{ a: "foo" }, "bar", "bar"],
  [{ e: null }, { a: 1 }, { e: null, a: 1 }],
  [[1, 2], { a: "b", c: null }, { a: "b" }],
  [{}, { a: { bb: { ccc: null } } }, { a: { bb: {} } }],
];

test("RFC 7396 appendix A vectors", () => {
  for (const [t, p, want] of VECTORS) assert.deepEqual(applyMergePatch(t, p), want, JSON.stringify([t, p]));
});

test("merge patch does not mutate the target and shares untouched branches", () => {
  const t = { acc: { "1": { digits: "0000000000" }, "2": { digits: "0000000000" } } };
  const out = applyMergePatch(t, { acc: { "2": { digits: "0000000004" } } }) as typeof t;
  assert.equal(t.acc["2"].digits, "0000000000");
  assert.equal(out.acc["2"].digits, "0000000004");
  assert.equal(out.acc["1"], t.acc["1"]);
});

test("touchedUnits maps patch keys to lamp units", () => {
  assert.deepEqual(touchedUnits({ cycle: { pos: 3 }, acc: { "2": {}, "11": {} }, ct: "x" }), ["cyc", "acc.2", "acc.11", "ct"]);
});

const machine = (): MachineState => ({
  ...otherUnits(),
  cycle: { pos: 0, mode: "C" },
  init: "000000000000000",
  acc: { "1": { sign: "P", digits: "0000000003", value: 3, carry: "0000000000", rep: 0, prog: "000000000000" } },
  ct: "0".repeat(30),
});
const drawn = (m: Mirror): MachineState | null => m.machine;
const sess = (id: string, state: SessionInfo["state"] = "setup"): SessionInfo => ({ id, mission: "squares", mode: "visitor", state, applied: [], remaining: 7 });

test("mirror renders only for the current session while core and link are up", () => {
  const m = new Mirror();
  m.onLink(true);
  m.onHealth({ core: "up" });
  assert.equal(m.machine, null, "no session yet");
  m.onState(sess("a"), 5, machine(), { state: "idle", inits: 0 });
  assert.equal(drawn(m)?.acc["1"].value, 3);
  m.onHealth({ core: "down", code: "E-CORE-DOWN" });
  assert.equal(m.machine, null, "core down blanks");
  m.onHealth({ core: "up" });
  assert.equal(m.machine, null, "stale state is dropped, never re-shown");
});

test("mirror drops frames from before the snapshot and after a session change", () => {
  const m = new Mirror();
  m.onLink(true);
  m.onHealth({ core: "up" });
  m.onState(sess("a"), 10, machine(), { state: "idle", inits: 0 });
  assert.equal(m.onFrame(9, { acc: { "1": { value: 99 } } }), null);
  assert.deepEqual(m.onFrame(11, { acc: { "1": { value: 4 } } }), ["acc.1"]);
  assert.equal(drawn(m)?.acc["1"].value, 4);
  m.onSession(sess("b"));
  assert.equal(m.machine, null, "new session: nothing to draw until its state arrives");
  assert.equal(m.onFrame(12, { acc: { "1": { value: 5 } } }), null);
});

test("link loss blanks the machine", () => {
  const m = new Mirror();
  m.onLink(true);
  m.onHealth({ core: "up" });
  m.onState(sess("a"), 1, machine(), { state: "idle", inits: 0 });
  m.onLink(false);
  assert.equal(m.machine, null);
  m.onLink(true);
  assert.equal(m.machine, null, "needs a fresh state after reconnect");
});
