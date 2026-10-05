# Keeping ENIAC alive: the tubes, the power and the maintenance

**Date:** 2026-10-02. **Status:** built. Folded into `docs/ux-spec.md` 14.11 (the build spec) and `docs/PRD.md` FR-99 to FR-101; the app is `src/web/app/screens/tubes.ts` and `src/web/app/tubes/`, tested by `tests/web/tubes.test.ts` and `tests/web/e2e/tubes.spec.ts` (TUBE-nn); screenshots in `docs/screenshots/m3/tubes-*.png`. **Mockup:** `docs/mockups/tubes.html` (open in Chrome; it is clickable) and the PNGs beside it. **Facts:** the new rows are also appended to `docs/fact-check.md` as group E, with the same IDs used here (E1 to E30).

**Nick's ask:** "something about the tubes: the 18,000 tubes, how much power they consumed, how often they burnt out, and what the maintenance cycle was like."

---

## 0. The short version

**What the sources support, in one paragraph for the exhibit.** ENIAC had about 18,000 vacuum tubes, in a machine that also had about 70,000 resistors, 10,000 capacitors and half a million soldered joints. It used about 150 kilowatts, and more than half of that only kept the tube heaters hot. Fans blew the heat out, and a thermostat in each panel switched the whole machine off if a panel got too hot. Tubes wear out, and switching on and off is hard on them, so the crew left the heaters on overnight and ran the tubes below their ratings. J. Presper Eckert remembered losing about one tube every two days and finding it within 15 minutes, by testing, then narrowing from the wrong answer to the unit, the circuit and the tube, with plug-in units to swap. The Army's own records are less rosy than Eckert's memory: in the first two years real work was only about 5 to 25 percent of the time, and by 1954 about 7 hours in 10.

**Three things in circulation that are wrong or unsupported** (details in section 1.4):

1. **"Longest run without a failure: 116 hours (1954)."** It is a misreading. In the Army's 1955 survey, 116 hours is the *good time in one week* (of 166 hours attempted). No source I could read gives a longest run.
2. **"The lights of Philadelphia dimmed."** A myth. Eckert called it "total fiction"; ENIAC drew its power from the grid through regulators.
3. **"ENIAC was never turned off."** Not what the documents say. The 1946 manuals have a stop switch that turns the heaters off, per-panel heater switches and heater clocks. In 1946 to 1948 it ran one 8-hour shift, five days a week, with **only the heaters left on** in between.

**The design, in brief** (section 2). A new screen, **S16 "Keeping ENIAC alive"**, a sibling of Explore ENIAC: five cards of at most 40 words (the tubes; power and heat; why they burned out; the hunt; a week with ENIAC), each with one honest picture on the stage, plus a one-card myth check. The hands-on part is **"Find the dead tube"**, a five-step **re-enactment** (run the test, find the wrong accumulator, find the wrong digit place, feel for the cold tube, plug in a fresh unit), always labelled as drawn and made up, and following the 1946 maintenance manual's own order (unit, then circuit, then tube). Reached from a header button in Explore ENIAC and from three new glossary words; mentioned in the finale. Everything uses the existing touch rules.

---

## 1. Research

### 1.1 Where the sources disagree (use the safe wording)

| Quantity | Figures in print | Why they probably differ | Safe wording on screen |
|---|---|---|---|
| Vacuum tubes | **18,000** (War Dept release, Feb 1946; 1946 *Report on the ENIAC* §1.5.1; Eckert 1989) · 17,480 (Penn Almanac 1996) · **17,468** (Weik, BRL 971, 1955) · ~17,000 (Goldstine 1991) · 19,000 (Kempf 1961; Weik 1961) | The 1946 machine, then the machine as modified at Aberdeen (Kempf says the modifications "eliminated about 3,000 tubes"). Counts also differ in what they include | **"about 18,000"** |
| Tube types | **10** (Eckert, 1989 memory) · **16** (BRL 971 and Kempf, the Aberdeen machine) | Different dates; Eckert is recalling | **Do not print a number.** ("Plug-in unit types" is a different count: 20 in 1946, 44 in 1955.) |
| Power | **150 kW** (War Dept release, Feb 1946; Penn; Eckert's own words in the interview) · 140 kW (Goldstine 1991) · 170,000 W (a spec box beside the Eckert interview on KurzweilAI, not a statement by Eckert) · **174 kW** (BRL 971, Dec 1955; Kempf 1961) · "almost 200 kW" (Weik 1961) | 150 kW is the Army's 1946 breakdown of the machine at the Moore School. 174 kW is the 1955 measurement of the modified machine at Aberdeen. "Almost 200" looks like a round-up in a magazine article. **This explanation is my inference; no source states the reason** | **"about 150 kilowatts"** (the figure whose parts add up: 80 + 45 + 20 + 5) |
| How often a tube failed | "about every two days" (Eckert, 1989 interview) · "every day or two" (CHM, unsourced, apparently downstream of Eckert) · "90% of the service interruptions were caused by vacuum tube failures" (Kempf 1961, undated "operating experience") · "intermittents" (power-supply spikes, shorted cables, bad solder) "were more frequent causes of breakdown" than burned-out tubes (Haigh, Priestley and Rope, as summarised by CHM) | One man's memory 43 years later; an Army summary of Aberdeen years; a historian's reading of the 1947 to 1948 operations log. **They are about different periods and different things.** | **"Eckert remembered ... about one tube every two days."** Never as a plain fact. Never "tubes were the only trouble" |
| Time doing real work | 5% to 25% (Army estimate for Feb 1946 to Mar 1948, Fritz 1952) · "5% of the 40-hour week" (New York Times, quoted by CHM) · 2 hours a week in December 1947 (Haigh and Priestley slides) · 55% (Apr 1948 to Jun 1952, Fritz 1952) · 0.70 in 1954 and 0.69 in 1955 (BRL 971) · "about 100 hours a week" trouble-free (Kempf 1961) | Different measures (share of manned time; good hours over hours attempted; hours per week) | State the measure each time. Card 5 uses Fritz for the early years and BRL 971 for 1954 |
| Longest run without a failure | **None found.** "116 hours" is the 1954 *weekly good time* (BRL 971); Fritz 1952 also gives about 116 machine hours a week as the quarterly average | A misreading that is now in the Wikipedia article without a source | **Do not use.** If a docent needs a number: the average run between errors in 1955 was 5.6 hours |

### 1.2 The claims, one row each (verdict, safest wording, sources)

Verdicts: **Correct**, **Nuance**, **Wrong**, **Unverifiable**, **Myth**, as in `docs/fact-check.md`. "Wording" is the text that is safe on a museum screen (at most 40 words). Source keys are listed in section 1.5 and in `docs/fact-check.md`.

| # | Claim | Verdict | Safest wording | Sources |
|---|---|---|---|---|
| E1 | ENIAC had about 18,000 vacuum tubes | **Correct** (as "about") | "ENIAC had about 18,000 vacuum tubes." | [WD46], [R46-1] §1.5.1, [Eckert89]; others in 1.1 |
| E2 | Tube types: ten, or sixteen | **Nuance** | (say nothing about the number) | [Eckert89], [BRL971], [Kempf] |
| E3 | An average radio had ten tubes; the biggest radar set 400; a B-29 under 800 | **Correct** (the Army's own 1946 comparison) | "A radio had about ten." Picture: boxes of 10, 400 and under 800 dots | [WD46] |
| E4 | About 70,000 resistors, 10,000 capacitors, 500,000 soldered joints | **Correct** (1946 Army figures). "5,000,000 hand-soldered joints" (Wikipedia) is **Wrong** (ten times too many, and the Army says "soldered joints", not "hand-soldered") | "Also inside: about 70,000 resistors, 10,000 capacitors and 500,000 soldered joints." | [WD46]; Penn page repeats it |
| E5 | Other counts: 1,500 relays; 7,200 crystal diodes and 4,100 magnetic elements (1955); 6,000 switches | **Nuance**: relays and diodes are Aberdeen-era counts (diodes after the 1948 conversion); the switch count is from Nick's earlier research and was not re-read | Use only 1,500 relays if wanted. Leave out diodes and switches on screen | [Kempf], [BRL971], [Verif] §4d |
| E6 | Power: about 150 kilowatts. 80 kW heated the tubes, 45 kW made the d-c voltages, 20 kW drove the blowers, 5 kW ran the card machines. Supplied as three-phase, regulated, 240 V | **Correct** (primary, 1946) | "ENIAC used about 150 kilowatts. More than half of it just made the tubes hot." (80 of 150 is 53%.) | [WD46]; [R46-1] §1.5.2 (240 V, 78 d-c voltages, 29 power supplies) |
| E7 | 150 kilowatts is "as much as 1,500 bright light bulbs" | **Correct** (100 W each; at 174 kW it would be 1,740, so "as much as 1,500" is safe for both) | "as much as 1,500 bright light bulbs" | arithmetic |
| E8 | In one hour ENIAC used about as much electricity as a typical American home today uses in 5 to 6 days. An average home draws about 1.2 kW | **Correct** (EIA 2022: 10,791 kWh a year, 29.6 kWh a day, 1.23 kW; 150 kWh is 5.1 days, 174 kWh is 5.9 days). Say "today" | "In one hour, ENIAC used as much electricity as a typical American home uses in 5 to 6 days." | [EIA]; [WD46]; [BRL971] |
| E9 | Heat: fans and blowers drove it off; each panel had a thermostat that turned the power to the whole ENIAC off above 115 °F | **Correct** (primary) | "Fans blew the heat out. A panel that got too hot switched the whole machine off." | [R46-1] §1.5.1; [R46-OM] general instruction 3 ("If ENIAC shuts down from overheating do not try to restart; call maintenance") |
| E10 | Heat was never solved at Aberdeen: "no special air conditioning", a blower system "not adequate", "a shortening of tube life which caused long periods of inoperation" | **Correct** (Army, 1961). The 1946 plan was an air-conditioned building at Aberdeen; BRL 971 says "Forced outside air" | "At Aberdeen the heat stayed a problem for years." (docent) | [Kempf], [Weik61], [WD46], [BRL971] |
| E11 | A tube failed about every two days, and a fault was found within 15 minutes | **Nuance**: Eckert's memory (1989), not a record | "Eckert remembered losing about one tube every two days." / "Eckert said they found a bad tube within 15 minutes." | [Eckert89]; CHM repeats it |
| E12 | Tube failures caused "90% of service interruptions" | **Nuance**: Army summary, period not given. **Conflicts** with the historians' finding that intermittents beat burn-out in the early Aberdeen years | Do not put a percentage on screen. Say "Tubes were not the only trouble" | [Kempf]; [CHM-blog] on Haigh, Priestley and Rope |
| E13 | Switching on and off is hard on tubes; the 1946 manual says heating and cooling cycles "increase the probability of failure of the tubes" | **Correct** | "Tubes wear out like light bulbs, and switching on and off is hard on them." | [R46-MM] §11.3 |
| E14 | "Most failures happened at warm-up" | **Unverifiable** as a quantity (Wikipedia, no citation) | Do not say "most". Say "hard on them" (E13) | none |
| E15 | Early on, the heaters were left on overnight (everything else switched off) | **Correct** for Feb 1946 to Mar 1948: "only in operation for a normal 8 hour shift for 5 days each week. All voltages except filament voltages were turned off during the non-operative period" | "So early on, the crew left the heaters on overnight." | [Fritz52] §I |
| E16 | "ENIAC was never turned off" | **Wrong** | (do not use) The manuals have a stop switch that turns off the heaters, a heater switch and an hours clock on every panel, and "certain units not being used may have their heaters turned off" | [R46-OM] §1, [R46-1] §9 via [Verif] §4b(ii) |
| E17 | The tubes were run gently: circuits had "at least a 2 to 1 safety factor", parts "operated at current, voltage, and power levels below their normal ratings"; Eckert kept the filaments "below their proper voltage" | **Correct** (three sources) | "... and ran the tubes gently." | [R46-MM] §1.7; [Kempf]; [Eckert89] |
| E18 | "Eckert ran the tubes at one-quarter power" | **Unverifiable** (Penn page, no citation). "A 6.3 V filament ran at 5.7 V" is second-hand (a blog citing Burks 1947; not read) | Do not use either | [Verif] §4b(i); Hackaday 2017 |
| E19 | Only specially selected or "burnt-in" tubes were used | **Unverifiable and contradicted**: Eckert says the tubes "were off the shelf; we got whatever the distributor could supply in lots of a thousand". Penn's 1996 almanac says only the "healthiest" tubes were used after preventive maintenance; no primary source | Do not use | [Eckert89]; [Almanac96]; [Verif] §4b(iv) |
| E20 | The circuits were built so a drifting tube could not spread error: tubes were used only as on-off switches and signals were regenerated from the clock | **Correct** (the deepest reason it worked at all) | "A tube is a sealed bulb that switches a signal on and off." (card 1) | [R46-1] (via [Verif] §4b(0)); [Kempf] |
| E21 | How a fault was hunted: a test problem showed it; find the unit, then the circuit, then the tubes; "the most frequent failure in circuits is burned out tubes"; rules of thumb (a circuit that works when it shouldn't: look at an inverter tube; one that doesn't work when it should: a gate or buffer); a failed cathode runs cold, so compare case temperatures; a tube tester; "Keep log of all tube failures — list each tube" | **Correct** (primary) | "When an answer came out wrong, the crew hunted: which unit, which circuit, which tube?" | [R46-MM] §1.2, §1.6; [R46-1] §1.5.3 |
| E22 | The neon lamps were "one of the most important visual checks"; one lamp for every flip-flop; ENIAC could be stopped after one pulse time or one addition time to read the lamps | **Correct** (primary) | "Lamps showed what was happening inside." | [R46-1] §1.2.2.1 |
| E23 | The lights you see on the panels are neon bulbs; the tubes were behind, pointing to the rear for easy replacement | **Correct** (the historians' own correction of a common error) | "The glowing lamps you see are neon, not tubes. The tubes sat inside." | [HPR-err] |
| E24 | Many circuits were plug-in units "to increase the ease of testing and replacing faulty components"; 20 types in 1946; an accumulator digit is one "decade plug-in unit" (a ring counter, pulse standardizer, carry circuit and output); 44 kinds in 1955; Eckert: swap them "in seconds" | **Correct** (primary), with Eckert's "seconds" as his claim | "Tubes sat in plug-in units that swapped fast." | [R46-1] §1.2.2.5; [BRL971]; [Eckert89] |
| E25 | How much of the time ENIAC did real work: 5% to 25% in Feb 1946 to Mar 1948 (Army estimates; machine run one 8-hour shift, five days a week); 55% of manned time from Apr 1948 to Jun 1952 (a log of every manned minute, kept from April 1948); best quarters about 70%; 1954 operating ratio 0.70 (116 good hours of 166 attempted a week); 1955 0.69 (113 of 164), average error-free run 5.6 hours; trouble-free time about 100 hours a week in the last six years (Kempf) | **Correct** (each figure with its own measure) | "In its first two years, ENIAC did real work only 5 to 25 percent of the time, by Army estimates. ... By 1954 it worked about 7 hours in every 10." | [Fritz52] §I, §III and Fig. 1; [BRL971]; [Kempf] |
| E26 | The routine at Aberdeen: three 8-hour shifts, seven days a week, six technicians a shift, no engineers on the machine (1955); "the checking routine alone took about eight hours" (Kempf, undated); a tube surveillance program from the start of 1950 (tubes life-tested, failure statistics kept); an independent motor-generator set ended the power-line troubles; fewer tubes after modifications | **Correct** (Army sources). The eight hours is the *test routine*, not a hunt for one tube | docent notes; not on a card | [BRL971]; [Kempf]; [Weik61] |
| E27 | "The longest continuous run without a failure was 116 hours (1954)" | **Wrong** (a misreading of a weekly total, 1.4) | (do not use) | [BRL971]; [Fritz52] §III |
| E28 | "The lights of Philadelphia dimmed when ENIAC was switched on" | **Myth** | "Eckert, who built it, called that story 'total fiction.'" | [Eckert89] |
| E29 | "Someone ran around with a box of tubes, changing one every few minutes" | **Myth** (Eckert: "Another myth") | (docent) | [Eckert89] |
| E30 | December 1947: about 2 hours of production in a week; 49% checking and fixing hardware | **Nuance** (from the authors' slides, not the book) | (docent; see 1.3) | [HPR-slides] |

### 1.3 Documented, but kept out of the cards (docent notes)

- **December 1947**, from the ENIAC operations log (Haigh and Priestley's slides): about **2 hours** of production work in the month's week, **17%** of the time setting up and testing, **49%** checking, diagnosing and fixing hardware. A technician "detected so many cold solder joints that he simply went through and resoldered every joint on the machine." (They are quoting the book, which I could not read; check the book before printing these.) [HPR-slides]
- **The women diagnosed faults.** Betty Jean Jennings Bartik: "we could diagnose troubles almost down to the individual vacuum tube." Homé McAllister Reitwiesner: "we were often able to point out to a technician which individual vacuum tube needed to be changed." So the programmers localised the fault and a technician changed the tube. [Fritz96] via [Verif] §5
- **No named person, on a named day, finding one tube** is documented. That is why the re-enactment says "the fault is made up" and does not tell a story about a real day. [Verif] §5
- **Test equipment** in 1946: a tube tester, a static tester that plugs into the d-c cables to read voltages on tube pins, a test table with its own power supplies and a variable oscillator, and an oscilloscope in the cycling unit. A variable oscillator and a variable power supply let the crew run ENIAC off-frequency and off-voltage "and thus increase the probability of failure", so weak parts failed on purpose in a test rather than in the middle of a job. [R46-1] §1.5.3; [R46-MM] §1.7
- **Seventy-eight** different d-c voltages, from 29 power supplies; ENIAC's heaters had their own hours clocks. [R46-1] §1.5.2; [R46-OM]

### 1.4 Myths and misreadings

| Story | What the sources show | Safe line |
|---|---|---|
| "The lights of Philadelphia dimmed when ENIAC switched on" | Eckert, 1989: "That story is total fiction, dreamed up by some journalist. We took power off of the grid. We had voltage regulators to provide 150 kilowatts of regulated supply." No contemporary report of dimming found. Some websites repeat "brown-outs" without a source. (Eckert's is a recollection, so the screen attributes it to him.) | "Eckert, who built it, called that story 'total fiction.'" (myth card) |
| "Someone ran around with a box of tubes, changing one every few minutes" | Eckert: "Another myth." (Same interview.) Army records show frequent trouble but not a tube every few minutes | docent |
| "The longest run without a failure was 116 hours (1954)" | **Misreading.** BRL 971: 1954 "Good time 116 hrs; attempted to run 166 hrs/wk". Fritz 1952: about 116 machine hours a week. Both are weekly totals | (do not use) |
| "ENIAC was never turned off" | See E16. Heaters stayed on overnight in 1946 to 1948; the rest was switched off | "the crew left the heaters on overnight" |
| "ENIAC lost a tube every day or two" | Eckert's memory said every two days; the Army and the historians say the picture was messier (intermittents) | "Eckert remembered ..." |
| "The tubes were specially selected and burnt in" | Unsupported (E19) | (do not use) |
| "The glowing lights were the vacuum tubes" | The lamps were neon; the tubes were behind (E23) | card 1 says so |
| "ENIAC ran at one-quarter power" | Unsupported (E18). What is supported: a 2 to 1 safety factor and tubes below their ratings | "ran the tubes gently" |

### 1.5 Sources, and how each was read

I read these on 2026-10-02. Tier: **a** primary or contemporary; **b** first-person or oral history; **c** secondary.

| Key | Source | Tier | What I did |
|---|---|---|---|
| [WD46] | War Department Bureau of Public Relations, "Physical Aspects, Operation of ENIAC Are Described", release for 16 Feb 1946. https://americanhistory.si.edu/comphist/pr4.pdf | a | Read in full (3 pages): tubes, comparisons, joints, power split, blower, planned air-conditioned building |
| [R46-1] | *A Report on the ENIAC*, Part I, ch. 1 (Adele Goldstine), 1 Jun 1946; ARL transcript via Wayback `web.archive.org/web/2020/https://ftp.arl.army.mil/~mike/comphist/46eniac-report/chap1.html` | a | Read §1.2.2 (neons, plug-in units), §1.5.1 to 1.5.3 (ventilation, power, test equipment) |
| [R46-MM] | *Report on the ENIAC, Maintenance Manual*, 1 Jun 1946. https://archive.org/details/ReportonENIACEl00MoorA (OCR text) | a | Read §1.2 (log of tube failures), §1.6 (trouble shooting), §1.7 (safety factor, marginal testing), §11.3 (starting sequence) |
| [R46-OM] | *Report on the ENIAC, Operating Manual*, Jun 1946 (Bitsavers copy on archive.org) | a | Read the general instructions (overheating, heaters, filament fuse lamps) |
| [Fritz52] | W. B. Fritz, *A Survey of ENIAC Operations and Problems 1946-1952*, BRL Memorandum Report 617, Aug 1952, DTIC AD1003735 (read through a Wayback copy; DTIC itself blocks scripts) | a | Read §I to §III and Fig. 1 (OCR; the numbers were checked against two readings) |
| [BRL971] | M. H. Weik, *A Survey of Domestic Electronic Digital Computing Systems*, BRL Report 971, Dec 1955. https://ed-thelen.org/comp-hist/BRL-e-h.html | a | Read the ENIAC entry (tubes 17,468; 16 types; 174 kW; 1954 and 1955 operating figures; shifts) |
| [Kempf] | K. Kempf, *Electronic Computers Within the Ordnance Corps*, 1961, ch. II (Wayback copy of the ARL page) | a | Read the whole chapter |
| [Weik61] | M. H. Weik, "The ENIAC Story", *Ordnance*, 1961 (Wayback copy) | a/c | Read the reliability, power-line and motor-generator passages |
| [Eckert89] | A. Randall 5th, interview with J. Presper Eckert recorded 1989: Computerworld, "A lost interview with ENIAC co-inventor J. Presper Eckert", 14 Feb 2006, and the KurzweilAI print version (read as a PDF) | b | Read the whole Q&A. Oral history, 43 years after the events |
| [HPR-err] | Haigh, Priestley and Rope, "ENIAC errors in Isaacson's *The Innovators*", https://eniacinaction.com/the-articles/eniac-errors-in-isaacsons-the-innovators/ | c (by the authorities) | Read the item on the tubes pointing to the rear |
| [HPR-slides] | T. Haigh and M. Priestley, "Working on ENIAC: The Lost Labors of the Information Age", MITH slides, 2016 | c | Read the Aberdeen reliability slides (Dec 1947 figures; the cold-solder quotation) |
| [CHM-blog] | Computer History Museum blog, "The Neverending Quest for 'Firsts'" | c | Read the paragraph on reliability (the 5% figure; intermittents more frequent than burn-out) |
| [Almanac96] | D. Winegrad and A. Akera, "ENIAC's 50th Anniversary", *Almanac* (Penn) 42(18), 1996 | c | Read the reliability paragraph |
| [Fritz96], [Verif] | As in `docs/fact-check.md`; [Verif] is Nick's `~/Workspaces/eniac/research/part-1-verification.md` §4 and §5 | b / (Nick's) | Read §4 and §5 and re-checked the primary quotations in the manuals myself |
| [EIA] | U.S. Energy Information Administration, "How much electricity does an American home use?", https://www.eia.gov/tools/faqs/faq.php?id=97 | a | 2022: 10,791 kWh a year per residential customer |

**What I could not do.** I could not read *ENIAC in Action* itself (it is a book, not online). Everything attributed to Haigh, Priestley and Rope comes from their own slides and web article and from CHM's summary of the book. The reliability chapters should be checked against the book before a figure from them goes beyond what is in card 5 and the docent notes. The 1946 Moore School progress reports and the ENIAC operations log (the likely home of any dated tube incident) are not online. I did not find a tube-failure count by year, so **the exhibit never claims that tube failures became less frequent, only that the share of time doing real work grew.**

---

## 2. Design

### 2.1 Where it lives, and why

Nick's suggestion was a "Keeping ENIAC alive" topic inside Explore ENIAC, reached from the panorama and the glossary, with four short cards and one hands-on interaction. It is the right shape. Three changes make it fit the existing rules:

| Question | Decision | Why |
|---|---|---|
| A thirteenth stop in "Walk the room"? | **No. A sibling screen, S16**, with the same header and the same rail-card pattern | The twelve stops are *units in the room*, in physical order; the tubes are inside all of them. A thirteenth stop would break "one card = one unit" and the Used-in chips |
| Four cards or five? | **Five** (adds "A week with ENIAC") | Nick asked for the maintenance cycle and how it improved. Without the card the story stops at "tubes burn out" and the exhibit would imply the machine mostly worked |
| What does the panorama show of the tubes? | **Nothing new for now.** A header button on S14, "Keeping ENIAC alive", is the entry; the cards say where the tubes were | The tempting alternative is a "look at the back of the panels" toggle that shows tubes behind every unit. It needs new art for all 40 panels, and the rear layout is not in any source I have (Q22 is already open on the front layout). **Keep it as a P2 idea if rear photographs are found.** Drawing an invented rear view would break the spirit of the no-fake-data rule |

The hands-on part is deliberately a **re-enactment**, not live state. The no-demo-fallback rule is about never standing in for the live machine. A scripted exercise is fine if it can never be mistaken for the live machine and is never shown where live state is expected. Section 2.5 turns that into rules that can be tested.

### 2.2 Entry points

| From | How | Detail |
|---|---|---|
| **S14 Explore ENIAC** | A header button **Keeping ENIAC alive** (64 px high, 430 wide, left of Glossary; outlined in yellow in the picture only because it is new) | Present in every S14 state. Back from S16 returns to S14 where the visitor was. See `tubes-entry-from-explore.png` |
| **S15 Glossary** | New words **Vacuum tube**, **Plug-in unit**, **Kilowatt** have "Show me" links to S16 cards 1, 4, 2. **Neon lamp** is reworded to say the tubes are inside | 2.6 |
| **Card 2 of S16** | A link "Did the lights of Philadelphia dim?" opens the myth card | 2.4 |
| **S8 Finale, beat F2** | A second line and a small chip **How they kept it alive >** (64 px) beside "Explore the whole machine >" | 2.7. The finale timers are unchanged; leaving for S16 returns to F5 |
| **Optional, P2: S1 Attract** | One more plate in the rotating slides: "THE MACHINE: about 18,000 vacuum tubes, about 150 kilowatts, about 30 tons" [FC E1, E6, and the weight in the disagreement table of `docs/fact-check.md`] | Costs nothing and answers "how big?" before a visitor touches anything |

### 2.3 The screen (S16), 1920 x 1080

Same header, footer, rail and tokens as S14. The stage is on the left (x24-1384, y112-1016) and the **rail card** on the right (x1408-1896, y112-1016). Each card has one picture on the stage.

```
+------------------------------------------------------------------------------------------------+
| [wordmark] [< Explore] x144-324      Keeping ENIAC alive                         [ Glossary ] 64h |
+---------------------------------------------------------------+--------------------------------+
| STAGE x24-1384, y112-1016 (1360 x 904)                        | RAIL  x1408-1896, y112-1016     |
|  card 1: 18,000 dots, one per tube; boxes for a radio (10),   |  2 OF 5 . A BIG APPETITE   [ X ]|
|          the biggest radar set (400), a B-29 (under 800)      |  banner 112 h                   |
|  card 2: the 150 kW bar split 80 / 45 / 20 / 5 and a sliver   |  Power and heat         40 px   |
|          for one home (1.2 kW), same scale                    |  body 28/40, <= 40 words        |
|  card 3: a week: 8-hour shifts Mon to Fri; heaters on all     |  [ link 64 h, optional ]        |
|          week; the rest dark                                  |  [ CTA 96 h, card 4 only ]      |
|  card 4: three rungs: which unit? which circuit? which tube?  |  [ < Previous ]  [ Next > ] 96 h |
|  card 5: three bars: 5-25% (1946-48), 55% (1948-52), 70% 1954 |                                |
+---------------------------------------------------------------+--------------------------------+
| ENIAC simulator by Brian L. Stuart, Drexel University                                  (footer) |
+------------------------------------------------------------------------------------------------+
```

Pictures: `tubes-1-the-tubes.png`, `tubes-2-power.png`, `tubes-3-why.png`, `tubes-4-hunt.png`, `tubes-5-week.png`, `tubes-myth.png`. Every figure is drawn from numbers in the research table; a test checks the numbers (section 2.9).

### 2.4 The five cards and the myth card (proposed copy)

At most 40 words each, grade 6 or lower, `[FC]` rows in `docs/fact-check.md` group E. Per FR-46 the claim IDs are internal notes in the content file, never shown. Previous and Next follow the card order; **Finish** on card 5 returns to S14.

| # | Card | Tagline | Copy | Words | Claims |
|---|---|---|---|---|---|
| 1 | The tubes | About 18,000 | ENIAC had about 18,000 vacuum tubes. A tube is a sealed bulb that switches a signal on and off, with nothing moving. A radio had about ten. The glowing lamps you see are neon, not tubes. The tubes sat inside. | 40 | E1, E3, E20, E23 |
| 2 | Power and heat | A big appetite | ENIAC used about 150 kilowatts, as much as 1,500 bright light bulbs. More than half of it just made the tubes hot. Fans blew the heat out. A panel that got too hot switched the whole machine off. | 38 | E6, E7, E9 |
| 3 | Why tubes burned out | Hard on tubes | Tubes wear out like light bulbs, and switching on and off is hard on them. So early on, the crew left the heaters on overnight, and ran the tubes gently. Eckert remembered losing about one tube every two days. | 39 | E11, E13, E15, E17 |
| 4 | The hunt | Which tube? | When an answer came out wrong, the crew hunted: which unit, which circuit, which tube? Lamps showed what was happening inside. Tubes sat in plug-in units that swapped fast. Eckert said they found a bad tube within 15 minutes. | 39 | E11, E21, E22, E24 |
| 5 | A week with ENIAC | Time at work | In its first two years, ENIAC did real work only 5 to 25 percent of the time, by Army estimates. Testing, setting up and repairs took the rest. By 1954 it worked about 7 hours in every 10. | 38 | E25 |
| M | Did the lights of Philadelphia dim? (myth check, from card 2) | Myth check | No. A story says ENIAC dimmed Philadelphia's lights when it switched on. Eckert, who built it, called that story "total fiction." ENIAC took its power from the city grid, through its own regulators. | 33 | E28, E6 |

**Stage captions** (24 px, not counted in the 40): card 1, "Each dot is one vacuum tube. The bright boxes are the biggest tube machines of 1946. ... Also inside: about 70,000 resistors, 10,000 capacitors and 500,000 soldered joints." [E3, E4] Card 2, "In one hour, ENIAC used as much electricity as a typical American home uses in 5 to 6 days. Each panel also had a thermostat. Above 115 °F it turned the whole machine off." [E8, E9]. Card 3, "One week in ENIAC's first two years (February 1946 to March 1948). Later it ran day and night." [E15, E25]. Card 5, "Share of time doing real work. Army figures, each measured a little differently. Tubes were not the only trouble. Loose solder and power glitches were hard to find, too." [E12, E25; the solder and power wording is from the historians' summary, so it is a general statement with no number].

**Why card 3 does not say "most tubes failed at switch-on".** It is a common claim with no source. The manual says only that heating and cooling cycles raise the probability of failure (E13). The card says that.

**Card 5 and card 3 together stop a wrong impression.** Card 3 alone would leave a visitor thinking ENIAC rarely failed (one tube in two days). Card 5 says it spent most of its first two years being tested and repaired.

### 2.5 "Find the dead tube": a re-enactment

**Goal, in one sentence:** the visitor *feels* how a crew narrowed 18,000 tubes down to one, in under a minute, using the manual's own order (unit, then circuit, then tube).

**What is honest here.** The fault is made up; the steps are the 1946 ones. The practice panels are **drawn** and are never ENIAC state. The stage shows this on every screen of the exercise.

#### 2.5.1 Honesty rules (each is testable)

| # | Rule |
|---|---|
| RE-1 | The **plate** is on every state of the exercise, including the win: a badge "RE-ENACTMENT" and the line "These panels are drawn, not the live ENIAC. The fault is made up. The steps follow the 1946 maintenance manual." (20 words, 24 px, full stage width, cream, double rule below.) |
| RE-2 | The exercise **never reads core or bridge state** and never writes the live lamp store. Its lamps are `data-source="script"`. It does not import the lamp, session or core client modules (a static check). |
| RE-3 | It **looks different** from live panels: a dashed frame around the practice area, the plate bar, panels named ACC 1 to ACC 4 (the live room says "Accumulator 7"), and no unit art ids shared with S14. |
| RE-4 | It is reachable **only by a tap** on card 4's button (or "Try another fault" / "Find the dead tube" from within). It is never shown in attract, in a mission, or as a stand-in for any screen that needs the core. |
| RE-5 | The win text says "A real crew would also ..." and gives Eckert's 15 minutes as **his** statement. It shows no score, timer or percentage. |
| RE-6 | A fault is never described as something that happened on a day. |

#### 2.5.2 The scenario

Four drawn accumulators (ACC 1 to ACC 4), each with ten digit places and ten lamps per place (0 to 9 down the left, as on the real machine), cleared to 0. The test is a test problem with a known answer: every accumulator should show the same lamps (drawn as all fives; no source names a specific 1946 test pattern, pre-share fact-check R3). In the test one place shows a wrong lamp. There are **three authored faults**, used in order (no randomness, so tests and docents can predict them):

| Variant | Wrong accumulator | Wrong place (from the left) | Lamp lit | Cold tube (of 8) |
|---|---|---|---|---|
| 0 (first visit) | ACC 3 | 4 | 9 | 3 |
| 1 | ACC 1 | 8 | 1 | 6 |
| 2 | ACC 4 | 2 | 8 | 1 |

The variant index starts at 0 at every reset and goes up by one on each "Try another fault", wrapping after 3.

#### 2.5.3 The steps

| Step | The visitor | The stage | Rail card (headline and body) | Wrong-tap hint (#1) |
|---|---|---|---|---|
| 1 | Presses **Run the test** (rail, 96 px) | Four panels, all lamps at 0 | "Run the test": "A 1940s technician began with a test problem with a known answer. Every accumulator should show the same lamps. Press Run the test, then compare them." | (no wrong tap) |
| 2 | Taps the wrong **panel** (each panel is one 306 x 700 target) | The test finished. Three rows of lamps line up on 5; one panel has a lamp out of line. A caption: "Test finished. Every accumulator should show the same lamps. Compare them." | "Which panel is wrong?": "Look for the accumulator whose lamps are out of line with the others. Tap it." | "Not quite. That one lines up with the others. Try another." Hint after #2: "Hint: look for a lamp sitting lower than the rest." |
| 3 | Taps the wrong **digit place** (ten columns, each 100 px wide and about 540 high) | The wrong accumulator fills the stage; ten places, each with its own plug-in unit at the bottom (drawn as a cream slot) | "Which digit place?": "Each digit place has its own plug-in unit. Tap the column with the wrong lamp." | "Not quite. That column is right. Look for the lamp that is lit at the wrong number." Hint: "one column is lit at 9, not 5. Count along from the left." |
| 4 | **Touches tubes** (eight tubes, each 112 x 300) until one is cold | The unit is **out**; eight tubes stand on a chassis labelled PLUG-IN UNIT ("Drawn simplified: a real one held many more parts."). A touch shows **warm** (amber tint, label "warm") or **COLD** (blue tint, label "COLD") on that tube | "Which tube?": "The unit is out. A dead tube runs cold. Touch each tube and compare." | A warm tube is not an error: "Warm. That one works. Try another." (it counts toward "Do it for me") |
| 5 | Presses **Plug in a fresh unit** (rail, 96 px) | The cold tube is marked; the button swaps the unit and the test runs again | "Plug in a fresh unit": "Found it! Slide in a fresh unit, and ENIAC will run the test again." | (no wrong tap) |
| Fixed | Reads, then **Try another fault** or **Back to the story >** (both 96 px) | All four panels show 5555555555. A green ring on the repaired place | "Fixed!" and: "Every lamp lines up again. A real crew would also test the dead tube and write it in the log. Eckert said a hunt took up to 15 minutes." (29 words) | |

Total taps: 1 + 1 + 1 + 1 to 8 + 1 = **5 to 12**, about 30 to 60 seconds.

#### 2.5.4 Feedback, help and the exits (reusing UX 5.2 and 5.3)

| Event | Behaviour |
|---|---|
| Wrong tap #1 | A red X badge (vermillion, 56 px) on the target for 600 ms with a 2 x 6 px shake; the rail's feedback line says "Not quite. ..." |
| Wrong tap #2 | The correct target gets a thicker yellow ring (12 px) and the line says "Look for the glowing ring." |
| Wrong tap #3 | **Do it for me** turns filled and the line says "Want us to do this one?" |
| **Do it for me** (steps 2 to 4) | Plays the step (the right panel, place or tube is chosen) and moves on; counts as `done-for-me` |
| **Skip to the answer** (64 px text button, steps 2 to 5) | Goes straight to the fixed state; no confirm |
| **Back to the story** | Returns to card 4; the exercise state is discarded |
| Tap on empty space | Neutral ripple only; not a wrong tap |
| **Try another fault** | Variant plus one (mod 3); step 1 again |
| Meaning is never colour alone | Warm/COLD tubes carry the words and different tints; the ring comes with a thicker outline; the wrong lamp is a position, not a colour (and is named in the feedback line after step 2) |

#### 2.5.5 Touch, motion, idle and failure

| Area | Spec |
|---|---|
| Targets | Panels 306 x 700; columns 100 x about 540; tubes 112 x 300; rail buttons 96 px; text buttons 64 px; 16 px or more between hit areas (the columns are on a 116 px pitch and 100 px wide, the tubes on a 128 px pitch and 112 wide, the panels on a 326 px pitch and 306 wide); a tap within 16 px of a target counts; actions fire on release; only the first touch counts |
| Gestures | None. No drag, long press, pinch or swipe is needed or recognised |
| Motion | Lamp change 80 ms decay (as everywhere); the unit "slides out" in 400 ms; wrong-tap shake 300 ms. **Reduced motion** (box setting or `prefers-reduced-motion`): the unit cross-fades in 200 ms, no shake (the X badge alone), no ring pulse. Nothing flashes more than 3 times a second |
| Idle | **120 s** (the S14 reading value), then S9 for 15 s, then S1. S1 resets the exercise and the variant counter |
| Core down, bridge up | **Works**, because nothing here is live. The plate stays exactly as it is. No "ENIAC is resting" pill is added, because the screen makes no claim about the live machine (Q24 asks Nick to confirm) |
| Websocket or bridge down more than 5 s | S10, as on every screen (FR-50) |
| Reading level and length | As the cards: grade 6 or lower, at most 40 words per rail card |

### 2.6 Glossary additions (S15)

Three new words and one change. The glossary is built in pages of 8; with 19 or 20 terms it becomes three pages and **Neon lamp** moves beside the other lamp-and-unit words. Each meaning is at most 25 words (the build checks it). Picture: `tubes-glossary.png`.

| # | Term | Meaning | Words | Show me | Claims |
|---|---|---|---|---|---|
| 17 | **Vacuum tube** | A sealed bulb that switches a signal on and off with nothing moving. ENIAC had about 18,000. Like light bulbs, they wore out. | 23 | S16 card 1 | E1, E13, E20 |
| 18 | **Plug-in unit** | A part made to pull out and push back in. A bad one could be swapped fast. Many of ENIAC's tubes sat in plug-in units. | 25 | S16 card 4 | E24 |
| 19 | **Kilowatt** | A thousand watts. ENIAC used about 150 kilowatts, as much as 1,500 bright light bulbs. | 15 | S16 card 2 | E6, E7 |
| 15 (changed) | **Neon lamp** | A small glowing bulb. Each place in an accumulator has ten lamps, 0 to 9. The lit one shows the digit. The tubes are inside. | 25 | S14 card 4 | E23; `A8` in the fact-check |

New rows for section 15.1 (mission words and real words): none; these are not mission words.

### 2.7 Finale and attract

- **F2 ("Here is every unit you used"):** add a second caption line, 28 px: "Behind those panels, about 18,000 tubes glowed. A crew worked shift after shift to keep them running." (17 words; E1, E26) and a chip **How they kept it alive >** (64 px) beside **Explore the whole machine >**. F2 keeps its 15 s timer; the chip leaves the finale, and **Finish** or **X** in S16 returns the visitor to F5. Under reduced motion nothing changes. With the core down F2 is skipped as before, and so is the chip.
- **Attract (optional):** the plate in 2.2.

### 2.8 Proposed text to fold into the other documents

These are written so they can be pasted in. I have not edited `docs/ux-spec.md` or `docs/PRD.md`.

**`docs/ux-spec.md`, new section 14.11 "S16 Keeping ENIAC alive".** Goal: tell how ENIAC's 18,000 tubes were kept working, in five cards and one re-enactment. Layout, copy (2.4), entry points (2.2), the re-enactment (2.5), glossary rows 17 to 19 and the changed row 15 (2.6), the F2 line and chip (2.7). Add to 14.7 the row: **S16 Keeping ENIAC alive** | idle 120 s | works (static, no pill) | S10 | cross-fade; no shake. Add to 14.8 rows 20 onward for E-claims that appear on screen (E1, E3, E4, E6 to E9, E11, E13, E15, E17, E20 to E25, E28), pointing to `docs/fact-check.md` group E. Add to 14.10 questions Q24 to Q27 (section 2.10). Add to section 16 a revision row.

**`docs/PRD.md`, section 4.9:**

| ID | Requirement | Priority |
|---|---|---|
| FR-99 | **Keeping ENIAC alive** (S16): five cards of at most 40 words each (the tubes; power and heat; why tubes burned out; the hunt; a week with ENIAC) and a one-card myth check, each with one drawn figure whose numbers come from the sourced table in `docs/tubes.md`. Reached from a button in the S14 header, from the glossary and from the finale (F2). Content is data with an internal `[FC]` note per claim (FR-46). | P1 |
| FR-100 | **Find the dead tube** is a **re-enactment**, never live state: a plate reading "RE-ENACTMENT" and "These panels are drawn, not the live ENIAC. The fault is made up." stays on screen in every state; it reads no core state; it follows the 1946 order (unit, circuit, tube); it uses the wrong-tap ladder, "Do it for me" and "Skip to the answer" of UX 5.2 and 5.3; three authored faults, no randomness. | P1 |
| FR-101 | Glossary adds **Vacuum tube**, **Plug-in unit** and **Kilowatt** and rewords **Neon lamp** (FR-96). Counters: `tubes_open`, `tubes_card{1..5}`, `tubes_try_start`, `tubes_try_step{2..5}`, `tubes_try_done{variant,doForMe}`, `tubes_try_skip`, `tubes_myth_open` (FR-98). | P2 |

### 2.9 Tests to write

IDs follow the test plan's style (`TUBE-nn`). Unit and DOM tests run in the existing `node --test` suite; the screenshots and touch audit extend the Playwright suite.

| ID | What | Expected |
|---|---|---|
| TUBE-01 | Copy limits | Every card at most 40 words; myth card at most 40; glossary meanings at most 25; the plate exactly the 20-word text; no card scrolls in the 488 x 904 rail |
| TUBE-02 | Claim IDs | Each content block lists `fc: [E..]` and every ID exists as a row in `docs/fact-check.md` group E |
| TUBE-03 | Banned wording | The strings "116", "never turned off", "one-quarter", "5,000,000", "every few minutes", "most failed" and "selected tubes" appear nowhere in visitor text. "lights of Philadelphia" appears only in the myth card, in a sentence that begins "No." |
| TUBE-04 | Figure numbers | The power bar's four parts sum to 150 and 80/150 is more than half; 150 kW / 100 W = 1,500; the dot field has exactly 18,000 dots and the boxes hold 10, 400 and fewer than 800; the "5 to 6 days" line is 150 kWh / 29.6 kWh a day and 174 / 29.6 rounded |
| TUBE-10 | The plate | The RE-ENACTMENT plate is visible with the exact text in step 1, 2, 3, 4, 5 and the fixed state, after "Do it for me", after "Skip", and after "Try another fault" |
| TUBE-11 | State machine | The table in 2.5.3 is followed exactly: only the right panel advances step 2; only the right column advances step 3; a warm tube never advances step 4; the cold tube advances to step 5; the fixed state shows four panels of 5555555555 |
| TUBE-12 | Ladder | Per step: wrong #1 shows the X badge and the hint; #2 thickens the target ring; #3 fills **Do it for me**. The counter resets on each step |
| TUBE-13 | Help paths | **Do it for me** and **Skip to the answer** reach the same states as the manual path; neither writes anything outside the exercise |
| TUBE-14 | Variants | Three faults, each solvable; the odd lamp is in the named panel and place, lit at the named number; "Try another fault" cycles 0, 1, 2, 0; a reset returns to 0 |
| TUBE-15 | No live data | Static check: the module imports nothing from the core client, session or lamp store. With the websocket open and with the core down, the screen is byte-identical. A spy on the live lamp store records no reads or writes |
| TUBE-16 | Hygiene | The DOM has no element with `data-live`; every lamp in S16 has `data-source="script"`; the panel names are ACC 1 to 4, never "Accumulator n" |
| TUBE-17 | Touch audit | Every interactive element is at least 64 px with at least 16 px between hit areas; primary buttons 96 px; no pointer handler needs a drag; a tap within 16 px counts |
| TUBE-18 | Reduced motion | Under `prefers-reduced-motion` and under the box setting: no shake class, no slide; the unit change is a 200 ms cross-fade; no more than 3 flashes a second |
| TUBE-19 | Idle | 120 s without a touch shows S9 for 15 s, then S1; the exercise and the variant counter are reset; a touch during S9 does not leak through |
| TUBE-20 | Failure | Core down, bridge up: S16 works with no pill. Websocket or bridge down for more than 5 s: S10 |
| TUBE-21 | Entry points | The header button is on S14 in every state and opens S16; Back returns to the same S14 position; each glossary "Show me" opens the named card; F2 shows the chip when the core is up and not when it is down; **Finish** and **X** from F2's S16 land on F5 |
| TUBE-22 | Colour and contrast | `axe-core` colour contrast on S16; a grayscale screenshot shows warm and COLD tubes still differ by their words and tint; the target ring has 3:1 contrast |
| TUBE-23 | Metrics | Each counter in FR-101 fires once per event and holds no free text |
| TUBE-24 | Screenshots | Playwright goldens at 1920 x 1080 for cards 1 to 5, the myth card, steps 2, 3, 4 and the fixed state, and glossary page 3 (tolerance as for S14) |
| TUBE-25 | On the device, once per milestone | One finger, a palm and a glove on the 24-inch panel: tubes (112 px) and columns (100 px) are hit reliably; the 24 px plate line is legible at arm's length |
| TUBE-26 | Docent review | A person who knows ENIAC reads cards 1 to 5 and the plate against the E-row wording, once. This is a read-through, not a gate (FR-46) |

### 2.10 Open questions

| # | Question | Default used here | Whose call |
|---|---|---|---|
| Q24 | When the core is down, should S16 keep working with no pill? | Yes. Nothing on it is live and the plate says so (2.5.5) | Nick |
| Q25 | Is a header button the right place, or should S14's room strip also get a small "Where are the tubes?" tag on every panel? | Header button only; a tag on 40 panels adds clutter, and the cards already say where the tubes were | Nick |
| Q26 | Should the optional attract plate ("about 18,000 vacuum tubes, about 150 kilowatts, about 30 tons") ship with this? | Yes if there is room in the rotation (P2) | Nick |
| Q27 | Do you want the Haigh and Priestley figures (December 1947: 2 hours of production in a week; 49% checking and fixing hardware) on a card once someone has read the book? | Not on a card; docent note only (1.3) | Nick |

### 2.11 Files in this change

- `docs/tubes.md` (this file); `docs/fact-check.md` (group E appended; sources added).
- `docs/mockups/tubes.html`, a standalone, clickable mockup (open in Chrome). URL shortcuts for screenshots: `?view=card&n=1..5`, `?view=myth`, `?view=try&step=1..5`, `?view=try&done=1`, `?view=glossary`, `?variant=0..2`.
- PNGs: `tubes-1-the-tubes.png`, `tubes-2-power.png`, `tubes-3-why.png`, `tubes-4-hunt.png`, `tubes-5-week.png`, `tubes-myth.png`, `tubes-try-1-panels.png`, `tubes-try-1b-wrong-tap.png`, `tubes-try-2-place.png`, `tubes-try-3-tubes.png`, `tubes-try-3b-touching.png`, `tubes-try-4-fixed.png`, `tubes-glossary.png`, `tubes-entry-from-explore.png` (an illustration made by adding the button to `explore-eniac.html` in the browser; the approved mockup file is untouched).

The mockup uses the same fonts, tokens and lamp drawing as `explore-eniac.html`. The "FC" marks in it are mockup annotations only; the build shows none (FR-46).
