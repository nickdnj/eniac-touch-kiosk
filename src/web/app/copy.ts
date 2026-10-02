// Generic UI copy (not mission content; mission copy comes from the mission
// JSON). Wording from docs/ux-spec.md.

export const COPY = {
  credit: "ENIAC simulator by Brian L. Stuart, Drexel University",
  wordmark: "ENIAC",
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
    punched: "hop! a card is punched",
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
};
