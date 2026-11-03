# ENIAC Fact Card — Part 1

**For the museum floor, not for listeners.** Built for a docent who has just been asked a follow-up
question and has thirty seconds. Every figure traces to `research/part-1-verification.md`; tier codes
are that document's.

**(a)** primary/contemporaneous · **(b)** peer-reviewed or archival scholarship · **(c)** reputable
secondary · **(d)** widely repeated, traceable to nothing.

**The one rule:** if you can't name where a number came from, say so. "That figure is in every book
and I don't know its source" is a better answer than a confident wrong one, and visitors respect it.

---

## 1. The checkable numbers

| Claim | Say this | Tier | Source |
|---|---|---|---|
| **Acronym** | Electronic Numerical Integrator **and Computer** | (a) | Title page, *A Report on the ENIAC*, 1 Jun 1946 |
| **Vacuum tubes** | **18,000** | (a) | Adele Goldstine, *Part I, Technical Description*, §1.5.1 |
| **Addition speed** | 200 µs per addition → **5,000 additions/sec** | (a) | Goldstine, *Part I* (cycling unit); Weik BRL 971 |
| **Multiplication** | ~2,800 µs → **~357/sec** | (a) | Weik BRL 971; Operating Manual (6–14 addition times) |
| **Division / square root** | ~24–25 ms → **~40/sec** | (a) | Weik BRL 971; Kempf 1961 |
| **Power** | **174 kW** | (a) | Weik BRL 971; Kempf 1961 |
| **Weight** | **over 30 tons** — consistent in every source | (a) | Kempf 1961 |
| **DC supply voltages** | **78 different d-c voltages**, from a 240 V 3-phase supply | (a) | Goldstine, *Part I*, §1.5.2 |
| **Panels** | **40**, in a U | (a) | Goldstine, *Part I*, §9 |
| **Per-panel thermostat** | shuts down the **whole machine** above **115 °F** | (a) | Goldstine, *Part I*, §1.5.1 |
| **Safety factor** | "at least a **2 to 1** safety factor" in practically all circuits | (a) | Maintenance Manual §1.7 |
| **Mean error-free run** | **5.6 hours** | (a) | Weik BRL 971, Dec 1955 |
| **Operating ratio** | **0.69** — 113 good hours of 164 attempted in a week (1955) | (a) | Weik BRL 971 |
| **Interruptions from tubes** | **90%** of service interruptions | (a) | Kempf 1961 |
| **Contract** | **W-670-ORD-4926**; proposal 9 Apr 1943; signed 5 Jun 1943; **$61,700** initial → **$486,804.22** final after nine supplements | (a)/(b) | Weik 1961; the 1946 report itself |
| **Firing table effort** | "about **three months** of work on a **two-shift** basis" per table | (b) quoting (a) | Barnes→Buckley draft, c. 1 Feb 1944 |
| **Table demand** | **six *requests*** for new tables per day; **15** completed / **74** in progress, week ending 15 Aug 1944 | (b) quoting (a) | BRL Memo, 16 Aug 1944 |
| **BRL Computing Branch staff** | **176 computers**, c. Feb 1944 | (b) quoting (a) | Barnes→Buckley draft |
| **Whole-project computers** | "a staff of about **200** trained computers" | (a) | War Dept press release, 30 Jan 1946 |
| **Work per trajectory** | "the order of **750 multiplications**" | (b) | Goldstine 1972, p. 138 |
| **Analyzer integrators** | Moore School **14**, Aberdeen **10**, MIT's original **6** | (b) quoting (a) | Barnes→Buckley draft; Owens 1986 |
| **Job grade** | "computers, **SP-4**, a subprofessional civil service grade" | (b), first-person | Kay McNulty in Fritz 1996, 15 |
| **Salary** | **$1,620/yr**, "assistant computer" = SP-4 step 3 | (b) citing (a) | Grier, p. 259, from Penn archives |
| **Key dates** | Press preview **Fri 1 Feb 1946**; unveiling + dedication **Fri 15 Feb 1946**; delivery **1 Dec 1945**; Ordnance acceptance **Jul 1946**; first production trajectories **Aug 1946** | (a)/(b) | Burks memo; War Dept masthead; Kempf 1961; Haigh/Priestley/Rope |
| **Total run time** | **80,223 hours** between 1948 and retirement in **1955** | (c) | Moye 1996 |

---

## 2. Where sources conflict — give both, say which you prefer

| Question | Competing figures | Prefer, and why |
|---|---|---|
| **Tube count** | 18,000 · 17,468 · ~17,000 · 19,000 | **18,000.** It's the 1946 documentation's own number for the 1946 machine. 17,468 (Weik, 1955) is the *rebuilt* machine at Aberdeen — also tier (a), also correct, for a different machine. 19,000 (Kempf 1961) is unexplained. Say: *"They're counting different machines at different times."* |
| **Power** | 174 kW · 150 kW · 140 kW · ~200 kW | **174 kW** — two Army sources agree. |
| **Floor area** | 1,800 sq ft · 1,500 sq ft (30 × 50 ft) | Both right. **1,800** is Aberdeen; **1,500** is the Moore School room. Name the site. |
| **Divisions/sec** | ~40–42 · 38 | **~40.** "38" is untraceable — tier (d) — despite being on countless captions. |
| **Trajectories per table** | 2,000–4,000 ("assume 3,000") · "hundreds" · ~156 | **Do not resolve it.** Army records show 1,560 trajectories across 10 tables (Feb–Jun 1945) = ~156/table; Goldstine says assume 3,000. Likely a basic-vs-full-table difference, but *no source states that*. |
| **Time per trajectory by hand** | ~12 hrs · ~20 hrs · 40 hrs · ~3 days · "20 min to several days" | Give the range, not a number. Goldstine's ~12 hrs is the best-argued. |
| **Setup time** | "a day" (Clippinger 1948) · "weeks" (Kempf 1961) | **Both, and separate the tasks.** "A day" = replugging a configuration that already exists. "Weeks" = designing it and checking it out. |
| **Moore School analyzer completed** | 1935 · 1934 · 1937 | **1935.** (Grier's 1937 is an error; 1934 press describes a machine still under construction.) |
| **Mauchly's Ursinus rank** | full professor · professor · associate professor | Dodge it: **"head of the physics department — a department of one."** Everyone agrees, and it's the better line. |
| **Mauchly's death** | 8 Jan 1980, Abington · 9 Jan 1980, Ambler | **8 January**, per Penn's finding aid. |
| **Who wrote the demo trajectory program** | Snyder & Jennings · Wescoff & Lichterman · "Adele Goldstine and me" | **Snyder & Jennings** (Fritz, Light — best sourced). The third is Herman Goldstine's memoir, i.e. an interested party. |
| **ENIAC restarts at Aberdeen** | Aug 1947 · 29 Jul 1947 | **29 July 1947** — it's the machine's own log. |
| **Delivery vs. acceptance** | 1 Dec 1945 · Jul 1946 | **Both.** Delivery (a court's finding) and formal Ordnance acceptance are different events. |

---

## 3. Do NOT say this — and the correct version

| ❌ Don't say | ✅ Say instead | Why |
|---|---|---|
| "They never turned the machine off." | "They understood that switching tubes on and off is what killed them, and built their procedures around minimising it." | No contemporaneous source. The 1946 report gives a stop switch, an instruction to switch off unused units' heaters, and **a heater switch + elapsed-hour meter on all 40 panels**. |
| "Eckert ran the tubes at one-quarter power." | "At least a two-to-one safety factor, and tubes run below rated voltage." | The ¼-power figure is on Penn's history page with no citation. The 2:1 is in the Maintenance Manual. |
| "Tubes came from a special burnt-in selection." | Nothing — drop it. | Traces to one dead Penn course page. Absent from all manuals and Army sources. |
| "A tube failed every two days." | "Eckert remembered about every two days; the Army's own records give a mean error-free run of 5.6 hours." | It's one man's 1989 memory. Everything else, including CHM, is downstream of it. |
| "Six firing tables a day were demanded." | "Six *requests* for new tables a day." | Moye 1996 dropped the word "requests"; everyone copied him. |
| "A trajectory took 30 days by hand." | "750 hours — about 30 days — was the **differential analyzer**, doing **a whole table**." | A mangling of Goldstine p. 138. |
| "ENIAC could make a firing table in 30 sec × 3,000." | "It computed *a trajectory* in about 30 seconds. Trajectory integration was one phase of many." | BRL 1952: table determination "is a more extensive computational problem than the mere computation of the trajectories." |
| "20 hrs / 15 min / 30 sec — that's what they measured." | "That's a 1961 Army capability comparison for a hypothetical 60-second trajectory." | Not a wartime measurement. Perfectly usable as a comparison. |
| "The Army seized/commandeered the Penn analyzer." | "A prewar clause, exercised in June 1942 — the Army paid $3.00 an hour." | Grier, from the Penn archives. |
| "A 155mm shell." | "An artillery shell." | No source gives a caliber. Probably a corruption of 1,550 ft/s muzzle velocity. |
| "Saturday, February 14, 1946." | "Preview 1 February; unveiling and dedication 15 February." | 14 Feb 1946 was a **Thursday**. |
| "They ran the shell trajectory for the press, faster than the shell flew." | "That's the 15th, it's a reconstruction, and the line is from a 1974 talk." | No record of the 15th's program exists. Stuart 2021 offers it as a stated hypothetical. |
| "One million punched cards for the Los Alamos run." | Give no card count. | Metropolis was asked directly in 1987 and declined to endorse it. |
| "Adele Goldstine wrote the ENIAC manual." | "She is the sole credited author of *Part I, Technical Description* — two of the five volumes." | The Operating Manual is Burks & Huskey; the Maintenance Manual a team of six; Part II is Huskey. |
| "The programmers had no documentation." | "There were five volumes, wiring and block diagrams, and the engineers. What there wasn't was a programming model, a language, or anyone to ask." | |
| "Some of the ENIAC Six were WACs." | "All six were civilians." | Fritz is explicit. |
| "They were paid $1,440." | "$1,620 a year as an assistant computer." | $1,440 is **NACA Langley's** SP-3 rate — a different agency. Don't transplant Langley's salary comparison onto BRL. |
| "Two hundred women worked at the Moore School." | "About 100 at a time in the Philadelphia room; ~200 across the whole project, civilian and military." | The 200 is project-wide and cumulative. |
| "The Philadelphia Computing Section" (as a period title) | "What's usually called the Philadelphia Computing Section." | Modern scholarship's phrase; not found in any wartime document. |
| "Captain Gillon" / "Captain Goldstine" (1942) | "**Major** Gillon" and "**First Lieutenant** Goldstine." | Both made higher rank later. |
| "38 divisions per second." | "About forty." | Untraceable. |
| "There were only two Bush analyzers in America." | "The Army had one at Aberdeen, and the only other one it could get its hands on was Penn's." | GE, Texas, California and MIT had them too. |
| "Electronic Numerical Integrator and *Calculator*." | "…and **Computer**." | No primary document uses "Calculator." |
| "The 1942 memo survived as a carbon copy." | "It survived as the secretary's Gregg shorthand notes, re-transcribed." | Attested independently by Mauchly (1973) and Chambers (1977). |
| "Mauchly was twelve years older than Eckert." | "About eleven and a half." | 11 y, 7 m, 10 d. |
| "A judge proved Atanasoff invented the computer." | "A court invalidated a patent, on several independent grounds." | Series guardrail. Never let this one stand. |

---

## 4. The four questions a visitor will actually ask

**Q. "How many vacuum tubes, exactly?"**
Eighteen thousand — that's the number in the machine's own 1946 documentation. If they push: the Army's 1955 inventory of the rebuilt machine at Aberdeen counts 17,468, and a 1961 Army history says 19,000. They're counting different machines at different times, and none of them is wrong.

**Q. "With eighteen thousand tubes, how did it ever work?"**
This is the best answer you have, and it isn't the one people expect. Not better tubes — a different design principle. The tubes were used only as on-off devices, never as amplitude-sensitive ones, so a number was carried by whether a pulse was present, not by a voltage level. A weak tube that still switches is a working tube. And the signals were *regenerated* from a clean master pulse train at each stage rather than passed along, so error couldn't accumulate down a chain. That's Adele Goldstine's own volume, and the Army said the same in 1961. On top of it: a 2-to-1 safety factor in practically all circuits, tubes run below rated voltage, a written log of every tube failure, and a purpose-built rig — a variable oscillator and variable power supply — for making marginal components fail on demand rather than mid-run. *And* they still lost about 31% of scheduled hours.

**Q. "Were the women really just operators?"**
No, and the paperwork is more damning than the anecdotes. They were hired as "computers, SP-4" — a *subprofessional* civil service grade — through a campaign that advertised for women with mathematics degrees. The Classification Act of 1923 defines Subprofessional Service as work "incident, subordinate, or preparatory" requiring training "of any degree inferior to that represented by graduation from a college or university." So they were hired onto a scale legally defined as needing *less than* the degree they were recruited for. On the work itself: Jean Bartik said they could "diagnose troubles almost down to the individual vacuum tube… as well as, if not better than, the engineer," and a second programmer records pointing technicians to the specific tube to change. Many received professional ratings in **November 1946**.

**Q. "Was ENIAC the first computer?"**
Don't answer the question — explain why it's the wrong shape. "First" depends on a definition, and each candidate machine satisfies a different one: Colossus was electronic and special-purpose; the ABC was electronic, special-purpose, and never ran fully; Zuse's machines were programmable but electromechanical. ENIAC was electronic, general-purpose, programmable and fast. Every book that ranks them picks the definition that produces its answer. And no, the 1973 patent trial did not settle it: it invalidated a patent on several independent grounds, which is a commercial outcome, not a historical verdict.

**Bonus, if someone asks what it did first:** not a firing table. A simplified hydrogen-bomb feasibility calculation for Los Alamos, run in late 1945 into early 1946, before the machine was publicly announced. The Army delayed shipping it to Aberdeen so the run could finish, and the people operating it were not told what the problem was. The trajectory work it was built for didn't start as production until August 1946.

---

## 5. Where to go if you're challenged

All free, all read in full for this episode:

- ***A Report on the ENIAC*, 1 June 1946, all five volumes** — archive.org: Vol 1 `ReportonENIACEl1Moor` · Vol 2 `ReportonENIACEl00MoorA` · Vols 3–4 `ReportonENIACEl00MoorB` · Vol 5 `reportoneniacele05moor`
- **War Department press release, 30 Jan 1946** — `ece.rice.edu/~dhj/History/ENIAC1.pdf`
- **Clippinger, BRL Report 673 (1948)** and **Kempf (1961)** — `ftp.arl.army.mil/~mike/comphist/`
- **Weik, BRL Report 971 (1955)** — `ed-thelen.org/comp-hist/BRL-e-h.html`
- **Fritz, "The Women of ENIAC," *IEEE Annals* 18:3 (1996)** — the women in their own words
- **Light, "When Computers Were Women," *Technology and Culture* 40:3 (1999)** — reproduces the 1946 photo captions and the press release text
- **Classification Act of 1923**, 42 Stat. 1488 §13

**Known gaps — say "that isn't established" rather than guessing:** a BRL tables-in-arrears count · time to produce a complete firing table on ENIAC · whether hiring involved a civil-service examination · any dead-tube incident with a named person and a date · the Feb 15 demonstration program · the Feb 15 dinner guest list · which master-programmer switch Betty Snyder moved · why papers ran 15 Feb when both releases embargoed to the 16th.
