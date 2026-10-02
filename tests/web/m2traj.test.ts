// M2 Trajectory UI logic (pure parts): the connect-the-dots figures, the
// arc's scales, the input card's numbers, the recorded flight through the
// card log (apex, landing, crossing), and the Workbench for the mission.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { arcDots, beatAt, dotsBeats, hopBeats, DOTS_LOOP_MS, HOP_LOOP_MS } from "../../src/web/app/stage/trajfig.ts";
import { plotScale, readCardNumbers, FILM_KEEP } from "../../src/web/app/run/filmstage.ts";
import { CardLog } from "../../src/web/app/run/cards.ts";
import { workbenchPlan } from "../../src/web/app/stage/workbench.ts";
import { dialClusterFor, jackClusterFor } from "../../src/web/app/stage/clusters.ts";
import { toView } from "../../src/web/app/mission/view.ts";
import { stepTargets } from "../../src/web/app/mission/runner.ts";
import type { MissionCompiled } from "../../src/web/app/protocol.ts";

const mock = (f: string) => JSON.parse(readFileSync(join(import.meta.dirname, "mock", "missions", f), "utf8"));
const traj: MissionCompiled = mock("trajectory.json");
const flight: { t: number; text: string }[] = mock("trajectory-flight.json").cards;
const fieldsOf = (text: string) => Array.from({ length: 16 }, (_, i) => text.slice(i * 5, i * 5 + 5));

test("briefing: eight dots about 350 ms apart on a rising and falling arc, then the joined path", () => {
  const b = dotsBeats();
  assert.equal(b.length, 9);
  assert.deepEqual(b.slice(0, 8).map((x) => x.dots), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(b[1].at - b[0].at, 350);
  assert.equal(b[0].caption, "1 dot");
  assert.equal(b[8].traced, true);
  assert.equal(b[8].caption, "Each dot is a card. Join the dots: that is the path.");
  assert.ok(b[8].at < DOTS_LOOP_MS && DOTS_LOOP_MS <= 10_000);
  const pts = arcDots();
  const top = pts.reduce((a, p) => (p.y < a.y ? p : a));
  assert.ok(pts[0].y > top.y && pts[7].y > top.y, "up, over the top, down");
  assert.ok(pts.every((p, i) => i === 0 || p.x > pts[i - 1].x));
});

test("plan: one hop in four beats (air, gravity, hop and card, still flying), then twice quicker", () => {
  const b = hopBeats();
  assert.deepEqual(b.slice(0, 5).map((x) => [x.at, x.stage]), [[300, "start"], [1800, "air"], [3400, "gravity"], [5000, "hop"], [6500, "check"]]);
  assert.equal(beatAt(b, 3500)?.stage, "gravity");
  const later = b.filter((x) => x.hop === 1);
  assert.equal(later.length, 5);
  assert.ok(later[4].at - later[0].at < (6500 - 300) / 2, "the repeat is at least twice quicker");
  assert.ok(b[b.length - 1].at < HOP_LOOP_MS);
});

test("the input card's seven numbers, as the reader splits it into 10-column fields", () => {
  assert.deepEqual(readCardNumbers(traj.readCard!.text), ["97,367", "13,975", "98,175", "10,000,000", "-3,217", "14,320,000", "5,932,000"]);
});

test("the recorded real flight: 34 cards, apex at hop 16 (the dot before the first fall), landing on 34, crossing between 33 and 34", () => {
  const log = new CardLog(traj.run.cards as any, traj.run.plot as any);
  flight.forEach((c, i) => log.add({ n: i + 1, text: c.text, fields: fieldsOf(c.text) }));
  assert.equal(log.count, 34);
  assert.equal(log.landed?.n, 34);
  assert.equal(log.apex?.n, 16);
  const x = log.crossing()!;
  assert.ok(x.x > log.dots[32].x && x.x < log.dots[33].x);
  assert.equal(log.valueOf(log.last!), 34, "the card's value is its hop number");
  const s = plotScale(log.dots, 1260, 322);
  assert.ok(s.xMax >= 390_417_741 && s.yMax >= 45_286_111);
  assert.ok(s.stretch > 1.2, "the flight is flat: the height is stretched (and says so)");
  const grown = plotScale(log.dots.slice(0, 3), 1260, 322, s);
  assert.equal(grown.xMax, s.xMax, "scales never shrink");
  assert.ok(FILM_KEEP * 64 + (FILM_KEEP - 1) * 16 <= 1360, "film cards fit with 16 px gaps");
});

test("workbench: Init, Printer, Acc 19, Master Programmer; every step target has a real-neighbour close-up", () => {
  const v = toView(traj);
  assert.deepEqual(workbenchPlan(v).units, ["i", "pr", "a19", "p"]);
  for (const st of v.steps) {
    for (const id of stepTargets(st)) {
      const c = id.startsWith("sw:") ? dialClusterFor(id)?.dials : jackClusterFor(id)?.jacks;
      assert.ok(c && c.some((x) => x.id === id) && c.length >= 3, id);
    }
  }
});
