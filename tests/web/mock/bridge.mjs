// DEV/TEST ONLY: a mock of eniac-bridge's websocket + mission API, driven by
// the message schema in docs/architecture.md 5.4-5.6. It simulates sq.e
// (one square per INIT: program 6 twice, then program 5 via trunk 1-3, then
// program 7) so the UI is runnable in a browser before the Go bridge (#8,
// #10, #11) exists. It is NOT the simulator and is never shipped: the
// production bundle is built from src/web/app only and is checked for
// fixture markers (tests/web/bundle.test.ts).

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const SQUARES = JSON.parse(readFileSync(join(here, "missions", "squares.json"), "utf8"));
delete SQUARES._comment;

const WL = new Set(["start_mission", "apply_step", "skip_setup", "button", "set_speed", "end_session", "metric", "ping"]);
// UI metric whitelist (architecture 8.3, protocol.gen.ts Metric.ev); bridge-owned names are NOT_ALLOWED.
const METRICS = new Set(["wrong_tap", "step_done", "speed", "skip_to_answer", "setup_skipped", "idle_reset"]);

export function defaultConfig() {
  return {
    idle: { setupS: 90, runS: 180, countdownS: 15 },
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
      cards: [],
      run: s ? { state: s.run, inits: s.inits } : { state: "idle", inits: 0 },
    };
  }

  missionsList() {
    return [
      {
        id: "squares",
        title: SQUARES.title,
        order: 1,
        summary: SQUARES.summary,
        buttons: SQUARES.run.buttons,
        available: this.missionsAvailable,
        ...(this.missionsAvailable ? {} : { reason: "mock: disabled" }),
      },
    ];
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
        if (m.mission !== "squares" || !this.missionsAvailable) return err("NOT_ALLOWED", "unknown mission");
        return this.startSession(m.mode || "visitor");
      case "end_session":
        return this.endSession();
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
        s.stdin.push(`s cy.rate ${m.speed === "full" ? 0 : 100}`);
        return;
      case "button": {
        if (!s || !["armed", "running", "result"].includes(s.state)) return err("BAD_STATE", "not armed");
        if (!s.mission.run.buttons.includes(m.b)) return err("NOT_ALLOWED", "button");
        if (s.run !== "idle") return err("BUSY", "machine busy");
        s.stdin.push(`b ${m.b[0]}`);
        if (s.state === "armed") {
          s.state = "running";
          this.sendSession();
        }
        return m.b === "init" ? this.runInit(s) : this.runClear(s);
      }
    }
  }

  // ------------------------------------------------------------- sessions
  startSession(mode) {
    // Like the real bridge: the previous session is still reported (it was
    // current when start_mission arrived), then visibly ended, before the
    // new one starts.
    if (this.session) {
      this.sendSession();
      this.endSession(false);
    }
    const s = {
      id: randomBytes(4).toString("hex"),
      mission: SQUARES,
      mode,
      state: "starting",
      applied: [],
      machine: initialMachine(),
      pending: {},
      run: "idle",
      inits: 0,
      speed: SQUARES.run.defaultSpeed,
      fired: new Set(),
      stdin: [],
      gen: 0,
    };
    this.session = s;
    this.sendSession();
    this.later(() => {
      if (this.session !== s) return;
      s.state = "setup";
      this.sendSession();
      this.broadcast(this.stateMsg());
    }, 350);
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
    this.endSession(true);
    this.log = [];
    this.health = { core: "up", kioskClient: true };
    this.config = defaultConfig();
    this.missionsAvailable = true;
    this.refuseUntil = 0;
    this.speedMs = { slow: 200, full: 8 };
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
