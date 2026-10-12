// Explore ENIAC (S14) and Glossary (S15) copy: data, edited here (UX 14.3.6,
// 14.4, 15; PRD FR-92, FR-96). Every block carries its review notes:
//
//   review: "approved" | "pending"   status with the Fact-Checker and Doug
//   fc: [...]                         the history or technical claims in it
//
// These are INTERNAL notes for the reviewers. Nothing on screen depends on
// them and no [FC] mark is ever drawn: Nick's call for the install is that
// the whole tour renders (the [FC] list in UX 14.8 is the review queue, not
// a gate). The wording follows the sourced docs/fact-check.md (2026-10-02);
// its row numbers (A1, A29, ...) are cited in `fc`. Change a word here and tests/web/explore-content.test.ts checks
// the limits: card bodies at most 40 words (FR-22), glossary meanings at
// most 25 (UX 15), intro and mission tails short.

import type { Stop } from "./room.ts";

export interface Review {
  review: "approved" | "pending";
  /** The claims in this block for the Fact-Checker and Doug (UX 14.8). */
  fc?: string[];
  /** Where the words came from. */
  source?: string;
}

export interface UnitCard extends Review {
  title: string;
  /** The unit's job in two to four words (the eyebrow after "3 OF 12"). */
  tag: string;
  body: string;
  /** Plate lines for the card's engraved banner. */
  plate: string[];
}

export interface GlossaryTerm extends Review {
  term: string;
  meaning: string;
  /** The card "Show me" opens, or null when the word has no place in the room. */
  show: Stop | null;
  /** Or: the S16 "Keeping ENIAC alive" card (1 to 5) "Show me" opens (docs/tubes.md 2.6). */
  tubes?: number;
}

export const EXPLORE = {
  title: "Explore ENIAC",
  back: { picker: "Missions", mission: (n: number) => `Back to Mission ${n}`, other: "Back" },
  glossary: "Glossary",
  arrows: { left: "Look left", right: "Look right" },
  minimap: "Map of the room. Tap a spot to go there.",
  lookingAt: "You are looking at:",
  to: "to",
  showUnitsFor: "Show the units for:",
  clear: "Clear",
  trays: { dt: "DIGIT TRAYS: numbers travel here", pt: 'PROGRAM TRAYS: "go!" signals' },
  /** Shown while lamps come from a live core (UX 14.2.3: real status only). */
  live: {
    attract: "LIVE: ENIAC is working out a shell's path",
    mission: (n: number) => `LIVE: your Mission ${n} machine`,
    waking: "Waking ENIAC...",
    between: "Starting another flight...",
  },
  /** UX 14.3.8: the core is down but the bridge is up. */
  resting: "Live lamps are off: ENIAC is resting. The tour still works.",
  restingButton: "ENIAC is resting",
  intro: {
    eyebrow: "THE WHOLE MACHINE",
    title: "ENIAC filled a room.",
    body: "Forty panels stood in a U shape, about 80 feet long along the front. Each panel had one job, and cables joined them. Tap any panel to meet it, or press Walk the room.",
    walk: "Walk the room",
    review: "pending",
    fc: ["40 panels in a U (fact-check A1: correct)", "about 80 feet along the front of the U (A1: the front of the U was 80 ft; not 'end to end')"],
    source: "UX 14.3.6 state A, with docs/fact-check.md A1",
  } as Review & { eyebrow: string; title: string; body: string; walk: string },
  planCaption: "The room from above. Bold outlines show what is on screen.",
  of: (i: number, n: number) => `${i} OF ${n}`,
  close: "Close",
  previous: "Previous",
  next: "Next",
  finish: "Finish",
  usedIn: "USED IN",
  usedNone: "None of our missions.",
  usedCycling: "Every mission, but you never plug it in.",
  oneOf20: "One of 20",
  allAcc: "Light up all 20 accumulators",
  allAccOff: "Back to one accumulator",
  /** P2 live line (UX 14.3.4): only while that accumulator's lamps are live. */
  liveAcc: (n: string, v: string) => `Right now, Accumulator ${n} holds ${v}`,
  missionEyebrow: (n: number) => `MISSION ${n}`,
  missionRings: "The yellow rings show where they stand.",
  missionUses: (title: string, count: number, list: string) => `${title} uses ${count} units: ${list}.`,
  startMission: (n: number) => `Start Mission ${n}`,
  /** The picker's Explore button (UX 14.9). */
  pickerButton: "Explore ENIAC: tour the whole machine",
  /** S3 briefing and S7 result links (UX 14.3.7). */
  briefingLink: "See these units in the room",
  resultLink: "See where they stand",
  /** S11 page 2 (the first programmers) to card 12 (UX 14.3.7). */
  fromHonor: "See the cables they plugged",
};

/**
 * What each mission's card adds after the derived unit list (UX 14.3.6
 * state C). The list itself comes from the compiled mission (the program's
 * own plugs and switches), so it can never disagree with the program.
 */
export const MISSION_TAILS: Record<string, string> = {
  squares: "You plug cables between them.",
  primes: "The group checkers are accumulators too.",
  trajectory: "Every tiny time step uses the multiplier and the air-drag table.",
};

/** The twelve cards (UX 14.3.6), in Walk-the-room order. */
export const CARDS: Record<Stop, UnitCard> = {
  init: {
    title: "Initiating Unit",
    tag: "The GO button",
    plate: ["INITIATING", "UNIT"],
    body: "This unit has the initiating pulse button, which Stuart's simulator labels INIT. Press it and a first signal shoots out and starts the job. It also holds CLEAR, and the button that starts the card reader.",
    review: "pending",
    source: "UX 14.3.6 card 1 (INITIATE, CLEAR and READ are on the approved art)",
  },
  cyc: {
    title: "Cycling Unit",
    tag: "The heartbeat",
    plate: ["CYCLING", "UNIT"],
    body: "ENIAC's clock. It ticks about 100,000 times a second. Every unit follows this beat, so numbers and signals arrive at exactly the right moment. One addition takes 20 ticks.",
    review: "pending",
    fc: ["about 100,000 ticks a second", "an addition takes 20 ticks (20 pulse slots in cycle.go)"],
    source: "UX 14.3.6 card 2",
  },
  mp: {
    title: "Master Programmer",
    tag: "The conductor",
    plate: ["MASTER", "PROGRAMMER"],
    body: 'The conductor. It counts, and decides what happens next, like "do this ten times, then do that." It has ten steppers, a bit like a music box with pins.',
    review: "pending",
    fc: ["ten steppers"],
    source: "UX 14.3.6 card 3",
  },
  acc: {
    title: "Accumulator",
    tag: "Adds and remembers",
    plate: ["ACCUMULATOR"],
    body: "An accumulator adds numbers and remembers them. Each holds one 10-digit number, shown in neon lamps. ENIAC had 20, so it could keep 20 numbers at once.",
    review: "pending",
    fc: ["one 10-digit number, shown in neon lamps", "ENIAC had 20"],
    source: "UX 14.3.6 card 4",
  },
  mult: {
    title: "High-Speed Multiplier",
    tag: "Times tables, fast",
    plate: ["HIGH-SPEED", "MULTIPLIER"],
    body: "It knows the times table. It multiplies two 10-digit numbers in about 3 thousandths of a second. Adding again and again would be far slower. The shell mission uses it on every tiny time step.",
    review: "pending",
    fc: ["it knows the times table", "about 3 thousandths of a second for two 10-digit numbers"],
    source: "UX 14.3.6 card 5",
  },
  div: {
    title: "Divider and Square-Rooter",
    tag: "Divides, and finds roots",
    plate: ["DIVIDER AND", "SQUARE ROOTER"],
    body: "One unit, two jobs: it divides one number by another, and it finds square roots. It is slower than the multiplier. None of our missions need it, but it is still here.",
    review: "pending",
    fc: ["one unit for division and square roots", "slower than the multiplier"],
    source: "UX 14.3.6 card 6 (no divider lines in any mission program)",
  },
  ft: {
    title: "Function Table",
    tag: "A look-up table",
    plate: ["FUNCTION", "TABLE"],
    body: "A function table is a look-up table. Give it a number and it hands back the matching answer, like a dictionary. ENIAC had three, each with 104 rows, set with switches.",
    review: "pending",
    fc: ["ENIAC had three", "104 rows each (ref.tex: -2 to 101)"],
    source: "UX 14.3.6 card 7",
  },
  pft: {
    title: "Portable Function Table",
    tag: "Switches on wheels",
    plate: ["PORTABLE", "FUNCTION TABLE"],
    body: "A big box on wheels, out on the floor, with 1,456 switches, set by hand, on its two faces. Any of the three boxes could plug into any Function Table. The shell mission's air-drag table takes 711 switches.",
    review: "pending",
    fc: ["a box on wheels with switches on 2 faces, 26 rows x 28 columns each = 1,456 ([R46-I] §7.3.1, p. VII-13); out on the floor; any box with any Function Table ([R46-I] §7.1, p. VII-2: 'extends into the center of the floor... can be moved around and, any of the tables (A, B, C on PX-1-302) can be used with any one of the function tables')", "set by hand", "711 switches (705 in drag.e plus 6 in the Trajectory program)"],
    source: "UX 14.3.6 card 8",
  },
  ct: {
    title: "Constant Transmitter",
    tag: "Numbers in",
    plate: ["CONSTANT", "TRANSMITTER"],
    body: "This is how numbers get into ENIAC. Dials hold numbers that never change. The IBM card reader beside it feeds in new ones from punched cards. Mission 3 reads a card here.",
    review: "pending",
    fc: ["the IBM card reader is attached to the Constant Transmitter"],
    source: "UX 14.3.6 card 9",
  },
  pr: {
    title: "Printer",
    tag: "Answers out",
    plate: ["PRINTER"],
    body: "ENIAC's answers come out here as punched cards, made by an IBM card punch. Each card holds the numbers ENIAC was told to print. Missions 2 and 3 watch the cards pile up.",
    review: "pending",
    fc: ["the IBM card punch makes the printed cards"],
    source: "UX 14.3.6 card 10",
  },
  dt: {
    title: "Digit Trays",
    tag: "Number highways",
    plate: ["DIGIT TRAYS"],
    body: "Long metal trays of wires carry numbers between units, like a highway. Trays joined end to end make a digit trunk. Each place (ones, tens, hundreds) has its own wire. Our missions say data trunk.",
    review: "pending",
    fc: ["one wire for each place (fact-check A26: correct; 10 digits and a sign)", "trays joined end to end make a digit trunk (A29: both are 1946 words; 'data trunk' is ours)"],
    source: "UX 14.3.6 card 11, rewritten with docs/fact-check.md A26, A28, A29",
  },
  pt: {
    title: "Program Trays",
    tag: '"Go!" signals',
    plate: ["PROGRAM TRAYS"],
    body: 'These trays carry signals, not numbers. A program pulse is one "go!" on one wire. It tells a unit to start its next job. Joined, they make program trunks. Change the cables and you change the program.',
    review: "pending",
    fc: ['a program pulse is one "go!" on one wire (fact-check A27: correct)', "trays joined make a trunk (A29)"],
    source: "UX 14.3.6 card 12, with docs/fact-check.md A27, A29",
  },
};

/** Card 12's link to the honor roll's first programmers (UX 14.3.7), when that screen exists. */
export const PROGRAMMERS_LINK = "Meet the first programmers";

/**
 * The glossary (UX 15): nineteen terms, three pages of eight, with the
 * corrections of docs/fact-check.md (A8, A11, A12, A19, A29, A30). The
 * Transceiver, held in the spec (Q21), is shown with the fact-checked
 * meaning: an accumulator's program control (DMB10 2.2; Stuart's handbook
 * ch. 1 section 16).
 */
export const GLOSSARY: GlossaryTerm[] = [
  { term: "Accumulator", meaning: "ENIAC's adding machine and memory. Each holds one 10-digit number and shows it in neon lamps. ENIAC had 20.", show: "acc", review: "pending", fc: ["10 digits, neon lamps, 20 of them (fact-check A7: correct)"] },
  { term: "Digit tray and digit trunk", meaning: "A rack of wires that carries numbers between units. Trays joined in a row make a digit trunk. Our missions say data trunk.", show: "dt", review: "pending", fc: ["fact-check A29 replacement text"] },
  { term: "Program tray and program trunk", meaning: 'A tray of wires that carries "go!" signals, not numbers. Trays joined in a row make a program trunk, like 1-1 and 1-3.', show: "pt", review: "pending", fc: ["fact-check A29, A31"] },
  { term: "Program pulse", meaning: 'One "go!" signal on one wire. It tells a unit to start a job. When the job ends, the unit sends its own pulse.', show: "pt", review: "pending", fc: ["one pulse on one wire (fact-check A27: correct)"] },
  { term: "Program control", meaning: 'The small circuit that waits for a program pulse and does its job. Most can repeat it up to 9 times, then send "done".', show: "acc", review: "pending", fc: ["fact-check A12 replacement text"] },
  { term: "INIT (initiating pulse)", meaning: "The GO signal. Pressing INIT on the Initiating Unit sends it out on a program tray to start the whole job.", show: "init", review: "pending", fc: ["fact-check A21: correct"] },
  { term: "Clock tick (add time)", meaning: "ENIAC's beat, from the Cycling Unit: about 100,000 a second. One addition takes 20 ticks, about 1/5,000 of a second.", show: "cyc", review: "pending", fc: ["100,000 a second; 1/5,000 s (fact-check A3: correct)"] },
  { term: "Stepper", meaning: "A part of the Master Programmer that counts through stages, one at a time. It hands the work from one job to the next.", show: "mp", review: "pending", fc: ["fact-check A6: correct"] },
  { term: "Constant", meaning: "A number that stays the same while a program runs. It is set on dials, or read from a punched card.", show: "ct", review: "pending", fc: ["fact-check A19 replacement text"] },
  { term: "Function table", meaning: "A look-up table of 104 numbers, set with switches. Give it a number and it hands back the matching answer.", show: "ft", review: "pending", fc: ["104 entries (fact-check A16: correct)"] },
  { term: "Punched card", meaning: "A stiff paper card with holes. The holes are digits. ENIAC reads cards in, and punches its answers onto cards.", show: "pr", review: "pending", fc: ["fact-check A20, A22: correct"] },
  { term: "Jack and cable", meaning: "A jack is a socket. A plug on a cable goes into it. Plugging cables in is how ENIAC was programmed.", show: "pt", review: "pending" },
  { term: "Receive and send jacks", meaning: "An accumulator takes numbers in on alpha to epsilon. It sends its number out on A, or on S, which sends it as a subtraction.", show: "acc", review: "pending", fc: ["fact-check A9: correct"] },
  { term: "Operation and repeat switches", meaning: "Most programs have two switches: what to do (take in on alpha, send on A) and how many times to do it, up to 9.", show: "acc", review: "pending", fc: ["fact-check A11 replacement text"] },
  { term: "Neon lamp", meaning: "A small glowing bulb. Each place in an accumulator has ten lamps, 0 to 9. The lit one shows the digit. The tubes are inside.", show: "acc", review: "pending", fc: ["fact-check A8 replacement text", "E23 (docs/tubes.md 2.6: the tubes are inside)"] },
  {
    term: "Transceiver",
    meaning: 'An accumulator program control. It hears a "go!", does its job up to 9 times, then sends "done". Each accumulator had 8, plus 4 receivers.',
    show: "acc",
    review: "pending",
    fc: ["fact-check A30 replacement text (Q21 answered: it can be shown)"],
    source: "docs/fact-check.md A30; DMB10 2.2; Stuart, ENIAC Handbook ch. 1 section 16",
  },
  // docs/tubes.md 2.6: the words of S16 "Keeping ENIAC alive"; "Show me" opens its card.
  { term: "Vacuum tube", meaning: "A sealed bulb that switches a signal on and off with nothing moving. ENIAC had about 18,000. Like light bulbs, they wore out.", show: null, tubes: 1, review: "pending", fc: ["E1", "E13", "E20"] },
  { term: "Plug-in unit", meaning: "A part made to pull out and push back in. A bad one could be swapped fast. Many of ENIAC's tubes sat in plug-in units.", show: null, tubes: 4, review: "pending", fc: ["E24"] },
  { term: "Kilowatt", meaning: "A thousand watts. ENIAC used about 150 kilowatts, as much as 1,500 bright light bulbs.", show: null, tubes: 2, review: "pending", fc: ["E6", "E7"] },
];

export const GLOSSARY_COPY = {
  title: "Glossary: words you met",
  more: "More words",
  first: "First words",
  close: "Close",
  showMe: "Show me",
  perPage: 8,
};

/** Word count as the build counts it (FR-22): whitespace-separated words. */
export function words(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
