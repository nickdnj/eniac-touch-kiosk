// DEV/TEST ONLY: a mock of eniac-bridge's websocket + mission API, driven by
// the message schema in docs/architecture.md 5.4-5.6. It simulates sq.e
// (one square per INIT: program 6 twice, then program 5 via trunk 1-3, then
// program 7) and, for M2, sieve.e's outline (odd numbers in Acc 19, a
// checker's program 12 lamp when its group size fits, a punched card for
// every prime) so the UI is runnable in a browser without the Go bridge. It
// is NOT the simulator and is never shipped: the production bundle is built
// from src/web/app only and is checked for fixture markers
// (tests/web/bundle.test.ts). The real-bridge suite (e2e-real) checks the
// real machine.

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const load = (id) => {
  const m = JSON.parse(readFileSync(join(here, "missions", `${id}.json`), "utf8"));
  delete m._comment;
  return m;
};
export const SQUARES = load("squares");
export const PRIMES = load("primes");
export const TRAJECTORY = load("trajectory");
/** One real first flight of trajdemo.e (recorded from the real core; test fixture). */
export const FLIGHT = JSON.parse(readFileSync(join(here, "missions", "trajectory-flight.json"), "utf8")).cards;
export const MISSIONS = { squares: SQUARES, primes: PRIMES, trajectory: TRAJECTORY };
/** The mission speed tables (rates), as in missions/*.yaml. */
export const RATES = { squares: { slow: 13, full: 0 }, primes: { slow: 100, full: 0 }, trajectory: { full: 0 } };
/** The 14 group checkers of sieve.e: Acc n watches the nth odd prime. */
export const CHECKERS = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];

const WL = new Set(["start_mission", "apply_step", "skip_setup", "button", "set_speed", "end_session", "attract_start", "attract_stop", "metric", "ping"]);
// UI metric whitelist (architecture 8.3, protocol.gen.ts Metric.ev); bridge-owned names are NOT_ALLOWED.
const METRICS = new Set(["wrong_tap", "step_done", "speed", "skip_to_answer", "setup_skipped", "idle_reset", "mission_picked", "picker_next_used", "honor_page_view",
  "explore_open", "explore_card", "explore_walk_completed", "explore_mission_chip", "glossary_open",
  "tubes_open", "tubes_card", "tubes_myth_open", "tubes_try_start", "tubes_try_step", "tubes_try_done", "tubes_try_skip",
  "finale_reached", "finale_beat", "finale_skipped_at", "finale_start_over", "finale_explore",
]);
/** The attract program (bridge config attract.mission). */
export const ATTRACT_MISSION = "trajectory";

export function defaultConfig() {
  return {
    idle: { setupS: 90, runS: 180, countdownS: 15, exploreS: 120 },
    admin: { tapZone: { corner: "top-left", widthPx: 120, heightPx: 96, taps: 5 } },
  };
}

function zeroAcc() {
  return { sign: "P", digits: "0000000000", value: 0, carry: "0000000000", rep: 0, prog: "000000000000" };
}
export function initialMachine() {
  const acc = {};
  for (let i = 1; i <= 20; i++) acc[String(i)] = zeroAcc();
  const ft = {};
  for (let i = 1; i <= 3; i++) ft[String(i)] = { arg: "0", ring: -3, add: 0, sub: 0, argff: 0 };
  return {
    cycle: { pos: 0, mode: "C" },
    init: "000000000000000",
    acc,
    mp: { stage: "0000000000", dec: "00000000000000000000", inff: "0000000000" },
    ft,
    ct: "0".repeat(30),
    mult: { stage: 0, ff: "0".repeat(24), r1: 0, r3: 0 },
    div: { place: 0, prog: 0, progff: "00000000", flags: "000000001000000000000000000000" },
  };
}
const digitsOf = (v) => String(((v % 1e10) + 1e10) % 1e10).padStart(10, "0");
const setBit = (s, i, b) => s.slice(0, i) + b + s.slice(i + 1);

export class MockBridge {
  constructor() {
    this.clients = new Set();
    this.log = [];
    this.config = defaultConfig();
    this.health = { core: "up", kioskClient: true };
    this.session = null;
    this.seq = 0; // monotonic for the life of the bridge (architecture 5.4 v0.2)
    this.speedMs = { slow: 200, full: 8 };
    // Primes: ms per odd number tested (the real core: about 1.85 s at Slow,
    // a card every 0.6 s at Full; the mock is faster so tests stay short).
    this.sieveMs = { slow: 120, full: 25 };
    // Trajectory: ms per card (the real core: 1.43 s on the Mac).
    this.hopMs = 150;
    // Attract: the session's status, and the landing hold (real bridge: 8 s).
    this.attract = null;
    this.attractTotal = 0;
    this.attractHoldMs = 1500;
    this.missionsAvailable = true;
    this.refuseUntil = 0;
    this.tick = setInterval(() => this.onTick(), 33);
    this.timers = new Set();
  }

  // ------------------------------------------------------------- plumbing
  close() {
    clearInterval(this.tick);
    for (const t of this.timers) clearTimeout(t);
  }
  later(fn, ms) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
    return t;
  }
  send(ws, m) {
    if (ws.readyState === 1) ws.send(JSON.stringify(m));
  }
  broadcast(m) {
    for (const ws of this.clients) this.send(ws, m);
  }
  sessionInfo() {
    const s = this.session;
    if (!s) return null;
    return { id: s.id, mission: s.mission.id, mode: s.mode, state: s.state, applied: [...s.applied], remaining: s.mission.steps.length - s.applied.length };
  }
  sendSession() {
    const info = this.sessionInfo();
    this.broadcast(info ? { t: "session", ...info } : { t: "session", id: "", mission: "", mode: "visitor", state: "none", applied: [], remaining: 0 });
  }
  stateMsg() {
    const s = this.session;
    return {
      t: "state",
      session: this.sessionInfo(),
      seq: this.seq,
      machine: s && s.state !== "starting" ? s.machine : null,
      cards: s ? s.cards.slice(-20) : [],
      run: s ? { state: s.run, inits: s.inits } : { state: "idle", inits: 0 },
      attract: this.attractMsg(),
    };
  }

  missionsList() {
    return Object.values(MISSIONS).map((m) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      summary: m.summary,
      ...(m.minutes ? { minutes: m.minutes } : {}),
      steps: m.steps.length,
      buttons: m.run.buttons,
      available: this.missionsAvailable,
      ...(this.missionsAvailable ? {} : { reason: "mock: disabled" }),
    }));
  }

  // ------------------------------------------------------------- connection
  accept(ws) {
    this.clients.add(ws);
    this.send(ws, { t: "hello", protocol: 1, build: "mock-dev", config: this.config, health: this.health });
    this.send(ws, this.stateMsg());
    ws.on("message", (data) => this.onMessage(ws, String(data)));
    ws.on("close", () => this.clients.delete(ws));
  }

  onMessage(ws, raw) {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return this.send(ws, { t: "error", code: "BAD_MESSAGE", message: "not json" });
    }
    this.log.push({ at: Date.now(), ...m });
    const err = (code, message) => this.send(ws, { t: "error", re: m.id, code, message });
    if (!WL.has(m.t)) return err("BAD_MESSAGE", `unknown type ${m.t}`);
    const s = this.session;
    switch (m.t) {
      case "ping":
        return this.send(ws, { t: "pong", re: m.id });
      case "metric":
        if (!METRICS.has(m.ev)) return err("NOT_ALLOWED", "metric not whitelisted");
        return;
      case "start_mission":
        if (this.health.core !== "up") return err("BAD_STATE", "core down");
        if (!MISSIONS[m.mission] || !this.missionsAvailable) return err("NOT_ALLOWED", "unknown mission");
        if (m.mode === "attract") return err("NOT_ALLOWED", "attract runs through attract_start");
        this.stopAttract(); // the hand-off: a visitor's mission ends attract
        return this.startSession(m.mode || "visitor", MISSIONS[m.mission]);
      case "end_session":
        this.stopAttract();
        return this.endSession();
      // Attract (attract.go): like the mission runs, the mock flies the one
      // recorded real flight (FLIGHT) as an ordinary session with mode
      // "attract", flight after flight, so Explore's live lamps can be
      // tested in dev. It is still dev-only: nothing here is in the bundle.
      case "attract_start":
        if (this.health.core !== "up") return this.send(ws, this.attractMsg({ re: m.id }));
        if (!this.attract) this.startAttract();
        return this.send(ws, this.attractMsg({ re: m.id }));
      case "attract_stop":
        this.stopAttract();
        return this.send(ws, this.attractMsg({ re: m.id }));
    }
    // Like the real bridge: an attract flight runs by itself.
    if (s && s.mode === "attract") return err("NOT_ALLOWED", "attract runs by itself");
    switch (m.t) {
      case "apply_step": {
        if (!s || s.state !== "setup") return err("BAD_STATE", "not in setup");
        const idx = s.mission.steps.findIndex((x) => x.id === m.step);
        if (idx < 0) return err("UNKNOWN_STEP", m.step);
        if (s.applied.includes(m.step)) return err("BAD_STATE", "already applied");
        if (idx !== s.applied.length) return err("BAD_STATE", "out of order");
        s.stdin.push(stepLine(s.mission.steps[idx]));
        return this.later(() => {
          s.applied.push(m.step);
          const remaining = s.mission.steps.length - s.applied.length;
          this.broadcast({ t: "step_applied", re: m.id, step: m.step, assisted: !!m.assisted, remaining });
          if (remaining === 0) {
            s.state = "armed";
            this.broadcast({ t: "setup_complete", re: m.id, skipped: 0 });
            this.sendSession();
          }
        }, 15);
      }
      case "skip_setup": {
        if (!s || s.state !== "setup") return err("BAD_STATE", "not in setup");
        const left = s.mission.steps.filter((x) => !s.applied.includes(x.id));
        for (const x of left) {
          s.stdin.push(stepLine(x));
          s.applied.push(x.id);
        }
        return this.later(() => {
          s.state = "armed";
          this.broadcast({ t: "setup_complete", re: m.id, skipped: left.length });
          this.sendSession();
        }, 20);
      }
      case "set_speed":
        if (!s || !["armed", "running", "result"].includes(s.state)) return err("BAD_STATE", "not armed");
        if (!s.mission.run.speeds.includes(m.speed)) return err("NOT_ALLOWED", "speed");
        s.speed = m.speed;
        s.stdin.push(`s cy.rate ${RATES[s.mission.id]?.[m.speed] ?? 0}`);
        return;
      case "button": {
        if (!s || !["armed", "running", "result"].includes(s.state)) return err("BAD_STATE", "not armed");
        if (!s.mission.run.buttons.includes(m.b)) return err("NOT_ALLOWED", "button");
        if (s.run !== "idle") return err("BUSY", "machine busy");
        if (m.b === "init" && s.mission.run.initOnce && s.inits > 0) return err("NOT_ALLOWED", "INIT was already pressed");
        if (m.b === "init" && s.mission.run.initAfter && !s.fired.has(s.mission.run.initAfter)) return err("NOT_ALLOWED", "INIT needs the card read");
        if (m.b === "read" && s.inits > 0) return err("NOT_ALLOWED", "READ is only allowed before INIT");
        if (m.b === "read") s.stdin.push("b c", "b r"); // the withheld lines bound to READ, in file order
        else s.stdin.push(`b ${m.b[0]}`);
        if (s.state === "armed") {
          s.state = "running";
          this.sendSession();
        }
        if (s.mission.id === "primes") return this.runSieve(s);
        if (s.mission.id === "trajectory") return m.b === "read" ? this.runRead(s) : this.runFlight(s);
        return m.b === "init" ? this.runInit(s) : this.runClear(s);
      }
    }
  }

  // ------------------------------------------------------------- sessions
  startSession(mode, mission = SQUARES) {
    // Like the real bridge: the previous session is still reported (it was
    // current when start_mission arrived), then visibly ended, before the
    // new one starts.
    if (this.session) {
      this.sendSession();
      this.endSession(false);
    }
    const s = {
      id: randomBytes(4).toString("hex"),
      mission,
      mode,
      state: "starting",
      applied: [],
      machine: initialMachine(),
      pending: {},
      run: "idle",
      inits: 0,
      speed: mission.run.defaultSpeed,
      fired: new Set(),
      stdin: [],
      gen: 0,
      cards: [],
    };
    this.session = s;
    this.sendSession();
    this.later(() => {
      if (this.session !== s) return;
      s.state = "setup";
      this.sendSession();
      this.broadcast(this.stateMsg());
      if (mode === "attract") this.autopilot(s);
    }, 350);
  }

  // ------------------------------------------------------------- attract (as session/attract.go)
  attractMsg(extra = {}) {
    const a = this.attract;
    return {
      t: "attract",
      phase: a ? a.phase : "off",
      mission: ATTRACT_MISSION,
      ...(a?.session ? { session: a.session } : {}),
      flight: a ? a.flight : 0,
      landed: a ? a.landed : 0,
      total: this.attractTotal,
      cards: this.session && this.session.mode === "attract" ? this.session.cards.length : 0,
      ...(a?.phase === "landed" ? { holdMs: this.attractHoldMs } : {}),
      ...(a?.landing && (a.phase === "landed" || a.phase === "recycling") ? { landing: a.landing } : {}),
      ...extra,
    };
  }
  setAttract(phase) {
    if (!this.attract) return;
    this.attract.phase = phase;
    if (phase !== "landed" && phase !== "recycling") delete this.attract.landing;
    this.attract.session = this.session && this.session.mode === "attract" ? this.session.id : undefined;
    this.broadcast(this.attractMsg());
  }
  /** attract_start: ends any visitor session, then flies. */
  startAttract() {
    this.endSession();
    this.attract = { phase: "starting", flight: 0, landed: 0 };
    this.nextFlight();
  }
  nextFlight() {
    const a = this.attract;
    if (!a) return;
    a.flight++;
    this.setAttract(a.flight === 1 ? "starting" : "recycling");
    this.startSession("attract", TRAJECTORY);
  }
  stopAttract() {
    if (!this.attract) return;
    this.attract = null;
    if (this.session && this.session.mode === "attract") this.endSession();
    this.broadcast(this.attractMsg());
  }
  /** One flight, by itself: all steps, READ (b c, b r), then one INIT; real recorded cards. */
  autopilot(s) {
    const ok = () => this.session === s && this.health.core === "up";
    for (const x of s.mission.steps) {
      s.stdin.push(stepLine(x));
      s.applied.push(x.id);
    }
    s.state = "armed";
    this.sendSession();
    s.stdin.push("b c", "b r");
    s.state = "running";
    this.sendSession();
    this.setAttract("reading");
    this.runRead(s);
    this.later(() => {
      if (!ok()) return;
      s.stdin.push("b i");
      this.setAttract("flying");
      this.runFlight(s);
    }, 700);
  }

  endSession(quiet = false) {
    if (!this.session) return;
    this.session.gen++;
    this.session = null;
    if (!quiet) this.sendSession();
  }

  // ------------------------------------------------------------- simulation
  patch(p) {
    const s = this.session;
    if (!s) return;
    mergeInto(s.machine, p);
    mergeInto(s.pending, p);
  }
  setAcc(n, v, extra = {}) {
    this.patch({ acc: { [n]: { digits: digitsOf(v), value: v, ...extra } } });
  }
  onTick() {
    const s = this.session;
    if (!s || s.state === "starting" || this.health.core !== "up") return;
    if (this.framesPaused) return; // test control (/__mock/frames): the status stream stops (FR-36)
    const pos = (s.machine.cycle.pos + 1) % 40;
    this.patch({ cycle: { pos } });
    this.seq++;
    this.broadcast({ t: "frame", seq: this.seq, d: s.pending });
    s.pending = {};
  }

  /** One INIT of sq.e, paced by the addition time of the current speed. */
  runInit(s) {
    const T = this.speedMs[s.speed] ?? 200;
    const gen = s.gen;
    s.run = "busy";
    s.inits++;
    this.broadcast({ t: "run", state: "busy", inits: s.inits });
    const a = () => s.machine.acc["1"].value;
    const b = () => s.machine.acc["2"].value;
    const steps = [];
    const at = (t, fn) => steps.push([t, fn]);
    let t = 0;
    at(t, () => this.patch({ init: setBit(s.machine.init, 13, "1") }));
    t += T;
    at(t, () => {
      this.patch({ init: setBit(s.machine.init, 13, "0") });
      this.patch({ acc: { 1: { prog: setBit(s.machine.acc["1"].prog, 5, "1") }, 2: { prog: setBit(s.machine.acc["2"].prog, 5, "1") } } });
    });
    for (let i = 1; i <= 2; i++) {
      t += T;
      at(t, () => {
        this.setAcc("2", b() + a(), { carry: i === 1 ? "0000000001" : "0000000000" });
        this.patch({ acc: { 1: { rep: i } } });
      });
    }
    t += T;
    at(t, () => {
      this.patch({ acc: { 1: { prog: setBit(s.machine.acc["1"].prog, 5, "0"), rep: 0 }, 2: { prog: setBit(s.machine.acc["2"].prog, 5, "0"), carry: "0000000000" } } });
      this.patch({ ct: setBit(s.machine.ct, 25, "1") });
      this.patch({ acc: { 1: { prog: setBit(s.machine.acc["1"].prog, 4, "1") }, 2: { prog: setBit(s.machine.acc["2"].prog, 4, "1") } } });
    });
    t += T;
    at(t, () => {
      this.setAcc("1", a() + 1);
      this.setAcc("2", b() + 1);
    });
    t += T;
    at(t, () => {
      this.patch({ ct: setBit(s.machine.ct, 25, "0") });
      this.patch({ acc: { 1: { prog: setBit(s.machine.acc["1"].prog, 4, "0") }, 2: { prog: setBit(setBit(s.machine.acc["2"].prog, 4, "0"), 6, "1") } } });
    });
    t += T;
    at(t, () => this.patch({ acc: { 2: { prog: setBit(s.machine.acc["2"].prog, 6, "0") } } }));
    t += Math.max(120, 3 * T);
    at(t, () => this.settle(s));
    for (const [when, fn] of steps) this.later(() => this.session === s && s.gen === gen && fn(), when);
  }

  /** sieve.e's outline: test each odd number, checkers call "fits", primes are punched. */
  runSieve(s) {
    const gen = s.gen;
    s.run = "busy";
    s.inits++;
    this.broadcast({ t: "run", state: "busy", inits: s.inits });
    let x = 1;
    const step = () => {
      if (this.session !== s || s.gen !== gen || this.health.core !== "up") return;
      // Clear the previous number's checker lamps.
      const off = {};
      CHECKERS.forEach((_, i) => (off[String(i + 1)] = { prog: setBit(s.machine.acc[String(i + 1)].prog, 11, "0") }));
      this.patch({ acc: off });
      x += 2;
      if (x > 2801) {
        s.run = "idle";
        this.broadcast({ t: "run", state: "idle", inits: s.inits, settled: { 19: 2801, 1: 0 } });
        return;
      }
      this.setAcc("19", x);
      const on = {};
      let fit = false;
      CHECKERS.forEach((p, i) => {
        if (x !== p && x % p === 0) {
          fit = true;
          on[String(i + 1)] = { prog: setBit(s.machine.acc[String(i + 1)].prog, 11, "1") };
        }
      });
      if (fit) this.patch({ acc: on });
      else this.punchCard(s, x);
      this.later(step, this.sieveMs[s.speed] ?? 100);
    };
    this.later(step, this.sieveMs[s.speed] ?? 100);
  }

  /** READ: the reader flip-flop, then the card's first number in Acc 1 (97,367). */
  runRead(s) {
    const gen = s.gen;
    s.run = "busy";
    this.broadcast({ t: "run", state: "busy", inits: s.inits });
    const ok = () => this.session === s && s.gen === gen;
    this.patch({ init: setBit(s.machine.init, 6, "1") });
    this.later(() => {
      if (!ok()) return;
      this.patch({ init: setBit(s.machine.init, 6, "0") });
      this.setAcc("1", 97367);
      if (!s.fired.has("card-read")) {
        s.fired.add("card-read");
        this.broadcast({ t: "checkpoint", id: "card-read" });
      }
    }, 400);
    this.later(() => ok() && this.settle(s), 600);
  }

  /** One flight: the recorded real cards, at the mock's pace; freeze on the landing card. */
  runFlight(s) {
    const gen = s.gen;
    s.run = "busy";
    s.inits++;
    this.broadcast({ t: "run", state: "busy", inits: s.inits });
    const ok = () => this.session === s && s.gen === gen && this.health.core === "up";
    FLIGHT.forEach((c, i) => {
      this.later(() => {
        if (!ok() || s.frozen) return;
        const n = s.cards.length + 1;
        const fields = [];
        for (let k = 0; k < 80; k += 5) fields.push(c.text.slice(k, k + 5));
        const num = (a, b) => Number((fields[a] + fields[b]).trim());
        this.setAcc("15", Number(fields[5]));
        this.setAcc("18", num(10, 11));
        const up = num(14, 15);
        this.patch({ acc: { 20: { digits: digitsOf(up), value: up, sign: up < 0 ? "M" : "P" } } });
        this.patch({ mult: { stage: (i % 13) + 1 }, mp: { stage: "0000000" + String(i % 3) + "00" } });
        const card = { n, text: c.text, fields };
        s.cards.push(card);
        this.broadcast({ t: "punch", ...card });
        if (n === 1 && !s.fired.has("first-hop")) {
          s.fired.add("first-hop");
          this.broadcast({ t: "checkpoint", id: "first-hop" });
        }
        if (fields[14].startsWith("-") && !s.fired.has("landed")) {
          s.fired.add("landed");
          s.frozen = true;
          s.stdin.push("s cy.op 1a"); // run.freezeAt
          // Like the real core: the next flight's setup has begun when the
          // clock stops (Hop back to 1, the next numbers loading).
          this.setAcc("15", 1);
          this.setAcc("18", 429410);
          this.setAcc("20", 177752);
          this.broadcast({ t: "checkpoint", id: "landed" });
          if (s.state === "running") {
            s.state = "result";
            this.sendSession();
          }
          // Attract: hold the landing, then a fresh session (a new core) flies again.
          if (s.mode === "attract" && this.attract) {
            this.attract.landed++;
            this.attractTotal++;
            // As attract.go landingOf: the landing card's numbers (up carries the 11-row overpunch).
            const up = fields[14] + fields[15];
            this.attract.landing = { card: n, hop: Number(fields[5]), along: num(10, 11), up: -Number(up.slice(1)), text: c.text, flightMs: (i + 1) * this.hopMs };
            this.setAttract("landed");
            this.later(() => {
              if (this.session === s && this.attract && this.health.core === "up") this.nextFlight();
            }, this.attractHoldMs);
          }
        }
      }, (i + 1) * this.hopMs);
    });
  }

  punchCard(s, value) {
    const n = s.cards.length + 1;
    const text = " ".repeat(60) + String(value).padStart(10, "0") + " ".repeat(10);
    const fields = [];
    for (let i = 0; i < 80; i += 5) fields.push(text.slice(i, i + 5));
    const card = { n, text, fields };
    s.cards.push(card);
    this.broadcast({ t: "punch", ...card });
    const fire = (id) => {
      if (s.fired.has(id)) return;
      s.fired.add(id);
      this.broadcast({ t: "checkpoint", id });
      if (id === s.mission.result && s.state === "running") {
        s.state = "result";
        this.sendSession();
      }
    };
    if (n >= 1) fire("first-card");
    if (n >= 100) fire("hundred");
    if (fields[13] === "02801") fire("last");
  }

  runClear(s) {
    const T = this.speedMs[s.speed] ?? 200;
    const gen = s.gen;
    s.run = "busy";
    this.broadcast({ t: "run", state: "busy", inits: s.inits });
    this.later(() => {
      if (this.session !== s || s.gen !== gen) return;
      this.setAcc("1", 0);
      this.setAcc("2", 0);
    }, T);
    this.later(() => this.session === s && s.gen === gen && this.settle(s), T + Math.max(120, 3 * T));
  }

  settle(s) {
    s.run = "idle";
    const settled = {};
    for (const w of s.mission.run.watch) settled[w] = s.machine.acc[w].value;
    this.broadcast({ t: "run", state: "idle", inits: s.inits, settled });
    if (!s.fired.has("first-square") && settled["2"] === 1) {
      s.fired.add("first-square");
      this.broadcast({ t: "checkpoint", id: "first-square" });
    }
    if (!s.fired.has("answer") && settled["1"] === 12) {
      s.fired.add("answer");
      this.broadcast({ t: "checkpoint", id: "answer" });
      s.state = "result";
      this.sendSession();
    }
  }

  // ------------------------------------------------------------- faults (test control)
  fault({ code = "E-CORE-DOWN", recoverAfterMs = 4000, final = false } = {}) {
    this.endSession(true);
    if (this.attract) this.setAttract("error");
    let attempt = 1;
    this.health = { core: "down", code, detail: "mock", attempt, of: 3, final, kioskClient: true };
    this.broadcast({ t: "health", ...this.health });
    if (final) return;
    const retry = () => {
      if (attempt < 3 && recoverAfterMs > 2500) {
        attempt++;
        this.health = { core: "down", code, detail: "mock", attempt, of: 3, final: false, kioskClient: true };
        this.broadcast({ t: "health", ...this.health });
      }
    };
    this.later(retry, Math.min(2000, recoverAfterMs / 2));
    this.later(() => {
      this.health = { core: "up", kioskClient: true };
      this.broadcast({ t: "health", ...this.health });
      this.broadcast(this.stateMsg());
      // Like the bridge (FR-51): attract resumes by itself once the core is back.
      if (this.attract) this.nextFlight();
    }, recoverAfterMs);
  }

  drop(ms) {
    this.refuseUntil = Date.now() + ms;
    for (const ws of this.clients) ws.terminate();
    this.clients.clear();
  }

  setConfig(cfg) {
    this.config = { ...this.config, ...cfg };
    this.broadcast({ t: "hello", protocol: 1, build: "mock-dev", config: this.config, health: this.health });
  }

  reset() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.attract = null;
    this.attractTotal = 0;
    this.framesPaused = false;
    this.attractHoldMs = 1500;
    this.endSession(true);
    this.log = [];
    this.health = { core: "up", kioskClient: true };
    this.config = defaultConfig();
    this.missionsAvailable = true;
    this.refuseUntil = 0;
    this.speedMs = { slow: 200, full: 8 };
    this.sieveMs = { slow: 120, full: 25 };
    this.hopMs = 150;
  }
}

function stepLine(step) {
  if (step.kind === "switch") return `s ${step.switch} ${step.value}`;
  return `p ${step.from} ${step.to}`;
}

function mergeInto(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== "object") target[k] = {};
      mergeInto(target[k], v);
    } else target[k] = v;
  }
}
