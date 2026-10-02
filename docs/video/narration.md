# Walkthrough video narration: Squares, Primes, Trajectory

Voice-over scripts for the three walkthrough videos, keyed to the `card(...)` and `cap(...)` beats in `tests/web/video/walkthrough.spec.ts` (Squares), `walkthrough-primes.spec.ts` and `walkthrough-trajectory.spec.ts`.

**Status: DRAFT. Not reviewed. Do not release outside the team.**

## How to read this

- The first column is the exact caption text from the spec file (or "title card" / "end card"). Captions keep their symbols because they are lookup keys. The narration column is written for text-to-speech.
- "About" is the estimated length of the beat in seconds: the spec's `pause(...)` plus roughly 1.5 seconds per tap. Real beats that wait on the simulator (INIT, full speed, skip) vary from run to run, so those have pause markers. After the voice is generated, re-time against the actual video and nudge the pauses.
- Pace is about 2.5 words per second. A line that is a bit long for its beat can start a moment early or run into the next breather.
- **[FC]** at the end of a line means it contains a historical claim taken from the repo docs. Doug and the fact-checker should review every [FC] line before anyone outside the team sees a video. Remove the tag only when the claim is confirmed.
- **[pause: let the lamps play]** means say nothing and let the machine be the show.
- "(caption cleared)" is the beat where the spec calls `cap(page, null)`.

## Running threads across the three videos

1. **The impatient machine.** Squares ends by promising that ENIAC will learn patience. Primes pays it off: ENIAC can add far faster than the card punch can punch, so it waits and taps its foot. Trajectory does not repeat the joke, because the punch overlaps the next hop there (spike S2) and does not limit that mission.
2. **Cookies and tiles.** Primes opens with a callback to the Squares tile floor and adds the cookies. Trajectory closes the thread with "no cookies this time, just shells".
3. **The multiplier.** Squares says ENIAC never multiplies. Trajectory notes that Squares never needed the multiplier, but this flight does.

## Pronunciation notes for whoever sets up the voice

- ENIAC is written as plain "ENIAC" throughout.
- **The narration does not speak Lehmer's name.** The earlier note said it is "LAY-mer", but no authoritative source was found (fact-check C10). A web search on 2026-10-02 (Wikipedia's D. H. Lehmer and Emma Lehmer pages, the MacTutor biographies, the IEEE Computer Society "Computer Pioneers" page, the Berkeley obituary of Emma Lehmer) turned up no pronunciation guide, no IPA and no family or colleague statement. The only hits were crowd-sourced sites (howtopronounce.com gives "leh-mer"; a Forvo entry for "D. N. Lehmer" exists but could not be checked), which are not good enough for a museum. So the two lines that named him (the Primes title card and end card) were reworded to leave the name out. If a recording of a colleague or a family member turns up, the name can go back in.
- Numbers are spelled out. "Twenty-eight oh one" is 2,801.

---

## Video 1: Squares

| Beat (exact caption) | About | Narration |
|---|---|---|
| title card | 6 s | This is the ENIAC Touch Kiosk, running Brian L. Stuart's ENIAC simulator, live. |
| Attract screen: a visitor walks up and touches | 5 s | A visitor walks up and touches the screen. That is the whole invitation. |
| Pick a mission | 5 s | Pick a mission. We will start with Squares. |
| What is a square? Tiles on a floor | 8 s | Picture tiles on a floor. Three rows of three makes nine tiles. So nine is the square of three. |
| The trick: a bigger square is a row, a column and a corner added | 12 s | To grow the square one size, add a row, a column, and one corner tile. Nine, plus three, plus three, plus one, makes sixteen. ENIAC never multiplies here. It just adds. |
| Step 1: set a dial on the Constant Transmitter | 8 s | Step one. Set a dial on the Constant Transmitter. Your first job is the number one. |
| A wrong choice gets a gentle hint, and never reaches the simulator | 7 s | Pick the wrong number and you get a gentle hint. Nothing reaches the simulator, so no harm done. |
| (caption cleared) | 4 s | There. Dial set to one. |
| Step 2: plug a cable — tap one jack, then the other | 8 s | Step two. Plug in a cable. Tap one jack, then the other, and the number can travel. |
| Step 3: carry the number to Accumulator 1 | 7 s | Step three. Carry the number to Accumulator One, one of ENIAC's adding machines. |
| Short on time? Skip ahead — the rest is wired automatically | 14 s | Short on time? Skip ahead, and the rest gets wired for you. On the real ENIAC, programmers placed hundreds of cables by hand. Setting up a new problem could take a day or more. [FC] |
| Press INIT — ENIAC's GO button. Lamps show the simulator's real accumulators. | about 55 s in all (4 s, then three presses) | Press INIT, ENIAC's go button. Those lamps are the simulator's real accumulators. |
| (same beat, during press 1) | about 15 s | One times one is one. [pause: let the lamps play] |
| (same beat, during press 2) | about 15 s | Press again. Two times two is four. [pause: let the lamps play] |
| (same beat, during press 3) | about 15 s | And again. Three times three is nine. [pause: let the lamps play] |
| 1, 4, 9 … each press adds a row, a column and a corner | 4 s | One, four, nine. Each press adds a row, a column, and a corner. |
| Skip to the answer: full speed up to 12 × 12 | 5 s plus the run | Or skip to the answer, full speed, all the way to twelve times twelve. [pause: let the lamps play] |
| (caption cleared) | 8 s | There is the whole table, up to one hundred forty-four. The cables were the program. And next time, ENIAC meets a card punch, and learns patience. |
| end card | 7 s | Warm thanks to Brian L. Stuart of Drexel University, whose simulator makes this real. |

---

## Video 2: Primes

| Beat (exact caption) | About | Narration |
|---|---|---|
| title card | 5 s | ENIAC hunts for primes, in a program based on a real run from July nineteen forty-six. [FC] |
| Missions in a suggested order. Primes is number 2 | 5 s | Welcome back. Missions come in a suggested order, and primes is number two. |
| What is a prime? Share cookies evenly, on the same tile floor | 11 s | Remember the tiles from Squares? Same floor, now with cookies. Twelve cookies share evenly: two groups of six, three groups of four. Seven always leaves one over. Numbers like seven are prime. |
| The trick: group checkers try 3, 5, 7 and more, all at once | 12 s | ENIAC tries groups of three, five, seven and more, all at once. If any size fits, the number is out. If none fit, it is prime. [pause: let the cards and tiles play] |
| Step 1: only odd numbers, so ENIAC counts up by 2 | 8 s | Step one. Only odd numbers need testing, so ENIAC counts up by two. |
| Step 2: the groups-of-3 checker calls out 'fits!' on trunk 1-7 | 7 s | Step two. The groups-of-three checker shouts, fits, over trunk one-seven. |
| Step 3: the Master Programmer listens. A wrong jack gets a hint, never the simulator | 9 s | Step three. The Master Programmer, ENIAC's conductor, listens for that call. Pick the wrong jack and you only get a hint. |
| Skip the last two steps: the rest is wired for you, 264 cables and 285 switches | 9 s | The rest is wired for you: two hundred sixty-four cables and two hundred eighty-five switches. Your fingers can rest. |
| Press INIT. Slow: every odd number is tested by 14 checkers at once | about 8 s | Press INIT and watch. At slow speed, fourteen checkers test every odd number at the same time. [pause: let the lamps play] |
| 3 won't split into equal groups: a real punched card | about 3 s | Three won't split evenly. Card number one! |
| 9 splits into 3 groups of 3: the checker calls 'fits!', so no card | about 8 s | Nine splits into three groups of three. The checker calls out, fits, and no card is punched. [pause: let the lamps play] |
| Full speed: the card punch sets the pace, a card every 0.6 s | about 50 s | Full speed! But now the card punch sets the pace. A real punch managed about one hundred cards a minute, and the simulator copies it: one card every six tenths of a second. [FC] |
| (same beat, a little later) | | [pause: let the lamps play] |
| (same beat, a little later) | | On the real machine an addition took one five-thousandth of a second. So while the punch finishes a single card, ENIAC could add about three thousand times. It is very patient. It has to be. [FC] |
| (same beat, a little later) | | [pause: let the lamps play] Every card is a number that no cookie plan can share evenly. |
| Skip to the answer: the first 100 primes | 6 s | Let us skip ahead to the first one hundred primes. ENIAC taps its foot a little longer. |
| Card 100 is 547. The result stays live: ENIAC keeps counting to 2,801 | 9 s | Card one hundred is five hundred forty-seven, and ENIAC keeps counting up to twenty-eight oh one. Same machine as Squares, different cables. |
| end card | 6 s | Warm thanks to Brian L. Stuart, and to De Mol and Bullynck, who reconstructed that nineteen forty-six run. [FC] |

---

## Video 3: Trajectory

| Beat (exact caption) | About | Narration |
|---|---|---|
| title card | 5 s | Mission three: one cannon shell, from Brian L. Stuart's recreation of the nineteen forty-six demo. [FC] |
| Three missions in a suggested order. Trajectory is number 3 | 5 s | Three missions now, and trajectory is the last of them. |
| Each card ENIAC punches is one dot. Join the dots: the path | 9 s | A shell flies in an arc. ENIAC finds it hop by hop, and punches a card for each. Each card is one dot. |
| One hop: the air slows the shell, gravity pulls it down, a card is punched | 11 s | One hop: the air slows the shell, gravity pulls it down, a card is punched. ENIAC was built to work out firing tables for Army guns. [FC] |
| Step 1: the card reader tells ENIAC it is done | 7 s | Step one. The card reader tells ENIAC it is done. One cable carries the news. |
| Step 2: punch the hop number on every card | 7 s | Step two. Punch the hop number on every card, so each dot knows its place. |
| Skip ahead: 293 cables and 1,147 switches, most of them the drag table | 12 s | Skip ahead: two hundred ninety-three cables and one thousand one hundred forty-seven switches, most of them the drag table, where ENIAC looks up how much the air slows the shell. |
| First READ: the real card of numbers goes into ENIAC | 6 s | Press READ, and a card of numbers goes into ENIAC. |
| 97,367 is in Accumulator 1. Now INIT: one press flies the shell | 6 s | Ninety-seven thousand three hundred sixty-seven is in Accumulator One. One press of INIT flies the shell. |
| Each card is one hop: how far along, how high up. Each dot is a real card | 10 s | Each card is one hop: how far along, and how high up. Every dot is a card from the simulator. No cookies this time, just shells. [pause: let the dots draw] |
| The multiplier and the drag table work between cards | about 20 s | Between cards, the multiplier and the drag table do the heavy lifting. Squares never needed the multiplier. This flight does. [pause: let the lamps play] |
| Highest point: from here the shell comes down | about 24 s | The highest point. From here, the shell comes down. [pause: let the dots draw] Gravity, as ever, wins. [pause: let the dots draw] |
| Landed: the height dropped below zero, and ENIAC stops on that card | 5 s | Landed. The height has dropped below zero, and ENIAC stops on that card. |
| 34 hops, 34 cards: the whole flight, drawn from the punched cards | 9 s | Thirty-four hops, thirty-four cards: one shell's whole flight, drawn from the dots. [pause: let the dots play] |
| end card | 6 s | Warm thanks to Brian L. Stuart, whose recreation we borrowed one shell path from. |

---

## Notes for reviewers

- **Trajectory scope.** The mission flies one shell path of 34 cards. The narration says "one shell path" and "one shell's whole flight" and never claims the full six-part 1946 demo. The title line says "recreation of the nineteen forty-six demo", which mirrors the on-screen title card, and it is tagged [FC].
- **No units on trajectory numbers.** The narration gives no feet or seconds. The only numbers are the card count (34), the number on the first card (97,367) and the cable and switch counts.
- **Punch pace.** "About one hundred cards a minute" is historical and tagged [FC]. The simulator's 0.6 seconds per card is a project fact, and it equals one hundred cards a minute.
- **"About three thousand additions."** This is arithmetic from two doc claims: an addition took one five-thousandth of a second (ux-spec 8.1.4, tagged [FC] there), and a card takes 0.6 seconds. It is tagged [FC] and is easy to cut: remove that one line and the pause after it.
- **No claims about Professor Stuart's views.** He is only credited as the author of the simulator and the programs, and as the source of the recreation.
- **Possible tight spots.** The title card lines are a little longer than the 5 to 6 second cards. Hold each card for an extra second, or let the voice start as the card fades in.
- **Left out on purpose:** the 18,000 vacuum tubes, the six women programmers (names need Doug's approval), "adding is what it did best" (flagged in the tiles handoff), any sieve of Eratosthenes remarks, and the claim that ENIAC could fly a shell faster than the shell flies.
