// S16 "Keeping ENIAC alive" (docs/tubes.md 2.9): the unit-level TUBE tests.
// Copy limits and claim ids (TUBE-01, 02), banned wording (03), figure
// numbers (04), the re-enactment's state machine, ladder, help paths and
// faults (11 to 14), no live data by construction (15), drawn-panel
// hygiene (16) and the metric names (23). The e2e half is
// tests/web/e2e/tubes.spec.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BANNED, CAPTIONS, DOTS, FAULTS, MYTH, PLATE, POWER, TRY, TUBE_CARDS, TUBES, WEEK, WORK } from "../../src/web/app/tubes/content.ts";
import { Reenactment } from "../../src/web/app/tubes/reenact.ts";
import { LAYOUT, STAGE, accSvg, banner, figPower, figTubes, figWeek, panelSvg, placeSvg, targets } from "../../src/web/app/tubes/art.ts";
import { GLOSSARY, GLOSSARY_COPY, words } from "../../src/web/app/explore/content.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const app = join(root, "src", "web", "app");

/** Every string a visitor can read on S16 (and its glossary words), for every fault. */
function visitorText(): string[] {
  const out: string[] = [TUBES.title, TUBES.exploreButton, TUBES.cta, PLATE.badge, PLATE.text, MYTH.title, MYTH.link, MYTH.body, MYTH.quote, MYTH.who, MYTH.stage.title];
  for (const c of TUBE_CARDS) out.push(c.title, c.tag, c.body, c.stage.title, c.stage.sub ?? "");
  const walk = (v: unknown): void => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => k !== "fc" && walk(x));
  };
  walk(CAPTIONS);
  walk(DOTS.boxes.map((b) => b.label));
  walk(POWER.parts.map((p) => p.label));
  walk(WORK.map((w) => [w.label, w.text]));
  const { fb, cap, steps, ...rest } = TRY;
  walk(steps);
  for (const v of Object.values(rest)) if (typeof v === "string") out.push(v);
  for (const f of FAULTS) {
    out.push(TRY.acc(f.acc), TRY.placeLabel(f.place), fb.panelOk(f.acc), fb.placeOk(f.place, f.lamp), ...cap.place(f.acc), ...cap.unit(f.place));
    for (const st of [2, 3, 4]) out.push(fb.hint[st](f));
  }
  out.push(...cap.cleared, ...cap.tested, ...cap.read, ...cap.fixed, fb.tested, fb.tubeOk, fb.warm, fb.doneForYou, fb.ring, fb.offer, ...Object.values(fb.wrong1));
  for (const g of GLOSSARY.filter((x) => x.tubes || x.term === "Neon lamp")) out.push(g.term, g.meaning);
  return out.filter(Boolean);
}

// ---------------------------------------------------------------- TUBE-01 copy limits

test("TUBE-01: five cards of 20 to 40 words, myth card at most 40, plate exactly the 20 words, rail cards at most 40", () => {
  assert.equal(TUBE_CARDS.length, 5);
  assert.deepEqual(
    TUBE_CARDS.map((c) => c.title),
    ["The tubes", "Power and heat", "Why tubes burned out", "The hunt", "A week with ENIAC"],
  );
  for (const c of TUBE_CARDS) {
    assert.ok(words(c.body) <= 40 && words(c.body) >= 20, `${c.id}: ${words(c.body)} words`);
    assert.ok(words(c.tag) >= 2 && words(c.tag) <= 4, `${c.id} tag: ${c.tag}`);
  }
  assert.ok(words(MYTH.body) <= 40);
  assert.equal(PLATE.badge, "RE-ENACTMENT");
  assert.equal(PLATE.text, "These panels are drawn, not the live ENIAC. The fault is made up. The steps follow the 1946 maintenance manual.");
  assert.equal(words(PLATE.text), 20);
  for (const s of TRY.steps) assert.ok(words(s.p) <= 40, s.h);
  assert.ok(words(TRY.win) <= 40);
  assert.equal(words(TRY.win), 29);
});

test("TUBE-01: the glossary's new words are at most 25 words and Show me opens a real S16 card; Neon lamp says the tubes are inside", () => {
  assert.equal(GLOSSARY.length, 19);
  assert.equal(Math.ceil(GLOSSARY.length / GLOSSARY_COPY.perPage), 3);
  const want: Record<string, number> = { "Vacuum tube": 1, "Plug-in unit": 4, Kilowatt: 2 };
  for (const [term, card] of Object.entries(want)) {
    const g = GLOSSARY.find((x) => x.term === term)!;
    assert.ok(g, term);
    assert.equal(g.tubes, card);
    assert.equal(g.show, null);
    assert.ok(words(g.meaning) <= 25, `${term}: ${words(g.meaning)}`);
  }
  const neon = GLOSSARY.find((x) => x.term === "Neon lamp")!;
  assert.equal(neon.meaning, "A small glowing bulb. Each place in an accumulator has ten lamps, 0 to 9. The lit one shows the digit. The tubes are inside.");
  assert.equal(neon.show, "acc");
});

// ---------------------------------------------------------------- TUBE-02 claim ids

test("TUBE-02: every content block lists its claims, and each is a row of docs/fact-check.md group E", () => {
  const fc = readFileSync(join(root, "docs", "fact-check.md"), "utf8");
  const groupE = fc.slice(fc.indexOf("### E."), fc.indexOf("## Sources"));
  const rows = new Set([...groupE.matchAll(/^\| (E\d+) \|/gm)].map((m) => m[1]));
  assert.ok(rows.size >= 30, `group E rows: ${rows.size}`);
  const blocks: [string, readonly string[] | undefined][] = [
    ...TUBE_CARDS.map((c) => [c.id, c.fc] as [string, string[] | undefined]),
    ["myth", MYTH.fc],
    ...Object.entries(CAPTIONS).map(([k, v]) => [`caption ${k}`, v.fc] as [string, string[]]),
    ["win", TRY.winFc],
    ...GLOSSARY.filter((g) => g.tubes).map((g) => [g.term, g.fc] as [string, string[] | undefined]),
  ];
  for (const [name, ids] of blocks) {
    assert.ok(ids && ids.length, `${name} has no fc`);
    for (const id of ids) assert.ok(rows.has(id), `${name}: ${id} is not in group E`);
  }
  // Claims that are wrong, unverifiable or myths are never cited as support.
  for (const [name, ids] of blocks) for (const bad of ["E14", "E16", "E18", "E19", "E27", "E29"]) assert.ok(!ids!.includes(bad), `${name} cites ${bad}`);
});

// ---------------------------------------------------------------- TUBE-03 banned wording

test("TUBE-03: the myths and misreadings of docs/tubes.md 1.4 appear nowhere; the lights story only as the myth card's question, answered No.", () => {
  const text = visitorText();
  for (const s of text) {
    for (const b of BANNED) assert.ok(!s.toLowerCase().includes(b.toLowerCase()), `"${b}" in: ${s}`);
    assert.doesNotMatch(s, /\[FC\]|\bFC\b|TODO|\bpending\b|\bdemo\b/i, s);
  }
  const lights = text.filter((s) => /lights of Philadelphia/i.test(s));
  assert.ok(lights.length >= 1);
  for (const s of lights) assert.equal(s, "Did the lights of Philadelphia dim?");
  assert.match(MYTH.body, /^No\. /);
  assert.match(MYTH.body, /“total fiction\.”/);
  // Eckert's figures are always his.
  assert.match(TUBE_CARDS[2].body, /Eckert remembered losing about one tube every two days/);
  assert.match(TUBE_CARDS[3].body, /Eckert said they found a bad tube within 15 minutes/);
  assert.match(TRY.win, /Eckert said a hunt took up to 15 minutes/);
  // Never "most failed at switch-on"; never that failures fell over the years.
  for (const s of text) assert.doesNotMatch(s, /\bmost\b.*\b(fail|failures)\b|failures? (fell|dropped)/i, s);
});

// ---------------------------------------------------------------- TUBE-04 figure numbers

test("TUBE-04: the figures' numbers add up (dots, power, bulbs, days, week, time at work)", () => {
  // Card 1: exactly 18,000 dots; boxes of 10, 400 and under 800.
  assert.equal(DOTS.cols * DOTS.rows, 18_000);
  assert.equal(DOTS.total, 18_000);
  const box = Object.fromEntries(DOTS.boxes.map((b) => [b.id, b.w * b.h]));
  assert.equal(box.radio, 10);
  assert.equal(box.radar, 400);
  assert.ok(box.b29 < 800 && box.b29 > 400);
  for (const b of DOTS.boxes) {
    assert.equal(b.w * b.h, b.tubes);
    assert.ok(b.col + b.w <= DOTS.cols && b.row + b.h <= DOTS.rows);
  }
  const fig = figTubes();
  assert.match(fig, /class="tb-dots" data-dots="18000"/);
  assert.match(fig, /data-box="radio" data-dots="10"/);
  assert.match(fig, /data-box="radar" data-dots="400"/);
  assert.match(fig, /data-box="b29" data-dots="760"/);
  // Card 2: 80 + 45 + 20 + 5 = 150; heaters are more than half; 1,500 bulbs; 5 to 6 days.
  assert.equal(POWER.parts.reduce((a, p) => a + p.kw, 0), POWER.totalKw);
  assert.deepEqual(POWER.parts.map((p) => p.kw), [80, 45, 20, 5]);
  assert.ok(POWER.parts[0].kw / POWER.totalKw > 0.5);
  assert.equal((POWER.totalKw * 1000) / POWER.bulbW, POWER.bulbs);
  assert.equal(Math.round(POWER.totalKw / POWER.homeKwhPerDay), POWER.days[0]); // 5.07
  assert.equal(Math.round(POWER.aberdeenKw / POWER.homeKwhPerDay), POWER.days[1]); // 5.88
  assert.ok(Math.abs(10_791 / 365 - POWER.homeKwhPerDay) < 0.05); // EIA 2022
  assert.ok(Math.abs(POWER.homeKwhPerDay / 24 - POWER.homeKw) < 0.05);
  assert.match(CAPTIONS.power.hour, /in 5 to 6 days/);
  // The drawn bar is to scale (one home is the same scale as ENIAC).
  const widths = [...figPower().matchAll(/class="tb-(kw|home)" data-kw="([\d.]+)" x="[\d.]+" y="\d+" width="([\d.]+)"/g)].map((m) => [Number(m[2]), Number(m[3])]);
  assert.equal(widths.length, 5);
  const scale = widths[0][1] / widths[0][0];
  for (const [kw, w] of widths) assert.ok(Math.abs(w - kw * scale) < 0.01, `${kw} kW drawn ${w}`);
  // Card 3: one 8-hour shift, five days; heaters all week.
  assert.deepEqual(WEEK, { shiftHours: 8, workDays: 5, days: 7, heatersAllWeek: true });
  // Card 5: 5 to 25, 55, 70 percent (0.70 in 1954 is "7 hours in every 10").
  assert.deepEqual(WORK.map((w) => [w.from, w.to]), [[5, 25], [0, 55], [0, 70]]);
  assert.match(TUBE_CARDS[4].body, /5 to 25 percent/);
  assert.match(TUBE_CARDS[4].body, /7 hours in every 10/);
  assert.equal([...figWeek().matchAll(/class="tb-work"/g)].length, 3);
  for (const id of ["tubes", "power", "why", "hunt", "week", "myth"] as const) assert.match(banner(id), /^<svg/);
});

// ---------------------------------------------------------------- TUBE-11 to 14 the re-enactment

/** Plays one fault by hand: the wrong targets first if asked. */
function solve(v: number): Reenactment {
  const r = new Reenactment(v);
  const a = r.answer;
  assert.equal(r.runTest().kind, "advance");
  assert.equal(r.tapPanel(a.panel).kind, "advance");
  assert.equal(r.tapPlace(a.place).kind, "advance");
  assert.equal(r.touchTube(a.tube).kind, "advance");
  assert.equal(r.plugFresh().kind, "advance");
  return r;
}

test("TUBE-11: the steps follow docs/tubes.md 2.5.3 exactly; only the right target advances", () => {
  const r = new Reenactment(0);
  assert.equal(r.step, 1);
  // Before the test: four panels cleared to zero.
  for (let i = 0; i < 4; i++) assert.deepEqual(r.panelDigits(i), Array(10).fill(0));
  assert.equal(r.tapPanel(2).kind, "ignored"); // nothing to tap yet
  r.runTest();
  assert.equal(r.step, 2);
  // Three panels show 5555555555; ACC 3 has lamp 9 lit in place 4.
  for (let i = 0; i < 4; i++) assert.deepEqual(r.panelDigits(i), i === 2 ? [5, 5, 5, 9, 5, 5, 5, 5, 5, 5] : Array(10).fill(5));
  for (const i of [0, 1, 3]) {
    assert.equal(r.tapPanel(i).kind, "wrong");
    assert.equal(r.step, 2);
  }
  r.tapPanel(2);
  assert.equal(r.step, 3);
  assert.equal(r.fb!.text, "ACC 3 it is. Its lamps are out of line.");
  for (const c of [0, 1, 2, 4, 9]) assert.equal(r.tapPlace(c).kind, "wrong");
  assert.equal(r.step, 3);
  r.tapPlace(3);
  assert.equal(r.step, 4);
  assert.equal(r.fb!.text, "Place 4 shows 9, not 5. Its plug-in unit slides out.");
  // A warm tube never advances step 4; the cold one does.
  for (const t of [0, 1, 3, 4, 5, 6, 7]) {
    assert.equal(r.touchTube(t).kind, "warm");
    assert.equal(r.step, 4);
    assert.equal(r.felt.get(t), "warm");
  }
  r.touchTube(2);
  assert.equal(r.step, 5);
  assert.equal(r.felt.get(2), "cold");
  r.plugFresh();
  assert.equal(r.step, "fixed");
  for (let i = 0; i < 4; i++) assert.deepEqual(r.panelDigits(i), Array(10).fill(5));
  assert.equal(r.assisted, false);
});

test("TUBE-12: the ladder per step: #1 X and the hint, #2 the ring, #3 Do it for me filled; it resets on each step", () => {
  const r = new Reenactment(0);
  r.runTest();
  const o1 = r.tapPanel(0);
  assert.deepEqual(o1, { kind: "wrong", target: 0, level: 1 });
  assert.equal(r.fb!.kind, "wrong");
  assert.equal(r.fb!.text, "Not quite. That one lines up with the others. Try another.");
  r.tapPanel(1);
  assert.equal(r.level, 2);
  assert.equal(r.fb!.text, "Look for the glowing ring. Hint: look for a lamp sitting lower than the rest.");
  assert.equal(r.offerFilled, false);
  r.tapPanel(3);
  assert.equal(r.level, 3);
  assert.equal(r.offerFilled, true);
  assert.equal(r.fb!.text, "Want us to do this one?");
  r.tapPanel(2);
  assert.equal(r.wrong, 0); // a new step: the ladder starts again
  r.tapPlace(0);
  assert.equal(r.fb!.text, "Not quite. That column is right. Look for the lamp that is lit at the wrong number.");
  r.tapPlace(1);
  assert.equal(r.fb!.text, "Look for the glowing ring. Hint: one column is lit at 9, not 5. Count along from the left.");
  r.tapPlace(3);
  // Warm tubes count toward the ladder but are not errors.
  r.touchTube(0);
  assert.equal(r.fb!.kind, "ok");
  assert.equal(r.fb!.text, "Warm. That one works. Try another.");
  r.touchTube(1);
  assert.equal(r.level, 2);
  r.touchTube(3);
  assert.equal(r.offerFilled, true);
  assert.match(r.fb!.text, /Want us to do this one\?/);
  // Fault 1 lights a lamp ABOVE 5: the hint says "higher".
  const r1 = new Reenactment(1);
  r1.runTest();
  r1.tapPanel(1);
  r1.tapPanel(2);
  assert.match(r1.fb!.text, /sitting higher than the rest/);
});

test("TUBE-13: Do it for me and Skip to the answer reach the same states as the manual path", () => {
  for (let v = 0; v < 3; v++) {
    const byHand = solve(v);
    const helped = new Reenactment(v);
    helped.runTest();
    assert.equal(helped.doForMe().kind, "advance");
    assert.equal(helped.step, 3);
    helped.doForMe();
    assert.equal(helped.step, 4);
    helped.doForMe();
    assert.equal(helped.step, 5);
    assert.equal(helped.felt.get(helped.answer.tube), "cold");
    assert.equal(helped.doForMe().kind, "ignored"); // step 5 is a button press
    helped.plugFresh();
    assert.equal(helped.step, "fixed");
    assert.equal(helped.assisted, true);
    for (const st of [2, 3, 4, 5] as const) {
      const sk = new Reenactment(v);
      sk.runTest();
      while (sk.step !== st) sk.doForMe();
      assert.equal(sk.skip().kind, "advance");
      assert.equal(sk.step, "fixed");
      for (let i = 0; i < 4; i++) assert.deepEqual(sk.panelDigits(i), byHand.panelDigits(i));
    }
    assert.equal(new Reenactment(v).skip().kind, "ignored"); // not before the test
    for (let i = 0; i < 4; i++) assert.deepEqual(helped.panelDigits(i), byHand.panelDigits(i));
  }
});

test("TUBE-14: three authored faults, each solvable, as named; Try another fault cycles 0, 1, 2, 0; a new screen starts at 0", () => {
  assert.deepEqual(FAULTS, [
    { acc: 3, place: 4, lamp: 9, tube: 3 },
    { acc: 1, place: 8, lamp: 1, tube: 6 },
    { acc: 4, place: 2, lamp: 8, tube: 1 },
  ]);
  for (let v = 0; v < 3; v++) {
    const r = new Reenactment(v);
    r.runTest();
    const f = FAULTS[v];
    // The odd lamp is in the named panel and place, lit at the named number; nowhere else.
    for (let i = 0; i < 4; i++) {
      const d = r.panelDigits(i);
      d.forEach((x, c) => assert.equal(x, i === f.acc - 1 && c === f.place - 1 ? f.lamp : 5));
    }
    assert.notEqual(f.lamp, 5);
    assert.equal(solve(v).step, "fixed");
  }
  const r = new Reenactment();
  const seen = [r.variant];
  for (let k = 0; k < 3; k++) {
    solve(r.variant);
    r.another();
    seen.push(r.variant);
    assert.equal(r.step, 1);
    assert.equal(r.felt.size, 0);
  }
  assert.deepEqual(seen, [0, 1, 2, 0]);
  assert.equal(new Reenactment().variant, 0);
});

// ---------------------------------------------------------------- TUBE-15 no live data (static)

/** Non-type imports of a module, resolved to absolute paths (relative imports only). */
function imports(file: string): string[] {
  const src = readFileSync(file, "utf8");
  const out: string[] = [];
  for (const m of src.matchAll(/^import\s+(type\s+)?[^;]*?from\s+"([^"]+)";/gms)) {
    if (m[1]) continue; // import type: erased, no code
    if (m[2].startsWith(".")) out.push(resolve(dirname(file), m[2]));
  }
  return out;
}

test("TUBE-15: S16 and the re-enactment import nothing that reads the core, the session, the link or the lamp store", () => {
  const start = [join(app, "screens", "tubes.ts"), join(app, "tubes", "content.ts"), join(app, "tubes", "reenact.ts"), join(app, "tubes", "art.ts")];
  const seen = new Set<string>();
  const queue = [...start];
  while (queue.length) {
    const f = queue.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    queue.push(...imports(f));
  }
  const rel = [...seen].map((f) => f.slice(app.length + 1)).sort();
  const forbidden = /^(net\/|state\/|lamps\/|attract\/|explore\/live|explore\/panorama|panels\/load|protocol\.ts|app\.ts|main\.ts|run\/|screens\/(?!tubes))/;
  for (const f of rel) assert.doesNotMatch(f, forbidden, `S16 pulls in ${f}`);
  // The re-enactment's own state machine needs nothing but its content.
  assert.deepEqual(imports(join(app, "tubes", "reenact.ts")).map((f) => f.slice(app.length + 1)), ["tubes/content.ts"]);
  // And the screen never touches the mirror, the session or the link.
  const code = readFileSync(join(app, "screens", "tubes.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(code, /\bapp\.(mirror|link|attract|attractCtl|mission|cards|visit|send)\b|onMachine|onMessage|data-live/);
});

// ---------------------------------------------------------------- TUBE-16 hygiene of the drawn panels

test("TUBE-16: drawn panels are ACC 1 to 4, every lamp is data-source=script, no live unit ids", () => {
  for (let i = 0; i < 4; i++) {
    const svg = panelSvg([5, 5, 5, 9, 5, 5, 5, 5, 5, 5], i);
    assert.equal([...svg.matchAll(/class="tl( on)?" data-source="script"/g)].length, 100);
    assert.equal([...svg.matchAll(/class="tl on"/g)].length, 10);
    assert.match(svg, new RegExp(`>ACC ${i + 1}<`));
    assert.doesNotMatch(svg, /Accumulator|id="lamp:|data-live/);
  }
  const big = placeSvg([5, 5, 5, 9, 5, 5, 5, 5, 5, 5], 3);
  assert.equal([...big.matchAll(/data-source="script"/g)].length, 100);
  assert.match(big, /data-place="4" data-digit="9"/);
  assert.doesNotMatch(big, /Accumulator|id="lamp:/);
  for (const s of visitorText()) assert.doesNotMatch(s, /Accumulator \d/, s);
});

test("TUBE-17 (geometry): targets are 64 px or more with at least 16 px between them, inside the stage", () => {
  const expect = { 2: [306, 700], 3: [100, LAYOUT.place.colH], 4: [112, 300] } as const;
  for (const st of [2, 3, 4] as const) {
    const t = targets(st);
    assert.equal(t.length, st === 2 ? 4 : st === 3 ? 10 : 8);
    for (const r of t) {
      assert.deepEqual([r.w, r.h], [...expect[st]]);
      assert.ok(r.w >= 64 && r.h >= 64);
      assert.ok(r.x >= STAGE.x && r.x + r.w <= STAGE.x + STAGE.w && r.y >= STAGE.y + LAYOUT.plateH && r.y + r.h <= STAGE.y + STAGE.h);
    }
    for (let i = 1; i < t.length; i++) assert.ok(t[i].x - (t[i - 1].x + t[i - 1].w) >= 16, `step ${st} gap ${i}`);
  }
});

// ---------------------------------------------------------------- TUBE-23 metrics

test("TUBE-23: the screen sends only the FR-101 counters, each whitelisted by the bridge and the protocol", () => {
  const screen = readFileSync(join(app, "screens", "tubes.ts"), "utf8");
  const evs = [...new Set([...screen.matchAll(/ev: "([a-z_]+)"/g)].map((m) => m[1]))].sort();
  assert.deepEqual(evs, ["tubes_card", "tubes_myth_open", "tubes_open", "tubes_try_done", "tubes_try_skip", "tubes_try_start", "tubes_try_step"]);
  const gen = readFileSync(join(root, "src", "bridge", "internal", "protocol", "protocol.gen.ts"), "utf8");
  const go = readFileSync(join(root, "src", "bridge", "internal", "metrics", "metrics.go"), "utf8");
  const mock = readFileSync(join(root, "tests", "web", "mock", "bridge.mjs"), "utf8");
  for (const ev of evs) {
    assert.ok(gen.includes(`'${ev}'`), `${ev} not in protocol.gen.ts`);
    assert.ok(go.includes(`"${ev}":`), `${ev} not in metrics.go`);
    assert.ok(mock.includes(`"${ev}"`), `${ev} not in the mock whitelist`);
  }
  // No free text: the only fields are screen (a name), n and assisted.
  for (const m of screen.matchAll(/app\.metric\(\{([^}]*)\}\)/g)) assert.doesNotMatch(m[1], /\b(text|label|title|body)\b/);
});

test("TUBE-22: accumulator lamps run 0 at the bottom and 9 at the top, as on the real machine (Stuart and Crawford, 2026-10-11)", () => {
  const svg = accSvg(Array(10).fill(0), { w: 400, h: 620, gx: 50, gy: 100, px: 25, py: 40, r: 8, label: "ACC 1", tall: false, slots: { w: 10, h: 10, dy: 20 } });
  const y = new Map<number, number>();
  for (const m of svg.matchAll(/data-place="1" data-digit="(\d)"><circle cx="[\d.]+" cy="([\d.]+)"/g)) y.set(Number(m[1]), Number(m[2]));
  assert.equal(y.size, 10, "ten lamps in the first place");
  for (let d = 0; d < 9; d++) assert.ok(y.get(d + 1)! < y.get(d)!, `digit ${d + 1} is above digit ${d}`);
  assert.ok(y.get(9)! < y.get(0)!, "9 is above 0");
});
