// S8 Finale, the pure parts (src/web/app/finale/beats.ts; UX 14.5, FR-45):
// beat sequencing and timers, which numbers F1 shows for full and partial
// data (never a made-up one), and the units / panels the visitor used.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BEAT_MS, BeatSequencer, f1Content, f2Caption, panelsUsed, unitsUsed, type Beat } from "../../src/web/app/finale/beats.ts";
import { Visit, type VisitSummary } from "../../src/web/app/state/visit.ts";
import { CardLog } from "../../src/web/app/run/cards.ts";
import { FakeClock } from "./fakes.ts";

const MISSIONS = [
  { id: "trajectory", order: 3, title: "Trajectory" },
  { id: "squares", order: 1, title: "Squares" },
  { id: "primes", order: 2, title: "Primes" },
];

function seq(opts: { room?: boolean } = {}) {
  const clock = new FakeClock();
  const shown: Beat[] = [];
  let ended = 0;
  let room = opts.room ?? true;
  const s = new BeatSequencer({
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    canShowRoom: () => room,
    show: (b) => shown.push(b),
    end: () => ended++,
  });
  return { s, clock, shown, ended: () => ended, setRoom: (v: boolean) => (room = v) };
}

// ---------------------------------------------------------------- sequencing

test("timers: five beats in at most 85 s, then F5 returns to S1", () => {
  assert.equal(Object.values(BEAT_MS).reduce((a, b) => a + b, 0), 85_000);
  const { s, clock, shown, ended } = seq();
  s.start();
  assert.deepEqual(shown, [1]);
  clock.advance(14_999);
  assert.deepEqual(shown, [1]);
  clock.advance(1);
  assert.deepEqual(shown, [1, 2]);
  clock.advance(15_000);
  clock.advance(15_000);
  assert.deepEqual(shown, [1, 2, 3, 4]);
  clock.advance(20_000);
  assert.deepEqual(shown, [1, 2, 3, 4, 5]);
  assert.equal(ended(), 0);
  clock.advance(19_999);
  assert.equal(ended(), 0);
  clock.advance(1);
  assert.equal(ended(), 1);
  assert.equal(s.beat, null);
  assert.equal(clock.pending, 0);
});

test("Next / a touch advances and restarts the beat's timer; nothing past F5", () => {
  const { s, clock, shown } = seq();
  s.start();
  clock.advance(10_000);
  s.next();
  assert.deepEqual(shown, [1, 2]);
  clock.advance(10_000); // F2's own 15 s started at the tap
  assert.deepEqual(shown, [1, 2]);
  clock.advance(5_000);
  assert.deepEqual(shown, [1, 2, 3]);
  s.next();
  s.next();
  assert.deepEqual(shown, [1, 2, 3, 4, 5]);
  s.next();
  assert.deepEqual(shown, [1, 2, 3, 4, 5]);
});

test("Skip goes to F5 from any beat, once; F5 holds 20 s after the last touch", () => {
  const { s, clock, shown, ended } = seq();
  s.start();
  s.next();
  s.skip();
  assert.deepEqual(shown, [1, 2, 5]);
  s.skip();
  assert.deepEqual(shown, [1, 2, 5]);
  clock.advance(15_000);
  s.hold(); // a touch on F5
  clock.advance(15_000);
  assert.equal(ended(), 0);
  clock.advance(5_000);
  assert.equal(ended(), 1);
});

test("hold() does nothing before F5", () => {
  const { s, clock, shown } = seq();
  s.start();
  clock.advance(14_000);
  s.hold();
  clock.advance(1_000);
  assert.deepEqual(shown, [1, 2]);
});

test("core down: F2 is skipped (asked when F2 would start)", () => {
  const { s, clock, shown, setRoom } = seq({ room: false });
  s.start();
  clock.advance(15_000);
  assert.deepEqual(shown, [1, 3]);
  // Up again before the next finale: F2 shows.
  const b = seq();
  b.s.start();
  b.setRoom(false);
  b.s.next();
  assert.deepEqual(b.shown, [1, 3]);
  setRoom(true);
  s.stop();
  s.start(2);
  assert.deepEqual(shown.at(-1), 2);
});

test("start(5): back from Explore or S16 lands on F5 and holds", () => {
  const { s, clock, shown, ended } = seq();
  s.start(5);
  assert.deepEqual(shown, [5]);
  clock.advance(20_000);
  assert.equal(ended(), 1);
});

test("stop() clears the timer: nothing fires after the screen is gone", () => {
  const { s, clock, shown, ended } = seq();
  s.start();
  s.stop();
  clock.advance(200_000);
  assert.deepEqual(shown, [1]);
  assert.equal(ended(), 0);
  assert.equal(clock.pending, 0);
});

// ---------------------------------------------------------------- F1 numbers

function summary(over: Partial<VisitSummary> = {}): VisitSummary {
  return {
    done: ["squares", "primes", "trajectory"],
    missions: {
      squares: { id: "squares", reached: true, squares: { n: 7, square: 49 } },
      primes: { id: "primes", reached: true, cards: { cards: 143, last: 2797 } },
      trajectory: { id: "trajectory", reached: true, flight: { hops: 34, along: 9123, top: 4000 } },
    },
    handCables: 9,
    handSwitches: 4,
    minutes: 12,
    ...over,
  };
}

test("F1 with every real figure: three plates in mission order, minutes, hand line", () => {
  const c = f1Content(summary(), MISSIONS);
  assert.equal(c.line, "In 1946, setting up a job like this could take people a day or more. You did it in about 12 minutes.");
  assert.equal(c.minutes, 12);
  assert.deepEqual(
    c.plates.map((p) => [p.id, p.text, p.figure]),
    [
      ["squares", "You counted up to 7 x 7 = 49.", true],
      ["primes", "143 cards punched. The last prime was 2,797.", true],
      ["trajectory", "A shell's flight, in 34 hops.", true],
    ],
  );
  assert.equal(c.hand, "You plugged in 9 cables and set 4 switches yourself, just like ENIAC's first programmers.");
});

test("F1 partial data: a figure never seen is not shown, only the mission's words", () => {
  const c = f1Content(
    summary({
      missions: {
        squares: { id: "squares", reached: true },
        primes: { id: "primes", reached: true, cards: { cards: 5 } }, // newest card unreadable
        trajectory: { id: "trajectory", reached: true }, // skipped to S7 before the landing
      },
      handCables: 0,
      handSwitches: 0,
    }),
    MISSIONS,
  );
  assert.deepEqual(
    c.plates.map((p) => [p.text, p.figure]),
    [
      ["ENIAC counted in squares.", false],
      ["5 cards punched.", true],
      ["ENIAC worked out a shell's flight.", false],
    ],
  );
  assert.equal(c.hand, null);
  for (const p of c.plates) assert.doesNotMatch(p.text, /\b0\b|undefined|NaN|null/);
});

test("F1 minutes are shown only from 3 to 30", () => {
  for (const [m, shown] of [[null, false], [0, false], [2, false], [3, true], [30, true], [31, false], [95, false]] as const) {
    const c = f1Content(summary({ minutes: m }), MISSIONS);
    assert.equal(c.minutes, shown ? m : null, `m=${m}`);
    assert.equal(c.line.includes("You did it in about"), shown, `m=${m}`);
    assert.ok(c.line.startsWith("In 1946, setting up a job like this could take people a day or more."));
  }
});

test("F1 hand line: a, two, digits; cables only, switches only; omitted at zero", () => {
  const L = ", just like ENIAC's first programmers.";
  assert.equal(f1Content(summary({ handCables: 1, handSwitches: 1 }), MISSIONS).hand, `You plugged in a cable and set a switch yourself${L}`);
  assert.equal(f1Content(summary({ handCables: 2, handSwitches: 2 }), MISSIONS).hand, `You plugged in two cables and set two switches yourself${L}`);
  assert.equal(f1Content(summary({ handCables: 3, handSwitches: 0 }), MISSIONS).hand, `You plugged in 3 cables yourself${L}`);
  assert.equal(f1Content(summary({ handCables: 0, handSwitches: 2 }), MISSIONS).hand, `You set two switches yourself${L}`);
  assert.equal(f1Content(summary({ handCables: 0, handSwitches: 0 }), MISSIONS).hand, null);
});

test("F1 shows only missions done this visit", () => {
  const c = f1Content(summary({ done: ["primes"] }), MISSIONS);
  assert.deepEqual(c.plates.map((p) => p.id), ["primes"]);
});

test("F1 from a real Visit store: tape rows, cards, step acks", () => {
  let t = 0;
  const v = new Visit(() => t);
  v.begin();
  v.stepApplied("s1", { id: "a", kind: "plug" }, false);
  v.stepApplied("s1", { id: "b", kind: "switch" }, false);
  v.stepApplied("s1", { id: "c", kind: "plug" }, true); // "Do it for me": not counted
  v.tape("squares", [{ x: 1, sq: 1 }, { x: 2, sq: 4 }, { x: 3, sq: 9 }]);
  v.reached("squares");
  v.reached("primes"); // skipped to the answer with no card: words only
  v.cards("trajectory", new CardLog(null)); // nothing punched: nothing recorded
  v.reached("trajectory");
  t = 4 * 60_000;
  const c = f1Content(v.summary(), MISSIONS);
  assert.deepEqual(c.plates.map((p) => p.text), ["You counted up to 3 x 3 = 9.", "ENIAC hunted for prime numbers.", "ENIAC worked out a shell's flight."]);
  assert.equal(c.minutes, 4);
  assert.equal(c.hand, "You plugged in a cable and set a switch yourself, just like ENIAC's first programmers.");
});

// ---------------------------------------------------------------- F2 units

/** The compiled missions' units (the mock fixtures are compiled from missions/*.yaml). */
function units(id: string): string[] {
  return JSON.parse(readFileSync(new URL(`./mock/missions/${id}.json`, import.meta.url), "utf8")).units;
}

test("units used: the union of the three programs, as room targets", () => {
  const t = unitsUsed([units("squares"), units("primes"), units("trajectory")]);
  for (const id of ["init", "mp", "ft1", "ft2", "ft3", "mult", "ct", "pr", "dt", "pt"]) assert.ok(t.has(id), id);
  for (let n = 1; n <= 20; n++) assert.ok(t.has(`a${n}`), `a${n}`);
  assert.ok(!t.has("div"), "no mission uses the divider");
  assert.ok(!t.has("cyc"), "the cycling unit is not ringed (as in Explore)");
  assert.ok(!t.has("ad"), "adapters are not units of the room");
});

test("panels used: each unit's whole width once; all three missions = 38 of 40", () => {
  const all = unitsUsed([units("squares"), units("primes"), units("trajectory")]);
  // 40 panels minus the Cycling Unit and the Divider (one panel each).
  assert.equal(panelsUsed(all), 38);
  assert.equal(panelsUsed(unitsUsed([units("squares")])), 1 + 2 + 2); // Initiating, Constant Transmitter (2), a1, a2
  assert.equal(panelsUsed(new Set(["mult", "pr", "dt"])), 3 + 4); // trays are not panels
  assert.equal(panelsUsed(new Set()), 0);
});

test("F2 caption: the real count, or no count when a unit list is missing", () => {
  assert.equal(f2Caption(38), "You used 38 of ENIAC's 40 panels. Yellow rings show them. ENIAC did all of this with cables and switches.");
  assert.equal(f2Caption(null), "Yellow rings show the units you used. ENIAC did all of this with cables and switches.");
});
