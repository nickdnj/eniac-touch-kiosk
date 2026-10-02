// Explore ENIAC and Glossary copy limits (FR-22, FR-92, FR-96; UX 14.3.4:
// "the build fails if a card overflows") and the fact-check wording.

import { test } from "node:test";
import assert from "node:assert/strict";
import { CARDS, EXPLORE, GLOSSARY, GLOSSARY_COPY, MISSION_TAILS, words } from "../../src/web/app/explore/content.ts";
import { STOPS } from "../../src/web/app/explore/room.ts";

const allText = (): string[] => [
  EXPLORE.intro.title,
  EXPLORE.intro.body,
  ...Object.values(CARDS).flatMap((c) => [c.title, c.tag, c.body]),
  ...GLOSSARY.flatMap((g) => [g.term, g.meaning]),
  ...Object.values(MISSION_TAILS),
];

test("twelve cards, one per stop; bodies at most 40 words; taglines two to four words", () => {
  assert.deepEqual(Object.keys(CARDS).sort(), [...STOPS].sort());
  for (const [id, c] of Object.entries(CARDS)) {
    assert.ok(words(c.body) <= 40, `${id}: ${words(c.body)} words`);
    assert.ok(words(c.body) >= 20, `${id}: too short`);
    assert.ok(words(c.tag) >= 2 && words(c.tag) <= 4, `${id} tag: ${c.tag}`);
    assert.ok(c.plate.length >= 1 && c.plate.length <= 2);
  }
  assert.ok(words(EXPLORE.intro.body) <= 40);
  for (const t of Object.values(MISSION_TAILS)) assert.ok(words(t) <= 12);
});

test("glossary: nineteen terms in three pages of eight, meanings at most 25 words, every Show me a real card", () => {
  // 16 machine words, plus Vacuum tube, Plug-in unit and Kilowatt for S16 (docs/tubes.md 2.6).
  assert.equal(GLOSSARY.length, 19);
  assert.equal(Math.ceil(GLOSSARY.length / GLOSSARY_COPY.perPage), 3);
  for (const g of GLOSSARY) {
    assert.ok(words(g.meaning) <= 25, `${g.term}: ${words(g.meaning)} words`);
    if (g.show) assert.ok((STOPS as readonly string[]).includes(g.show), `${g.term} -> ${g.show}`);
    if (g.tubes !== undefined) assert.ok(!g.show && g.tubes >= 1 && g.tubes <= 5, `${g.term} -> S16 card ${g.tubes}`);
  }
  // The Transceiver is shown, with the fact-checked meaning (docs/fact-check.md A30).
  const tr = GLOSSARY.find((g) => g.term === "Transceiver")!;
  assert.match(tr.meaning, /program control/);
  assert.match(tr.meaning, /up to 9 times/);
  assert.doesNotMatch(tr.meaning, /onto a tray/);
});

test("nothing on screen carries an [FC] mark or review placeholder; review notes stay internal", () => {
  for (const s of allText()) {
    assert.doesNotMatch(s, /\[FC\]|\bFC\b|\bHOLD\b|TODO|\bpending\b/, s);
  }
  for (const c of Object.values(CARDS)) assert.ok(c.review === "approved" || c.review === "pending");
});

test("fact-check wording (docs/fact-check.md): trays not tubes, digit trunk, 80 feet laid in a line", () => {
  const text = allText().join(" ");
  assert.doesNotMatch(text, /tubes of wires/);
  assert.doesNotMatch(text, /end to end, about 80|80 feet end to end/);
  assert.match(EXPLORE.intro.body, /Laid in a line, they would stretch about 80 feet/);
  assert.match(CARDS.dt.body, /digit trunk/);
  assert.match(GLOSSARY.find((g) => g.show === "dt")!.meaning, /digit trunk/);
  assert.match(GLOSSARY.find((g) => g.term === "Neon lamp")!.meaning, /ten lamps, 0 to 9/);
  assert.match(GLOSSARY.find((g) => g.term === "Constant")!.meaning, /read from a punched card/);
});
