# Spike S4 (MC): can a 1948-true Monte Carlo neutron-chain mission run on the pinned simulator?

**Issue:** none yet | **Date:** 2026-10-21 | **Author:** software-developer agent | **Time used:** about 3 hours
**Feeds:** a decision by Nick on whether a Monte Carlo mission goes on the roadmap (FR-24 data-only missions, R1 permission)
**Name note:** `docs/spikes/S4-squares-speed.md` already exists. This file was named as asked; renumber one of them if the S-numbers matter.

Confidence tags used throughout: **(a)** primary source (a 1948-49 document, or the code and docs we actually ran), **(b)** secondary (Haigh, Priestley and Rope reconstructions or quotations), **(c)** unverified or my inference.

## Summary

**A faithful 1948 Monte Carlo mission cannot be built on Stuart's pinned simulator as it is.** Two facts decide it.

1. The 1948 program was not plugboard-wired. ENIAC had been converted to run a 79-order stored program held in the function tables, with order codes, jumps and a subroutine. The second-run listing is about 840 instructions in about 2,208 digits. The pinned simulator models ENIAC *as built at Penn, 1946*: its README says the BRL-era enhancements are "future plans". There is no converter, order decoder or stored-program code anywhere in the upstream tree (grep of `src/`, `programs/`, `doc/`, README: nothing).
2. The 1946-style plugboard route cannot carry the whole job. Von Neumann's own March 1947 estimate for a plugboard set-up was 80-90 percent of ENIAC's programming capacity, before the later additions (census, multi-event loops, cross-section lookup). The team gave up that route and converted the machine instead.

**What does run on the unmodified core (tested, real output below):**
- card reader into the constant transmitter into accumulators (a card of 80 columns is 8 ten-digit words, exactly the layout the 1948 decks used);
- the multiplier squaring that number, with the product punched back out as a card;
- a function-table row read as an "order word", its digits decoded by a digit-program adapter, and that driving the Master Programmer and then an accumulator add. That is the plugboard cousin of the converter's order decoding. It is not the converter.

**What did not work or was not reached:** the middle ten digits of the 20-digit product (needed for the middle-square generator) were not obtained in the time box, and the top ten digits come out one unit low in the last place (see Test A). A looping program counter over function-table rows was not finished. In three wirings the core deadlocked (no output until killed).

**Recommendation:** do not build a "1948 Monte Carlo" mission now. If Nick wants one, take the route in section 6: ask Stuart (with the permission request already drafted for R1) whether a converter model exists or is wanted, because a faithful mission needs the core extended and that is not "as-is". A smaller "one step of the method, plugboard style" mission is possible in about 4 to 6 days, but it would be a 1946-mode sketch of one neutron step, and it would have to say so on screen. That conflicts with Nick's requirement to match how the machine was used in 1948, so I do not recommend it as the main route.

## 1. What the 1948 problem actually computed

### Sources used

| Tag | Source | Where | Notes |
|---|---|---|---|
| (b) | Haigh, Priestley, Rope, "Los Alamos Bets on ENIAC: Nuclear Monte Carlo Simulations, 1947-8", IEEE Annals 36(3), 2014, pp. 42-63 | PDF provided in the session; text extracted with `pdftotext -layout` | cited below as **H14** |
| (a, reconstructed) | Klara von Neumann, John von Neumann, N. Metropolis, "Actual Running of the Monte Carlo Problems on the ENIAC", 1949 (reconstruction by Graf and Priestley, 2014) | `https://eniacinaction.com/docs/ActualRunning.pdf`, saved to a scratch dir | cited as **AR**. The 1948 handwritten draft covers the first run only. |
| (b) | Priestley and Haigh, "Monte Carlo Computation Analysis", v1.0, Jan 2016 | `https://eniacinaction.com/docs/MonteCarloComputationAnalysis.pdf` (46 pages, fetched) | cited as **MCA** |
| (b) | Priestley and Haigh, "Monte Carlo Second Run Code Reconstruction and Analysis", v1.0, Jan 2016 | `https://eniacinaction.com/docs/MonteCarloSecondRunCodeReport.pdf` (fetched) | cited as **SRC** |
| (a) | Monte Carlo flow diagram, 9 Dec 1947 | `https://eniacinaction.com/docs/MonteCarloFlow1947.pdf`, fetched, one page | It is an image: `pdftotext` gives no text, **I did not read it**. |
| (b) | ENIAC in Action poster page | `https://eniacinaction.com/the-book/eniac-monte-carlo-poster/` | dates only |
| not reached | Haigh and Priestley, *ENIAC in Action* (MIT Press, 2016) | book, not online | page references not checked |

The 2014 article says the first-run program code was **not located**; the first run is reconstructed from flow diagrams, the second-run code, AR and the allocation documents (H14, p. 54).

### The model (b)

A **spherical assembly of concentric zones**, each a mixture of active material, tamper and moderator. A neutron is described by its zone, time, velocity, distance from the centre and a direction parameter. Planned in March 1947 as a letter from von Neumann to Richtmyer (H14 p. 45; MCA section 1). Velocity is binned into **10 intervals**; cross-sections for each material, interval and collision type sit on **function table 3** (160 combinations originally, H14 p. 50). Seven problems are mentioned in von Neumann's letter, six in AR (see "Open discrepancies").

### One neutron history, in steps (a/b, AR pp. 2-13, H14 pp. 51-52)

1. **Read a card** (one neutron, one "period of life") into the constant transmitter. Fields: event code alpha (3 absorption, 4 total escape, 5 fission, 6 census, 7 zonal escape in run 2), the last random number xi, zone, time t (in 10^-8 s "shakes"), velocity, radial distance r, direction parameter a, weight q (1 to 4), plus family numbers (generation, parent, ancestor, serial).
2. If the card is absorption or escape, **discard it** and read the next. A census card of the current period resumes where it stopped. A fission card gets a **random** direction and a **random velocity** from the 10 interval "centers of gravity".
3. Draw a random number and form **lambda\* = minus the log of a random number in (0,1)**.
4. Find the **velocity interval** k (0 to 9) by searching the table. (Note: **k here is an interval index, not a multiplication factor.**)
5. From r, a and the zone radii work out whether the neutron is going inward or outward and the **distance d to the zone boundary**.
6. Look up the zone's **total cross-section**, multiply by d, compare with lambda\*. If sigma times d exceeds lambda\*, a collision happens at d1 = lambda\*/sigma; otherwise it reaches the zone edge and lambda\* is reduced by the "risk" already run.
7. Check the **census time**: if the neutron cannot reach the event before time T, stop it at T and mark it census (alpha = 6).
8. At a collision, a further random number picks **absorption, elastic scattering, inelastic scattering or fission** by comparing it with cumulative partial cross-sections. Scattering gives new direction and velocity from more random digits. Fission gives q = 1 to 4 daughters (integer part plus a random rounding).
9. **Punch a card** with the new state and event code, and go to the next card. A card with q greater than 1 is read once and run q times.

### Random numbers (a)

Not read from cards. A **middle-square generator on ENIAC itself**: square the n-digit number xi, keep the middle n digits as both the next xi and the supply of random digits (**n = 8 in the first run, 10 in the second**). Von Neumann's stated reason is that the machine was faster at producing numbers than reading cards (letter of 3 Feb 1948, in MCA section 2.3). Only about 2,000 (first run) or just over 3,000 (second run) squarings had been statistically tested, so a "special" card re-seeded xi after that many squarings (first run), or a count order halted the machine (second run). The last xi travels on each neutron card (columns 41-50). The seed was set by hand on constant-transmitter register J (SRC Table 2: `5879009876`; K = `1000000200` for the initial zone/direction values).

### Outputs, and whether k or criticality was an output (a/b)

- The output is **a deck of punched cards**, one per period of life. They were sorted on an IBM sorter into absorbed/escaped, census and fission piles (first run), and analysed afterwards at Los Alamos for the distribution of neutrons and fissions in time and space.
- **Criticality was inferred, not printed.** AR p. 5: the census stack was duplicated "if the stack had decreased ... when the assembly was under-critical" and thinned "if the stack had increased ... related to the assembly being critical or super-critical." H14 notes that tracking the population (alpha) was something ENIAC "did not itself track". **No k-effective, no alpha, no running total came out of ENIAC.**
- The census structure: first run, a stack of **exactly 100 cards** per census period (restored by hand-duplicating or discarding), T = 1 shake set on a constant-transmitter switch and raised by hand after each period. Second run: no fixed stack, surviving neutrons given weight 2 (doubling the sample), periods handled inside the program, census length 8192 in units of 10^-4 shakes.

### The converter / stored-program set-up (b)

- ENIAC was **converted in early 1948** (Metropolis completed the initial reconfiguration; H14 p. 54) so that it could run code in the "modern code paradigm": orders and arguments in an addressable store, conditional and unconditional jumps, index-style address modification, a closed subroutine called from two places (random-number refresh), and instructions and data in one address space.
- For the first run ENIAC "was set up to implement a code providing **79 instructions**" (H14 p. 55). The conversion planning for the "60 order" and later codes belongs to the companion article "Engineering 'The Miracle of the ENIAC'", **which I did not read**.
- **Program memory = the first two function tables**; the **numeric data (cross-sections, radii, densities) sat on function table 3**, changed per problem (AR p. 7; H14 p. 54). Each function-table line holds **six two-digit order codes** (SRC section 2); function tables have 104 rows of 12 digits and two signs (MCA section 3).
- The second-run listing: rows -2, -1 and 12-99 of FT1 and rows -2 to 96 of FT2, about **2,208 digits, about 840 instructions**, 28 handwritten pages (H14 p. 56). Code variants were chosen by hand-setting "a handful of transfer addresses" before starting.
- Accumulator use: 20 accumulators, with data fields packed into subfields (SRC Table 3); cards printed from eight accumulators wired to the punch (AR).

### Card counts, run times, number of problems and runs (b, with discrepancies)

| Item | Figure | Source | Tag |
|---|---|---|---|
| Runs | three: "first" (spring 1948), "second" (Oct-Nov 1948), "third" (1949, not described) | AR p. 1, H14 p. 54 | a/b |
| First run, calendar | first production run 17 Apr 1948; real work from 28 Apr; "all over" by 10 May. Poster page says March-April | H14 p. 54; poster page | b |
| First run, effort | von Neumann to Ulam, 11 May 1948: "ENIAC ran for 10 days. It was producing 50% of these 10x16 hours, this includes two Sundays and all troubles .... It did **160 cycles** ('censuses,' 100 input cards each) on **7 problems**." | H14 p. 55 (quoting the letter) | b |
| First run, output | "a total output of **over 20,000 cards**" (letter of three days later) | H14 p. 55 | b |
| Second run | Klara von Neumann at Aberdeen from 18 Oct 1948, production from 22 Oct, series done by about 7 Nov. The article says "about **105** cards were produced in three weeks" (letter of 18 Nov) | H14 pp. 55-56 | b/c |
| Input per period | 100 cards (first run); about 20 virgin cards for critical cases (second run) | AR pp. 4-6 | a |
| Planning estimate | 100 neutrons read, punched and sorted once: "about 3 minutes", so 100 stages "about 5 hours" | von Neumann, 1947, MCA section 1 | b |

**The "roughly a million punched cards" claim is not supported.** The best-sourced figures are **over 20,000 output cards for the first run** (consistent with 160 periods x 100 cards = 16,000 input cards, each producing at least one output card) and an order of **10^5 cards** for the second run. The second figure is printed "105" in the PDF text; this is almost certainly 10^5 with the superscript lost in extraction, and 10^5 is also the figure Wikipedia gives for Klara von Neumann ("100,000"), but I could not check the printed page. **Treat 10^5 as likely, unconfirmed, and a million as unsupported.**

### Open discrepancies in the sources (all (c) until resolved)

- First run: **six problems** (AR p. 7, MCA) against **seven** (von Neumann's letter, H14). Fitzpatrick (via H14) also says "seven calculations in spring 1948".
- AR's introduction dates the runs "March-April and October-November **1949**", and H14 says the series finished "7 November **1949**"; the documents' own context (Oct-Nov 1948, 3rd run in 1949) says 1948. Typographical errors; do not copy dates from those two sentences.
- Poster page: "March and April 1948"; H14: first production run 17 April. Use April-May 1948 for the production runs.

## 2. Simulator tests

### 2.1 What was built and how it was run

- Binary: `build/darwin-arm64/eniac-core` (the patched pinned core: 0001-0003). Copied, with `build/upstream/programs/` and the `*.card` files, to a scratch directory. Nothing under `src/`, `missions/`, `patches/`, `upstream.lock` or `build/upstream` was touched; nothing was added to git.
- Run method: the documented headless way, commands on stdin, no `-v` display child, `f p FILE` to capture punched cards. A small driver (`/private/tmp/claude-503/-Users-nickd-Workspaces-vcf/e49484a1-81c6-4a89-9820-129e12ddb964/scratchpad/drive.sh`) pipes commands with optional sleeps.
- Test programs (all mine, in `.../scratchpad/run/`): `midsq1.e`, `midsq2.e`, `dec.e`, `f_2.e`, `f_4.e`, `f_7.e`.

### 2.2 What the upstream documentation and code say about the stored-program mode

| Question | Finding | Tag |
|---|---|---|
| Converter or stored-program code upstream? | **No.** `grep -i "converter\|stored.program\|modern code\|order code"` over `src/`, `programs/`, `doc/`, `README.md`: no hits. README: the simulator "covers all of the functionality as originally constructed at the University of Pennsylvania. Future plans include implementing the enhancements that were made at the Ballistics Research Lab" | a (code) |
| Function tables | 3 tables; switch panel rows **-2 to 101** (the 104-row real size), 6 digits plus sign per A and B side per row (`doc/ref.tex`); arg input, A and B outputs, C/NC pulses, 11 programs each. Loaded one switch per command line: 13 `s` lines per half-row, about 2,700 lines to fill one table | a |
| Order decoding | Only through the digit-program adapter (`dp`), which turns "digit position k is non-zero" into a program pulse (`adapter.go`, `digitprog`), as in `turing.e` and `fttest2.e`. There is no two-digit order decoder and no program counter | a |
| Constant transmitter | 8 card words A-H (10 digits each, read by `proccard`, 80 columns) plus manual J and K; 30 selectors; program in/out per selector. Matches the 1948 card layout (SRC Table 2: registers A-H, hand-set J and K) | a |
| Card reader | `f r FILE`, one line per card, **one card per 375 ms** (`initiate.go`); punch to `f p FILE`, **about 600 ms per card** (150 ms + 450 ms phases). Printer feeds from a13-a20 plus 5 digits of the Master Programmer, 16 fields of 5 digits | a |
| Divider and square-rooter, multiplier | Present (`divsr.go`, `mult.go`) | a |
| Ring and program controls | Master Programmer with steppers and decade counters (`mp.go`), cycling unit `co`/`1a`/`1p` | a |

### 2.3 Test A: plugboard-wired card-fed step (works, with caveats)

Program `midsq2.e` (my file): reader output starts the constant transmitter (selector A, left+right) and loads accumulator 1 with the card word; the multiplier is started by the constant transmitter's program output, both operands come from accumulator 1; when the multiplier's program output fires, the printer is triggered and punches the accumulator 13 digits. Card `midsq1.card` has `1234567891` in field A.

```
> l midsq2.e     > b c     > b r     (wait 5 s)     > d a13
 P 0152415781 0000000000 0 000000000000
punch file midsq2.out (80 columns, spaces shown as dots):
.....0152415781.................................................................
```

- **Card in, multiply, card out works, unmodified.** Exact square is `01524157877488187881`, so the top ten digits should be `0152415787`.
- **The top ten digits are one unit low in the last place** (`...781` for `...787`; `1111111111` squared gives `0123456789` where exact truncation gives `0123456790`; `3` and `300000` are exact). I do not know if this is faithful hardware behaviour of the high-speed multiplier or a wiring error in my test (I took the multiplier set-up from `ref.tex` and `multtest.e`). **Do not assume either; ask Stuart.**
- **The low half of the product was not recovered** in the time box. Variants of the product-disposal switch (`A`, `AC`, `AS`, `0`) left the same value in a13, and a11 held a residual (`0000045936`). The middle-square step needs digits 6 to 15 of the product, so **the random-number generator is not demonstrated end to end.** The 1948 code did this with shifts and deleters (the real second run used rotation orders on xi), and `ad.s` and `ad.d` adapters exist upstream, so it is probably wiring work, not a missing capability. Tag (c).
- Not run: a random-digit walk with several decisions per card. Its pieces (card in, multiplier, sign tests via adapters and the Master Programmer, card out) all exist in programs that run (`trajdemo.e`, `sieve.e`, `turing.e`), but I did **not** assemble them.

### 2.4 Test B: function table as program memory (decoding works, program counter not built)

Program `f_7.e` (my file, based on the working `fttest.e` wiring): accumulator 1 is a "program counter" holding 12, which selects row 12 of function table 1. Row 12 has digit 1 set in its units position (the "order"). The row's A output goes to a digit-program adapter; adapter output 1 advances Master Programmer stepper A, and that stepper's output 1 triggers accumulator 14 to add a constant.

```
> l f_7.e   > s cy.op co   > b i   (wait 1 s)   > d a13   > d a14   > d p
 P 0000000001 0000000000 0 000000000000        <- a13: the row's data word (0000000001), as fttest.e
 P 0000000012 0000000000 0 000000000000        <- a14: constant added because the row's digit 1 was non-zero
 1000000000 10000000000000000000 0000000000    <- Master Programmer stepper A advanced
```

- **A row digit selecting an action through the Master Programmer works on the unmodified core.** That is the plugboard analogue of "read an order, act on it", the idea behind `turing.e`.
- Wired straight from the adapter to the accumulator and constant transmitter program inputs (`f_4.e`) it did **not** work: the stepper advanced but a14 stayed 0. Going through the Master Programmer is what works.
- `turing.e` loads and runs (one INIT moves its head pointer, a12 = 1) and uses function tables as a transition table, so a *table-driven* machine is demonstrated upstream.
- **Not built:** auto-increment of the program counter (loop over rows) and a halt order. `turing.e` has that kind of loop and shows it is possible. I did not finish it.
- **Stability:** in three of my wirings (`dec.e` variants, `f_6.e`) the core hung until killed by the 15 s timeout. The kiosk's stall guard would catch that, but it means a new mission's wiring needs soak testing like `sieve.e` got (S3).

### 2.5 Summary of what runs

| Capability | Result |
|---|---|
| (a) Plugboard random-digit walk fed from the card reader | **Partly.** Card in, multiply, card out: yes. Middle-square digits: not obtained. Full walk with decisions: pieces exist, not assembled |
| (b) 1948 converter-style stored program (79 orders, jumps, subroutine, function tables as program memory) | **No.** No converter upstream. Only a hand-built row-decoding plugboard exists, with at most a handful of orders and no address arithmetic |

**Smallest honest program for each:**
- (a) A 1946-mode step: card in (xi, one state word), square, keep the middle digits as xi, compare with a threshold set on a manual switch, punch one of two outcome cards (absorbed or scattered) with the new xi. About 150 to 250 lines of `.e`. Labelled as a plugboard sketch of **one** neutron step.
- (b) There is none on the pinned core. Adding a converter-style fetch/decode/jump unit needs Go changes to the core.

## 3. Options

| | P-lite: plugboard step | P-full: whole method as plugboard | F: 1948-faithful converter mission |
|---|---|---|---|
| What the visitor sees | One neutron step, 1946 style, card in and out | The whole chain with census and fission | The real two-digit order code run from the function tables |
| True to 1948? | **No** (the 1948 team had given up plugboard for this problem) | No, and probably does not fit (von Neumann's own 80-90 percent estimate for the *smaller* 1947 plan) | **Yes**, if the converter and 79-order code are modelled and the real listing is loaded |
| Needs core change? | No | No | **Yes**, a new unit in `src/` (or a fork of upstream), and the pin/patch policy (NFR-12, FR-24 "unmodified upstream .e") would need amending |
| Effort | 4 to 6 days (wiring and middle-square, 8-digit like run 1; mission YAML; goldens; fact-check) | Not estimated; I would not attempt it | **4 to 8 weeks**, mostly core work: converter model, 840-instruction load (about 2,700 `s` lines per table or a bulk loader), validation against SRC's annotated traces, then the mission on top |
| Fidelity risk | High: an honest label contradicts the brief | High | Medium: sources are good, hardware details of the converter are a documented gap here (see risks) |
| Needs Stuart? | Questions only | Questions only | **Yes**: permission (R1) and probably collaboration |

## 4. Risks

1. **No converter, no stored-program mode upstream.** Anything 1948-faithful needs core changes, which breaks the "as-is, do not fix" and FR-24 principles unless Stuart agrees to carry it. (a)
2. **Source gaps.** The first-run code is lost; the second-run code survives. The 9 Dec 1947 flow diagram is an image I did not read. The converter's electrical behaviour (order decode, timing in add times) is in the companion paper and book that I did not read; a model needs it. (b)
3. **Result trust.** Von Neumann noted in 1949 that Problem 4 of the second run was wrong and had to be repeated (H14 p. 57). A mission that claims numbers must not present ENIAC's physics output as truth about real bombs. (b)
4. **Multiplier last-digit discrepancy** in Test A is unexplained; a middle-square generator is sensitive to it. (c)
5. **Core hangs** under unusual wirings (Test B), and the card reader runs at 375 ms per card, so 100-card census stacks take over 40 s of reading alone before punching (about 600 ms per card for the punch). A mission would show a handful of cards, not a census. (a)
6. **Sensitivity.** The topic is nuclear-weapon design history. The 1948 problems are publicly documented in the Haigh papers and the data are 1940s, but wording needs the Fact-Checker and Doug. (c)
7. **Copyright:** the flow diagrams and listings are reproduced by permission of Marina von Neumann Whitman. Using their images on the kiosk needs its own permission. (a)

## 5. Fact-check items a mission would carry

| # | Item | Status |
|---|---|---|
| 1 | The video's **k** explanation is a general-physics gloss. In the 1948 papers **k is the velocity-interval index (0 to 9)**; the multiplication factor was never an ENIAC output. Say "the team watched whether the stack of cards grew or shrank", not "ENIAC computed k". | AR pp. 5-6, MCA (a/b) |
| 2 | Runs were **April-May 1948 (first) and Oct-Nov 1948 (second)** at the **Ballistic Research Laboratory, Aberdeen**, on the **converted** ENIAC, not at Penn, not in 1945-46 and not "Manhattan Project proper". The first ENIAC problem (Dec 1945) was a different calculation for Los Alamos. | H14 pp. 43, 54 (b) |
| 3 | **Klara von Neumann** and **Nick Metropolis** did the running at Aberdeen; John von Neumann visited. Klara coded and ran, with Metropolis. Do not credit her with the weather calculations or the Wikipedia "100,000 cards" story. The ENIAC in Action authors rebut that elsewhere. | H14 p. 54, conclusions; search result (b) |
| 4 | **Goldstine's role in these runs is unconfirmed.** Herman and Adele Goldstine investigated the *1947 plugboard set-up* and Adele worked on Hippo; neither is documented as running the 1948 Monte Carlo. | H14 p. 46 (b); (c) for 1948 |
| 5 | Card numbers: "over 20,000 cards" (first run) is quotable; "about a million" is not; the second-run figure is probably 10^5 but unchecked. | see section 1 |
| 6 | Random numbers were produced **inside ENIAC** by squaring and taking the middle digits, **not read from cards**. | AR p. 21-22 (a) |
| 7 | ENIAC "first stored-program"/"first closed subroutine" claims: H14 hedges ("we believe"). Keep their hedge. | H14 (b) |
| 8 | Run counts: 160 cycles of 100 cards on 6 or 7 problems in about 10 days; the 6/7 split is an open discrepancy. | (c) |
| 9 | Do not print the typed "1949" dates in AR's intro or H14's "7 November 1949". | section 1 (c) |
| 10 | Fission-weapon context: the first set of calculations were "primarily for the purpose of checking techniques" (Metropolis, via Fitzpatrick); the second included "actual weapons calculations" (uranium-hydride core, "Zebra"). Choose wording with Doug. | H14 pp. 54-55 (b) |

## 6. Recommendation, and what to ask Stuart

**Recommendation.** Do not start a Monte Carlo mission on the pinned core as-is. It cannot be 1948-true, and a plugboard version would show the machine doing the job in a way the 1948 team had abandoned. If the story matters for the museum, choose between:

- **Wait and ask (recommended).** Add the questions below to the already-drafted permission and bug-report email (still a draft; Nick sends it). If Stuart says a converter model is planned, available or welcome as a contribution, scope option F as a new spike (S6) with Priestley and Haigh's annotated traces as the test oracle.
- **P-lite, clearly labelled**, only if Nick explicitly accepts a 1946-mode "one step of the method" sketch. 4 to 6 days. The on-screen text must say it is a plugboard sketch of one step, because that is not how the 1948 runs were set up.
- Meanwhile, the **story without the simulator**: a static card-flow explainer (reader, sorter piles, census) from the Haigh materials, with the permissions above, costs no core work.

**What to ask Stuart** (nothing has been sent; the S3 draft is still Nick's to send):
1. Is there any converter / modern-code-paradigm model, or work in progress, for the BRL-era enhancements? Would he welcome one as a contribution, and on what terms (license, patch route)?
2. Is the multiplier's top-ten-digit product meant to truncate in the last place (for example `1234567891` squared giving `0152415781`), and what is the right wiring to get the low ten digits for a middle-square step?
3. Do deadlocks under odd wirings (digit-program output straight to accumulator program inputs) match what he has seen?
4. Does he know whether Priestley or Haigh already have an executable converter emulation? (My recollection that such a thing exists is unverified (c); better to ask them than to assume.)
5. The permission request for the kiosk (R1), unchanged.

Also worth asking Haigh/Priestley (not yet contacted): whether the converter's order-decoding timing is documented in the Annals companion paper, and permission to use the flow-diagram images.

## Files

- `docs/spikes/S4-monte-carlo-feasibility.md` (this report; the only repo file added)
- Scratch (not in the repo): `/private/tmp/claude-503/-Users-nickd-Workspaces-vcf/e49484a1-81c6-4a89-9820-129e12ddb964/scratchpad/` with `run/midsq1.e`, `run/midsq2.e`, `run/midsq1.card`, `run/midsq2.out`, `run/dec.e`, `run/f_2.e`, `run/f_4.e`, `run/f_7.e`, `drive.sh`, and the downloaded PDFs (one directory each, `dl_*`) with their extracted text `ActualRunning.txt`, `MonteCarloComputationAnalysis.txt`, `MonteCarloSecondRunCodeReport.txt`, `haigh.txt`.
