// S11 About and honor roll: all visitor text, as data (UX 14.6, PRD FR-41,
// FR-43, FR-44). Edit the words here; the screen (screens/honor.ts) only
// lays them out. Plain strings, no markup.
//
// `fc` is an internal note for the Fact-Checker, Doug Crawford and Brian
// Stuart: the claim, and where it comes from. It is never shown. Nick's
// direction (2026-10-02): everything here renders; if we got something
// wrong, the people who know will tell us, and we will fix it here
// (PRD FR-46 v0.5). `hold: true` keeps a block off the screen; nothing in
// this file is held.
//
// Sizes and limits the screen relies on (each page fits 1920 x 1080 with no
// scrolling): a lead is at most about 60 words; a plate line is one line.

export interface Block {
  /** Internal note for reviewers ([FC] claim and source). Never rendered. */
  fc?: string;
  /** Kept off the screen while true (for a claim nobody can stand behind yet). */
  hold?: boolean;
}

export interface Link extends Block {
  /** What the visitor reads under the QR code. */
  label: string;
  /** The address encoded in the QR code. */
  url: string;
  /** The address as printed (short, no https://), so it can be typed. */
  print: string;
}

export interface PersonPlate extends Block {
  /** The name as engraved (the 1945 name for the programmers). */
  name: string;
  /** The name they were known by later in life, if different. */
  later?: string;
  /** One honest line. */
  line: string;
}

export interface Source extends Block {
  /** What it is for ("Squares"). */
  what: string;
  /** Where it comes from. */
  from: string;
}

export interface HonorPage extends Block {
  id: "stuart" | "programmers" | "builders" | "exhibit" | "idea";
  /** The tab label. */
  tab: string;
  /** The page title (32 px caps over the lead). */
  title: string;
}

const STUART_URL = "https://www.cs.drexel.edu/~bls96/eniac/simulator.html";
const REPO_URL = "https://github.com/blstuart/eniac-simulator";
const PAPER_URL = "https://doi.org/10.1109/JPROC.2018.2813678";

export const HONOR = {
  screenTitle: "About and honor roll",
  back: "‹ Back",
  /** S2 picker button (UX 14.9). */
  pickerButton: "About and honor roll",
  /** S7 Trajectory link (UX 14.6.3). */
  resultLink: {
    text: "The women who set up this shell path in 1946",
    missions: ["trajectory"],
    page: 2,
    fc: "docs/fact-check.md B8: ENIAC's women programmers set up the shell trajectory for the Feb 15, 1946 unveiling (Jennings and Snyder per Fritz/Light/Bartik; Penn credits Wescoff and Lichterman), so the link names no one.",
  },

  pages: [
    { id: "stuart", tab: "Brian L. Stuart", title: "The simulator" },
    { id: "programmers", tab: "The first programmers", title: "The first programmers" },
    // fact-check B18: the Goldstines did not build ENIAC; "project team" covers everyone on this page.
    { id: "builders", tab: "The project team", title: "The project team" },
    { id: "exhibit", tab: "This exhibit", title: "This exhibit" },
    // Draft (2026-10-15): the Signal Corps radar job and the Army's firing tables as two real problems with one bottleneck. docs/camp-evans-eniac-research.md
    { id: "idea", tab: "The idea", title: "Where the idea came from" },
  ] as HonorPage[],

  // ---------------------------------------------------------------- page 1
  stuart: {
    kicker: "The simulator behind this screen",
    name: "Brian L. Stuart",
    where: "Drexel University",
    lead: [
      "Every lamp, cable and switch on this screen is run by a simulator that Brian L. Stuart wrote. It simulates ENIAC at the level of individual pulses.",
      "Without his work, this exhibit would be an empty screen. Thank you, Brian.",
    ],
    paper: {
      text: "His paper, “Simulating the ENIAC,” appeared in the Proceedings of the IEEE in April 2018.",
      fc: "fact-check D2: Proceedings of the IEEE 106(4), April 2018, pp. 761-772, doi 10.1109/JPROC.2018.2813678 (IEEE Xplore 8326772, linked from the upstream README). D1: Stuart's own words, 'at the level of individual pulses' (pre-share N1). D4: test the QR codes on an iPhone and an Android phone (the Drexel server sent an incomplete TLS chain on 2026-10-02).",
    },
    alsoLine: "He has spent years bringing ENIAC back to life, so that anyone can program it again.",
    qr: { label: "Scan to visit his simulator page", url: STUART_URL, print: "cs.drexel.edu/~bls96/eniac/simulator.html" } as Link,
    more: [
      { label: "His code", url: REPO_URL, print: "github.com/blstuart/eniac-simulator" },
      { label: "His paper", url: PAPER_URL, print: "doi.org/10.1109/JPROC.2018.2813678" },
    ] as Link[],
    /** The attract and finale plate (UX 14.2.1, 14.5.2 F3). */
    plateKicker: "The simulator behind this screen",
    finaleLine: "Every lamp you saw was run by his program. Without his work, there would be nothing here to touch.",
    fc: "Wording to go to Brian Stuart with the R1 request (Q18). 'He has spent years bringing ENIAC back to life': his ENIAC simulator and papers span 2016 onward (Simulating, Programming, Debugging the ENIAC in Proc. IEEE).",
  },

  // ---------------------------------------------------------------- page 2
  programmers: {
    lead: "In 1945, six women were chosen to program ENIAC. There was no programming language and no manual yet. They learned the machine from its block and wiring diagrams, and worked out every cable by hand.",
    fcLead: "fact-check B10 wording (the 1946 report is dated June 1946, after they had learned). Selected 1945 from the women computing firing tables by hand for the Ballistic Research Laboratory at the Moore School. B13: they were the FIRST programmers; Fritz names 23 women who worked on ENIAC.",
    shell: "Our shell mission is based on the shell path ENIAC’s women programmers set up for its unveiling on February 15, 1946.",
    fcShell: "fact-check B8 (no names: credit for the unveiling trajectory is disputed between Jennings/Snyder and Wescoff/Lichterman); B7: the upstream Feb 15 program is Stuart's working reconstruction.",
    /**
     * Order as Nick gave it. Name as in 1945; `later` as known later in life
     * (Q17: both shown). fact-check B11: the names are correct; Marlyn (not
     * Marilyn); Jean was Betty Jean; Betty Snyder's first name was Frances.
     * The `line`s (where each studied) are not in the fact-check: sources are
     * the Women of ENIAC pages (computer.org, womenshistory.org).
     */
    plates: [
      { name: "Kathleen “Kay” McNulty", later: "Kay McNulty Mauchly Antonelli", line: "Mathematics graduate, Chestnut Hill College", fc: "Chestnut Hill College 1942, mathematics." },
      { name: "Betty Jean Jennings", later: "Jean Jennings Bartik", line: "Mathematics graduate, Northwest Missouri State", fc: "Northwest Missouri State Teachers College, 1945, mathematics." },
      { name: "Frances Elizabeth “Betty” Snyder", later: "Betty Snyder Holberton", line: "Studied at the University of Pennsylvania", fc: "Studied journalism at Penn." },
      { name: "Marlyn Wescoff", later: "Marlyn Wescoff Meltzer", line: "Graduate of Temple University", fc: "Temple University 1942." },
      { name: "Frances “Fran” Bilas", later: "Frances Bilas Spence", line: "Mathematics graduate, Chestnut Hill College", fc: "Chestnut Hill College 1942, mathematics." },
      { name: "Ruth Lichterman", later: "Ruth Lichterman Teitelbaum", line: "Mathematics graduate, Hunter College", fc: "Hunter College, New York, mathematics." },
    ] as PersonPlate[],
    /** fact-check B12: no end date (several worked on at Aberdeen into 1947 and later). */
    role: "ENIAC’s first programmers, from 1945",
  },

  // ---------------------------------------------------------------- page 3
  builders: {
    lead: "ENIAC was built for the U.S. Army at the Moore School of Electrical Engineering, University of Pennsylvania. Work began in 1943, and it was working by late 1945. The Army needed firing tables for its guns.",
    fcLead: "fact-check B19, B5; 'finished in 1945' is Nuance: working late 1945, accepted by the Army July 1946. B21: contract W-670-ORD-4926 signed 5 June 1943 for $61,700, grown to $486,804.22.",
    people: [
      { name: "J. Presper Eckert", line: "Chief engineer of ENIAC", fc: "fact-check B14: correct." },
      { name: "John W. Mauchly", line: "Proposed the machine in 1942 and helped design it", fc: "fact-check B15: correct (August 1942 memo; proposal to the Army 9 April 1943)." },
      { name: "Herman H. Goldstine", line: "Army officer and mathematician who oversaw the project", fc: "fact-check B16: a lieutenant and mathematician, the Ordnance Department's resident supervisor. Not a builder (B18)." },
      { name: "Adele Goldstine", line: "Wrote the technical manual, helped train the programmers", fc: "fact-check B17 (its wording, shortened to fit one line). Sole author of Part I of the 1946 Report on the ENIAC. Not a builder (B18) and not one of the six (B11)." },
    ] as PersonPlate[],
    bodies: [
      { name: "Moore School of Electrical Engineering", later: "University of Pennsylvania", line: "Where ENIAC was designed and built", fc: "fact-check B19: correct." },
      { name: "U.S. Army Ordnance", later: "Ballistic Research Laboratory", line: "Paid for ENIAC, then ran it at Aberdeen, Maryland, from 1947 to 1955", fc: "fact-check B20 wording; B22: restarted 29 July 1947, switched off 2 October 1955." },
    ] as PersonPlate[],
    thanks: "Thank you to all of them, and to the many engineers, technicians and computers whose names are not on this wall.",
  },

  // ---------------------------------------------------------------- page 4
  exhibit: {
    lead: "This exhibit runs on Brian Stuart’s simulator, on a screen of the Vintage Computer Federation at InfoAge. Our missions come from real history.",
    sourcesTitle: "Where the missions come from",
    sources: [
      { what: "Squares", from: "An example program by Brian L. Stuart, written for his simulator.", fc: "sq.e ships with the upstream simulator." },
      { what: "Primes", from: "Based on D. H. Lehmer’s run over the July 4 weekend of 1946, with Emma Lehmer. It used a sieve to find primes. Our program follows Liesbeth De Mol and Maarten Bullynck’s reconstruction.", fc: "fact-check C1, C8, C9: 'based on' his run; his goal was exponents of 2 modulo primes, and the sieve found the primes. Bullynck & De Mol, Archive for Mathematical Logic 49 (2010); De Mol & Bullynck, CiE 2008 (LNCS 5028). Emma Lehmer: DMB08 abstract." },
      { what: "Shell’s path", from: "Brian Stuart’s reconstruction of the shell trajectory from ENIAC’s unveiling, February 15, 1946.", fc: "fact-check B6, B7: the upstream program is Stuart's working reconstruction of the Feb 15 one." },
      { what: "Battleship and Fire Mission", from: "Games on Brian Stuart’s shell program. You pick the gun and the angle, and ENIAC flies the shell. Fire Mission is the Army version: the Army paid for ENIAC.", fc: "docs/army-game-research.md: Army Ordnance contract with the Moore School, 5 June 1943 (Army history page). Stuart's drag table is his own reconstruction." },
      { what: "Top Secret", from: "A stand-in written for this exhibit, not a recreation. In December 1945 Los Alamos ran a classified problem on ENIAC, and its details are still not public. Our program spreads heat along a rod, a job of the same kind.", fc: "docs/manhattan-research.md: the first ENIAC problem was a Los Alamos problem, Dec 1945 to early 1946; the 1948 Monte Carlo runs are a separate, later effort. programs/heatrod.e is exhibit-team work." },
      { what: "Difference", from: "Brian L. Stuart’s program from his tutorial “Polynomial Tables on the ENIAC”. It builds a table by adding differences, the method Babbage’s Difference Engine was designed around.", fc: "Stuart's tutorial, p. 1 (Babbage's motivation; the Method of Differences). Needs a second, museum-grade source for the Babbage claim before the floor (video plan section 6)." },
    ] as Source[],
    museumTitle: "The museum",
    museum: "Vintage Computer Federation, at the InfoAge Science and History Museums, Wall, New Jersey.",
    madeBy: "Exhibit by Nick DeMarco",
    madeByRole: "Docent and Exhibit Developer, Vintage Computer Federation",
    fcMadeBy: "Q18 settled 2026-10-02: Nick's VCF role title (Docent and Exhibit Developer), no personal credentials on the exhibit.",
    type: "Type: Atkinson Hyperlegible and IBM Plex Mono (SIL Open Font License).",
    welcome: "Know more of this story, or spot a mistake? Please tell a docent. We would love to hear it.",
    qr: { label: "Vintage Computer Federation", url: "https://vcfed.org/", print: "vcfed.org" } as Link,
  },

  // ---------------------------------------------------------------- page 5 (draft)
  idea: {
    lead: "Before ENIAC, John Mauchly led a team of human computers on a classified radar-antenna job. It came from the Signal Corps’s radar laboratories in New Jersey, a Monmouth County network that included Camp Evans.",
    fcLead: "Mauchly, Smithsonian Computer Oral History (Tropp, 10 Jan 1973), pp. 15-20, 33-34: Brainerd negotiated a classified contract 'with the Signal Corps in New Jersey' for radar radiation patterns; Mauchly did the numerical integration by desk calculator. The transcript never names Camp Evans (nor does the 6 Feb session); that the client was a laboratory at Camp Evans is InfoAge's inference. Nick chose this wording 2026-10-15 (docs/camp-evans-eniac-research.md). 'Human computers': the Moore School's hired computers (Mauchly p. 69).",
    left: {
      kicker: "The Signal Corps job",
      line: "How does a radar dish send its signal? Solve the equations by hand, one tiny piece at a time.",
      fc: "Mauchly pp. 15-16: numerical integration of the electromagnetic equations over the reflector, piece by piece, on desk calculators.",
    },
    right: {
      kicker: "The Army’s job",
      line: "Where does a shell land? Work out its flight by hand, step by step, for every firing table.",
      fc: "Mauchly p. 20: step-by-step integration on Friden desk calculators; about two weeks per trajectory; about a hundred women computing in 1943 and still falling behind.",
    },
    foot: "At the same school, two real problems with the same mathematics and the same bottleneck. They showed what a faster machine would be for.",
    /** A footnote, small: what the source says and what is not independently verified (Nick, 2026-10-15). */
    note: "Mauchly’s own account says only “the Signal Corps in New Jersey”. That Camp Evans was part of it has not been independently verified.",
    fcFoot: "Mauchly p. 20: the slow hand calculation on the Signal Corps project, and the Ballistics Research Laboratory's firing-table backlog, are the two pressures he describes as pushing him toward an electronic computer. 'At the same school': the women computing firing tables worked 'around that place' (p. 20); the Philadelphia group was at the Moore School.",
  },

  // ---------------------------------------------------------------- attract plate (UX 14.2.1)
  /** Rotating honor plate slides for attract (8 s each, 400 ms cross-fade). */
  /**
   * S1's designers plate, beside the ENIAC title: as prominent as the Stuart
   * plate (the machine, and the simulator of it). "Designed", not
   * "invented": the 1973 Honeywell v. Sperry Rand ruling voided the patent.
   */
  designers: {
    plateKicker: "ENIAC was designed by",
    names: ["J. Presper Eckert", "John W. Mauchly"],
    fc: "[WD46] War Department release, 16 Feb 1946 (americanhistory.si.edu/comphist/pr1.pdf): 'the ENIAC ... is the invention of Dr. J. W. Mauchly and Mr. J. Presper Eckert, Jr., both of the Moore School'; Eckert 'joined with Dr. Mauchly in elaborating the plans for the ENIAC and took charge of the technical and engineering work'. B14, B15.",
  },
  /** The rotating S1 plate. Eckert and Mauchly have their own fixed plate (designers), so no "builders" slide. */
  attractSlides: [
    { heading: "ENIAC’s first programmers", names: ["Kay McNulty", "Jean Jennings", "Betty Snyder", "Marlyn Wescoff", "Fran Bilas", "Ruth Lichterman"] },
    { heading: "The project team", names: ["Herman Goldstine", "Adele Goldstine"] }, // fact-check B18
    { heading: "Built at and for", names: ["Moore School of Electrical Engineering", "U.S. Army Ballistic Research Laboratory"] },
    {
      heading: "The machine",
      names: ["About 18,000 vacuum tubes", "About 150 kilowatts", "About 30 tons"],
      fc: "docs/tubes.md 2.2 (optional attract plate, Q26). docs/fact-check.md E1 (about 18,000 tubes: R46 Part I 1.5.1, WD46), E6 (about 150 kW: the 1946 Moore School figure, WD46, R46-1 1.5.2) and the disagreement table (weight: 'about 30 tons', Kempf, Penn).",
    },
  ] as { heading: string; names: string[]; hold?: boolean; fc?: string }[],

  /** Finale beat F4's line (UX 14.5.2), in fact-check B13 wording; F3 uses stuart.finaleLine. */
  finaleThanks: "Six women were its first programmers. Engineers and an Army team built it. Thank you to all of them.",
};

/** True if a block may be drawn (only `hold: true` keeps it off). */
export const shown = <T extends Block>(b: T): boolean => !b.hold;
