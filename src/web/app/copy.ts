// Generic UI copy (not mission content; mission copy comes from the mission
// JSON). Wording from docs/ux-spec.md.

export const COPY = {
  credit: "ENIAC designed by J. Presper Eckert and John W. Mauchly · Simulator by Brian L. Stuart, Drexel University",
  wordmark: "ENIAC",
  /** The Home button beside the wordmark: back to the mission picker from any screen. */
  home: "Home",
  waitingMachine: "Waiting for the machine...",
  wakingUp: "Waking ENIAC up...",
  start: {
    title: "ENIAC",
    subtitle: "The room-sized computer of 1946. Now you program it.",
    pill: "Touch to program ENIAC",
  },
  picker: {
    title: "Pick a mission",
    startHere: "Start here",
    upNext: "Up next",
    done: "Done",
    start: "Start",
    then: "then",
    order: "Suggested order",
    orderLine: (orders: number[]) => orders.join(", then "),
    /** More missions than fit: the pager under the cards. */
    showing: (first: number, last: number, of: number) => `Missions ${first} to ${last} of ${of}`,
    earlier: "Earlier",
    more: "More missions",
    about: (min: number) => `About ${min} min`,
    wire: (n: number, read = false) => `You wire ${n} steps${read ? " and read a card" : ""}`,
  },
  header: {
    missions: "Missions",
    startOver: "Start over",
    stepOf: (i: number, n: number) => `Step ${i} of ${n}`,
    mission: (order: number, title: string) => `Mission ${order}: ${title}`,
  },
  confirm: {
    text: "Start this mission again? Your cables will come out.",
    textMenu: "Go back to the missions? Your cables will come out.",
    /** The wordmark (the docents' touch point): back to S1 from anywhere. */
    textStart: "Go back to the welcome screen? This visit will end.",
    yes: "Yes, start over",
    yesMenu: "Yes, go back",
    no: "Keep going",
  },
  rail: {
    letsGo: "Let's go",
    next: "Next step",
    finish: "Finish wiring",
    doIt: "Do it for me",
    skip: "Skip setup, just run it",
    tellMore: "Tell me more",
    close: "Close",
    showWhere: "Show me where",
    doneForYou: "Done for you",
    continue: "Continue",
    workbench: "We moved these units next to each other so you can see them. On the real ENIAC they are far apart.",
    cables: (n: number) => `${n} cables`,
    switches: (n: number) => `${n} switches`,
    pickNumber: "Pick a number for this dial:",
    pickRepeat: "How many times?",
    pickPrinter: "Punch this field, or leave it blank?",
    roomPlan: "The ENIAC room, seen from above. Not to scale.",
  },
  // Squares tile figures (docs/handoff-squares-tiles.md): briefing captions,
  // the plan's "+3"/"+1" labels and the replay button.
  tiles: {
    count: (n: number) => (n === 1 ? "1 tile" : `${n} tiles`),
    rows: (n: number) => `${n} rows of ${n} = ${n * n} tiles`,
    square: (n: number) => `The square of ${n} is ${n * n}`,
    plus: (n: number) => `+${n}`,
    again: "↻ Again",
  },
  // Difference plan figure (stage/diffig.ts): the table built by adding.
  difference: {
    heads: ["Row", "Table value", "Change", "Next change", "Steady"],
    start: (r: readonly number[]) => `Start: ${r[0]}, ${r[1]}, ${r[2]}, ${r[3]}`,
    add: (f: number, d: number, next: number) => `${f} + (${d}) = ${next}`,
    only: "Only adding. No multiplying.",
    briefStart: "Start with 600.",
    briefAdd: "Add the change. The change changes too.",
    briefNegative: "Now it goes below zero.",
    change: (d: number) => (d < 0 ? `${d}` : `+${d}`),
  },
  run: {
    init: "INIT",
    initSub: "Initiating Pulse: the GO button",
    clear: "CLEAR",
    clearSub: "Count from 0 again",
    slow: "Slow",
    full: "Full",
    speed: "Speed",
    skipAnswer: "Skip to the answer",
    keepPressing: "Keep pressing for me",
    stop: "Stop pressing",
    showMe: "Show me what happened",
    helper: "helper readout",
    /** S6 header: swap the mission's own view for the whole room, and back (run/roomview.ts). */
    seeRoom: "See the whole room",
    seeMission: "Back to the mission view",
    roomNote: "These are your mission's lamps, live, on the whole machine.",
    tape: "Notebook tape",
  },
  result: {
    next: (t: string) => `Next: ${t}`,
    tryAgain: "Try again",
    menu: "Menu",
    finish: "Finish",
  },
  // Card pane, plot and run rail extras for the M2 missions. Mission copy
  // (labels, captions) comes from the mission JSON; these are generic.
  cards: {
    showing: (n: number) => `Card ${n}`,
    tapToSee: "Tap a card to see it large",
  },
  run2: {
    read: "READ",
    readSub: "Pull the card into ENIAC",
    initDone: "INIT pressed",
  },
  // Trajectory figures (UX 8.3.3): explanatory art, no units.
  traj: {
    dots: (n: number) => (n === 1 ? "1 dot" : `${n} dots`),
    joined: "Each dot is a card. Join the dots: that is the path.",
    air: "air slows it",
    gravity: "gravity pulls",
    punched: "one second done: a card is punched",
    stillFlying: "still flying? yes: hop again",
    card: (n: number) => `card ${n}`,
    reader: "Card reader",
    onTheCard: "On the card:",
  },
  // Trajectory run view (UX 8.3.5 S6): helper readouts, labelled with the
  // accumulator number so a technician can find them. No units on screen.
  trajRun: {
    // [accumulator, label, the card field it matches: hop / x / y of the plot]
    readouts: [
      ["15", "Hop", "hop"],
      ["18", "Along", "x"],
      ["20", "Up", "y"],
      ["6", "Along speed", ""],
      ["4", "Up speed", ""],
    ] as [string, string, "hop" | "x" | "y" | ""][],
    landedNote: "Stopped on the landing card. These are its numbers.",
    acc: (n: string) => `Acc ${n}`,
    atWork: "Units at work",
  },
  // Primes run view labels (UX 8.2.5 S6 wireframe).
  primesRun: {
    testing: "Testing",
    helper: (n: string) => `Accumulator ${n}`,
    checkers: "Group checkers",
    acc: (n: string) => `Acc ${n}`,
    fits: "fits!",
  },
  // Primes figures (UX 8.2.3): briefing (cookies as tiles) and plan (group
  // checkers). Numbers are the ones the real program uses.
  primes: {
    cookies: (n: number) => `${n} cookies`,
    shares: "3 equal groups of 4. It shares evenly!",
    now7: "Now 7",
    leftOver: (g: number) => `${g} groups: 1 left over`,
    left: (r: number) => `${r} left over`,
    prime7: "7 won't split evenly. Prime!",
    fits: "fits",
    fitsBang: "fits!",
    groupsOf: (k: number) => `groups of ${k}`,
    more: "+ 11 more group sizes",
    out: "out: no card",
    prime: "prime: punch a card",
    slowed: "How it works, slowed down",
    punch: "Punch",
    candidate: (n: number) => `Testing ${n}`,
  },
  // Live attract captions (UX 14.2.1 "Live caption"), used by attract/store.ts.
  attract: {
    waking: "Waking ENIAC...",
    reading: "Live: ENIAC is reading its card of numbers.",
    flying: (hop: number) => `Live: ENIAC is working out a shell's path. Hop ${hop}`,
    landed: "The shell has landed. ENIAC worked out the whole path.",
    between: "Starting another flight.",
    // S1 screen (UX 14.2.1): the LIVE chip (a dot and a word, not colour alone),
    // the shell's path card, and the landing hold's numbers (from the real card).
    live: "LIVE",
    waiting: "WAITING",
    plotTitle: "The shell's path",
    plotEmpty: "Waiting for the first card",
    hop: (n: number) => `Hop ${n}`,
    landedOn: (hop: number) => `Landed on hop ${hop}`,
    cardsPunched: (n: number) => (n === 1 ? "1 card punched" : `${n} cards punched`),
  },
  still: {
    title: "Still there?",
    body: "We will start over in",
    here: "I'm here",
  },
  error: {
    title: "ENIAC is resting.",
    body: "Please let a docent know.",
    trying: (a?: number, of?: number) => (a && of ? `Trying to wake it up again... (${a} of ${of})` : "Trying to wake it up again..."),
    staff: "Staff: tap the top-left corner 5 times, then enter the PIN and choose Restart simulator.",
  },
  // Staff screens (UX 7.11, 7.12.2; docs/original-ui-switch.md 6.7). No
  // keyboard anywhere: the PIN is entered on the S12 pad.
  admin: {
    pin: {
      title: "Staff PIN",
      clear: "Clear",
      ok: "OK",
      wrong: "Not right",
      locked: "Try again in a minute.",
      none: "No staff PIN is set on this kiosk.",
      checking: "Checking...",
      /** Not in UX 7.12.7: the bridge did not answer the login. */
      error: "The PIN could not be checked.",
    },
  },
  // The Original UI and the room tour (UX 7.12.7). The wrapper's own strings
  // (Back to kiosk, Going back...) live in deploy/kiosk/original-ui-back.tcl.
  originalUi: {
    tour: {
      label: "Original room tour",
      sub: "Brian L. Stuart's own screens tour the room by themselves.",
      confirm: "Leave the kiosk for the original room tour? This visit will end.",
      yes: "Yes, take the tour",
      no: "Keep exploring",
      switching: "Starting the room tour...",
      switchingSub: "The kiosk is closing for a moment.",
      failed: "The room tour did not start.",
      failedBack: "Back to Explore",
    },
    staff: {
      header: "Staff",
      exits: (m: number, ss: string) => `Exits in ${m}:${ss}`,
      restart: "Restart simulator",
      restartNote: "Starts the simulator fresh.",
      original: "Original UI",
      originalNote: "Brian L. Stuart's own screen for the simulator.",
      notInstalled: "Not installed on this box.",
      return: "Return to kiosk",
      confirmTitle: "Switch to the original screen?",
      confirmBody: 'The kiosk will close for now. Tap "Back to kiosk" in the top-left corner to bring it back.',
      yes: "Yes, switch",
      no: "Not now",
      switching: "Switching to the original screen...",
      switchingSub: "The kiosk is closing. This takes a few seconds.",
      failed: "The original screen did not start.",
      failedSub: "The kiosk is still running.",
      failedBack: "Back to admin",
      /** Not in UX 7.12.7: Restart simulator's request failed. */
      actionFailed: "That did not work. Try again.",
    },
  },
};
