import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Runner, DEBOUNCE_MS, stepTargets } from "../../src/web/app/mission/runner.ts";
import { hitTest, squareAt, distToRect } from "../../src/web/app/mission/hit.ts";
import type { ClientMsg, CompiledMission, MissionCompiled } from "../../src/web/app/protocol.ts";
import { toView } from "../../src/web/app/mission/view.ts";

const mission: CompiledMission = toView(JSON.parse(readFileSync(join(import.meta.dirname, "mock", "missions", "squares.json"), "utf8")) as MissionCompiled);

function mk(applied: string[] = []) {
  let t = 1000;
  const r = new Runner(mission, () => t, applied);
  const out: ClientMsg[] = [];
  const step = (ms = DEBOUNCE_MS + 1) => (t += ms);
  const tap = (id: string | null) => {
    step();
    const res = r.tap(id);
    out.push(...res.send);
    return res.feedback;
  };
  const pick = (v: string) => {
    step();
    const res = r.pick(v);
    out.push(...res.send);
    return res.feedback;
  };
  return { r, out, tap, pick, step, now: () => t, rawTap: (id: string | null) => { const res = r.tap(id); out.push(...res.send); return res; } };
}
const applies = (out: ClientMsg[]) => out.filter((m) => m.t === "apply_step");
const wrongMetrics = (out: ClientMsg[]) => out.filter((m) => m.t === "metric" && m.ev === "wrong_tap");

test("switch step happy path: dial, then value, then ack, then Next", () => {
  const { r, out, tap, pick } = mk();
  assert.equal(r.step!.id, "j1-one");
  assert.deepEqual(r.activeTargets, ["sw:c.j1"]);
  assert.equal(tap("sw:c.j1").kind, "open-picker");
  const f = pick("1");
  assert.equal(f.kind, "ok");
  assert.deepEqual(applies(out), [{ t: "apply_step", step: "j1-one", assisted: false }]);
  assert.equal(r.phase, "pending");
  assert.equal(r.ack("j1-one", false), true);
  assert.equal(r.phase, "done");
  assert.equal(r.status[0], "done");
  r.next();
  assert.equal(r.step!.id, "const-to-trunk1");
  assert.equal(r.phase, "source");
});

test("wrong-tap ladder: #1 specific hint, #2 glowing ring, #3 Do it for me filled; one metric each; no apply_step", () => {
  const { r, out, tap } = mk(["j1-one"]);
  const w1 = tap("jack:c.26i");
  assert.equal(w1.kind, "wrong");
  assert.equal((w1 as any).level, 1);
  assert.equal((w1 as any).text, "Not quite. That is a jack for signals. We want OUT, the number exit.");
  assert.equal(r.doItFilled, false);
  const w2 = tap("jack:c.25i");
  assert.equal((w2 as any).text, "Look for the glowing ring.");
  assert.equal(r.ringLevel, 2);
  const w3 = tap("jack:c.24i");
  assert.equal((w3 as any).text, "Want us to do this one?");
  assert.equal(r.doItFilled, true);
  assert.equal(wrongMetrics(out).length, 3);
  assert.deepEqual(wrongMetrics(out)[0], { t: "metric", ev: "wrong_tap", mission: "squares", step: "const-to-trunk1" });
  assert.equal(applies(out).length, 0, "wrong taps never reach the core");
});

test("per-decoy hints win over class hints", () => {
  const { tap } = mk(["j1-one", "const-to-trunk1", "trunk1-to-a1"]);
  const f = tap("jack:a1.S");
  assert.equal((f as any).text, "Not quite. S is for subtracting. We want A.");
});

test("right source, wrong destination snaps back and keeps the source armed", () => {
  const { r, out, tap } = mk(["j1-one"]);
  assert.equal(tap("jack:c.o").kind, "ok-source");
  assert.equal(r.phase, "dest");
  assert.deepEqual(r.activeTargets, ["trunk:1"]);
  const f = tap("trunk:2");
  assert.equal(f.kind, "wrong");
  assert.equal((f as any).snapBack, true);
  assert.equal((f as any).text, "Not quite. That is a different trunk. Choose Trunk 1.");
  assert.equal(r.phase, "dest", "source stays armed");
  assert.equal(tap("jack:c.o").kind, "neutral", "re-tapping the source is harmless");
  assert.equal(tap("trunk:1").kind, "ok");
  assert.deepEqual(applies(out), [{ t: "apply_step", step: "const-to-trunk1", assisted: false }]);
});

test("wrong switch value and wrong dial follow the ladder", () => {
  const { r, out, tap, pick } = mk();
  assert.equal((tap("sw:c.j2") as any).text, "Not quite. That is a different digit of the number. Try the glowing one.");
  tap("sw:c.j1");
  const f = pick("7");
  assert.equal(f.kind, "wrong");
  assert.equal((f as any).text, "Look for the glowing ring.");
  assert.equal(r.phase, "pick", "picker stays open");
  assert.equal(pick("1").kind, "ok");
  assert.equal(applies(out).length, 1);
});

test("empty and dimmed taps are neutral and never counted", () => {
  const { r, out, tap } = mk();
  assert.equal(tap(null).kind, "neutral");
  assert.equal(tap(null).kind, "neutral");
  assert.equal(r.wrong, 0);
  assert.equal(out.length, 0);
});

test("the ladder counter is per step", () => {
  const { r, tap, pick } = mk();
  tap("sw:c.j5");
  tap("sw:c.j5");
  assert.equal(r.wrong, 2);
  tap("sw:c.j1");
  pick("1");
  r.ack("j1-one", false);
  r.next();
  assert.equal(r.wrong, 0);
  assert.equal(r.doItFilled, false);
});

test("rapid double tap within 400 ms is ignored; nothing while pending", () => {
  const { r, out, rawTap, step } = mk(["j1-one"]);
  step();
  assert.equal(rawTap("jack:c.26i").feedback.kind, "wrong");
  step(100);
  assert.deepEqual(rawTap("jack:c.26i"), { feedback: { kind: "ignored", reason: "debounce" }, send: [] });
  assert.equal(r.wrong, 1);
  step(500);
  rawTap("jack:c.o");
  step(500);
  rawTap("trunk:1");
  assert.equal(r.phase, "pending");
  step(500);
  assert.equal(rawTap("trunk:1").feedback.kind, "ignored");
  assert.equal(applies(out).length, 1);
});

test("Do it for me sends assisted and marks the step assisted", () => {
  const { r, out } = mk(["j1-one", "const-to-trunk1", "trunk1-to-a1"]);
  const res = r.doItForMe();
  out.push(...res.send);
  assert.deepEqual(applies(out), [{ t: "apply_step", step: "a1-to-a2", assisted: true }]);
  assert.equal(r.ack("a1-to-a2", true), true);
  assert.equal(r.status[3], "assisted");
  assert.equal(r.doItForMe().feedback.kind, "ignored", "not twice");
});

test("acks for other steps are ignored", () => {
  const { r, tap, pick } = mk();
  tap("sw:c.j1");
  pick("1");
  assert.equal(r.ack("a1-twice", false), false);
  assert.equal(r.phase, "pending");
});

test("skip setup marks the rest skipped and logs the step it was at", () => {
  const { r } = mk(["j1-one", "const-to-trunk1"]);
  const { send, stepsLeft } = r.skipAll();
  assert.deepEqual(send, [{ t: "skip_setup" }, { t: "metric", ev: "setup_skipped", mission: "squares", step: "trunk1-to-a1" }]);
  assert.equal(stepsLeft.length, 5);
  assert.equal(r.finished, true);
  assert.deepEqual(r.status, ["done", "done", "skipped", "skipped", "skipped", "skipped", "skipped"]);
});

test("stepTargets maps .e terms to element ids", () => {
  assert.deepEqual(stepTargets(mission.steps[2]), ["trunk:1", "jack:a1.α"]);
  assert.deepEqual(stepTargets(mission.steps[5]), ["jack:i.io", "trunk:1-1"]);
  assert.deepEqual(stepTargets(mission.steps[4]), ["sw:a1.rp6"]);
});

// ---- hit testing (UX 6.6)

test("hit test: inside, within 16 px tolerance, and beyond", () => {
  const t = [squareAt("jack:c.o", 100, 100, 88)];
  assert.equal(hitTest({ x: 100, y: 100 }, t), "jack:c.o");
  assert.equal(hitTest({ x: 144 + 16, y: 100 }, t), "jack:c.o", "16 px outside the edge still counts");
  assert.equal(hitTest({ x: 144 + 17, y: 100 }, t), null);
  assert.equal(distToRect(144 + 16, 100 + 44 + 16, t[0]) > 16, true, "corner distance is Euclidean");
});

test("hit test: nearest wins; the active target wins a tie", () => {
  // Two 88 px targets with a 16 px gap: a tap in the gap is 8 px from both.
  const a = squareAt("jack:a", 100, 100, 88);
  const b = squareAt("jack:b", 204, 100, 88);
  assert.equal(hitTest({ x: 150, y: 100 }, [a, b]), "jack:a", "closer to a");
  assert.equal(hitTest({ x: 158, y: 100 }, [a, b]), "jack:b", "closer to b");
  assert.equal(hitTest({ x: 152, y: 100 }, [a, b], ["jack:b"]), "jack:b", "tie goes to the active target");
  assert.equal(hitTest({ x: 152, y: 100 }, [a, b], ["jack:a"]), "jack:a");
});
