# The real trajectory problem: what the Army asked for, and what ENIAC did

**For:** Nick (docent, kiosk owner). **Date:** 2026-10-03. **Status:** research note, not kiosk copy. The kiosk copy drafts are in section 6. Every new claim is also a row in `docs/fact-check.md`, group F.

**How to read the sources:** each claim ends with a key in square brackets, for example [BRL889 §II]. The keys are listed in section 8. Sources are split into **primary** (written at the time, by the people doing the work) and **secondary** (historians, memoirs written later, and our own reading of the code). Where sources disagree, the doc says so and does not pick a winner.

---

## 0. The short answer

**What did the ENIAC people get from the government?** They did not get "a spec" in the modern sense. The Ballistic Research Laboratory (BRL) at Aberdeen Proving Ground already had a fixed, decades-old method for making firing tables. ENIAC was built to do the slowest step of that method faster: computing shell paths ("trajectories") one small time step at a time [BRL889 §I–III; HPR-err]. The equations, the drag tables and the integration method all came from BRL practice. The very first ENIAC plan for a trajectory, drawn in January 1944, already uses them [PX-1-81].

**What were the variables?** For each trajectory the inputs were:

- muzzle velocity (how fast the shell leaves the gun)
- elevation (the gun's angle)
- the ballistic coefficient *C*, a number that says how well this particular shell pushes through the air
- a drag function, *G* (or *K*<sub>D</sub>), read from a table: how strongly air slows a standard shell at each speed
- air density with height, *H*(*y*), which falls off exponentially as the shell climbs
- gravity, *g*
- a time step, Δ*t*

The outputs were the shell's position (*x*, *y*), its velocity and the time, all printed along the way [PX-1-81; BRL889 §II–III]. Section 2 has the equations, in math and in plain words.

**Are there documents we can look at?** Yes, and several are free and public domain. The best are:

1. a real 1941 Army firing table book, with a column-by-column explanation [TM6-215]
2. Arthur Burks's January 1944 drawing "Setup of Exterior Ballistic Equations" for ENIAC [PX-1-81]
3. BRL's own 1954 description of how firing tables were made, with ENIAC's running times [BRL889]
4. the 1946 Curry and Wyatt report on the inverse-interpolation step that turned trajectories into table rows [CW46]
5. the 1946 *Report on the ENIAC*, Part I, which has two worked trajectory set-ups [R46-I §10.6]

The full list, with links and notes on reuse, is in section 4.

**How close is our Mission 3?** Brian Stuart's `trajdemo.e` uses the right method (Heun's method, a 0.02-second step), the right equations for a "normal" trajectory, and a drag table indexed by speed squared, just as the 1944 plan did. It simplifies two things on purpose: air density stays constant all the way up, and the drag table is his own reconstruction. Nobody has found a record of the real February 1946 demo set-up, and Stuart says so [Stuart21]. The card in our mission launches a shell at **1,550 ft/s and 22.5°**, and each punched card is **one second of flight** [Stuart21; our decoding in section 5].

---

## 1. What BRL needed: firing tables

### 1.1 What a firing table is

> "Firing tables contain data, pertinent to the application of fire, based on standard trajectories for each type of weapon and combination of projectile, fuze, and propelling charge." — *TM 6-215, Abbreviated Firing Tables*, War Department, 15 Dec 1941, ¶1 [TM6-215]

A gun crew cannot "just point" a howitzer at a target miles away. The shell flies in a high arc, and the air, wind, temperature and the exact shell all change where it lands. The firing table is a printed book. The crew looks up the range to the target and reads off the elevation to set, then adds corrections for the day's weather and ammunition [TM6-215 ¶1–5; BRL889 §III.A]. It was used by artillerymen, and also by the makers of ammunition and aiming equipment [BRL889 §III.A].

### 1.2 What is in one (the columns)

The 1941 manual explains Table A for the 75-mm gun column by column [TM6-215 ¶5a]. In plain words:

| Col. | What it gives | Plain words |
|---|---|---|
| 1 | Range, every 100 yards | How far away the target is |
| 2 | Elevation in mils | How high to point the gun |
| 3 | Fork | How much to change the aim to move the shots by "four probable errors" |
| 4 | Change in elevation for 100 yards more range | A fine-tuning number |
| 5 | Yards per mil | How far one mil of aim moves the shot |
| 6 | Time of flight to the level point | Seconds in the air (also used to set the fuze) |
| 7, 8 | Probable error in range and in deflection | How much shots scatter, long-short and left-right |
| 9 | Slope of fall | How steeply the shell comes down |
| 10 | Line number of the metro message | Which line of the weather report to use (it matches the shell's highest point) |
| 11 | Drift | The shell's spin pushes it to one side |
| 12 | Effect of a 1 mph cross wind | Wind correction, sideways |
| 13, 14 | Complementary angle of site | Correction when the target is uphill or downhill |
| 15 | Effect of one weight mark ("square" or "cross") heavier | Heavier shells fly differently |
| 16 | Effect of 1 ft/s more muzzle velocity | A "hot" or "tired" gun |
| 17 | Effect of 1° hotter air (standard 59 °F) | Weather correction |
| 18 | Effect of a 1 mph rear wind | Wind correction, along the line of fire |
| 19 | Effect of 1% denser air (standard 100%) | Weather correction |
| 20, 21 | Range-scale settings for two carriages | What to dial on the sight |

Notes:

- The manual says the highest point of the path ("maximum ordinate") is not in Table A. It can be estimated in feet as four times the square of the time of flight, and there is a separate table of maximum ordinates [TM6-215 ¶5a(10), App. I].
- The OCR of this scan misreads some column numbers ("Column 8" for 3, "18 and 1f" for 13 and 14). The scanned pages are correct.

BRL's own 1954 list of table elements is the same: elevation for each 100 yards of range, time of flight, drift, probable errors, fork, angle of fall, angle of site, and the effects of muzzle velocity, temperature, wind, density and weight [BRL889 §III.A, §III.F]. A 1967 BRL report describes the later, metric tables. They give corrections for ±1 m/s of muzzle velocity, ±1 knot of wind, ±1% temperature and density, and ±1 "square" of weight [BRL1371 §VI.F]. It also explains the weight marks: on 105-mm shells one square is 0.6 lb, and two squares (33.0 lb) is standard [BRL1371 p. 62 footnote].

### 1.3 How many trajectories made a table

The sources disagree, because they count different things:

| Figure | Source | Notes |
|---|---|---|
| "perhaps 2,000–4,000 … assume 3,000" | Goldstine 1972, p. 138 [Goldstine72 via Verif §1] | Secondary (a memoir by the Army's liaison officer) |
| about 150 "reduction" trajectories, then "some three thousand normal and effects trajectories" | BRL Report 889, 1954 [BRL889 §V.B] | **Primary.** This is for the ENIAC/ORDVAC era |
| 1,560 production trajectories for ten tables, 1 Feb to 30 Jun 1945, on the Aberdeen analyzer alone | *Ballisticians in War and Peace* vol. 1 [BIWP; Verif §1] | Primary (BRL history). That works out to about 156 per table, from one machine in one stretch |

**Safe wording:** "A full table needed hundreds to thousands of trajectories, depending on how many corrections it covered." The 1954 BRL figure of about 3,000 agrees with Goldstine.

### 1.4 How long it took, and who did it

- **One trajectory took about 750 multiplications** (Goldstine 1972, p. 138) [Goldstine72 via Verif §1]. This is the most solid number, because it measures work, not clock time.
- **By hand, on a desk calculator:** about 12 hours (Goldstine) or about 20 hours for a 60-second trajectory (Weik 1961, Kempf 1961, restated by Moye 1996). Other estimates run up to "40 hours" and "three days" [Verif §1; fact-check "Trajectory by hand"]. Safe wording: "many hours".
- **On the differential analyzer** (an analog machine of spinning disks and shafts): 10 to 20 minutes (Goldstine) or 15 minutes (Weik/Kempf) [Verif §1].
- **The people:** BRL's Computing Branch had "a staff of 176 computers" in early 1944, plus a 10-integrator analyzer at Aberdeen and a 14-integrator one at the Moore School [Barnes–Buckley draft letter, c. Feb 1944, quoted in Goldstine72 pp. 165–166, via Verif §1]. "Computer" was a job title (civil-service grade SP-4, "subprofessional"), and most of the computers were women [Fritz96 pp. 14–15, via Verif §2]. Kay McNulty described "about 100 women on two shifts" at the Moore School. When a shift ended, the next shift kept working on the unfinished trajectory [Fritz96 p. 17, via Verif §2].

### 1.5 The backlog that justified ENIAC

- "Even with the personnel and equipment now available, it takes about three months of work on a two shift basis" to produce the data for one firing table, director or gun sight [Barnes–Buckley, c. Feb 1944, in Goldstine72 p. 165; Verif §1]. Primary, quoted in a secondary book.
- In the week ending 15 Aug 1944, the Computing Branch finished 15 tables and had 74 in progress. "Requests for the preparation of new tables are being currently received at the rate of six per day" [BRL memo 16 Aug 1944, in Goldstine72 p. 166; Verif §1]. **Careful:** it says six *requests* a day, not six tables. Later retellings drop the word "requests" [Verif §1].
- The machine came too late for the war. "Neither the ENIAC nor the EDVAC was ready for use before the end of the war" [BIWP p. 39, quoting Kempf 1961].

---

## 2. One trajectory: the inputs, the equations, the method

### 2.1 The equations of motion (as BRL wrote them)

BRL's full equations include wind and the Earth's rotation [BRL889 eq. 1]. For the standard ("normal") trajectories in a firing table there is no wind and no rotation, and the shell stays in one vertical plane, so they shrink to [BRL889 §III.E; Stuart21]:

```
dvx/dt = -E · vx              (vx = horizontal speed)
dvy/dt = -E · vy - g          (vy = vertical speed)
dx/dt  = vx
dy/dt  = vy
```

*E* is the **resistance function**, which says how hard the air is slowing the shell right now. BRL used two forms [BRL889 eqs. 3, 4, 6]:

```
E = ρ(y) · v · K_D(M) / C            (the "aerodynamic" form)
E = (a/a_s) · H(y) · G(v, a) / C     (the older "Gâvre" form, used for firing tables)

C = m / (i · d²)                      (ballistic coefficient: mass over form-factor × caliber²)
```

- ρ(*y*) or *H*(*y*) is the air density at height *y*. *H* is the ratio to sea-level density.
- *v* is the shell's speed. *M* is its Mach number (speed ÷ speed of sound).
- *K*<sub>D</sub> or *G* is the **drag function**, an empirical curve looked up in a table.
- *a*/*a*<sub>s</sub> corrects for the speed of sound at height.

**Where the drag tables came from:** *G* goes back to "the work of the Gâvre Commission in the late nineteenth century" (a French artillery commission), later changed to depend on the speed of sound. Before 1917 the U.S. computed only low-angle fire, using the Siacci methods and *Ingalls' Tables* (Artillery Circular M) [BRL889 §I, §II]. The prompt for this research also mentioned R. H. Kent's work at BRL. **I did not research Kent in this pass,** so this doc makes no claim about him.

**Choosing the drag function:** for each new shell, BRL "chose from among many available" drag functions, "based upon experience in the past with projectiles of all shapes and sizes." Then BRL adjusted *C* until computed ranges matched the ranges measured on the proving ground [BRL889 §III.C–D].

### 2.2 The same thing in 5th-grade words

- A shell has two speeds: how fast it moves **forward** and how fast it moves **up**.
- Every instant, the **air pushes back** on both speeds. Faster shells get pushed harder. Thin air high up pushes less.
- **Gravity pulls down** on the "up" speed only. So the shell climbs slower and slower, stops climbing, then falls.
- To find the path, take a tiny step in time (1/50 of a second). Work out the new speeds and the new place. Then do it again, thousands of times, until the shell hits the ground.

### 2.3 The numerical method: Heun's method

BRL integrated these equations with "the modified Euler method of numerical integration with one iteration (sometimes called the Heun method)" [BRL889 §II]. The 1944 ENIAC plan writes out exactly this two-pass step [PX-1-81]:

1. **Guess:** use today's speeds and drag to jump a full step ahead.
2. **Check:** work out the drag again at the guessed point.
3. **Average:** take the step using the average of the two pushes.

In 5th-grade words: "Peek ahead, then split the difference."

**Step size.** The 1944 plan uses Δ*t*/2 = 0.01 s, so the step is 0.02 s [PX-1-81 "Values of constants"]. By 1954, BRL varied Δ*t* with speed, using five speed bands. The steps were smaller near the speed of sound, where the drag curve "rises sharply somewhere between M = 0.9 or so and M = 1.2 or so" [BRL889 §II].

### 2.4 What the 1944 ENIAC plan actually specified

PX-1-81, "Setup of Exterior Ballistic Equations," was drawn by "RAB" (Arthur W. Burks) in January 1944. It appears in volume 2 of the ENIAC progress report covering work to 31 Dec 1943, and was redrawn by Mark Priestley [PX-1-81; HPR supporting materials]. It specifies:

- **Constants:** Δ*t*/2 = 0.01 s; *b* = 9.85 × 10⁻⁶ per meter; *h* = 95.736 × 10⁻⁶ per meter; *H*₀ = 1; *c* = 2.5 to 5.0; *F*₀ = 1/*c*.
- **Ranges of the variables:** *x* up to 10⁵ m, *y* up to 10⁴ m, each speed up to 10³ m/s, and 0.1 < *F* < 0.4. The units are **metric**.
- **Density falls off exponentially.** It carries *F* = *H*/*c* as its own variable, with Δ*F* = −*h*·*F*·*ẏ*·Δ*t*. That is the step-by-step form of *H*(*y*) = e<sup>−*hy*</sup>, with *h* ≈ 9.57 × 10⁻⁵ per meter. (The equation form is from the sheet. Calling it "exponential" is our reading of it.)
- **Drag looked up by speed squared,** with an altitude factor: *G* = *G*[3(*ẋ*² + *ẏ*²)(1 − *by*)²], and *E* = *F*·*G*. "The range of the argument of G is extended by a factor of 3 to make full use of the range of the E.N.I.A.C. function table." The (1 − *by*)² factor is presumably the speed-of-sound correction (our reading; the sheet does not say).
- **Linear interpolation** between table entries: *G* = *f*(*a*) + Δ*a*·[*f*(*a*+1) − *f*(*a*)], where *a* is the first two digits of the argument and Δ*a* the next two.

The 1946 *Report on the ENIAC* gives the reason for indexing by *v*²: tabulate drag "against v² as is done for hand computation of trajectories to avoid the necessity for extracting square roots." It warns that near the speed of sound the drag function "is likely to require considerable thought" and may need its own function table [R46-I §7.5.3].

---

## 3. How it was done on ENIAC

### 3.1 The design was shaped by trajectories from the start

Haigh and Priestley say ENIAC was "constructed … from careful mathematical analysis of the firing tables problem," and that much of the preparatory work was done "very early and shaped the design of the machine" [HP-talk]. They also say Burks "came up with a detailed trajectory configuration for ENIAC long before the celebrated 'women of ENIAC' were recruited" [HPR-err]. PX-1-81 is that kind of document. Secondary sources, but they agree with the primary drawing.

### 3.2 The 1946 manual's trajectory examples

Adele Goldstine's *Technical Description* (Part I of the 1946 report) uses trajectories as its worked examples for the Master Programmer [R46-I §10.6]:

- **Problem 1:** computing "the trajectories needed to make an anti-aircraft table," with 200 trajectories, printing every 10 steps.
- **Problem 2:** "ground gunfire trajectories." Printing happens only near the summit and the ground. "When the projectile goes below ground, computations cease, a test run is performed, and then the next trajectory is initiated."

Problem 2 is the same "stop when *y* goes negative" logic that our Mission 3 wires up.

### 3.3 The February 1946 demonstration

- Arthur Burks wrote a memo listing what was shown on 1 Feb 1946. The last item was "a problem of great importance to the Ordnance Department," classified secret. Goldstine later called the last part of the demo a modification of the Los Alamos "E-2" run. Stuart's **working hypothesis** is that on 15 Feb the shell trajectory replaced the Los Alamos problem [Stuart21; Burks46].
- Betty Jean Jennings (Bartik) and Betty Snyder (Holberton) had been "working on programming artillery trajectory computations." When the Goldstines asked if it could be ready for the 15th, "We said we sure could" [Stuart21, quoting Bartik's autobiography].
- The night before, the trajectory would not stop after the shell hit the ground. The next morning Snyder "knew exactly which switch on the master programmer was set incorrectly … flipped the switch over one position, and we were in business" [Stuart21, quoting Bartik].
- Burks later recalled the trajectory as the centerpiece of the demo. He said it ran in about 20 seconds, for a shell that flies about 30 seconds [Stuart21; Verif §1]. This is from a 1974 talk, from memory.
- **Credit is disputed:** see fact-check "Who wrote the demo trajectory". Fritz, Light and Bartik credit Jennings and Snyder. The Penn Engineering page credits Wescoff and Lichterman. Goldstine says "Adele Goldstine and me."
- **No record of the demo's actual set-up survives** that Stuart could find. "We make an attempt to recreate the design from the ground up" [Stuart21].

### 3.4 Curry and Wyatt (BRL Report 615, 19 Aug 1946)

A trajectory gives position as a function of time and launch angle. A firing table needs the reverse: for each **range**, the angle and the time. Curry and Wyatt worked out how to do this "inverse interpolation" on ENIAC:

> "Suppose the trajectory calculations have given us the coordinates (x,y) of the projectile as functions of t (time) and φ (angle of departure). For the tables we want t and φ as functions of x and y … This is a problem of inverse interpolation in two variables." [CW46 §1.2]

The report was originally RESTRICTED and is now approved for public release [CW46 cover]. It shows that making a table was much more than computing trajectories. (The Haskell programming language is named after Haskell Curry.)

### 3.5 Hartree and Goldstine

- **Hartree:** Douglas Hartree published "The ENIAC, an electronic computing machine" in *Nature* 158 (12 Oct 1946), 500–506, the first big-journal article on ENIAC [Hartree46]. I did not read it in this pass, so this doc makes no claim about what it says on trajectories.
- **Goldstine:** *The Computer from Pascal to von Neumann* (1972) is the source of the 750-multiplications figure, the 2,000–4,000 trajectories, the speed comparisons on p. 138, and the 1944 letters on pp. 165–166 [Goldstine72 via Verif]. It is a memoir by a participant: valuable, but not a contemporary record.

### 3.6 Did ENIAC actually make firing tables? (the honest answer)

Yes, but it came after the war, and it was a minority of ENIAC's work.

- **It was not used in the war.** ENIAC was not ready before the war ended [BIWP p. 39].
- **Trajectory work started in 1946.** "Trajectory calculations were one of the first production jobs run on ENIAC, in August 1946" [HPR-err]. Haigh, Priestley and Rope also call it "quite wrong" to say ENIAC did not compute trajectory tables [HPR-err].
- **It was about a fifth to a quarter of ENIAC's time.**
  - "In recent years about 25% of the Eniac's computing time has been spent on the development of Ballistic Tables involving computations on some 41 problems" [Fritz52 §I.A]. Primary, 1952.
  - "During its period of peak output, in the 1950s, they accounted for about 20% of all ENIAC work" [HPR-err]. Secondary.
  - In Fritz's table of ENIAC time by sponsor (1952), outside groups (Los Alamos, weather and others) took 49%, BRL's Computing Laboratory 35%, and the Exterior Ballistic Lab 12% [Fritz52 p. 10].
- **The early years were slow.** From Feb 1946 to Mar 1948 only "eleven problems were completed," on one 8-hour shift a day, with productivity estimates "from 5% to as much as 25%" [Fritz52 §I]. The 1948 conversion to a stored "code" changed that. From April 1948 to June 1952 ENIAC averaged 116 hours a week on problems [BIWP; Fritz52].
- **Trajectories were the smaller part of the job.** "The determination of the numerical data for Firing Tables and Bombing Tables is a more extensive computational problem than the mere computation of the trajectories" [Fritz52 §I.A]. The other steps were least-squares fitting and high-order interpolation [Fritz52 §I.A; Reed52 via Verif §1].
- **By 1954 ENIAC was one machine of several.** BRL ran reduction trajectories on "Eniac, Edvac, or Ordvac." On ENIAC a reduction trajectory took "some fifteen minutes" (with a print-out every second), against two minutes on ORDVAC. Normal trajectories ran "about 30 per hour on ENIAC" against 80–100 on ORDVAC. A whole table still took months: three to six weeks of range firing, six to eight weeks for the trajectories, and eight to ten weeks to transcribe the table [BRL889 §V.B].

**What the request suspected:** that *ENIAC in Action* says ENIAC did "comparatively little" routine firing-table work. **I could not read the book's text in this pass,** so I can't confirm that phrasing. What the authors say elsewhere (in [HPR-err]) is that ENIAC *did* compute trajectories, from August 1946, at about 20% of its peak-years work. The primary sources (Fritz 1952 and BRL 889) agree. So "ENIAC was built for firing tables, but spent most of its life on other problems" is fair. "ENIAC never made firing tables" is wrong.

**One more caution about speed:** "ENIAC did a trajectory in 30 seconds" is a 1961 capability figure for a 60-second trajectory [Verif §1]. BRL's 1954 production figures are slower (about 2 minutes per normal trajectory, 15 minutes per reduction trajectory with print-outs), because punching cards and checking took time [BRL889 §V.B]. Both can be true. Don't multiply 30 seconds by 3,000 and call that a firing table [Verif §1].

---

## 4. Real documents Nick can look at

"PD" means public domain. Works of the U.S. Government (Army manuals and BRL reports) are not under copyright. Whether we "could reproduce" an image in the kiosk is my judgment, not legal advice.

| # | Document | Link | What it shows | PD? | Kiosk image? |
|---|---|---|---|---|---|
| 1 | **TM 6-215, *Abbreviated Firing Tables*, War Dept, 15 Dec 1941** (extracts of FT 75-B-4 for the 75-mm gun and FT 155-D-2 for the 155-mm howitzer) | https://archive.org/details/1941TM6-215 (1940 edition: https://archive.org/details/TM6-215) | Real firing-table pages (Table A, B, C) plus a plain explanation of every column. PDF p. 27 is the right half of Table A (75-mm gun, cols. 13–21, 100 to 4,000 yd), clear and legible. The 155-mm howitzer tables start near PDF p. 54 | **Yes.** U.S. War Department; archive.org marks it Public Domain Mark 1.0 | **Yes, the best candidate.** The scan is a Google digitization from the University of California, with "Digitized by Google" in the margin. Crop the margins, or re-typeset a few rows |
| 2 | **PX-1-81 "Setup of Exterior Ballistic Equations"**, drawn by RAB (Burks), Jan 1944, redrawn by Mark Priestley | https://eniacinaction.com/docs/PX-1-81.pdf (index: https://eniacinaction.com/the-book/supporting-technical-materials/) | The earliest ENIAC trajectory plan: constants, Heun equations, drag look-up by *v*², unit-by-unit schedule. Companion: PX-1-82 panel diagram | The 1944 original is a U.S. contract report. **The redrawing is Priestley's work** | **Ask first** (email the ENIAC in Action authors), or re-typeset the equations ourselves |
| 3 | **BRL Report 889**, S. Gorn & M. L. Juncosa, *On the Computational Procedures for Firing and Bombing Tables*, Jan 1954 | https://archive.org/details/DTIC_AD0027123 · DTIC AD0027123 (https://apps.dtic.mil/sti/tr/pdf/AD0027123.pdf) | BRL's own end-to-end description: range firings, reduction trajectories, ballistic coefficient fitting, normal and effects trajectories, table elements, running times on ENIAC and ORDVAC, flow charts | **Yes** (U.S. Army; "Approved for public release; distribution is unlimited") | Text quotes, yes. The scan is "partially illegible", so use the flow charts only if they read well |
| 4 | **BRL Report 615**, H. B. Curry & W. A. Wyatt, *A Study of Inverse Interpolation of the Eniac*, 19 Aug 1946 | DTIC AD0640621: https://apps.dtic.mil/sti/pdfs/AD0640621.pdf (DTIC blocks scripts; a Wayback copy works) | How to turn trajectories into table rows on ENIAC. 100 pages of set-up diagrams | **Yes** (U.S. Army; approved for public release) | Yes, as a "the real work behind the table" image |
| 5 | ***Report on the ENIAC*, Part I, *Technical Description*** (Adele Goldstine), Moore School, 1 June 1946 | https://archive.org/details/ReportonENIACEl00MoorB | §7.5.3 on the drag function. §10.6.1–10.6.2: anti-aircraft and ground-gunfire trajectory set-ups (Problems 1 and 2) | Contract report for the Army, no copyright notice; **very likely PD** (not legally checked). Smithsonian Libraries scan | Probably yes, with a credit line to Smithsonian Libraries |
| 6 | **BRL Report 1371**, E. R. Dickinson, *The Production of Firing Tables for Cannon Artillery*, Nov 1967 | https://archive.org/details/DTIC_AD0826735 | A later, very clear walk-through of every table (A–N) and every correction column, with a sample tabular firing table | **Yes** (approved for public release) | Yes. But it is 1967, so label it "a later firing table" |
| 7 | **BRL Memorandum Report 617**, W. B. Fritz, *A Survey of ENIAC Operations and Problems 1946–1952*, Aug 1952 | DTIC AD1003735 (Wayback: https://web.archive.org/web/2023/https://apps.dtic.mil/sti/tr/pdf/AD1003735.pdf) | ENIAC's share of time on ballistic tables (25%), the 41 problems, 11 problems in 1946–48 | **Yes** | Text only |
| 8 | ***Handbook of Ballistic and Engineering Data for Ammunition*, Vol. 2**, BRL, July 1950 (section BRLH 105-1-1, Shell, HE, 105-mm, M1) | https://archive.org/details/HandbookOfBallisticAndEngineeringDataForAmmunitionVol2 (also DTIC ADA955369) | The drag-coefficient-vs-Mach graph for the 105-mm M1 shell that Stuart used to build his drag table [Stuart21 Fig. 3] | U.S. Army; **likely PD** (archive.org gives no license) | Yes, if the scan is clean: "the real drag curve behind our table" |
| 9 | ***FM 6-40, Field Artillery Gunnery*, War Dept, June 1945** | https://archive.org/details/Fm6-401945 | How gunners used tabular and graphical firing tables in WWII | **Yes** (PD Mark) | Possibly. It is mostly text |
| 10 | ***Ballisticians in War and Peace*, Vol. 1, 1914–1956** (BRL history) | https://archive.org/details/DTIC_ADA300523 | Analyzer production figures; the Bell relay computers; ENIAC's arrival in 1947 | **Yes** | Photos may be usable; check the credit for each |
| 11 | ***Firing Tables for 75-mm Gun, Model of 1897 (French)***, 1931 | https://archive.org/details/firingtablesfor70000vari | A complete pre-war U.S. firing table book | U.S. Government; likely PD | Yes. But it is pre-war, and for a different gun |
| 12 | ***Ingalls' Ballistic Tables*, revised 1917** | https://archive.org/details/ingallsballistictablesrevised1917 | The older Siacci-era tables BRL 889 mentions | U.S. Army 1917; PD | Yes, as "how it was done before" |
| 13 | H. H. & A. Goldstine, "The Electronic Numerical Integrator and Computer (ENIAC)", *MTAC* 2(15), July 1946, 97–110 | https://www.ams.org/journals/mcom/1946-02-015/S0025-5718-1946-0018977-0/S0025-5718-1946-0018977-0.pdf | Contemporary technical description. **Its worked example is not a trajectory** (checked) | AMS journal; copyright status not checked | Do not reuse without checking |
| 14 | B. L. Stuart, "Reconstructing the Unveiling Demonstration of the ENIAC", *IEEE Annals* 43(2), 2021 | preprint: https://www.techrxiv.org/articles/preprint/Reconstructing_the_Unveiling_Demonstration_of_the_ENIAC/14538117 | How `trajdemo.e` was built: the equations, Heun's method, Δt, the drag source, 1,550 ft/s at 22.5°, the plotted path | © IEEE | No (ask Stuart for his own figures) |
| 15 | H. H. Goldstine, *The Computer from Pascal to von Neumann*, 1972 | https://archive.org/details/computerfrompasc00herm (borrow only) | Firing-table numbers, the 1944 letters | In copyright | No |
| 16 | *The Moore School Lectures* (1946; reprint 1985) | https://archive.org/details/mooreschoollectu0000unse (borrow only) | Includes Rademacher on error build-up in ENIAC integration [Fritz52 §I.C] | Reprint in copyright | No |
| 17 | H. L. Reed Jr., "Firing Table Computations on the Eniac", *Proc. ACM* 1952, 103–106 | https://dl.acm.org/doi/10.1145/609784.609796 (403 to scripts) | The full firing-table pipeline on ENIAC (summarized in [Verif §1]) | © ACM | No |
| 18 | **A Checklist of Obsolete Artillery Firing Tables**, 1978 | https://archive.org/details/DTIC_ADA055593 | Lists FT numbers (useful for hunting down FT 105-H-3) | PD | n/a |

**The 105-mm table itself.** The table for the gun and shell Stuart modeled is *FT 105-H-3, Firing Tables for Howitzer, 105-mm, M2 and M2A1, firing Shell, H.E., M1*. It was printed in 1941 and updated with changes through 11 March 1944. I found catalog entries (Imperial War Museum: https://www.iwm.org.uk/collections/item/object/1500083546; Australian War Memorial: https://www.awm.gov.au/collection/LIB51322) and copies for sale, but **no free online scan**. If Nick wants the exact page for 1,550 ft/s (charge 7) at 400 mils, a paper copy (eBay or a museum library) or an IWM/AWM copy request is the route. Until then, item 1 (TM 6-215) is the real WWII table we can show.

---

## 5. Stuart's `trajdemo.e`, compared with the real thing

Sources for this section: the program files `build/upstream/programs/trajdemo.e` and `drag.e` at our pinned simulator commit; `demo.card`; Stuart's 2021 paper [Stuart21]; and one debug run of the simulator I did on 2026-10-03, with a print added to the function-table code in a scratch copy (the repo was not changed).

### 5.1 What the comments say, and a disagreement inside the file

- The header says: "Using Heun's method for integration on the artillery trajectory."
- The trajectory section says: "using a drag table I tried to figure out and simple rectangular integration with a delta-t of 0.01s."

**These disagree.** The 2021 paper explains it. Stuart's YouTube video used "an earlier version that used Euler's method," and the paper describes Heun's method with Δ*t* = 0.02 s, "allowing us to perform the multiplications by Δ*t*/2 by shifting two digits to the right" [Stuart21]. The code matches the paper: it looks up drag **twice per step** (function-table programs `f2.1` and `f2.2`), which is what Heun's method needs. Our reading: the "rectangular, 0.01 s" comment is left over from the Euler version. The 0.01 is Δ*t*/2.

### 5.2 The constants card, decoded

`demo.card` holds seven 10-digit fields (70 columns). The program picks them with the Constant Transmitter switches `c.s1 Alr`, `c.s2 Blr`, `c.s7 Clr`, `c.s13/15 Elr`, `c.s14 Flr` and `c.s19 Glr`.

| Field | Digits | Used by | Meaning | Confidence |
|---|---|---|---|---|
| A | `0000097367` | addition demo | 97,367, added 5,000 times (Burks memo) | High [Stuart21; Burks46] |
| B | `0000013975` | multiplier demo | 13,975 × 13,975 | High [Stuart21] |
| C | `0000098175` | sine/cosine demo | B = 0.000098175 = sin(0.1 mil) | High [Stuart21] |
| D | `0010000000` | **no switch in `trajdemo.e` selects it** | Unknown | **Can't decode.** Not used by this program, as far as I can see |
| E | `-000003217` | trajectory, added to vertical speed each half-step | −0.3217 ft/s = −*g*·Δ*t*/2 = −32.17 ft/s² × 0.01 s | Our inference: the units and scale fit everything else, but Stuart doesn't state it |
| F | `0014320000` | trajectory, loaded to Acc 6 (horizontal speed) | *ẋ*₀ = 1,432.0000 ft/s | High: see the check below |
| G | `0005932000` | trajectory, loaded to Acc 4 (vertical speed) | *ẏ*₀ = 593.2000 ft/s | High: see the check below |

**Check:** √(1432² + 593.2²) = 1,550.0 ft/s, and arctan(593.2/1432) = 22.50°. Stuart writes that Figure 5 shows "a shell leaving the gun at 1550 ft/s and a gun elevation of 22.5°" [Stuart21]. The punched cards use 4 decimal places in feet. For example, `0014127117` is 1,412.7 ft. 22.5° is 400 mils.

**Each card is one second.** Master Programmer stepper H, stage 1, is set to 50 (`p.d5s1 5`, `p.d4s1 0`). So it runs 50 steps of 0.02 s, then punches. "For each 50 simulation steps (each covering 0.02s for a total of 1 second of simulated time), a card is punched" [Stuart21]. This settles the open question in `missions/trajectory.yaml` ("no feet or seconds on screen until Stuart or the Fact-Checker confirms"). **Feet and seconds are confirmed** by Stuart's paper.

**What our run produced** (a repeat run, punched cards read directly; my numbers): after 1 s the shell is at 1,413 ft along and 569 ft up. Its highest point is about 4,530 ft, after about 16 s. It lands between cards 33 and 34, at roughly 38,700–39,000 ft (about 12,900 yd, or 7.3 miles). That matches the kiosk's own config ("landing card 34").

### 5.3 The drag table (`drag.e`)

- 100 entries (rows 0–99) on function table 2, each a 3-digit number. They rise from 000 and 032 at the start to about 710 at the end, with small kinks (row 58 = 660 is below row 57 = 661; row 63 = 669 is below row 62 = 670).
- Stuart: "The sum of the squares is shifted to obtain a two-digit number used to index one of the ENIAC function tables. The values in the table are the values of E corresponding to each value of v²." He built them from the *K*<sub>D</sub>-vs-Mach graph for the 105-mm HE M1 shell in the 1950 *Handbook* and *C* for a 105-mm shell, with "the density of air, which we will take as a constant" [Stuart21].
- **What I could not settle:** the debug run suggests row ≈ *v*² / 100,000 (in ft²/s²). That would put the speed of sound (about 1,117 ft/s) near rows 12–13, where the table is smooth. The table's one big jump (row 24 = 246 to row 25 = 357) sits near the launch speed (about 1,550 ft/s), not at the sound barrier. Real drag curves jump between about Mach 0.9 and 1.2 [BRL889 §II]. Either my reading of the index scaling is off, or the table's shape differs from a real *K*<sub>D</sub> curve. **Ask Stuart before claiming either.**
- **A related observation, flagged as our inference:** a real 105-mm M2/M101 howitzer is listed with a 1,550 ft/s (472 m/s) muzzle velocity and a **maximum** range of about 11,270 m (12,300 yd) [Wiki-M101, a tertiary source]. Our run reaches about 12,900 yd at only 22.5°. That suggests the reconstructed drag is lighter than the real shell's. Don't put a range figure on screen as "what a 105 would do."

### 5.4 Faithful vs. reconstructed

| Feature | `trajdemo.e` | Real BRL / ENIAC practice | Verdict |
|---|---|---|---|
| Equations | *ẍ* = −*Eẋ*, *ÿ* = −*Eẏ* − *g* | Same, for "normal" trajectories [BRL889 §III.E] | **Faithful** |
| Method | Heun (two drag look-ups per step) | Heun [PX-1-81; BRL889 §II] | **Faithful** |
| Step | Δ*t* = 0.02 s, with ×Δ*t*/2 done by a two-digit shift | Δ*t*/2 = 0.01 s [PX-1-81]. By 1954, variable with speed [BRL889] | **Faithful to 1944.** Simpler than 1954 |
| Drag look-up | Function table indexed by *v*² (two digits) | Indexed by *v*² [PX-1-81; R46-I §7.5.3] | **Faithful idea** |
| Interpolation | None (nearest row) | Linear interpolation [PX-1-81] | **Simplified** |
| Air density | Constant | Falls exponentially with height [PX-1-81; BRL889] | **Simplified** (Stuart says so) |
| Speed of sound vs height | Not modeled | Modeled [PX-1-81 (1 − *by*)²; BRL889 eq. 6] | **Simplified** |
| Drag values | Stuart's own, from a 1950 handbook graph | Measured *G* or *K*<sub>D</sub>, with *C* fitted to range firings [BRL889 §III.C–D] | **Reconstructed** |
| Units | feet, ft/s | Metric in the 1944 plan [PX-1-81]; yards and feet in WWII U.S. tables [TM6-215] | Either is fine |
| Stop rule | Test the sign of *y* after each card | Same idea [R46-I §10.6.2]; the demo used it [Stuart21] | **Faithful** |
| Launch values | 1,550 ft/s, 22.5° | **Unknown for the demo** | **Stuart's choice** |
| Overall demo set-up | Rebuilt from scratch | "We have not found any record of the complete detailed design" [Stuart21] | **Reconstruction** |

---

## 6. Presentation ideas for the kiosk

Each has a draft of the visitor copy (40 words or fewer, 5th-grade level). Every fact in these drafts is in fact-check group F.

1. **"What the gunner saw."** Show a page of TM 6-215 Table A next to our stack of punched cards. Highlight one row: range, elevation, time of flight.
   > *Soldiers never saw ENIAC. They saw a book like this. Find how far away the target is. Read how high to aim. ENIAC's job was to fill pages like this one, much faster than people could.* (35 words)

2. **"Each card is one second."** Label the cards with seconds (1 s, 2 s …) and the arc with feet. Stuart's paper allows this now.
   > *Each card ENIAC punches is one second of the shell's flight. The shell leaves the gun faster than sound, at 1,550 feet each second. Watch it climb, slow down, and fall.* (31 words)

3. **"One path is one line."** After landing, zoom out to a grid of hundreds of faint arcs.
   > *This is one shell path. A firing table needed hundreds or thousands, for every distance, plus wind, hot or cold air, and heavy or light shells. By hand, each path took many hours.* (33 words)

4. **"The 1944 plan."** Show a re-typeset version of Burks's PX-1-81 equations (ask the ENIAC in Action authors before using their redrawing).
   > *In January 1944, before ENIAC was finished, Arthur Burks drew this plan to work out a shell's path. It uses the same trick our program uses: tiny hops, checking the push of the air at each one.* (37 words)

5. **"What ENIAC had to know."** Five icons that light up as the card is read: speed, angle, the shell's shape and weight, air, gravity.
   > *To find a shell's path, ENIAC needed five things: how fast the shell leaves the gun, how high the gun points, how easily the shell slips through air, how thick the air is, and gravity.* (36 words)

Notes for the designers:

- Don't show a landing distance as "real" (see 5.3).
- If names are wanted on idea 4 or nearby, use "Betty Jean Jennings and Betty Snyder set up the trajectory for the 1946 demo," with the credit caveat (fact-check B8).
- "Faster than sound" is safe: 1,550 ft/s is well above about 1,117 ft/s at 59 °F. But the 59 °F standard is from TM 6-215, and the speed-of-sound figure is general physics, not from a source cited here.

---

## 7. Disagreements and open questions

- **Trajectories per table:** 2,000–4,000 (Goldstine) and about 3,000 (BRL 889) vs. about 156 per table (analyzer, 1945). They count different scopes. Don't average them.
- **Time per trajectory:** see the fact-check table. ENIAC "30 s" (1961 capability) vs. about 2 min (normal) and 15 min (reduction, with print-outs) in 1954 production [BRL889].
- **Demo credit:** disputed (fact-check B8).
- **`trajdemo.e` comments:** Heun vs. "rectangular 0.01 s." The paper and the code say Heun with 0.02 s.
- **Drag-table scaling:** unresolved (5.3). Ask Stuart.
- **Card field D (`0010000000`):** purpose unknown. Not selected by `trajdemo.e`.
- **Not done in this pass:** reading *ENIAC in Action* itself, Polachek 1997, Reed 1952 (only Nick's earlier summary), Hartree's *Nature* articles, and anything on R. H. Kent.

---

## 8. Sources

### Primary (written at the time by the people doing the work)

- **[PX-1-81]** A. W. Burks ("RAB"), "Setup of Exterior Ballistic Equations," drawing PX-1-81, Jan 1944, in *The ENIAC, Vol. 2* (progress report to 31 Dec 1943), Moore School. Redrawn by M. Priestley: https://eniacinaction.com/docs/PX-1-81.pdf (read 2026-10-03, rendered and read visually).
- **[TM6-215]** War Department, *TM 6-215 Abbreviated Firing Tables*, 15 Dec 1941: https://archive.org/details/1941TM6-215 (¶1–5 read in full; Table A page viewed).
- **[BRL889]** S. Gorn and M. L. Juncosa, *On the Computational Procedures for Firing and Bombing Tables*, BRL Report 889, Jan 1954, DTIC AD0027123: https://archive.org/details/DTIC_AD0027123 (read §I–III and the time-requirements section; the scan is partly garbled, so the standard-atmosphere constant in eq. 9 is unreadable).
- **[CW46]** H. B. Curry and W. A. Wyatt, *A Study of Inverse Interpolation of the Eniac*, BRL Report 615, 19 Aug 1946, DTIC AD0640621 (abstract, §1 read).
- **[R46-I]** A. K. Goldstine, *Report on the ENIAC, Part I: Technical Description*, Moore School, 1 Jun 1946: https://archive.org/details/ReportonENIACEl00MoorB (§7.5.3 and §10.6.1–10.6.2 read from OCR).
- **[Fritz52]** W. B. Fritz, *A Survey of ENIAC Operations and Problems 1946–1952*, BRL MR 617, Aug 1952, DTIC AD1003735 (§I and §I.A read).
- **[BRL1371]** E. R. Dickinson, *The Production of Firing Tables for Cannon Artillery*, BRL Report 1371, Nov 1967: https://archive.org/details/DTIC_AD0826735 (contents and Table F/G sections read).
- **[HB2-50]** BRL, *Handbook of Ballistic and Engineering Data for Ammunition*, Vol. 2, July 1950: https://archive.org/details/HandbookOfBallisticAndEngineeringDataForAmmunitionVol2 (located the 105-mm M1 section; graph not inspected).
- **[BIWP]** *Ballisticians in War and Peace*, Vol. 1, 1914–1956, DTIC ADA300523: https://archive.org/details/DTIC_ADA300523 (pp. 39 and the 1948–52 usage passage read).
- **[MTAC46]** H. H. and A. Goldstine, "The Electronic Numerical Integrator and Computer (ENIAC)," *MTAC* 2(15), 1946, 97–110 (checked: its example is not a trajectory).
- **[Burks46]** A. W. Burks, "Demonstration of ENIAC," memo, Feb 1946 (as transcribed in [Stuart21]).
- **[Hartree46]** D. R. Hartree, "The ENIAC, an electronic computing machine," *Nature* 158 (1946), 500–506: https://www.nature.com/articles/158500a0 (not read).

### Secondary

- **[Stuart21]** B. L. Stuart, "Reconstructing the Unveiling Demonstration of the ENIAC," *IEEE Annals* 43(2), 2021 (read in full; preprint PDF via Semantic Scholar).
- **[HPR-err]** T. Haigh, M. Priestley, C. Rope, "ENIAC errors in Isaacson's *The Innovators*": https://eniacinaction.com/the-articles/eniac-errors-in-isaacsons-the-innovators/ (read 2026-10-03).
- **[HP-talk]** T. Haigh and M. Priestley, "Working on ENIAC: The Lost Labors of the Information Age," MITH talk, 2016, transcript at opentranscripts.org (read 2026-10-03).
- **[Goldstine72]** H. H. Goldstine, *The Computer from Pascal to von Neumann*, Princeton UP, 1972 (pp. 138, 165–166, through [Verif]).
- **[Fritz96]** W. B. Fritz, "The Women of ENIAC," *IEEE Annals* 18(3), 1996 (through [Verif]).
- **[Reed52]** H. L. Reed Jr., "Firing Table Computations on the Eniac," *Proc. ACM*, 1952 (through [Verif]; not re-read).
- **[Verif]** Nick's earlier research, `~/Workspaces/eniac/research/part-1-verification.md` §1–2 (2026-08-08).
- **[Wiki-M101]** Wikipedia, "M101 howitzer" (tertiary; used only for the range comparison in 5.3).

### Our own work

- `build/upstream/programs/trajdemo.e`, `drag.e`, `build/upstream/demo.card` at the pinned simulator commit; a debug run of the simulator on 2026-10-03, in a scratch copy only.
