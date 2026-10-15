// Honor-roll content (src/web/app/content/honor.ts): the people and bodies
// PRD FR-44 names, the spellings docs/fact-check.md insists on, the limits the
// one-screen pages rely on, and that `fc` notes stay internal.

import { test } from "node:test";
import assert from "node:assert/strict";
import { HONOR, shown } from "../../src/web/app/content/honor.ts";

const words = (s: string) => s.trim().split(/\s+/).length;

test("five pages, in the spec's order (the idea page is a draft at the end), none held", () => {
  assert.deepEqual(HONOR.pages.map((p) => p.id), ["stuart", "programmers", "builders", "exhibit", "idea"]);
  assert.ok(HONOR.pages.every(shown));
});

test("the six programmers (FR-44), 1945 names with later names, fact-check spellings", () => {
  const p = HONOR.programmers.plates;
  assert.equal(p.length, 6);
  assert.deepEqual(p.map((x) => x.later), [
    "Kay McNulty Mauchly Antonelli",
    "Jean Jennings Bartik",
    "Betty Snyder Holberton",
    "Marlyn Wescoff Meltzer",
    "Frances Bilas Spence",
    "Ruth Lichterman Teitelbaum",
  ]);
  assert.ok(p.some((x) => x.name === "Betty Jean Jennings"));
  assert.ok(p.some((x) => x.name.startsWith("Frances Elizabeth")));
  const all = JSON.stringify(HONOR);
  assert.doesNotMatch(all, /Marilyn/);
  assert.doesNotMatch(HONOR.programmers.role, /1946/); // B12: no end date
});

test("builders and project team (FR-44); the Goldstines are never called builders", () => {
  assert.deepEqual(HONOR.builders.people.map((x) => x.name), ["J. Presper Eckert", "John W. Mauchly", "Herman H. Goldstine", "Adele Goldstine"]);
  assert.deepEqual(HONOR.builders.bodies.map((x) => x.later), ["University of Pennsylvania", "Ballistic Research Laboratory"]);
  for (const s of HONOR.attractSlides) if (s.names.some((n) => /Goldstine/.test(n))) assert.doesNotMatch(s.heading, /builder/i);
  assert.equal(HONOR.pages.find((p) => p.id === "builders")!.tab, "The project team");
});

test("Stuart's credit is prominent and plain (FR-43), with the paper named", () => {
  assert.match(HONOR.stuart.lead.join(" "), /Without his work, this exhibit would be an empty screen/);
  assert.match(HONOR.stuart.paper.text, /Simulating the ENIAC/);
  assert.match(HONOR.stuart.paper.text, /Proceedings of the IEEE/);
  assert.equal(HONOR.stuart.qr.url, "https://www.cs.drexel.edu/~bls96/eniac/simulator.html");
  assert.deepEqual(HONOR.stuart.more.map((l) => l.url), ["https://github.com/blstuart/eniac-simulator", "https://doi.org/10.1109/JPROC.2018.2813678"]);
});

test("the mission sources credit Lehmer, De Mol and Bullynck, and the Feb 15, 1946 unveiling", () => {
  const s = HONOR.exhibit.sources.map((x) => x.from).join(" ");
  assert.match(s, /D\. H\. Lehmer/);
  assert.match(s, /Based on/); // C1/C9: based on his run
  assert.match(s, /Liesbeth De Mol and Maarten Bullynck/);
  assert.match(s, /February 15, 1946/);
});

test("printed URLs match the QR targets, and every QR target is https", () => {
  for (const l of [HONOR.stuart.qr, ...HONOR.stuart.more, HONOR.exhibit.qr]) {
    assert.match(l.url, /^https:\/\//);
    assert.ok(l.url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "").startsWith(l.print.replace(/\/$/, "").replace(/^www\./, "")), `${l.print} vs ${l.url}`);
  }
});

test("lengths the one-screen layout relies on", () => {
  assert.ok(words(HONOR.programmers.lead) <= 40);
  assert.ok(words(HONOR.builders.lead) <= 40);
  for (const p of [...HONOR.programmers.plates, ...HONOR.builders.people, ...HONOR.builders.bodies]) {
    assert.ok(p.line.length <= 70, `${p.name}: "${p.line}" is ${p.line.length} chars`);
    assert.ok(p.name.length <= 40, p.name);
  }
});

test("fc notes are reviewer notes only: the screen code never reads them", async () => {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const root = join(import.meta.dirname, "..", "..", "src", "web", "app");
  for (const f of ["screens/honor.ts", "ui/plates.ts"]) {
    const src = await readFile(join(root, f), "utf8");
    assert.doesNotMatch(src, /\.fc\b|fcLead|fcShell|fcMadeBy/, f);
  }
});
