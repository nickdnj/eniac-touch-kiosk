# Fact-check: every historical claim in the ENIAC Touch Kiosk

**Date:** 2026-10-02. **Scope:** the [FC] list in `docs/ux-spec.md` §14.8 and §8.5, the glossary (§15), the other [FC] tags in `docs/ux-spec.md` and `docs/PRD.md`, the `content:` copy in `missions/*.yaml`, `docs/video/narration.md`, and history copy in `src/web/app/copy.ts`. Line numbers are against `main` at `00a8088`. Developers are editing copy at the same time, so line numbers may drift; the quoted text is the anchor.

**Purpose:** to get the exhibit right. This is not an approval gate. Each row gives a verdict and, where needed, replacement copy (at most 40 words, 5th-grade reading level) that can be pasted straight in.

Verdicts: **Correct** · **Nuance** (true, but the wording overreaches or could mislead; a safer wording is given) · **Wrong** (fix it) · **Unverifiable** (no good source found; soften or cut).

---

## Summary: what is WRONG (fix these first)

1. **"Every ENIAC job had a repeat switch."** (`missions/squares.yaml:81`, ux-spec 729). Each accumulator had 12 program controls. Only 8 of them (the *transceivers*) had a repeat switch, set from 1 to 9. The other 4 (*receivers*) had no repeat switch and no "done" output.
2. **"Trunks were long tubes of wires."** (`missions/squares.yaml:40`, ux-spec 696). They were open metal **trays** of wires, 8 ft long, running along the panels. They were not tubes.
3. **Glossary 16, "Transceiver" (draft).** (ux-spec 2242). The draft says it is "a part that sends numbers onto a tray, or receives them". That is wrong. In ENIAC's own vocabulary a transceiver is a **program control** on an accumulator. It receives a program pulse, does its job 1 to 9 times, then sends a "done" pulse. The term can now be shown, with the corrected meaning.
4. **Honor plate heading "THE BUILDERS: Herman Goldstine, Adele Goldstine".** (ux-spec 1771, attract slide 3). Neither Goldstine built ENIAC. Herman was the Army's liaison and supervisor for the project. Adele wrote the technical manual and taught the programmers. Use another heading, such as "THE PROJECT TEAM".
5. **"Data trunk" and "program trunk" are only the simulator's words, and "trays" are the real ones.** (ux-spec 1941, 2182, §15.1). Half wrong. Both words come from the 1946 report. A *tray* was one 8-ft rack. Trays joined end to end made a *trunk*. The real phrase is **digit trunk**, not "data trunk".
6. **"By hand, the same work took days."** (`missions/trajectory.yaml:199`). This overstates it. The Army's figure for one 60-second shell path was about **20 hours** for a person with a desk calculator (Goldstine gives about 12 hours). Say "many hours". The "days" figure belongs to a whole firing table, or to setting the machine up.

**Needs nuance (the short list):** "about 80 feet end to end" (the 80 ft is the length of the front of the U, not the distance from end to end) · "setting up took days" (the best primary source says "a day"; "days" or "weeks" includes design and checking) · "Lehmer ran prime searches" (his goal was exponents of 2 modulo primes, and the sieve was the step that found the primes) · "Six women programmers set up ENIAC for [the Feb 15 demo]" (Jennings and Snyder set up the trajectory; the other demo items were Burks's set) · "Programmer of ENIAC, 1945 to 1946" (several worked on into 1947 at Aberdeen) · "no manual" (the 1946 report did not exist yet when they learned, but block and wiring diagrams did) · "ENIAC was finished in 1945" (working late 1945, accepted by the Army July 1946) · the narration's "as D. H. Lehmer ran it" (it is *based on* his run) · "His paper … is in IEEE" (name the journal: *Proceedings of the IEEE*, April 2018) · "ENIAC's first programmers" wording on page 2 (see Fritz: 23 women worked on ENIAC; "six" is the first programming team) · glossary 5, 14, 15 (small fixes below).

**Good news:** the big numbers all check out against primary sources: 18,000 tubes, 40 panels in a U, 20 accumulators of 10 digits, a 100,000-pulse clock, 1/5,000 s per addition, about 2.8 ms per multiplication, 3 function tables of 104 entries, 10 steppers, an IBM reader on the Constant Transmitter, and an IBM punch at 100 cards a minute on the Printer. The Primes mission is more faithful than the spec dared to claim. De Mol and Bullynck's reconstruction of Lehmer's 1946 sieve uses **exactly 14 accumulators, one for each odd prime from 3 to 47**, as `sieve.e` does. They also call it a straightforward sieve of Eratosthenes.

---

## Where sources disagree (use the safe wording)

| Quantity | Figures in print | Why they differ | Safe wording |
|---|---|---|---|
| Vacuum tubes | 18,000 (1946 *Report on the ENIAC*, Part I §1.5.1) · 17,468 (Weik, BRL 971, 1955) · ~17,000 (Goldstine 1991) · 19,000 (Kempf 1961; Weik 1961) | Different counts of the machine at different dates; ENIAC was modified at Aberdeen | **"about 18,000 vacuum tubes"** |
| Weight | "over 30 tons" (Kempf 1961, Weik 1961, Penn) | Consistent | "about 30 tons" |
| Power | 174 kW (BRL 971, Kempf) · 150 kW (Penn) · 140 kW (Goldstine) · ~200 kW (Weik 1961) | Different measurements and dates | "about 150 to 175 kilowatts" or just "as much power as a city block's homes" (avoid a single number) |
| Size | 40 panels in a U, "80 feet long at the front" (Penn); room 30 × 50 ft (Penn); 1,800 sq ft (BRL 971, Aberdeen); "100 feet long" (Goldstine 1991) | Front length vs room vs floor area | "40 panels in a U shape. Laid end to end, the panels would stretch about 80 feet." |
| Divisions per second | ~40–42 (Army: 24–25 ms) · "38" (popular, untraceable) | — | "about 40 divisions a second" or "slower than the multiplier" (current copy is fine) |
| Setup time | "a day" (Clippinger, BRL 673, 1948) · "weeks of checking and set up time" (Kempf 1961) · "many days" (CHM) | Replugging a known setup vs designing and checking a new one | "Setting up a new problem could take a day or more." |
| Trajectory by hand | ~20 hours for a 60-s path (Weik 1961 / Moye 1996) · ~12 h (Goldstine 1972) · "3 days" for a 30-s path (Burks, 1974 talk, from memory) | Different assumptions | "many hours" |
| Press dates | Press preview **Fri 1 Feb 1946**; formal unveiling and dedication **Fri 15 Feb 1946**. "Feb 14" in some pages is an error (it was a Thursday) | — | Keep "February 15, 1946" for the public unveiling |
| Restart at Aberdeen | Log entry 29 July 1947 (Haigh, Priestley & Rope) · "August 1947" (Moye, Kempf) | Log vs official history | "from 1947" (current copy is fine) |
| Who wrote the demo trajectory | Jennings & Snyder (Fritz 1996; Light 1999; Bartik) · Wescoff & Lichterman (Penn Engineering page) · "Adele Goldstine and me" (H. Goldstine 1972) | Credit is disputed | Name Jennings and Snyder only if you want names; otherwise "ENIAC's women programmers" |

---

## Claim-by-claim table

### A. Machine facts (Explore cards, glossary, mission "Tell me more")

| # | Claim (as written) | Where | Verdict | Corrected wording (≤40 words) | Sources |
|---|---|---|---|---|---|
| A1 | "ENIAC filled a room. Forty panels stood in a U shape, about 80 feet end to end." | ux-spec 1943 (S14 intro); 1810; PRD FR-90 | **Nuance** | "ENIAC filled a room. Forty panels stood in a U shape. Laid in a line, they would stretch about 80 feet. Each panel had one job, and cables joined them." | [Penn], [R46] ("each of the remaining 39 panels"), [V] |
| A2 | Panels 0–15 left wall, 16–23 back, 24–39 right (16+8+16) | ux-spec 1810 | **Correct-ish (unverified layout)** | No copy change. 40 panels in a U is solid. The exact split per wall is the simulator's; the 1946 floor plan (Q22) is the authority if anyone asks. | [Penn], Stuart `vis/eniactk.go` |
| A3 | Cycling Unit "ticks about 100,000 times a second. One addition takes 20 ticks." | ux-spec 1955, 2233 | **Correct** | (keep) | [R46] Part I: oscillator "at the rate of 100,000 per second", addition time "200 micro-seconds (1/5000th of a second)"; [BRL971] add 200 µs |
| A4 | "One addition took ENIAC 1/5,000 of a second." | squares.yaml:192; ux-spec 792; narration 73 | **Correct** | (keep) | [R46]; [BRL971]; [Kempf] |
| A5 | "While the punch finishes a single card, ENIAC could add about three thousand times." | narration 73 | **Correct** (0.6 s × 5,000/s = 3,000) | (keep) | [BRL971] punch 100 cards/min; [R46] |
| A6 | Master Programmer "has ten steppers", "a bit like a music box with pins" | ux-spec 1956, 982, 1334; primes.yaml:55; trajectory.yaml:84 | **Correct** | (keep). Fact behind it: 10 steppers, each a 6-stage counter, on two panels. The music box is a fair image. | [DMB10] §2.3 ("10 independently functioning units, each having a 6-stage counter (called the stepper)"); [Stuart slides] "Two-panel master programmer" |
| A7 | "ENIAC had 20 accumulators. Each held a 10-digit number and could add. They were its memory and its adders in one." | squares.yaml:53; ux-spec 707, 1957, 2227 | **Correct** | (keep). Fine detail: 10 digits **plus a sign**. | [DMB10] §2.2 ("a 10 place decimal number and a sign"); [BRL971] |
| A8 | "shown in neon lamps" / glossary 15: "one lit lamp for each digit" | ux-spec 1957, 2241; squares.yaml:52 | **Nuance** (glossary 15 only) | Glossary 15: "A small glowing bulb. Each place in an accumulator has ten lamps, 0 to 9. The lit one shows that digit." (19 words) | [R46] ch.1: the state of each flip-flop "indicated by a neon lamp"; ten flip-flops (0–9) per decade ring counter |
| A9 | Inputs α to ε; "A sends a number as it is. S sends its opposite, which is how ENIAC subtracted." | squares.yaml:66; ux-spec 718, 2239 | **Correct** | (keep). S sends the complement (10¹⁰ − n). | [DMB10] §2.2 |
| A10 | "Every ENIAC job had a repeat switch." | squares.yaml:81; ux-spec 729 | **WRONG** | "Many ENIAC jobs had a repeat switch, to do the job up to 9 times. Here, Accumulator 2 has to listen twice. That is one of the 10 switches we set for you." (32 words) | [DMB10] §2.2: 12 program controls, "4 receivers and 8 transceivers"; repeat "up to 9 times"; "A receiver … has no output terminal and no repeater switch"; [StuartCh1] §16 |
| A11 | Glossary 14: "Each program has two switches: what to do … and how many times to do it." | ux-spec 2240 | **Nuance** | "Most programs have two switches: what to do (take in on alpha, send on A) and how many times to do it, up to 9." (25 words) | [DMB10] §2.2 |
| A12 | Glossary 5: program control "waits for a program pulse, does its job once or several times, then sends 'done'" | ux-spec 2231 | **Nuance** | "The small circuit that waits for a program pulse and does its job. Most can repeat it up to 9 times, then send 'done'." (24 words) | [DMB10] §2.2 |
| A13 | "Every job on ENIAC ended with a signal, and that signal started the next job. Chaining those signals together was programming." | squares.yaml:106; ux-spec 751 | **Correct** (simplified; receivers had no output, but a chain of jobs works exactly this way) | (keep) | [DMB10]; [Stuart slides] "Accumulators emit control pulse to trigger next operation" |
| A14 | Multiplier "knows the times table"; "multiplies two 10-digit numbers in about 3 thousandths of a second" | ux-spec 1958 | **Correct** | (keep). 2.8 ms (BRL 971) or 2.6 ms (Kempf). The unit had a built-in one-digit multiplication table. | [BRL971] multiply 2,800 µs; [R46] Operating Manual: "6 to 14 addition times" |
| A15 | Divider and Square-Rooter: "one unit, two jobs … slower than the multiplier" | ux-spec 1959 | **Correct** | (keep). About 24 to 25 ms per division. | [BRL971] divide 24,000 µs; [Kempf] |
| A16 | "ENIAC had three [function tables], each with 104 rows, set with switches" | ux-spec 1960, 2236 | **Correct** | (keep). Glossary 10 ("104 numbers") is fine; strictly, each entry is 12 digits and 2 signs and is often split into two numbers. | [R46]; Stuart `doc/ref.tex`; [DMB10] §2 |
| A17 | "The switches sit on a wheeled cart called a portable table. People set them by hand." | ux-spec 1961; PRD FR-90 | **Correct** | (keep) | [R46]; [Penn] (portable function table photos); [HPR16] |
| A18 | "ENIAC had dials like these for numbers that never change, called constants. A number was up to 10 digits long." | squares.yaml:27; ux-spec 684 | **Correct** | (keep). The "dials" are rotary switches; the 10 digits come with a sign. | [DMB10] §2 (CT; constants J and K set by switch) |
| A19 | Glossary 9: a constant "does not change while a program runs. It is set on dials in the Constant Transmitter." | ux-spec 2235 | **Nuance** | "A number that stays the same while a program runs. It is set on dials, or read from a punched card." (21 words) | [DMB10] §2; [R46] |
| A20 | IBM card reader with the Constant Transmitter; IBM card punch with the Printer | ux-spec 1876, 1962, 1963; PRD FR-90 | **Correct** | (keep) | [Kempf]: reader "caused data … to be stored in relays located in the constant transmitter"; results "punched on cards by the ENIAC's printer unit operating in conjunction with an IBM card punch" |
| A21 | Initiating Unit "is where you press the button that starts the machine. It can also start the card reader and the card punch." | squares.yaml:93; ux-spec 740; glossary 6 (2232) | **Correct** | (keep) | [R46]; [Stuart slides] "Provides initiating pulse"; Stuart `initiate.go` |
| A22 | "A card punch … could punch about 100 cards a minute. Our simulator copies that pace." | primes.yaml:68; ux-spec 993; narration 71 | **Correct** | (keep) | [BRL971]: "Card Punch: IBM Cards 100 cards/min" (reader 125 cards/min) |
| A23 | "The punch took a little over half a second per card." | trajectory.yaml:57; ux-spec 1312 | **Correct** (100/min = 0.6 s) | (keep) | [BRL971] |
| A24 | "A card had 80 columns. The card in this mission holds seven numbers of up to 10 digits." | trajectory.yaml:30; ux-spec 1290 | **Correct** (80-column IBM card). The seven-number split is a reading of `demo.card` and is not a history claim. | (keep) | [R46]; Stuart `demo.card` |
| A25 | "The punch worked in 16 groups of 5 columns. A switch for each group chose what got punched." | trajectory.yaml:44; ux-spec 1301 | **Correct** (16 × 5 = 80; printer switches per group) | (keep) | [R46]; Stuart `printer.go` |
| A26 | Digit trays: "Long trays of cables carry numbers … one wire for each place: ones, tens, hundreds" | ux-spec 1964, 2228 | **Correct** (11 lines: 10 digits and a sign; each digit travels as 0–9 pulses on its own wire) | Optional: "…one wire for each place, plus one for the sign. A digit travels as that many pulses." | [R46] ch.1 (trays 8 ft long, 11 wires + ground); [StuartSim] ("if one accumulator sends the digit 5 … it does so by sending 5 pulses") |
| A27 | Program pulse: "one 'go!' on one wire" | ux-spec 1965, 2230 | **Correct** | (keep) | [R46]; [DMB10] |
| A28 | "On the real ENIAC, trunks were long tubes of wires that ran along the machine. Cables plug units into them." | squares.yaml:40; ux-spec 696 | **WRONG** ("tubes") | "On the real ENIAC, long trays of wires ran along the panels. Trays joined end to end made a trunk. Cables plug units into them." (25 words) | [R46] ch.1: "Each digit tray was 8 feet long and ran past 4 panels … jumper cables to form a digit trunk" |
| A29 | "'digit tray' and 'program tray' are … the real machine's [words]"; "data trunk" is the simulator's | ux-spec 1941, 2182, 2228–2229, §15.1 | **WRONG (half)** | §15.1 row: "Number highway, Trunk 1 → **Digit trunk**, made of **digit trays** joined end to end." Glossary 2: "A rack of wires that carries numbers between units. Trays joined in a row make a digit trunk. Our missions say data trunk." (24 words) | [R46] ch.1 (both "tray" and "trunk" are 1946 words) |
| A30 | Glossary 16 Transceiver (HOLD): "a part that sends numbers onto a tray, or receives them" | ux-spec 2242, §15 note | **WRONG** | "An accumulator program control. It hears a 'go!', does its job up to 9 times, then sends 'done'. Each accumulator had 8, plus 4 receivers." (25 words) | [DMB10] §2.2; [StuartCh1] §16 "Transceiver" ("this transceiver is active and the repeater is in the stage selected by the repeat switch"). The `mp.go` comment about an IBM "transceiver" is a different thing: an IBM card-transmission machine. |
| A31 | Glossary 3: program trunks "like 1-1 and 1-3" | ux-spec 2229 | **Correct** (tray-line numbering) | (keep) | [R46]; Stuart `doc/ref.tex` |
| A32 | "We moved these units next to each other … On the real ENIAC they are far apart." | copy.ts:50; ux-spec 156 | **Correct** (a design note) | (keep) | [Penn] (U layout) |
| A33 | Squares: "Stuart's notes say this is faster than multiplying, because each new square needs only additions." | squares.yaml:150; ux-spec 671 | **Correct** | (keep) | Stuart `doc/example.tex` l.19–21 ("the first thought might be to use the multiplier … there's a faster way") |
| A34 | "Brian Stuart's note … says he tried to work that [drag] table out himself" | trajectory.yaml:143; ux-spec 1278 | **Correct** (quotes the program file) | (keep) | Stuart `programs/drag.e` comment |
| A35 | Accumulator 97,367 × 5,000 = 486,835,000 | ux-spec 1485 | **Correct** (arithmetic, and it is item 2 of the **Feb 1, 1946** press demo) | (keep). If shown as history, say "the press demo of February 1946", not "Feb 15". | [Burks46] via [Stuart21] appendix |

### B. Dates, people and context

| # | Claim (as written) | Where | Verdict | Corrected wording (≤40 words) | Sources |
|---|---|---|---|---|---|
| B1 | "ENIAC was finished in 1945 and shown to the public on February 15, 1946. It had about 18,000 vacuum tubes." | squares.yaml:143; ux-spec 662 | **Nuance** (1945) / Correct (rest) | "ENIAC was working by the end of 1945 and shown to the public on February 15, 1946. It had about 18,000 vacuum tubes. …" (rest unchanged) | [HPR-I] (first problem run "late 1945 and very early 1946"); [Kempf] (acceptance July 1946); [R46] Part I §1.5.1 (18,000) |
| B2 | "There was no keyboard for programs. People set cables and switches, a bit like an old telephone switchboard." / "In 1946, programming meant plugging in cables!" | squares.yaml:142–143; copy.ts:11 ("room-sized computer of 1946") | **Correct** (until the 1948 conversion) | (keep) | [Clippinger48]; [HPR16] |
| B3 | "Real ENIAC programmers placed hundreds of cables by hand, and setting up took days." | squares.yaml:155; primes.yaml:140; trajectory.yaml:148; ux-spec 758, 1011, 1341; narration 44 | **Nuance** | "Real ENIAC programmers placed hundreds of cables by hand. Setting up a new problem could take a day or more. We will place the last ones now: …" | [Clippinger48] ("changed in an hour instead of a day by the old method where many cables had to be plugged"); [Kempf] ("weeks of checking and set up time"); CHM ("many days") |
| B4 | F1: "In 1946, setting up a job like this took people days." | ux-spec 2042 | **Nuance** | "In 1946, setting up a job like this could take people a day or more. You did it in about {m} minutes." | as B3 |
| B5 | "ENIAC was built to work out firing tables for Army guns." / "The Army needed firing tables for its guns." | trajectory.yaml:136; ux-spec 2115; narration 88 | **Correct** | (keep) | [Moye96]; [Kempf]; [HPR16] |
| B6 | "It was shown to the public on February 15, 1946." | trajectory.yaml:136; primes.yaml:128; ux-spec 557–559, 2102, 2128 | **Correct** (formal unveiling and dedication; the press saw it on Feb 1) | (keep) | War Dept release masthead; [Moye96]; [Stuart21]; Burks memo dated 1 Feb 1946 |
| B7 | "Brian Stuart's program tries to recreate the demo from that day." | trajectory.yaml:136; narration 85 | **Correct** (and Stuart himself labels the Feb 15 program a working hypothesis) | (keep) | `programs/trajdemo.e` header; [Stuart21] ("it is our working hypothesis that … the artillery trajectory computation replac[ed] the Los Alamos problem") |
| B8 | "Six women programmers set up ENIAC for it [the Feb 15 demo]." | trajectory.yaml:136; ux-spec 2102, 2185 (#14) | **Nuance** | "Betty Jean Jennings and Betty Snyder, two of ENIAC's first programmers, set up the shell trajectory for that demo." (or, without names: "ENIAC's women programmers set up the shell trajectory for that demo.") | [Fritz96] 20–21 (Bartik's account); [Light99]; [Stuart21]. Conflict: the Penn Engineering page credits Wescoff and Lichterman |
| B9 | "The real ENIAC could work out a trajectory like this much faster than a shell takes to fly. By hand, the same work took days." | trajectory.yaml:199 | **Nuance / WRONG ("days")** | "The real ENIAC could work out a shell's path faster than the shell takes to fly. A person with a desk calculator needed many hours. Our simulator is slower, so you can watch every hop." (36 words) | [Weik61] / [Moye96] (60-s trajectory: 20 h by hand, 30 s on ENIAC); [Goldstine72] (~12 h); Burks 1974 talk (the "faster than the shell" line is from memory, not from 1946) |
| B10 | "In 1945, six women were chosen to program ENIAC. There was no manual and no programming language. They learned the machine from its wiring diagrams and worked out every cable by hand." | ux-spec 2102; §14.8 #12 | **Nuance** | "In 1945, six women were chosen to program ENIAC. There was no programming language and no manual yet. They learned the machine from its block and wiring diagrams, and worked out every cable by hand." (35 words) | [Kleiman22]; [Fritz96]; [R46] is dated June 1946, after they had learned |
| B11 | The six names: Jean Jennings Bartik, Kathleen McNulty Mauchly Antonelli, Frances Bilas Spence, Marlyn Wescoff Meltzer, Ruth Lichterman Teitelbaum, Betty Snyder Holberton | ux-spec 2106–2111; PRD FR-44 | **Correct** | (keep). Spelling traps: **Marlyn** (not Marilyn); Jean was **Betty Jean** Jennings; Betty Snyder's first name was Frances. Do not add Adele Goldstine to the six. | War Dept photo captions, Jan 1946 (in [Light99]); [Fritz96]; [Penn]; [Kleiman22] |
| B12 | Role line: "Programmer of ENIAC, 1945 to 1946" | ux-spec 2092 | **Nuance** | "One of ENIAC's first programmers, from 1945" (or just "ENIAC programmer"). Some, such as Lichterman, worked on at Aberdeen into 1947 and later. | [Fritz96] |
| B13 | "ENIAC'S FIRST PROGRAMMERS" / F4: "Six women programmed it." | ux-spec 1771, 2045 | **Nuance** | F4: "Six women were its first programmers. Engineers and an Army team built it. Thank you to all of them." (The heading "ENIAC'S FIRST PROGRAMMERS" is correct as is.) Fritz names 23 women who worked on ENIAC. | [Fritz94]; [Fritz96] |
| B14 | Eckert: "Chief engineer of ENIAC." | ux-spec 2119 | **Correct** | (keep) | [Moye96] ("Eckert as chief engineer and Mauchly as principal consultant"); NYT 15 Feb 1946 |
| B15 | Mauchly: "Proposed the machine and helped design it." | ux-spec 2120 | **Correct** | (keep). Fact behind it: August 1942 memo; the proposal went to the Army on 9 April 1943. | [Moye96]; Mauchly 1942 memo (in Randell, *Origins*); [Verif] §3 |
| B16 | Herman Goldstine: "Army officer who linked the Army to the project." | ux-spec 2121 | **Correct** (a lieutenant and mathematician) | Optional: "Army officer and mathematician who linked the Army to the project and oversaw it." | [Moye96] ("Goldstine was the resident supervisor for the Ordnance Department") |
| B17 | Adele Goldstine: "Mathematician who wrote ENIAC's manual and trained its programmers." | ux-spec 2122 | **Nuance** | "Mathematician who wrote ENIAC's technical manual and helped train its programmers." | [R46] Part I title page (she is the sole author of the *Technical Description*, 2 of 5 volumes); [Fritz96] |
| B18 | Attract plate "THE BUILDERS: Herman Goldstine, Adele Goldstine" | ux-spec 1771 | **WRONG** | Slide 3 heading: "THE PROJECT TEAM: Herman Goldstine, Adele Goldstine" | as B16, B17 |
| B19 | "ENIAC was built at the Moore School of Electrical Engineering, University of Pennsylvania, for the U.S. Army." | ux-spec 2115, 2123; PRD FR-44 | **Correct** | (keep) | [Moye96]; [Penn] |
| B20 | Army Ordnance and BRL: "Paid for ENIAC, then ran it at Aberdeen from 1947." | ux-spec 2124 | **Correct** | Optional: "Paid for ENIAC, then ran it at Aberdeen, Maryland, from 1947 to 1955." | [Moye96]; [HPR16] (log: "ENIAC starts up again", 29 July 1947); [Weik61] (power off 11:45 p.m., 2 Oct 1955) |
| B21 | Project PX contract (not in copy; for reference) | — | **Reference** | Proposal 9 Apr 1943; contract W-670-ORD-4926 signed 5 June 1943 for $61,700; nine supplements brought it to $486,804.22. Avoid "$400,000" (NAE) and Penn Almanac's "1942" typo. | [Weik61]; [Moye96]; [Verif] §3 |
| B22 | Move and shutdown (not in copy; reference) | — | **Reference** | Dismantled late 1946; first units reached Aberdeen January 1947; restarted 29 July 1947; switched off for good 11:45 p.m., 2 October 1955. | [Weik61]; [HPR16]; [Moye96] |
| B23 | Weight / power (not in copy; reference) | — | **Reference** | "about 30 tons"; power: see the disagreement table. | [Kempf]; [Penn] |

### C. Primes mission, Lehmer, De Mol and Bullynck

| # | Claim (as written) | Where | Verdict | Corrected wording (≤40 words) | Sources |
|---|---|---|---|---|---|
| C1 | "In 1946 ENIAC hunted for primes. … in July 1946 D. H. Lehmer ran prime searches on it. Brian Stuart's program is based on those runs and on a reconstruction by Liesbeth De Mol and Maarten Bullynck." | primes.yaml:128; ux-spec 1578 table | **Nuance** | "For parents: a prime is a number above 1 that divides evenly only by 1 and itself. Over a July 1946 holiday weekend, D. H. Lehmer used ENIAC to study primes. Brian Stuart's program follows De Mol and Bullynck's reconstruction." (39 words) | [DMB10] §3: Fourth of July weekend 1946; the goal was "to compute a list of exponents e of 2 mod p, p prime"; a "sieve" "screened out all numbers having a prime factor ≤ 47"; [DMB08] |
| C2 | "ENIAC was shown to the public on February 15, 1946" (in the Primes intro) | primes.yaml:128 | **Correct** | (keep, or drop it to save words, since it has nothing to do with primes) | as B6 |
| C3 | "ENIAC did it with 14 counters instead of a pencil." / 14 checkers for 3 to 47 | primes.yaml:174; primes.yaml:42; ux-spec 1071 | **Correct**, and historically exact | (keep) | [DMB10] §3: "each of the 14 Apj corresponds to a row j of the sieve"; "the first 14 odd prime numbers (3 to 47)" |
| C4 | "The old idea of crossing out multiples is called the sieve of Eratosthenes, after a Greek scholar." | primes.yaml:174 | **Correct** | (keep) | [DMB10] §3.2 ("a rather straightforward implementation of Eratosthenes's sieve") |
| C5 | "A number below 2,809 (53 × 53) that is not prime always splits into equal groups of 47 or fewer. That is why this search stops at 2,801." | primes.yaml:135; ux-spec 947 | **Correct** (math) / **Nuance** (history) | (keep for the mission). Do not imply Lehmer stopped there: he sieved up to about 4.5 million and threw out the composites that got through with an extra test. | [DMB10] §3.2 |
| C6 | "ENIAC runs this one about 1,400 times, from 3 up to 2,801" | primes.yaml:81 | **Correct** (odd numbers 3–2,801 = 1,400) | (keep) | arithmetic |
| C7 | "Today, big primes help keep online messages secret." | primes.yaml:174 | **Correct** (RSA and related public-key cryptography) | (keep) | general |
| C8 | Credits: "Brian L. Stuart, programs/sieve.e. After D. H. Lehmer's July 1946 runs, as reconstructed by L. De Mol and M. Bullynck." | primes.yaml:184; ux-spec 1132, 2128 | **Correct** | (keep). Cite: Bullynck & De Mol, *Archive for Mathematical Logic* 49 (2010); De Mol & Bullynck, CiE 2008 (LNCS 5028). | [DMB10]; [DMB08]; `sieve.e` header |
| C9 | Narration: "ENIAC hunts for primes, as D. H. Lehmer ran it in July nineteen forty-six." | narration 60 | **Nuance** | "ENIAC hunts for primes, in a program based on D. H. Lehmer's run of July nineteen forty-six." | [DMB10] (Lehmer's run computed exponents of 2 up to ~4.5 million; this is a simplified sieve) |
| C10 | Narration: "Lehmer is normally said 'LAY-mer'." | narration 25 | **Unverifiable** (no recorded source found in this pass) | Confirm with a mathematician or a recording before generating audio. | — |

### D. Brian L. Stuart and the simulator

| # | Claim (as written) | Where | Verdict | Corrected wording (≤40 words) | Sources |
|---|---|---|---|---|---|
| D1 | "Brian Stuart's simulator follows the real machine pulse by pulse." / "a simulator that Brian L. Stuart wrote. It follows the real 1946 machine pulse by pulse." | squares.yaml:192; ux-spec 792, 2100 | **Correct** | (keep) | [StuartSim]: "The operation of the ENIAC is simulated at the level of individual pulses"; [Stuart18] |
| D2 | "His paper, 'Simulating the ENIAC,' is in IEEE." | ux-spec 2100 | **Nuance** (name the venue) | "His paper, "Simulating the ENIAC," appeared in the Proceedings of the IEEE in 2018. Scan the code to visit his simulator page." (22 words) | [Stuart18]: B. L. Stuart, "Simulating the ENIAC," *Proc. IEEE* 106(4):761–772, April 2018, doi:10.1109/JPROC.2018.2813678, ieeexplore 8326772 (the same document the upstream README links) |
| D3 | "Warm thanks to Brian L. Stuart of Drexel University" | narration 52 | **Correct** | (keep) | [StuartSite] (cs.drexel.edu/~bls96) |
| D4 | QR target: Stuart's simulator page | ux-spec 2100 | **Correct**, with a practical note | Use `https://www.cs.drexel.edu/~bls96/eniac/` (index) or `…/eniac/simulator.html`. On 2026-10-02 the server sent an incomplete certificate chain (a strict TLS client failed with "unable to verify the first certificate"; curl -k worked). Test the QR on an iPhone and an Android phone before printing. | [StuartSite] |
| D5 | Stuart's related papers (for the About page if wanted) | — | **Reference** | "Programming the ENIAC," *Proc. IEEE* 106(9), Sept 2018; "Debugging the ENIAC," *Proc. IEEE* 106(12), Dec 2018; "Reconstructing the Unveiling Demonstration of the ENIAC," *IEEE Annals of the History of Computing* 43(2), 2021. | [StuartSite] |

---

## Sources

Primary and contemporaneous

- **[R46]** Moore School of Electrical Engineering, *A Report on the ENIAC*, Contract W-670-ORD-4926, 1 June 1946, 5 vols. Part I, *Technical Description of the ENIAC*, by Adele K. Goldstine. Scans: https://archive.org/details/ReportonENIACEl1Moor (and companion volumes). ARL transcription of ch. 1: https://ftp.arl.army.mil/~mike/comphist/46eniac-report/chap1.html (the ARL host did not respond on 2026-10-02; figures were taken from Nick's earlier full-text reading in `~/Workspaces/eniac/research/part-1-verification.md` §4 and from a search excerpt of ch. 1).
- **[BRL971]** M. H. Weik, *A Survey of Domestic Electronic Digital Computing Systems*, BRL Report 971, Dec 1955, ENIAC entry: https://ed-thelen.org/comp-hist/BRL-e-h.html (read 2026-10-02: tubes 17,468; 174 kW; 1,800 sq ft; add 200 µs; multiply 2,800 µs; divide 24,000 µs; reader 125 cards/min; punch 100 cards/min).
- **[Kempf]** K. Kempf, *Electronic Computers Within the Ordnance Corps*, 1961, ch. 2: https://ftp.arl.army.mil/~mike/comphist/61ordnance/chap2.html
- **[Weik61]** M. H. Weik, "The ENIAC Story," *Ordnance*, 1961: https://ftp.arl.army.mil/~mike/comphist/eniac-story.html
- **[Clippinger48]** R. F. Clippinger, *A Logical Coding System Applied to the ENIAC*, BRL Report 673, Sept 1948: https://ftp.arl.army.mil/~mike/comphist/48eniac-coding/index.html
- **[Burks46]** A. W. Burks, "Demonstration of ENIAC," memorandum, 1 Feb 1946 (transcribed in [Stuart21]).

Scholarship

- **[HPR16]** T. Haigh, M. Priestley, C. Rope, *ENIAC in Action: Making and Remaking the Modern Computer*, MIT Press, 2016. **[HPR-I]** same authors, "ENIAC errors in Isaacson's *The Innovators*": https://eniacinaction.com/the-articles/eniac-errors-in-isaacsons-the-innovators/ ; "Los Alamos Bets on ENIAC," *IEEE Annals* 36(3), 2014.
- **[DMB10]** M. Bullynck and L. De Mol, "Setting-up early computer programs: D. H. Lehmer's ENIAC computation," *Archive for Mathematical Logic* 49 (2010) 123–146: https://link.springer.com/article/10.1007/s00153-009-0169-8 (preprint read in full: https://www.clps.ugent.be/sites/default/files/publications/6828128.pdf).
- **[DMB08]** L. De Mol and M. Bullynck, "A Week-End Off: The First Extensive Number-Theoretical Computation on the ENIAC," CiE 2008, LNCS 5028: https://link.springer.com/chapter/10.1007/978-3-540-69407-6_19
- **[Stuart18]** B. L. Stuart, "Simulating the ENIAC," *Proceedings of the IEEE* 106(4), April 2018, 761–772: https://ieeexplore.ieee.org/document/8326772
- **[Stuart21]** B. L. Stuart, "Reconstructing the Unveiling Demonstration of the ENIAC," *IEEE Annals of the History of Computing* 43(2), 2021; preprint: https://www.techrxiv.org/articles/preprint/Reconstructing_the_Unveiling_Demonstration_of_the_ENIAC/14538117
- **[StuartSite]** https://www.cs.drexel.edu/~bls96/eniac/ · **[StuartSim]** https://www.cs.drexel.edu/~bls96/eniac/simulator.html · **[StuartCh1]** draft *ENIAC Handbook* ch. 1 (tube circuits), https://www.cs.drexel.edu/~bls96/eniac/ch1.pdf (§16 "Transceiver") · **[Stuart slides]** https://www.cs.drexel.edu/~bls96/eniac/eniac2.pdf
- **[Fritz96]** W. B. Fritz, "The Women of ENIAC," *IEEE Annals of the History of Computing* 18(3), 1996. **[Fritz94]** W. B. Fritz, "ENIAC—A Problem Solver," *IEEE Annals* 16(1), 1994 (names 23 women).
- **[Light99]** J. S. Light, "When Computers Were Women," *Technology and Culture* 40(3), 1999.
- **[Kleiman22]** K. Kleiman, *Proving Ground: The Untold Story of the Six Women Who Programmed the World's First Modern Computer*, Grand Central, 2022; ENIAC Programmers Project.
- **[Goldstine72]** H. H. Goldstine, *The Computer from Pascal to von Neumann*, Princeton, 1972.

Institutional

- **[Moye96]** W. T. Moye, "ENIAC: The Army-Sponsored Revolution," U.S. Army Research Laboratory, 1996: https://ftp.arl.army.mil/~mike/comphist/96summary/index.html
- **[Penn]** Penn Engineering, "ENIAC": https://www.engineering.upenn.edu/about/history-heritage/eniac/ ("40 panels were arranged in a U-shape that measured 80 feet long at the front"; room 30 × 50 ft; 30 tons).

Prior research (Nick's)

- **[Verif]** `~/Workspaces/eniac/research/part-1-verification.md` (2026-08-08), a tiered verification against the 1946 report, CBI oral histories, Fritz, Light and Stuart 2021. It is the source here for the tube, power and size conflicts, the contract figures, the 1 Feb / 15 Feb dates, the six names and their traps, and the conflicting credit for the demo trajectory.
- **[V]** the simulator source at the pinned commit (`c4b94f2`), where the kiosk copy describes the simulator rather than history.
