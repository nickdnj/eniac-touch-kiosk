// S16 "Keeping ENIAC alive" copy and figure numbers: data, edited here
// (docs/tubes.md 2.4 to 2.6; UX 14.11; PRD FR-99 to FR-101).
//
// Every block carries `fc`, the rows of docs/fact-check.md group E that
// back it (E1, E6, ...). They are INTERNAL notes for the reviewers, never
// drawn (FR-46). tests/web/tubes.test.ts checks the limits (cards and the
// myth card at most 40 words, the plate's exact 20 words), that every fc id
// is a row of group E, the banned wording of docs/tubes.md 1.4, and that
// every figure's numbers add up.
//
// "Find the dead tube" is a RE-ENACTMENT: its panels, lamps and faults are
// authored here and drawn by tubes/art.ts. Nothing in it is, or reads, the
// live machine (docs/tubes.md 2.5.1).

import type { Review } from "../explore/content.ts";

export interface TubeCard extends Review {
  /** "the tubes", "power", ...: the banner and figure to draw. */
  id: "tubes" | "power" | "why" | "hunt" | "week";
  title: string;
  /** Two to four words after "1 OF 5 ·". */
  tag: string;
  body: string;
  /** Stage heading and sub-heading over the figure. */
  stage: { title: string; sub?: string };
}

export const TUBES = {
  title: "Keeping ENIAC alive",
  /** S14 header button and the finale chip label (docs/tubes.md 2.2). */
  exploreButton: "Keeping ENIAC alive",
  back: { explore: "Explore", glossary: "Glossary", other: "Back" },
  glossary: "Glossary",
  close: "Close",
  previous: "Previous",
  next: "Next",
  finish: "Finish",
  of: (i: number, n: number) => `${i} OF ${n}`,
  mythEyebrow: "MYTH CHECK",
  mythBack: "Back",
  cta: "Find the dead tube",
};

/** The five cards, in order (docs/tubes.md 2.4). At most 40 words each. */
export const TUBE_CARDS: TubeCard[] = [
  {
    id: "tubes",
    title: "The tubes",
    tag: "About 18,000",
    body: "ENIAC had about 18,000 vacuum tubes. A tube is a sealed bulb that switches a signal on and off, with nothing moving. A radio had about ten. The glowing lamps you see are neon, not tubes. The tubes sat inside.",
    stage: { title: "Each dot is one vacuum tube.", sub: "The bright boxes: a radio, and the biggest tube machines of 1946." },
    review: "pending",
    fc: ["E1", "E3", "E20", "E23"],
    source: "docs/tubes.md 2.4 card 1",
  },
  {
    id: "power",
    title: "Power and heat",
    tag: "A big appetite",
    body: "ENIAC used about 150 kilowatts, as much as 1,500 bright light bulbs. More than half of it just made the tubes hot. Fans blew the heat out. A panel that got too hot switched the whole machine off.",
    stage: { title: "Where the power went", sub: "More than half of it only kept the tubes hot." },
    review: "pending",
    fc: ["E6", "E7", "E9"],
    source: "docs/tubes.md 2.4 card 2",
  },
  {
    id: "why",
    title: "Why tubes burned out",
    tag: "Hard on tubes",
    body: "Tubes wear out like light bulbs, and switching on and off is hard on them. So early on, the crew left the heaters on overnight, and ran the tubes gently. Eckert remembered losing about one tube every two days.",
    stage: { title: "Heaters on, the rest off", sub: "Heating up and cooling down is hard on a tube." },
    review: "pending",
    fc: ["E11", "E13", "E15", "E17"],
    source: "docs/tubes.md 2.4 card 3",
  },
  {
    id: "hunt",
    title: "The hunt",
    tag: "Which tube?",
    body: "When an answer came out wrong, the crew hunted: which unit, which circuit, which tube? Lamps showed what was happening inside. Tubes sat in plug-in units that swapped fast. Eckert said they found a bad tube within 15 minutes.",
    stage: { title: "How a crew found one bad tube", sub: "Out of about 18,000." },
    review: "pending",
    fc: ["E11", "E21", "E22", "E24"],
    source: "docs/tubes.md 2.4 card 4",
  },
  {
    id: "week",
    title: "A week with ENIAC",
    tag: "Time at work",
    body: "In its first two years, ENIAC did real work only 5 to 25 percent of the time, by Army estimates. Testing, setting up and repairs took the rest. By 1954 it worked about 7 hours in every 10.",
    stage: { title: "How much of the time did ENIAC work?", sub: "Most of it, in the end. Not at first." },
    review: "pending",
    fc: ["E25"],
    source: "docs/tubes.md 2.4 card 5",
  },
];

/** Card 2's link and the myth card (docs/tubes.md 2.4, row M). */
export const MYTH = {
  link: "Did the lights of Philadelphia dim?",
  title: "Did the lights of Philadelphia dim?",
  tag: "Myth check",
  body: "No. A story says ENIAC dimmed Philadelphia's lights when it switched on. Eckert, who built it, called that story “total fiction.” ENIAC took its power from the city grid, through its own regulators.",
  stage: { title: "A story people still tell" },
  quote: "“That story is total fiction.”",
  who: "J. Presper Eckert, ENIAC's chief engineer, interviewed in 1989",
  review: "pending",
  fc: ["E28", "E6"],
  source: "docs/tubes.md 2.4 row M",
} as const;

/** Stage captions, 24 px, not counted in the 40 words (docs/tubes.md 2.4). */
export const CAPTIONS = {
  tubes: {
    where: ["Where were they?", "Inside the panels. The glowing lamps on the front are neon bulbs that show what the tubes are doing."],
    parts: "Also inside: about 70,000 resistors, 10,000 capacitors and 500,000 soldered joints.",
    eniac: "ENIAC: about 18,000",
    fc: ["E1", "E3", "E4", "E23"],
  },
  power: {
    total: "ENIAC: about 150 kilowatts in all (1946)",
    home: "← An average American home today: about 1.2 kilowatts",
    scale: "Same scale. The thin sliver is one home.",
    hour: "In one hour, ENIAC used as much electricity as a typical American home uses in 5 to 6 days.",
    thermostat: "Each panel also had a thermostat. Above 115 °F it turned the whole machine off.",
    fc: ["E6", "E8", "E9"],
  },
  why: {
    legend: ["Amber: ENIAC working, one 8-hour shift a day", "Purple: tube heaters kept on, all week", "Dark: everything else switched off"],
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    note: "One week in ENIAC's first two years (February 1946 to March 1948). Later it ran day and night.",
    fc: ["E15", "E25", "E26"],
  },
  hunt: {
    rungs: [
      { h: "Which unit?", t: "Run a test problem. The wrong answer points to a unit." },
      { h: "Which circuit?", t: "Stop ENIAC and read the neon lamps, one tick at a time." },
      { h: "Which tube?", t: "Swap the plug-in unit. A dead tube runs cold." },
    ],
    note: "After the 1946 maintenance manual: first the unit, then the circuit, then the tube.",
    fc: ["E21", "E22", "E24"],
  },
  week: {
    note: "Share of time doing real work. Army figures, each measured a little differently.",
    trouble: ["Tubes were not the only trouble. Loose solder and power glitches", "were hard to find, too."],
    fc: ["E12", "E25"],
  },
};

// ---------------------------------------------------------------- figure numbers (TUBE-04)

/** Card 1: one dot per tube, and the Army's 1946 comparison boxes [WD46]. */
export const DOTS = {
  cols: 200,
  rows: 90,
  /** The tubes ENIAC had ("about 18,000"): cols x rows. */
  total: 18_000,
  boxes: [
    { id: "radio", label: "radio: 10", col: 0, row: 0, w: 5, h: 2, tubes: 10 },
    { id: "radar", label: "biggest radar set: 400", col: 20, row: 0, w: 25, h: 16, tubes: 400 },
    { id: "b29", label: "B-29 bomber: under 800", col: 80, row: 0, w: 40, h: 19, tubes: 760, under: 800 },
  ],
};

/** Card 2: the Army's 1946 power breakdown [WD46], and one home today [EIA]. */
export const POWER = {
  totalKw: 150,
  parts: [
    { label: "Tube heaters", kw: 80, colour: "#CC79A7", text: "#101215" },
    { label: "Power for the circuits", kw: 45, colour: "#56B4E9", text: "#101215" },
    { label: "Fans", kw: 20, colour: "#009E73", text: "#FFFFFF" },
    { label: "Card machines", kw: 5, colour: "#F0E442", text: "#101215" },
  ],
  homeKw: 1.2,
  /** EIA 2022: 10,791 kWh a year per home, 29.6 a day. */
  homeKwhPerDay: 29.6,
  bulbW: 100,
  bulbs: 1_500,
  /** BRL 971 (1955) measured the modified machine at 174 kW: "5 to 6 days" covers both. */
  aberdeenKw: 174,
  days: [5, 6],
};

/** Card 3: one week in 1946 to 1948 [Fritz52]: one 8-hour shift, Monday to Friday; heaters on all week. */
export const WEEK = { shiftHours: 8, workDays: 5, days: 7, heatersAllWeek: true };

/** Card 5: share of time doing real work, each with its own measure [Fritz52; BRL971]. */
export const WORK = [
  { label: "1946 to 1948", from: 5, to: 25, text: "5 to 25 percent" },
  { label: "1948 to 1952", from: 0, to: 55, text: "55 percent" },
  { label: "1954", from: 0, to: 70, text: "70 percent" },
];

// ---------------------------------------------------------------- the re-enactment (docs/tubes.md 2.5)

/** RE-1: on every state of the exercise. Exactly these 20 words. */
export const PLATE = {
  badge: "RE-ENACTMENT",
  text: "These panels are drawn, not the live ENIAC. The fault is made up. The steps follow the 1946 maintenance manual.",
};

/**
 * The three authored faults (docs/tubes.md 2.5.2), used in order, never
 * random. 1-based as in the spec: ACC 3, place 4 (from the left), lamp 9
 * lit, tube 3 of 8 cold.
 */
export const FAULTS = [
  { acc: 3, place: 4, lamp: 9, tube: 3 },
  { acc: 1, place: 8, lamp: 1, tube: 6 },
  { acc: 4, place: 2, lamp: 8, tube: 1 },
] as const;
export type Fault = (typeof FAULTS)[number];

/** Every accumulator should end the test showing this. */
export const GOOD_DIGIT = 5;
export const PANELS = 4;
export const PLACES = 10;
export const TUBES_PER_UNIT = 8;

export const TRY = {
  steps: [
    {
      h: "Run the test",
      p: "A 1940s technician began with a test problem. Every accumulator should end up showing 5555555555. Press Run the test, then compare the lamps.",
    },
    { h: "Which panel is wrong?", p: "Look for the accumulator whose lamps are out of line with the others. Tap it." },
    { h: "Which digit place?", p: "Each digit place has its own plug-in unit. Tap the column with the wrong lamp." },
    { h: "Which tube?", p: "The unit is out. A dead tube runs cold. Touch each tube and compare." },
    { h: "Plug in a fresh unit", p: "Found it! Slide in a fresh unit, and ENIAC will run the test again." },
  ],
  stepOf: (n: number) => `STEP ${n} OF 5`,
  run: "Run the test",
  plug: "Plug in a fresh unit",
  doIt: "Do it for me",
  skip: "Skip to the answer",
  backToStory: "Back to the story",
  again: "Try another fault",
  fixedEyebrow: "FIXED",
  fixed: "Fixed!",
  win: "Every lamp lines up again. A real crew would also test the dead tube and write it in the log. Eckert said a hunt took up to 15 minutes.",
  winFc: ["E11", "E21"],
  /** Panel names: ACC 1 to ACC 4, never "Accumulator n" (RE-3). */
  acc: (n: number) => `ACC ${n}`,
  /** Stage captions per state. */
  cap: {
    cleared: ["Four accumulators, all cleared to zero.", "Press Run the test."],
    tested: ["Test finished.", "Every accumulator should show 5555555555. Compare the lamps."],
    place: (acc: number) => [`ACC ${acc}.`, "Ten digit places, left to right. Each place has its own plug-in unit, at the bottom."],
    unit: (place: number) => [`Place ${place} plug-in unit, pulled out.`, "Drawn simplified: a real one held many more parts."],
    read: ["How to read it:", "touch a tube to feel its case.", "Warm", "means it works.", "COLD", "means the tube has died."],
    fixed: ["Test run again.", "Every lamp lines up on 5."],
  },
  placeLabel: (n: number) => `place ${n}`,
  unitLabel: "PLUG-IN UNIT",
  touch: "touch",
  warm: "warm",
  cold: "COLD",
  /** Feedback lines (UX 5.2 ladder, docs/tubes.md 2.5.3 and 2.5.4). */
  fb: {
    tested: "The test is done. One accumulator disagrees. Which one?",
    panelOk: (acc: number) => `ACC ${acc} it is. Its lamps are out of line.`,
    placeOk: (place: number, lamp: number) => `Place ${place} shows ${lamp}, not 5. Its plug-in unit slides out.`,
    tubeOk: "COLD. That tube is dead.",
    warm: "Warm. That one works. Try another.",
    doneForYou: "Done for you.",
    wrong1: { 2: "Not quite. That one lines up with the others. Try another.", 3: "Not quite. That column is right. Look for the lamp that is lit at the wrong number." } as Record<number, string>,
    ring: "Look for the glowing ring.",
    hint: {
      2: (f: Fault) => `Hint: look for a lamp sitting ${f.lamp > GOOD_DIGIT ? "lower" : "higher"} than the rest.`,
      3: (f: Fault) => `Hint: one column is lit at ${f.lamp}, not 5. Count along from the left.`,
      4: () => "Hint: keep touching until one feels cold.",
    } as Record<number, (f: Fault) => string>,
    offer: "Want us to do this one?",
  },
};

/** Banned wording (docs/tubes.md 1.4, TUBE-03): never in visitor text. */
export const BANNED = ["116", "never turned off", "one-quarter", "5,000,000", "every few minutes", "most failed", "selected tubes"];
