# Walkthrough video narration

Voice-over scripts for the narrated videos in `docs/video/`, keyed to the `card(...)`, `cap(...)` and `say(...)` beats in `tests/web/video/`:

| Video | File | Spec |
|---|---|---|
| 1 Squares | `eniac-touch-walkthrough-squares.mp4` | `walkthrough.spec.ts` |
| 2 Primes | `eniac-touch-walkthrough-primes.mp4` | `walkthrough-primes.spec.ts` |
| 3 Trajectory | `eniac-touch-walkthrough-trajectory.mp4` | `walkthrough-trajectory.spec.ts` |
| 4 The tour (flagship) | `eniac-touch-tour.mp4` | `walkthrough-tour.spec.ts` |
| Clip A Attract | `attract.mp4` | `clip-attract.spec.ts` |
| Clip B Explore | `explore.mp4` | `clip-explore.spec.ts` |
| Clip C Tubes | `tubes.mp4` | `clip-tubes.spec.ts` |
| Clip D Finale | `finale.mp4` | `clip-finale.spec.ts` |

**Voice:** Nick's own cloned ElevenLabs voice ("Nick 2", `eleven_multilingual_v2`, stability 0.5, similarity 0.75, style 0.4, speed 1.12), rendered by `tests/web/video/narration-gen.py`. The narrator speaks as Nick, a docent at the Vintage Computer Federation museum. Every historical line uses the wording of `docs/fact-check.md`.

**Status: DRAFT. Not reviewed. Do not release outside the team.**

## How to read this

- The first column is the exact caption text from the spec file (or "title card" / "end card"). Captions keep their symbols because they are lookup keys. The narration column is written for text-to-speech.
- "About" is the estimated length of the beat in seconds: the spec's `pause(...)` plus roughly 1.5 seconds per tap. Real beats that wait on the simulator (INIT, full speed, skip) vary from run to run, so those have pause markers. After the voice is generated, re-time against the actual video and nudge the pauses.
- Pace is about 2.5 words per second. A line that is a bit long for its beat can start a moment early or run into the next breather.
- **[FC]** at the end of a line means it contains a historical claim taken from the repo docs. Doug and the fact-checker should review every [FC] line before anyone outside the team sees a video. Remove the tag only when the claim is confirmed.
- **[pause: let the lamps play]** means say nothing and let the machine be the show.
- "(caption cleared)" is the beat where the spec calls `cap(page, null)`.
- A beat in parentheses with a video tag, like "(tour: f3)", is a line said with no caption change (`say(...)` in the spec).
- Where a video says it fast-forwards (the tour and the finale clip do Missions 2 and 3 off camera), the spec marks a cut (`cutFrom`/`cutTo`) and `narration-mux.py` removes it. Long waits (a slow flight) are trimmed the same way (`trimWait`). Nothing is ever sped up, and nothing is said inside a cut.

## Running threads across the three videos

1. **The impatient machine.** Squares ends by promising that ENIAC will learn patience. Primes pays it off: ENIAC can add far faster than the card punch can punch, so it waits and taps its foot. Trajectory does not repeat the joke, because the punch overlaps the next hop there (spike S2) and does not limit that mission.
2. **Cookies and tiles.** Primes opens with a callback to the Squares tile floor and adds the cookies. Trajectory closes the thread with "no cookies this time, just shells".
3. **The multiplier.** Squares says ENIAC never multiplies. Trajectory notes that Squares never needed the multiplier, but this flight does.

## Pronunciation notes for whoever sets up the voice

- ENIAC is written as plain "ENIAC" throughout. **ElevenLabs needs no respelling.** Checked on 2026-10-02 with whisper.cpp (base model): Nick's voice says the all-caps "ENIAC" as one word (transcribed "NEAC", that is EN-ee-ack), not letter by letter, and more cleanly than the "Eniac" respelling, which garbled the words after it. Kokoro still gets "Eniac" (the generator does that for `--engine kokoro` only).
- The "Find the dead tube" re-enactment labels its panels ACC 1 to ACC 4. The narration says "the third one" rather than reading the label aloud.
- **The narration does not speak Lehmer's name.** The earlier note said it is "LAY-mer", but no authoritative source was found (fact-check C10). A web search on 2026-10-02 (Wikipedia's D. H. Lehmer and Emma Lehmer pages, the MacTutor biographies, the IEEE Computer Society "Computer Pioneers" page, the Berkeley obituary of Emma Lehmer) turned up no pronunciation guide, no IPA and no family or colleague statement. The only hits were crowd-sourced sites (howtopronounce.com gives "leh-mer"; a Forvo entry for "D. N. Lehmer" exists but could not be checked), which are not good enough for a museum. So the two lines that named him (the Primes title card and end card) were reworded to leave the name out. If a recording of a colleague or a family member turns up, the name can go back in.
- Numbers are spelled out. "Twenty-eight oh one" is 2,801.

---

## Video 1: Squares

| Beat (exact caption) | About | Narration |
|---|---|---|
| title card | 7 s | Hi, I'm Nick, a docent at the Vintage Computer Federation museum. This is our ENIAC Touch Kiosk, running Brian L. Stuart's ENIAC simulator, live. |
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
| Press INIT — ENIAC's GO button. Lamps show the simulator's real accumulators. | about 55 s in all (4 s, then three presses) | Press init. It sends the initiating pulse, ENIAC's go signal. Those lamps are the simulator's real accumulators. |
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
| Press INIT. Slow: every odd number is tested by 14 checkers at once | about 8 s | Press init and watch. At slow speed, fourteen checkers test every odd number at the same time. [pause: let the lamps play] |
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

## Video 4: The tour

The flagship, about five minutes: S1 attract live, the picker, Explore ENIAC, the glossary, Keeping ENIAC alive with "Find the dead tube", the honor roll, Squares the quick way, a fast-forward through Missions 2 and 3 (cut), and the finale.

| Beat (exact caption) | About | Narration |
|---|---|---|
| title card | 9 s | Hi, I'm Nick, a docent at the Vintage Computer Federation museum. Come take a tour of our new ENIAC exhibit with me. Everything you'll see runs live, on Brian L. Stuart's ENIAC simulator. |
| Nobody is touching it, so ENIAC flies a shell, live | 10 s | When nobody's at the screen, the kiosk doesn't play a canned video. It runs ENIAC. Right now it's working out the path of a cannon shell, and every lamp in this room is the simulator's real state. |
| Every dot is a real punched card from the simulator | 8 s | Every dot is a real punched card. ENIAC was built to work out firing tables for Army guns, so a cannon shell is just the right thing to keep it busy. [FC] |
| A visitor walks up and touches the screen | 3 s | But the moment someone touches the screen... |
| Three missions, a walk around the room, and an honor roll | 6 s | you're in. Three missions, in a suggested order. But first, let's look around the room itself. |
| Explore ENIAC: the real room, with live lamps | 10 s | This is ENIAC, the way it stood. Forty panels in a U shape. Laid in a line, they'd stretch about eighty feet. And these lamps are live: that shell is still flying while we look around. [FC] |
| (tour: pan) | 5 s | Tap the arrows, or the map along the bottom, to walk down the room. |
| Walk the room: one card for each kind of unit | 10 s | Or press Walk the room, and meet the units one at a time. The Cycling Unit is ENIAC's clock. It ticks about a hundred thousand times a second, and one addition takes twenty ticks. [FC] |
| (tour: master programmer) | 8 s | The Master Programmer is the conductor. It counts, and decides what happens next. It has ten steppers, a bit like a music box with pins. [FC] |
| Right now: a live number from the simulator | 10 s | Here's one of ENIAC's twenty accumulators. Each one adds, and remembers one ten-digit number. And that number on the card is live. It changes as the shell flies. [FC] |
| Tap a mission to light up the units it uses | 9 s | Tap a mission, and the room lights up every unit it uses. The cannon shell needs nineteen accumulators, a function table, and the multiplier, which works on every hop. |
| The glossary: ENIAC's words, in plain English | 5 s | Stuck on a word? The glossary explains them all, in plain English. |
| Keeping ENIAC alive: about 18,000 vacuum tubes | 13 s | Now, my favorite part: keeping ENIAC alive. It had about eighteen thousand vacuum tubes. Each dot here is one. A radio had about ten! And here's a surprise: the glowing lamps you see are neon. The tubes sat inside. [FC] |
| About 150 kilowatts: as much as 1,500 bright bulbs | 8 s | ENIAC used about a hundred and fifty kilowatts, as much as fifteen hundred bright light bulbs. More than half of it just kept the tubes hot. [FC] |
| Myth check: did the lights of Philadelphia dim? | 8 s | So, did ENIAC dim the lights of Philadelphia when it switched on? It's a great story. But Eckert, who built it, called it total fiction. [FC] |
| Why tubes burned out | 7 s | Tubes wear out like light bulbs, and switching on and off is hard on them. So early on, the crew left the heaters on overnight. [FC] |
| The hunt: which unit, which circuit, which tube? | 7 s | When an answer came out wrong, the crew went hunting. Which unit? Which circuit? Which tube? Let's try it. [FC] |
| Find the dead tube: a re-enactment | 9 s | This part is a re-enactment. The panels are drawn and the fault is made up, but the steps follow the nineteen forty-six maintenance manual. First, run a test problem. [FC] |
| Every accumulator should show 5555555555 | 5 s | Every accumulator should end up showing all fives. One of them doesn't. Which one? |
| (tour: not that one) | 3 s | Hmm, not that one. It lines up with the others. |
| (tour: acc 3) | 4 s | There it is, the third one. One of its lamps is out of line. |
| (tour: place 4) | 5 s | Place four shows a nine instead of a five. So out comes its plug-in unit. |
| (tour: warm) | 4 s | Now touch the tubes. Warm means that one works. |
| (tour: cold) | 3 s | Cold! That's our dead tube. |
| Fixed! Every lamp lines up again | 8 s | Plug in a fresh unit, run the test again, and every lamp lines up. Eckert said a hunt like this took up to fifteen minutes. [FC] |
| The honor roll: Brian L. Stuart | 12 s | None of this would exist without Brian L. Stuart of Drexel University. He wrote the simulator behind every lamp you've seen, and it follows the real machine pulse by pulse. Without his work, this exhibit would be an empty screen. [FC] |
| ENIAC's first programmers | 16 s | And these are ENIAC's first programmers: Kay McNulty, Betty Jean Jennings, Betty Snyder, Marlyn Wescoff, Fran Bilas, and Ruth Lichterman. There was no programming language and no manual yet. They learned the machine from its diagrams, and worked out every cable by hand. [FC] |
| Mission 1, Squares: now I program ENIAC | 7 s | Now it's my turn to program ENIAC. Mission one is Squares. Picture tiles on a floor: three rows of three make nine. |
| (tour: the trick) | 7 s | To grow the square, add a row, a column, and one corner tile. ENIAC never multiplies here. It just adds. |
| Step 1: set a dial to 1 | 4 s | Step one: set a dial on the Constant Transmitter to one. |
| Step 2: plug a cable, one jack, then the other | 4 s | Step two: plug in a cable. Tap one jack, then the other. |
| Short on time? Skip: the rest is wired for you | 7 s | In nineteen forty-six, setting up a new problem could take a day or more. I'll let the kiosk wire the rest for me. [FC] |
| Press INIT, ENIAC's GO button | 3 s | Now press INIT, ENIAC's go button. |
| (tour: one) | 3 s | One times one is one. [pause: let the lamps play] |
| Skip to the answer: every square up to 12 × 12 | 6 s | Or skip to the answer: every square up to twelve times twelve, a hundred forty-four, all by adding. |
| Fast-forward: Missions 2 and 3, the quick way | 6 s | I'll fast-forward through missions two and three, the primes and the cannon shell. They each have their own video. |
| All three missions done: Finish | 5 s | And we're back. The shell has landed, all three missions are done, and the button says Finish. |
| (tour: f1) | 9 s | The finale. You programmed ENIAC, and it shows what this visit really did: the squares, the primes ENIAC punched, and the shell's flight. |
| (tour: f2) | 6 s | Here's every unit we used, lit up in the room. That's almost the whole machine. |
| (tour: f3) | 6 s | And again, Brian L. Stuart, who wrote this simulator. Every lamp we saw was run by his program. |
| (tour: f4) | 9 s | The people who made ENIAC. Six women were its first programmers. Engineers and an Army team built it. Thank you to all of them. [FC] |
| (tour: f5) | 4 s | Thanks for visiting! From here, a visitor can start over, or go exploring. |
| end card | 8 s | A huge thank-you to Brian L. Stuart, whose simulator is the beating heart of this exhibit. And thank you for watching. |

---

## Clip A: Attract

About a minute: one whole live flight on S1, its landing, the next flight, and a touch. The middle of a slow flight is trimmed (cut, not sped up).

| Beat (exact caption) | About | Narration |
|---|---|---|
| title card | 5 s | When nobody's using the kiosk, it doesn't play a canned video. It runs ENIAC, live. |
| The ENIAC room, lit by the live simulator | 9 s | This is the ENIAC room, panel by panel, and every lamp is the simulator's real state. The room drifts slowly, so people walking by see the whole machine. |
| Each dot is a real punched card: one hop of the shell | 11 s | ENIAC is working out the path of a cannon shell, one hop at a time. Each hop, it punches a card, and each card becomes a dot. ENIAC was built to work out firing tables for Army guns. [FC] |
| Landed: the hop and the card count, held for a moment | 6 s | Landed! The kiosk holds the landing for a moment, with the hop it landed on and the cards it punched. |
| Then a fresh flight, on a fresh run of the simulator | 4 s | Then it starts over, on a fresh run of the simulator. |
| One touch, and the visitor is in | 5 s | And the moment someone touches the screen, the flight stops and the missions appear. |
| end card | 5 s | Thanks to Brian L. Stuart, whose simulator flies every one of these shells. |

---

## Clip B: Explore

About a minute and a half: the room, a pan, Walk the room, a live accumulator, two missions' units, and the glossary.

| Beat (exact caption) | About | Narration |
|---|---|---|
| title card | 5 s | Explore ENIAC lets a visitor walk around the whole machine, panel by panel. |
| Forty panels in a U, with live lamps | 10 s | ENIAC's forty panels stood in a U shape. Laid in a line, they'd stretch about eighty feet. And the lamps are live: ENIAC is flying a cannon shell while we look. [FC] |
| (explore: pan) | 5 s | Tap the arrows, or the map along the bottom, to walk down the room. |
| Walk the room: twelve cards, one for each kind of unit | 7 s | Walk the room, and you meet each kind of unit. The Initiating Unit has the initiating pulse button, which the simulator calls init. |
| (explore: cycling) | 5 s | The Cycling Unit is the clock. It ticks about a hundred thousand times a second. [FC] |
| (explore: master programmer) | 6 s | The Master Programmer is the conductor, with ten steppers, a bit like a music box with pins. [FC] |
| Tap any panel: this number is live | 9 s | Tap any panel to meet it. An accumulator adds, and remembers one ten-digit number. ENIAC had twenty. This card shows this one's number, live. [FC] |
| Tap a mission: the room lights up the units it uses | 6 s | Tap a mission, and the room lights up the units it uses. Squares needs just four. |
| (explore: trajectory) | 6 s | The cannon shell needs nineteen accumulators, a function table, and the multiplier. |
| The glossary: ENIAC's words, in plain English | 6 s | And the glossary explains every word in plain English, from accumulator to vacuum tube. |
| end card | 5 s | Thanks to Brian L. Stuart, whose simulator lights every lamp in the room. |

---

## Clip C: Tubes

About a minute and a half: Keeping ENIAC alive (four cards and the myth check), then "Find the dead tube" played through, with two misses so the hint ring shows.

| Beat (exact caption) | About | Narration |
|---|---|---|
| title card | 5 s | How do you keep a machine with about eighteen thousand vacuum tubes running? Let's find out. [FC] |
| Each dot is one vacuum tube | 11 s | Each dot is one of ENIAC's tubes. A radio had about ten! A tube is a sealed bulb that switches a signal on and off, with nothing moving. The glowing lamps you see are neon. The tubes sat inside. [FC] |
| Power and heat: about 150 kilowatts | 9 s | ENIAC used about a hundred and fifty kilowatts. In one hour, that's as much electricity as a typical American home uses today in five to six days. [FC] |
| Myth check | 10 s | Did it dim the lights of Philadelphia? No. Eckert, who built it, called that story total fiction. ENIAC took its power from the city grid, through its own regulators. [FC] |
| Why tubes burned out | 9 s | Switching on and off is hard on tubes, so early on, the crew left the heaters on overnight. Eckert remembered losing about one tube every two days. [FC] |
| The hunt: which unit, which circuit, which tube? | 5 s | So when an answer came out wrong, the crew went hunting. Let's try it. |
| A re-enactment that follows the 1946 maintenance manual | 8 s | This is a re-enactment: drawn panels and a made-up fault, but the real steps from the nineteen forty-six maintenance manual. Run the test. [FC] |
| (tubes: which panel) | 4 s | Every accumulator should show all fives. Which one doesn't? |
| (tubes: the ring) | 5 s | Two misses, so the kiosk helps: a glowing ring around the right panel. |
| (tubes: which place) | 4 s | Now, which digit place? Look for the lamp that's lit at the wrong number. |
| (tubes: which tube) | 6 s | Place four shows nine, not five. Its plug-in unit slides out. Now touch each tube. |
| (tubes: cold) | 5 s | The first two were warm, and this one is cold. That's the dead tube. |
| Fixed! Every lamp lines up on 5 | 8 s | A fresh unit, the test runs again, and every lamp lines up. A real crew would also write the dead tube in the log. [FC] |
| end card | 5 s | Thanks to Brian L. Stuart, and to the crews who kept the real ENIAC running. |

---

## Clip D: Finale

About a minute: a real visit's finale. The three missions are done off camera first (cut).

| Beat (exact caption) | About | Narration |
|---|---|---|
| title card | 6 s | Finish all three missions, and the kiosk ends with a finale. Here's one, from a real visit. |
| Mission 3 done: all three missions, so the button says Finish | 6 s | This visitor just landed the cannon shell, the last of the three missions, so the button says Finish. |
| (finale: f1) | 9 s | First: you programmed ENIAC. The kiosk remembers what this visit really did: the squares counted, the cards ENIAC punched, the shell's flight. |
| (finale: f2) | 6 s | Then every unit the visitor used, lit up in the room. Almost the whole machine. |
| (finale: f3) | 8 s | Then the person who made it all possible: Brian L. Stuart, who wrote the simulator. Scan the code to visit his page. |
| (finale: f4) | 9 s | Then the people who made ENIAC. Six women were its first programmers. Engineers and an Army team built it. Thank you to all of them. [FC] |
| (finale: f5) | 3 s | And finally: thanks for visiting! |
| end card | 5 s | And my thanks to Brian L. Stuart, whose simulator makes all of this real. |

---

## Notes for reviewers

- **Trajectory scope.** The mission flies one shell path of 34 cards. The narration says "one shell path" and "one shell's whole flight" and never claims the full six-part 1946 demo. The title line says "recreation of the nineteen forty-six demo", which mirrors the on-screen title card, and it is tagged [FC].
- **No units on trajectory numbers.** The narration gives no feet or seconds. The only numbers are the card count (34), the number on the first card (97,367) and the cable and switch counts.
- **Punch pace.** "About one hundred cards a minute" is historical and tagged [FC]. The simulator's 0.6 seconds per card is a project fact, and it equals one hundred cards a minute.
- **"About three thousand additions."** This is arithmetic from two doc claims: an addition took one five-thousandth of a second (ux-spec 8.1.4, tagged [FC] there), and a card takes 0.6 seconds. It is tagged [FC] and is easy to cut: remove that one line and the pause after it.
- **No claims about Professor Stuart's views.** He is only credited as the author of the simulator and the programs, and as the source of the recreation.
- **Possible tight spots.** The title card lines are a little longer than the 5 to 6 second cards. Hold each card for an extra second, or let the voice start as the card fades in.
- **Left out of the three mission videos on purpose:** the 18,000 vacuum tubes, the six women programmers, "adding is what it did best" (flagged in the tiles handoff), any sieve of Eratosthenes remarks, and the claim that ENIAC could fly a shell faster than the shell flies.
- **The tour and the clips** follow the kiosk's own screens: the tube, power and myth lines are S16's copy (fact-check group E; Eckert's figures are always said as his memory, never as a plain fact), and the six names are the honor roll's, as on screen (fact-check B11: Marlyn, Betty Jean). The finale lines are the F1 to F5 copy (B13). Nothing in them is new history.
- **Cuts.** The tour and the finale clip say out loud that Missions 2 and 3 are fast-forwarded; that stretch is cut. The attract clip trims the middle of the flight if it runs long. Cuts only remove time; no clip is sped up or staged.
