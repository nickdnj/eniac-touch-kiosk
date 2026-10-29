# Manhattan Project / Los Alamos mission: fact-checked brief

**For:** Nick. **Date:** 2026-10-29. **Status:** research, not kiosk copy. Builds on `docs/spikes/S4-monte-carlo-feasibility.md` (S4) and uses the style of `docs/trajectory-history.md`. Not redone here: the 1948 run structure, card counts of the Monte Carlo runs, the "k is not an ENIAC output" point.

Tags: **[V]** verified primary or scholarly, **[S]** secondary, **[C]** conflicting, **[U]** unverified. I read the full text of every source marked "read"; the rest are marked "snippet only" or "could not open".

## 0. Short answer

1. **The Manhattan Project itself did not use ENIAC.** The war ended in September 1945 and ENIAC was not finished until late 1945. Wartime Los Alamos computing was people, desk calculators and IBM punched-card machines [V: Lewis, "Trinity by the Numbers", LA-UR-20-30196, read].
2. **ENIAC's first real job was a Los Alamos problem, December 1945 to early 1946.** It was a simplified, one-dimensional model of whether a thermonuclear ("Super") fusion reaction would ignite. It was not about uranium or critical mass, and it was not a Monte Carlo run [V: Haigh, Priestley and Rope 2014, read; Metropolis 1987 interview, read].
3. **The "million cards" claim is not supported.** It traces to one secondary article (see section 1.4). Metropolis himself, asked about "very large numbers of punched cards", did not endorse it. Do not print it.
4. **Uranium and neutron-chain work was ENIAC's second Los Alamos job, in 1948,** after it moved to Aberdeen and was converted. That is the Monte Carlo work in S4. It modelled neutrons in a *hypothetical* assembly. It did not compute "how much uranium a bomb needs", and it was postwar.
5. **A real executable converter-mode emulation does not appear to exist publicly.** Closest finds: an unfinished GPL assembler (hallorant/eniac) and a chess VM on top of Stuart's simulator (jeredw/eniac-chess).
6. **Correction to the brief:** the "60-order code" was *never installed* on ENIAC. The converter-era code ENIAC ran in April 1948 was the **79-order** code, later the 100-order (84 distinct) code [V: Haigh, Priestley and Rope, "Engineering the Miracle of the ENIAC", Annals 36(2), 2014, read].

## 1. The December 1945 "Los Alamos problem"

### 1.1 What the sources agree on

| Fact | Source | Tag |
|---|---|---|
| It was ENIAC's first actual problem, "run in late 1945 and very early 1946", "not a Monte Carlo simulation"; "a greatly simplified model of the ignition of a fusion weapon" | Haigh, Priestley, Rope, "Los Alamos Bets on ENIAC", IEEE Annals 36(3), 2014, p. 43. Free PDF: https://www.tomandmaria.com/Tom/Writing/LosAlamosBetsOnENIAC.pdf (read) | V |
| A Los Alamos team "had taken control of ENIAC for several weeks from the end of 1945, before it had even been declared fully operational" | same, p. 45 | V |
| Start date 10 Dec 1945 ("Problem A, 12/10/45" in the service log, per APS News; also quoted in the Honeywell v. Sperry Rand finding) | https://www.aps.org/apsnews/2022/11/eniac-first-top-secret-program (HTTP 403 to me; snippet only); https://en.wikipedia.org/wiki/ENIAC (read) | S |
| Von Neumann proposed it as a stiffer test of ENIAC than firing tables; Frankel and Metropolis (with Anthony Turkevich) did the work; Metropolis said it used about **95% of ENIAC's controls** against 20-25% for firing tables | Metropolis, "The Beginning of the Monte Carlo Method", Los Alamos Science special issue 1987, pp. 125-130, https://mcnpx.lanl.gov/pdf_files/Article_1987_LAS_Metropolis_125--130.pdf (read); Metropolis interview OH 135, Charles Babbage Institute, 29 May 1987, https://conservancy.umn.edu/server/api/core/bitstreams/0febae83-9953-48aa-b626-8637433d52de/content (read) | V |
| What it modelled: "one dimension in space and one dimension in time, ... some of the thermonuclear possibilities", with many assumptions to fit ENIAC | Metropolis OH 135 | V |
| Fitzpatrick: only the **ignition** part of the Super problem ran on ENIAC (ignition of a deuterium cylinder, depending on initial temperature distribution and tritium concentration); the propagation part did not. Ignition depends on reaching a critical temperature, "not on assembling a critical mass" | Fitzpatrick, "Teller's Technical Nemeses", Society for Philosophy and Technology 3(3), 1998, https://scholar.lib.vt.edu/ejournals/SPT/v3n3/FITZPATR.html (read, via fetch summary) | V/S |
| Results reviewed at Los Alamos in spring 1946 (Teller, Fermi, von Neumann, Bradbury attending); "cause for guarded optimism" | Metropolis 1987, LAS | V |
| Afterwards ENIAC was announced publicly, 15 Feb 1946 | Lewis, "Neutronics Calculation Advances at Los Alamos", LA-UR-21-22202, https://arxiv.org/pdf/2103.06260 (read) | S |

### 1.2 What was computed, honestly

- **Physics:** time-dependent, one-space-dimension energy-and-reaction behaviour of a hot deuterium (and tritium) mixture, to see whether a self-sustaining fusion burn would start. Cycle by cycle, ENIAC advanced the state at each space point by one time step. Metropolis: "each cycle represented the state of the solution at that moment ... in space for a given time interval" [V].
- **Equations and inputs are not public.** Haigh states the work "remains classified" and that he had to rely on Fitzpatrick because Los Alamos sources were closed to him (SIGCIS thread, snippet only: https://lists.sigcis.org/archives/list/members@lists.sigcis.org/message/P2VP3VPHOZMNZPJEVQGEYDBXTHSEIEO3/) [S/U]. The first runs were deliberately simplified so the machine's classification could drop [S, LA-UR-21-22202]. **No listing, plugboard diagram or set-up sheet for it has been found.** I found no declassified LA- report that gives ENIAC set-up detail [U].
- **Not Monte Carlo, not critical mass, not uranium.** Anyone claiming it was needs a source.

### 1.3 Data in and out, time taken

| Item | What is documented | Tag |
|---|---|---|
| Medium | "punched card inputs and punched card outputs"; initial conditions were punched on cards by hand | V (Metropolis OH 135) |
| Rate | output punch ran at about a second per card; one pass over the space points about a minute; demos were run slowed to "the speed of the Mark I" | V (same) |
| Weeks of running | "several weeks" (Haigh p. 45); "six weeks in December 1945 and January 1946" (Rhodes, *Dark Sun*, 1995, p. 251, via Wikipedia, book not opened) | V / S |
| Metropolis on the "six weeks" and "very large numbers of cards" | The interviewer calls these "journalistic accounts, of which I'm somewhat skeptical". Metropolis does not confirm either figure | V |
| Plugboard set-up | Metropolis: "95% of the controls". It was the **unconverted, 1945 wired ENIAC** (the converter arrived 15 March 1948) [V: Engineering the Miracle, read]. Cabling detail unknown | V / U |

### 1.4 Where "a million cards" comes from

| Version | Source | Tag |
|---|---|---|
| "The 'Los Alamos problem,' filling one-million punched cards, ran on the ENIAC in December of 1945" | N. Lewis, "Trinity by the Numbers", Nuclear Technology 2021 (LA-UR-20-30196), https://arxiv.org/pdf/2103.06211. Refs 34, 23, 10, 13 sit on the sentence before; I could not map them to a card count (read) | S |
| "about a million punch cards over several weeks" | michalbrennek.github.io blog, April 2026 (search snippet only; it is not a scholarly source) | S |
| "half a million", with others saying a million | a Wikipedia-derived page seen in a search snippet, not opened | C/U |
| Contradicting the order of magnitude | Metropolis: a card per second at the output, a minute per pass. One minute per pass over several weeks does not need millions of cards on its face, and the interviewer's own doubt stands | V |
| Scholarly sources (Haigh, Fitzpatrick, Metropolis) | give no card count | V |

**Verdict: [C]/[U], leaning wrong.** It is a repeated journalistic figure, now picked up by one reputable-looking Los Alamos review. A rough check: ENIAC could hold 80 characters per card, and cards cycled through ENIAC at about one a second (the punch is the slow part; ENIAC's reader could do roughly 120 cards a minute and the punch about 100 [U: from general ENIAC specs, not checked against a primary page here]). A million output cards at one a second is about 11.6 days of continuous punching, so "several weeks" is not impossible by arithmetic. The arithmetic does not make the claim true; it only means it cannot be dismissed by arithmetic alone. **Safe wording: "a very large stack of punched cards, with no reliable count"**.

## 2. Uranium and critical mass: what is true

| Nick's belief | Evidence | Correction |
|---|---|---|
| ENIAC was used by the Manhattan Project | Manhattan Project computing was human computers plus IBM tabulators (Lewis 2021); Trinity (July 1945) predates ENIAC | ENIAC was used by **Los Alamos** after the war's end, for the Super (Dec 1945) and for neutron Monte Carlo (1948). Los Alamos was the Manhattan Project's lab, which is where the link comes from |
| to compute uranium quantities | The Dec 1945 run was fusion ignition (deuterium/tritium); Fitzpatrick: "not ... a critical mass". The 1948 runs modelled a spherical assembly of concentric zones of fissionable material, tamper and moderator, tracking neutron absorption, scatter, escape and fission, and watched whether the neutron population grew or shrank (S4; Haigh 2014 pp. 44-52). The first set was "primarily for checking techniques"; the second included actual weapons calculations (S4 item 10) | It studied **how neutron chains behave** in a given geometry, which bears on criticality. It did **not** output "kilograms of uranium needed". Material quantities were inputs for each problem, not an answer |
| a million cards | section 1.4 | Not supported. The Monte Carlo figures are "over 20,000" output cards for the first run (S4) |
| One ENIAC uranium-adjacent paper | Frankel and Metropolis, "Calculations in the Liquid-Drop Model of Fission", Phys. Rev. 72(10), 914-925, Nov 1947: Bohr-Wheeler liquid-drop model of a fissioning nucleus studied "with the use of an electronic calculator, the Eniac" (abstract seen via Scilit/Zhenzhi snippets: https://scilit.com/publications/18562e8372f780e899e396d61e42c26d; full text not opened) | This is the one **published** Metropolis-Frankel ENIAC paper that concerns uranium nuclei: energy of deformed drops and fission thresholds. Nuclear physics, not bomb mass. Whether it ran on the Penn or the Aberdeen machine I could not establish [U] |

Polite framing for Nick: "You're right that ENIAC worked for the people who built the atomic bomb, and that neutrons and fission were the heart of its second Los Alamos job. The dates and the question are different from what the story usually says."

## 3. Existing implementations and oracles

| Item | URL | Licence | Language | What it can do | Tag |
|---|---|---|---|---|---|
| Stuart's ENIAC simulator (our pinned core) | https://github.com/blstuart/eniac-simulator (active, pushed 2026-10-25, 44 stars) | **none declared** (API: `license: null`; matches NOTICE.md) | Go | Pulse-level 1945 ENIAC as built at Penn. No converter (S4 grep) | V |
| jeredw/eniac-chess | https://github.com/jeredw/eniac-chess | CC BY 4.0 | Python, C++, ENIAC asm | A patch assembler, a *software VM built from ENIAC function tables*, a fast VM emulator `chsim`, and a pulse-level `eniacsim` derived from Stuart's. It is **not** the 1948 converter code. Shows a VM can run on the plugboard core (relevant to a purpose-built VM, section 6) | V (README read) |
| hallorant/eniac | https://github.com/hallorant/eniac | GPL-3.0 | C (autotools) | "Assembler and simulator for the 1948 ENIAC Converter Code". 17 commits, last 2021-07-04; src has only lexer, assembler stub (`easm.c`), log; commit "Starting to add orders from the conversion code". Looks **unfinished**; the README says only an assembler. I did not build or run it | S/U |
| Zuse-Institut Java ENIAC simulation | https://zuse-z1.zib.de/simulations/eniac/index.html (not opened; snippet only) | unknown | Java | Original-configuration ENIAC, not converter | U |
| Priestley/Haigh executable emulator | no public one found. Their material is documentation | n/a | n/a | None found | U |
| Tim Robinson's ENIAC simulator | **nothing found** in several searches | n/a | n/a | Cannot confirm it exists | U |
| Python/JS/Go/Haskell converter emulators, 1945 Super code | **none found** | n/a | n/a | None | U |

### Primary listings usable as oracle

All free at https://eniacinaction.com/the-book/supporting-technical-materials/ (read; the site's `/docs/` directory itself returns 403, so link files individually):

- BRL Technical Note 141, *Description and Use of the ENIAC Converter Code* (Fritz, 1949), and BRL Memorandum Report 582 (1951): the converter instruction set, transcribed with errata. This is the specification a converter-mode emulator would be built from.
- Adele Goldstine's 1947 conversion plan (retyped).
- "Monte Carlo Second Run Code, archive version" (von Neumann papers, LoC box 12 folder 5), the Priestley/Haigh "Second Run Code Reconstruction and Analysis" (annotated transcript, about 840 instructions), "Monte Carlo Computation Analysis", Klara von Neumann et al "Actual Running of the Monte Carlo Problems" (1949), the 9 Dec 1947 flow diagram, and a redrawn second-run flow diagram by Priestley.
- **Test oracle:** the annotated transcript plus the Actual Running report give a worked card layout and the register contents. There is **no machine-readable trace** I could find. An oracle would have to be built by hand-tracing a few neutron histories.
- No listing of the Dec 1945 Super program exists in public archives that I found.

## 4. Reuse and permissions

| Material | Status | Tag |
|---|---|---|
| Von Neumann papers items (flow diagrams, second-run code, Actual Running) | Site says "Reproduced with permission of Marina von Neumann Whitman" for the website's own use. **That permission is for the website; it does not pass to us.** Ask Haigh/Priestley and the family (or LoC) before putting images on the kiosk | V (site text) |
| Priestley/Haigh reports and the Annals papers | Copyright the authors / IEEE. Haigh hosts PDFs on tomandmaria.com. Quote briefly with credit; do not mirror or reproduce tables/figures without asking | S |
| BRL TN 141 and MR 582 | US Army report, so probably public domain, but the website's *transcriptions* belong to the authors [U]. Use the original scans if available | U |
| Stuart's simulator | No licence; our NOTICE.md already handles this. R1 permission still outstanding for kiosk use | V |
| eniac-chess (CC BY 4.0), hallorant (GPL-3.0) | Can be consulted; GPL code cannot be copied into the MIT repo | V |
| Metropolis CBI interview | Copyright Charles Babbage Institute; a short quote with credit is fine | V |

## 5. Sensitivity and what Doug will want sourced

**Safe and good for eighth graders:** the story of the *computer*: a machine built to calculate artillery tables was first used for a problem nobody could do by hand; a stack of punched cards carried the state of the calculation; engineers ran a demo at "Mark I speed" to show the difference between a second and a minute; the 1948 team turned it into a programmable machine and used it to *play out a chain of random events, one neutron at a time*; Klara von Neumann and Nick Metropolis ran it; the method (Monte Carlo) is now used in medicine, weather, games, finance.

**Avoid:** fusion/fission weapon design parameters; the word "bomb" as an objective of a game; critical-mass numbers, material compositions, "Zebra" and the uranium-hydride core; any instructions that could be read as a recipe. The public papers are 1940s and openly cited, but the kiosk should show a *generic* neutron, an invented material ("material X"), invented numbers, and say so. Stay with "nuclear research" and "atomic physics" language rather than weapons detail.

**Suggested framing:** "In 1948 scientists at Los Alamos had a question about how neutrons behave in a chain. They couldn't do the sums by hand, so they used ENIAC to play it out like a game of chance, thousands of times. This is a made-up material with made-up numbers, but the steps are the real ones."

**Doug will want:** (1) every date and name with a citation (our `docs/fact-check.md` pattern); (2) a statement that *this is not the actual 1945 or 1948 program*; (3) no "million cards" and no "Manhattan Project used ENIAC"; (4) permission trail for images; (5) a note that Problem 4 of the second run was wrong and had to be repeated (Haigh p. 57, via S4), as an honest-limits point; (6) correct year (1948, Aberdeen), correct names (not Goldstine for these runs).

## 6. Three mission concepts

| | A. "Life of a neutron" card-flow story | B. Census game: does the stack grow or shrink? | C. The 1945 PDE run |
|---|---|---|---|
| Idea | Walk one card through reader, random draw, zone lookup, collide or escape, punch. 6-9 steps, each with the real ENIAC unit named | Visitor holds a deck of cards (neutrons); each round the dice decide absorb, scatter, or fission (more cards). Count the stack: did it grow or shrink? That is how the 1948 team judged "critical" | Re-create "one time step of a one-dimensional heat/energy problem" with cards carrying the state at each position |
| Runs on the real pinned core? | Partly. Card in, multiply (square), card out works (S4 Test A); middle-square digits and decision logic do not. **A truthful claim is "the machine is real, the chain logic is animated"** | **No** for the whole game. The decisions need the converter-style program | **Partly**: a PDE step is plugboard-friendly (it is how ENIAC was used in 1945; compare our Trajectory mission, `trajdemo.e`). But the real equations and set-up are classified and absent |
| Needs purpose-built converter emulator? | No (it is a story with real ENIAC clips and the S4 wired step) | Optional: a JS/Go toy is enough if labelled "Monte Carlo as the 1948 team did it, not the real code" | No |
| Honest label | "Animation of the real method. Not ENIAC's 1948 program." plus one real ENIAC square-and-punch demo | "A game that follows the same census idea. Not ENIAC's program." | "Plugboard-style teaching problem. The real 1945 problem and set-up are unpublished" |
| Fidelity risk | Low | Medium: risk of "ENIAC computed k" error (S4 item 1) | **High**: we would invent the physics and the set-up |
| Sensitivity risk | Low | Low if material is invented | Medium (it is *the* H-bomb calculation) |
| Rough effort | 3-5 days: copy, 2-3 screens, the wired step as in S4 P-lite (4-6 days if the middle-square wiring is included), fact-check rows, permission requests | 4-6 days for a self-contained game and fact-check; no core changes | 6-10 days, plus a permanent "we do not know" caveat |

**Purpose-built converter-mode emulator (for a faithful mission):** build from Fritz TN 141 and the second-run transcript. S4 estimated **4-8 weeks** (mostly the core: order decode, 1,460-instruction capacity, load tooling, validation). New fact: Clippinger's pulse-timing plans exist only for the *60-order* design that was never installed, so timing of the as-installed 79-order set-up must come from TN 141 and the Annals paper [U on completeness]. The unfinished hallorant assembler could shorten the assembler half, but is GPL. An alternative, cheaper "faithful in logic, not in pulses" Python/Go interpreter of the 79-order code could be done in **2-3 weeks** [U, my estimate] and could run the surviving second-run program on invented zones. That is a software reconstruction of ENIAC-the-computer, not the pinned Stuart simulator, and the screen should say so.

### Recommendation

**Build A first, with B as the touch interaction on top of it, as one mission titled "Playing out a chain of chances (1948)".**
- It tells the true, defensible story (Monte Carlo on the converted ENIAC; April-May 1948; Aberdeen; Klara von Neumann and Metropolis), uses real sources already read, and fits the "understanding is the goal" principle.
- Keep the physics generic; no weapon context beyond one honest sentence.
- Include one **real** simulator step (card in, square, card out) clearly labelled, so the pinned core is genuinely used.
- Do **not** build C: its inputs are unpublished and we would be inventing a famous classified calculation.
- Defer the converter emulator; revisit only after Stuart answers the S4 questions and Haigh/Priestley reply on permissions.
- Before any copy goes in, resolve the open sources: the Fritz TN 141 scan, Rhodes p. 251 and Fitzpatrick's cited Los Alamos documents (for "ignition run" wording), and the Lewis million-cards reference chain (ask the author which source he used).

## 7. What I could not open or verify

- APS News article (HTTP 403), Zuse-ZIB Java simulator page, eniacinaction.com `/docs/` index (403), the book *ENIAC in Action* and Rhodes's *Dark Sun* (not available), Frankel and Metropolis 1947 full text (abstract only), the SIGCIS thread (summary only), the 9 Dec 1947 flow diagram (image).
- Dates conflict: Frankel and Metropolis visited Moore School in **March 1945** (Metropolis 1987, LAS), **summer or August 1945** (LA-UR-21-22202; Wikipedia, Frankel). Physics Today (Seidel 1996) says a 1-D Super run was done "in the fall of 1944", which cannot be right for a machine not finished until late 1945 [C].
- Whether hallorant/eniac builds or runs anything: unchecked.
