// Live attract client state (attract/store.ts): phases, cards, caption,
// liveness and the hand-off requests. Driven with the message sequence the
// bridge sends (src/bridge/internal/session/attract.go) and the recorded
// real flight (mock/missions/trajectory-flight.json).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AttractController, AttractStore, LIVE_LOST_MS, LIVE_WAITING_MS } from "../../src/web/app/attract/store.ts";
import { toView } from "../../src/web/app/mission/view.ts";
import type { AttractInfo, ClientMsg, MissionCompiled, ServerMsg } from "../../src/web/app/protocol.ts";

const mock = (f: string) => JSON.parse(readFileSync(join(import.meta.dirname, "mock", "missions", f), "utf8"));
const traj = toView(mock("trajectory.json") as MissionCompiled);
const flight: { text: string }[] = mock("trajectory-flight.json").cards;
const fields = (text: string) => Array.from({ length: 16 }, (_, i) => text.slice(i * 5, i * 5 + 5));

const status = (phase: AttractInfo["phase"], extra: Partial<AttractInfo> = {}): ServerMsg => ({
  t: "attract",
  phase,
  mission: "trajectory",
  flight: 1,
  landed: 0,
  total: 0,
  cards: 0,
  ...extra,
});
const session = (id: string, state: string, mode = "attract"): ServerMsg => ({ t: "session", id, mission: "trajectory", mode, state, applied: [], remaining: 0 });
const punch = (n: number): ServerMsg => ({ t: "punch", n, text: flight[n - 1].text, fields: fields(flight[n - 1].text) });

/** One flight as the bridge sends it, up to the landing. */
function fly(s: AttractStore, id: string, flightNo: number, t0: number, cards = flight.length): number {
  let t = t0;
  s.onMessage(session(id, "starting"), t);
  s.onMessage(session(id, "setup"), (t += 500));
  s.onMessage(status("reading", { flight: flightNo, session: id }), (t += 100));
  s.onMessage({ t: "frame", seq: t, d: {} }, (t += 400));
  s.onMessage(status("flying", { flight: flightNo, session: id }), (t += 100));
  for (let n = 1; n <= cards; n++) {
    s.onMessage({ t: "frame", seq: t, d: {} }, (t += 700));
    s.onMessage(punch(n), (t += 700));
  }
  return t;
}

test("a flight: reading -> flying with cards, dots and a live caption -> landed -> recycling", () => {
  const s = new AttractStore();
  s.setMission(traj);
  let t = 0;
  s.onMessage(status("starting", { flight: 1 }), t);
  assert.equal(s.caption(), "Waking ENIAC...");
  assert.equal(s.liveness(t + 1000), "waking");
  assert.equal(s.liveness(t + LIVE_LOST_MS + 1), "lost", "a first flight not live in 5 s is S10 (FR-36)");
  t = fly(s, "f1", 1, t, 5);
  assert.equal(s.phase, "flying");
  assert.equal(s.cards.count, 5);
  assert.equal(s.cards.dots.length, 5);
  assert.equal(s.caption(), "Live: ENIAC is working out a shell's path. Hop 5");
  assert.equal(s.liveness(t), "live");
  assert.equal(s.liveness(t + LIVE_WAITING_MS + 100), "waiting");
  assert.equal(s.liveness(t + LIVE_LOST_MS + 100), "lost");
  for (let n = 6; n <= flight.length; n++) s.onMessage(punch(n), (t += 700));
  assert.ok(s.cards.landed, "the landing card is below ground");
  const landing = { card: 34, hop: 34, along: 390417741, up: -2951425, text: flight[33].text, flightMs: 48320 };
  s.onMessage(status("landed", { flight: 1, landed: 1, total: 1, session: "f1", cards: 34, holdMs: 8000, landing }), (t += 50));
  assert.equal(s.caption(), "The shell has landed. ENIAC worked out the whole path.");
  assert.deepEqual(s.landing, landing);
  assert.equal(s.liveness(t + 7000), "held", "frozen on purpose: no frames due");
  s.onMessage(status("recycling", { flight: 1, landed: 1, total: 1, session: "f1", cards: 34, landing }), (t += 8000));
  assert.ok(s.dimmed);
  assert.equal(s.caption(), "Starting another flight.");
  // The old session ends, the next one boots: the last flight is held.
  s.onMessage(session("f1", "none"), (t += 10));
  s.onMessage(session("f2", "starting"), (t += 10));
  s.onMessage({ t: "state", session: { id: "f2", mission: "trajectory", mode: "attract", state: "setup", applied: [], remaining: 0 }, seq: 9, machine: null, cards: [], run: { state: "idle", inits: 0 } } as ServerMsg, (t += 900));
  assert.equal(s.cards.count, 34, "held through recycling");
  assert.equal(s.liveness(t), "held");
  assert.equal(s.liveness(t + LIVE_LOST_MS + 1000), "lost", "the next flight not live in 5 s is S10");
  // Flight 2 starts clean.
  s.onMessage(status("reading", { flight: 2, landed: 1, total: 1, session: "f2" }), (t += 100));
  assert.equal(s.cards.count, 0);
  assert.equal(s.session, "f2");
  s.onMessage(punch(1), (t += 100));
  assert.equal(s.cards.count, 1);
});

test("nothing of a flight reaches the store after its session ended or attract stopped", () => {
  const s = new AttractStore();
  s.setMission(traj);
  let t = fly(s, "f1", 1, 0, 3);
  s.onMessage(session("f1", "none"), (t += 10));
  assert.equal(s.onMessage(punch(4), (t += 10)), false, "a late card is dropped");
  assert.equal(s.cards.count, 3);
  s.onMessage(status("off", { flight: 0 }), (t += 10));
  assert.equal(s.cards.count, 0);
  assert.equal(s.liveness(t), "off");
  assert.equal(s.caption(), "");
  // A visitor's mission session never feeds the attract store.
  s.onMessage(session("v1", "setup", "visitor"), (t += 10));
  assert.equal(s.onMessage(punch(1), (t += 10)), false);
});

test("error phase and core down: liveness error; recovery starts fresh", () => {
  const s = new AttractStore();
  let t = fly(s, "f1", 1, 0, 3);
  s.onMessage({ t: "health", core: "down", code: "E-CORE-DOWN", kioskClient: true }, (t += 10));
  assert.equal(s.liveness(t), "error");
  s.onMessage(status("error", { flight: 1, code: "E-CORE-DOWN" }), (t += 10));
  assert.equal(s.cards.count, 0, "no stale flight kept across a fault");
  s.onMessage({ t: "health", core: "up", kioskClient: true }, (t += 2000));
  s.onMessage(status("starting", { flight: 2 }), (t += 10));
  assert.equal(s.liveness(t), "waking");
});

test("a late joiner adopts the running flight from state", () => {
  const s = new AttractStore();
  s.setMission(traj);
  const cards = [1, 2, 3].map((n) => ({ n, text: flight[n - 1].text, fields: fields(flight[n - 1].text) }));
  s.onMessage(
    {
      t: "state",
      seq: 50,
      session: { id: "f9", mission: "trajectory", mode: "attract", state: "running", applied: [], remaining: 0 },
      machine: null,
      cards,
      run: { state: "busy", inits: 1 },
      attract: { phase: "flying", mission: "trajectory", session: "f9", flight: 4, landed: 3, total: 3, cards: 3 },
    } as ServerMsg,
    0,
  );
  assert.equal(s.phase, "flying");
  assert.equal(s.cards.count, 3);
  assert.equal(s.cards.dots.length, 3);
  s.onMessage(punch(4), 10);
  assert.equal(s.caption(), "Live: ENIAC is working out a shell's path. Hop 4");
});

test("controller: home asks for attract, the touch hands off, a reconnect asks again", async () => {
  const sent: ClientMsg[] = [];
  const s = new AttractStore();
  let fetched = 0;
  const c = new AttractController({
    send: (m) => {
      sent.push(m);
      return 1;
    },
    store: s,
    fetchMission: async (id) => {
      fetched++;
      assert.equal(id, "trajectory");
      return traj;
    },
  });
  c.leave("touch");
  assert.equal(sent.length, 0, "no stop when attract was never asked for");
  c.enter();
  c.onHello();
  assert.deepEqual(sent.map((m) => m.t), ["attract_start", "attract_start"]);
  c.onMessage(status("starting"), 0);
  c.onMessage(status("starting"), 1);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(fetched, 1, "the mission is fetched once");
  assert.ok(s.hasMission);
  c.leave("touch");
  assert.deepEqual(sent[2], { t: "attract_stop", reason: "touch" });
  c.onHello();
  assert.equal(sent.length, 3, "no attract_start after the hand-off");
});

const FIXTURE = join(import.meta.dirname, "..", "fixtures", "protocol", "attract.json");
test("the recorded attract fixture is consumed", { skip: !existsSync(FIXTURE) && "no attract fixture" }, () => {
  const fx = JSON.parse(readFileSync(FIXTURE, "utf8"));
  const s = new AttractStore();
  s.onMessage(fx, 0);
  assert.equal(s.phase, fx.phase);
  if (fx.landing) assert.ok(fx.landing.up < 0 && fx.landing.hop > 0);
});
