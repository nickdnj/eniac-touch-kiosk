// S8 Finale: all visitor text, as data (UX 14.5, PRD FR-45). The screen
// (screens/finale.ts) only lays it out; the numbers come from this visit's
// real runs (state/visit.ts) through finale/beats.ts, never from here.
//
// `fc` is an internal note for the Fact-Checker and Doug Crawford: the
// claim and where its wording comes from. It is never shown. Nothing here
// is held (PRD FR-46 v0.5).

export const FINALE = {
  /** Top right on beats 1 to 4 (UX 14.5.2: 64 px). */
  skip: "Skip to the end",
  /** Bottom right on beats 1 to 4 (96 px). */
  next: "Next",
  /** S7 primary button once every mission is done (UX 14.5.1) and the picker chip (14.9). */
  pickerChip: "See the finale",
  /** Screen-reader name of the beat dots. */
  progress: (n: number, of: number) => `Part ${n} of ${of}`,

  f1: {
    title: "You programmed ENIAC.",
    then: "In 1946, setting up a job like this could take people a day or more.",
    you: (m: number) => `You did it in about ${m} minutes.`,
    fc: "UX 14.8 #17, fact-check B4: 'could take people a day or more' (Clippinger 1948: 'a day'; Kempf 1961: weeks incl. checking). {m} is this visit's real time, shown only from 3 to 30 minutes.",
    /** Each mission's sentence lives in its YAML `finale:` block (bridge /api/missions); a mission without one gets this. */
    otherWords: "You ran it on ENIAC.",
    /** Hand-placed steps only ("Do it for me" and skipped steps are not counted); the caller omits it at 0 and 0. */
    hand: (cables: number, switches: number) => {
      const few = (n: number, one: string, many: string) => (n === 1 ? `a ${one}` : n === 2 ? `two ${many}` : `${n} ${many}`);
      const c = few(cables, "cable", "cables");
      const s = few(switches, "switch", "switches");
      const like = "just like ENIAC's first programmers.";
      if (cables && switches) return `You plugged in ${c} and set ${s} yourself, ${like}`;
      if (cables) return `You plugged in ${c} yourself, ${like}`;
      return `You set ${s} yourself, ${like}`;
    },
    handFc: "fact-check B13: 'first programmers'. They wired ENIAC by hand with cables and switches (UX 14.8 #12).",
  },

  f2: {
    title: "Here is every unit you used.",
    used: (p: number) => `You used ${p} of ENIAC's 40 panels. Yellow rings show them.`,
    /** When a mission's unit list could not be loaded: no count (never a guess). */
    usedNoCount: "Yellow rings show the units you used.",
    how: "ENIAC did all of this with cables and switches.",
    /** docs/tubes.md 2.7 (fact-check E1, E26). */
    tubes: "Behind those panels, about 18,000 tubes glowed. A crew worked shift after shift to keep them running.",
    tubesFc: "fact-check E1 ('about 18,000' is correct as 'about'; 17,468 in 1955, 19,000 per Kempf) and E26 (shift work at Aberdeen).",
    explore: "Explore the whole machine",
    /** Fixed tray labels over the room (the strip's own tags repeat and clip at this width); same words as Explore's. */
    digitTrays: "DIGIT TRAYS: numbers travel here",
    programTrays: 'PROGRAM TRAYS: "go!" signals',
    tubesChip: "How they kept it alive",
    /** UX 14.3.8: the core went down while F2 shows (it is skipped if it was down before). */
    resting: "Live lamps are off: ENIAC is resting.",
    live: "LIVE lamps: ENIAC is working right now",
  },

  f3: {
    title: "Brian L. Stuart wrote this simulator.",
    // The line is HONOR.stuart.finaleLine (one place for Stuart's wording, Q18).
  },

  f4: {
    title: "The people who made ENIAC.",
    team: "The project team",
    bodies: "Built at and for",
    // The thanks line is HONOR.finaleThanks (fact-check B13 wording).
  },

  f5: {
    title: "Thanks for visiting!",
    line: "Come back and do it again, or explore the whole machine.",
    fc: "UX 14.5.2 F5 says 'try the other missions'; the finale only shows once all three are done, so the line invites them back instead.",
    startOver: "Start over for the next visitor",
    explore: "Explore ENIAC",
  },
};
