# ENIAC Part 1 — Fact Verification Pass

**Compiled:** 2026-08-08
**Scope:** the nine inline `[NEEDS SOURCE]` markers in `script/part-1.md`, plus two bonus items.
**Standard applied:** museum-docent grade. A confident wrong number is worse than an acknowledged
gap. Where a figure circulates widely and traces nowhere, that is recorded as a finding, not
smoothed over. Where sources conflict, both figures are given — never averaged, never picked.

## Tier key

| Tier | Meaning |
|---|---|
| **(a)** | Primary / contemporaneous — 1940s–50s Army or Moore School reports, press releases, contemporaneous press |
| **(b)** | Peer-reviewed or archival scholarship — IEEE Annals, *Technology and Culture*, the *ENIAC in Action* companion papers; also participant recollections published in those venues |
| **(c)** | Reputable secondary / institutional — Penn, CHM, ARL historian summaries, IEEE Spectrum |
| **(d)** | Widely repeated, not traceable to any source |

## Primary sources located and read in full text during this pass

All public domain, all free, all read (not merely cited) for this document:

| Document | Where | Used for |
|---|---|---|
| ***A Report on the ENIAC***, Moore School / Ordnance Dept, Contract W-670-ORD-4926, **June 1, 1946** — all five volumes | Vol 1 https://archive.org/details/ReportonENIACEl1Moor · Vol 2 https://archive.org/details/ReportonENIACEl00MoorA · Vols 3–4 https://archive.org/details/ReportonENIACEl00MoorB · Vol 5 https://archive.org/details/reportoneniacele05moor | §4a acronym, §4b reliability engineering, §4d scale, §4e speed, §4f authorship, §5 fault-localization procedure, §6 (negative result) |
| **R. F. Clippinger, *A Logical Coding System Applied to the ENIAC*, BRL Report No. 673, 29 Sept 1948** | https://ftp.arl.army.mil/~mike/comphist/48eniac-coding/ · DTIC ADB205179 | §6 setup time and the six-fold speed trade; §4c reliability |
| **Martin H. Weik, *A Survey of Domestic Electronic Digital Computing Systems*, BRL Report No. 971, Dec 1955** | https://ed-thelen.org/comp-hist/BRL-e-h.html | §4c operating ratios, §4d scale, §4e speed |
| **Karl Kempf, *Electronic Computers Within the Ordnance Corps*, Aberdeen Proving Ground, Nov 1961** | https://ftp.arl.army.mil/~mike/comphist/61ordnance/chap2.html | §4b derating, §4c failure causes and heat, §6 setup, §7 timeline |
| **W. Barkley Fritz, "The Women of ENIAC," *IEEE Annals* 18:3 (1996)** | https://courses.cs.washington.edu/courses/csep590a/06au/readings/00511940-frist.pdf | §2 throughout, §3, §5, §9 |
| **Jennifer S. Light, "When Computers Were Women," *Technology and Culture* 40:3 (1999)** | (obtained in full) | §2, §5, §8, §9 |
| **C. Dianne Martin, "ENIAC: The Press Conference That Shook the World," *IEEE T&S* 14:4 (1995)** | https://www2.seas.gwu.edu/~mfeldman/csci110/summer08/eniac2.pdf | §1, §2, §7, §8 |
| **Haigh, Priestley & Rope, *IEEE Annals* trilogy (2014)** | https://eniacinaction.com/the-articles/ | §6, §7, §4f |
| **U.S. War Department, Bureau of Public Relations press release, 30 Jan 1946** (embargoed to 16 Feb) | https://www.ece.rice.edu/~dhj/History/ENIAC1.pdf | §2 headcount, §8 throughout |
| **Arthur W. Burks, "Demonstration of ENIAC," Feb 1946** — ENIAC Patent Trial Plaintiff Exhibit 4024.5, issued via Penn's publicity office; transcribed complete in Stuart 2021 | https://pdfs.semanticscholar.org/4ff6/341e9588c9a532807e3c853e6b3662704e5f.pdf | §7, §8 |
| **Nicholas Metropolis, oral history, Charles Babbage Institute OH 135, 29 May 1987** | https://hdl.handle.net/11299/107493 | §7 |
| **Brian L. Stuart, "Reconstructing the Unveiling Demonstration of the ENIAC," *IEEE Annals* 43:2 (2021)** | preprint as above | §8 |
| **William T. Moye, "ENIAC: The Army-Sponsored Revolution," ARL, Jan 1996** | https://ftp.arl.army.mil/~mike/comphist/96summary/ | §1, §2, §3, §7, §8 |
| **Barnes→Buckley draft letter, c. 1 Feb 1944**, and **BRL Memo, 16 Aug 1944** — both quoted verbatim in Goldstine, *The Computer from Pascal to von Neumann* (1972), pp. 138, 165–166 | Internet Archive / JSTOR | §1 backlog and throughput, §2 headcount and integrators |
| **J. Presper Eckert, oral history, CBI OH 13** (Stern, 28 Oct 1977) · **Irven Travis, CBI OH 36** (Stern, 21 Oct 1977) · **Carl Chambers, CBI OH 7** | conservancy.umn.edu | §2 analyzer, §3 throughout |
| **John Mauchly, Smithsonian Computer Oral History**, 10 Jan 1973 | https://www.si.edu/media/NMAH/NMAH-AC0196_mauc730110.pdf | §3 |
| **Classification Act of 1923, 42 Stat. 1488 §13** | https://www.honorfirst.com/uploads/4/7/0/8/47087249/classification_act_of_1923.pdf | §2 job classification |
| ***Ballisticians in War and Peace*, Vol. 1, 1914–1956**, DTIC AD-A300523 | https://archive.org/stream/DTIC_ADA300523/DTIC_ADA300523_djvu.txt | §1, §2 |

## Relationship to `research/research-brief.md`

Nothing here contradicts the brief. Three things extend it materially (§2 differential analyzer,
§7 Los Alamos, §8 the War Department press release), and **one finding complicates a line in the
script's cold open** — see §10.4. The brief's guardrails on the 1973 opinion (§5.3) and on
stored-program timeline precision (§3) are untouched by anything below.

---

## 1. Firing tables — the production bottleneck

**Status: SUBSTANTIALLY ESTABLISHED, and better than expected. There are real production numbers
from a 1944 Army memo. Two widely repeated figures turn out to be corruptions — see 1.x below.**

### THE KEY DOCUMENT — a February 1944 Ordnance letter that answers three questions at once

**Draft letter, Gen. G. M. Barnes to Dr. O. E. Buckley, c. 1 February 1944**, drafted by Herman
Goldstine, quoted verbatim in Goldstine, *The Computer from Pascal to von Neumann* (Princeton UP,
1972), **pp. 165–166**. **tier (b) quoting (a):**

> "In addition to a staff of **176 computers** in the Computing Branch, the Laboratory has a
> **10-integrator differential analyzer at Aberdeen and a 14-integrator one at Philadelphia**, as
> well as a large group of IBM machines. **Even with the personnel and equipment now available, it
> takes about three months of work on a two shift basis** to turn out the data needed to construct a
> director, gun sight, or firing table."

One contemporaneous sentence gives the headcount (§2), the integrator counts (§2), and the time to
produce a complete table. **It is 1944, not a postwar recollection. Confidence: high.**

### The answer

**Backlog and throughput — now sourced.** BRL Memo, **16 August 1944**, quoted in Goldstine 1972,
p. 166. For the week ending 15 August 1944, Computing Branch alone:

| Category | Completed | In progress |
|---|---|---|
| Ground Gunfire Tables | 10 | 16 |
| Bombing Tables | 1 | 28 |
| Aircraft Fire Tables | 3 | 16 |
| Ballistic Tables | — | 6 |
| Miscellaneous Major Computations | 1 | 8 |
| **Total** *(summed; no totals row in the original)* | **15** | **74** |

> "The number of tables for which work has not been started because of lack of computational
> facilities **far exceeds** the number in progress. **Requests for the preparation of new tables are
> being currently received at the rate of six per day.**"

**tier (b) quoting (a). Confidence: high.**

### ⚠️ CORRECTION — "six tables a day" is wrong. It was six *requests* a day.

The widely repeated "demands for tables coming in at the rate of about six a day" comes from Moye
1996 (ARL), which restates the 1944 memo with the word "**requests**" dropped. It is then routinely
re-reported as though six *tables* were demanded daily.

**Script-safe:** *"About six new table requests were arriving a day, against roughly fifteen tables
completed a week."* Both halves come from the same 1944 memo. That single comparison conveys the
bottleneck better than any adjective.

**Corroborating the qualitative crisis:** John Grist Brainerd, Moore School director of war research,
secret memo to Dean Pender, 1943 — "In the specific case of sidewise firing from airplanes,
construction of directors for guns has been held up several months because it has been a physical
impossibility to supply to the manufacturers the necessary ballistic data." Found via Augarten,
*Bit by Bit*, ch. 4 — **tier (c)**, unfootnoted; the memo itself was not reached. Wording confidence:
**medium**.

**Trajectories per table.** "perhaps **2,000–4,000** trajectories — assume 3,000" — Goldstine 1972,
**p. 138**, **tier (b)**. Independently, Augarten, *Bit by Bit*, p. 109: 2,000–4,000 per gun/projectile
pair, explicitly *"for only the most basic factors, altitude and range"* — **tier (c)**, quoted in
C. Dianne Martin, "ENIAC: The Press Conference That Shook the World," *IEEE Technology and Society
Magazine* 14:4 (Dec 1995), https://www2.seas.gwu.edu/~mfeldman/csci110/summer08/eniac2.pdf.

**CONFLICT — a much lower figure exists and it is not reconcilable by hand-waving.**
H. Polachek, "Before the ENIAC," *IEEE Annals* 19:2 (1997): 25–30, says "**hundreds** of
trajectories" — **tier (b), but the article is paywalled and was NOT read; this is a source-chain
report.** And a hard Army number points the same way:

> "Between 1 February 1945 and 30 June 1945, the **Aberdeen Analyzer alone computed 1560 production
> trajectories used in the preparation of ten firing tables.** This work was in addition to test runs
> and certain theoretical work carried on during this period."
> — *Ballisticians in War and Peace: A History of the U.S. Army Ballistic Research Laboratories,
> Vol. 1, 1914–1956*, DTIC AD-A300523, https://archive.org/stream/DTIC_ADA300523/DTIC_ADA300523_djvu.txt
> **tier (a).**

That implies **~156 production trajectories per table** on that machine in that window — an order of
magnitude below Goldstine's 3,000. Augarten's "most basic factors" qualifier is the plausible
reconciliation (hundreds for a basic set; thousands for the full multi-variable table) but **no source
states that reconciliation. Do not smooth it.**

**Script-safe:** *"A table could run to a few thousand trajectories, though the Army's own records
show a single analyzer producing about a hundred and fifty per table in one 1945 stretch — the count
depends entirely on how many variables the table covered."*

### Time per trajectory — a genuinely wide spread. Do not average.

**By hand, on a desk calculator:**

| Figure | Source | Tier |
|---|---|---|
| **~12 hours** — *derived*: ~750 multiplications × 10 s ≈ 2 h multiplying, × 6 for bookkeeping. Goldstine adds: "This was about right, perhaps a little low." | Goldstine 1972, p. 138 | (b) |
| **~20 hours** (for a 60-second trajectory) | Kempf 1961 ch. 1; Weik, "The ENIAC Story," 1961 | (a)/(c) |
| **up to 40 hours** | Polachek 1997 — **not read, source-chain only** | (b) |
| **40 hours** | Winegrad & Akera, *Penn Almanac* 42:18 (1996) | (c) |
| **about three days** | Arthur Burks, 1974 talk, in Augarten p. 99 | (b) |
| **"between twenty minutes and several days"**, method-dependent | Light 1999, p. 463, citing Stern pp. 13–14 (**Stern not read**) | (b) |

**On the differential analyzer:** **10–20 minutes** (Goldstine p. 138) · **15 minutes** for a
60-second trajectory (Kempf 1961; Weik 1961; repeated by Moye 1996) · **15–30 min plus 1–2 hours
set-up per table** (Augarten) · **30 minutes** (Burks 1974; Polachek; *Penn Almanac* 1996).
The occasionally seen "~45 minutes" appears only in unsourced course notes — **tier (d), disregard.**

**On ENIAC:** **30 seconds** for a 60-second trajectory (Weik 1961 → Moye 1996) · **20 seconds**
against a 30-second flight (Burks 1974, describing the Feb 1946 demo) · **100 seconds** as Mauchly's
1942 pre-construction projection, which assumed 1,000 multiplications/sec — about three times
optimistic, since ENIAC managed ~290–360.

### ⚠️ CORRECTION — "a trajectory took 30 days by hand" is a corruption

It mangles Goldstine 1972, p. 138:

> "Thus, for example, **the differential analyzer required perhaps 750 hours — 30 days — to do the
> trajectory calculations for a table.**"

That is 3,000 trajectories × 15 minutes, for **the machine**, for **a whole table**. Not one
trajectory, not by hand. **tier (d) as usually repeated.**

### ⚠️ CORRECTION — the famous "20 hours / 15 minutes / 30 seconds" triad is a 1961 construction

It first appears in **two Army-official 1961 publications** — Weik's *Ordnance* article and Kempf's
Ordnance Corps monograph — and the ARL web page everyone cites (Moye 1996) is a restatement of them.
It is a **capability comparison for a hypothetical 60-second trajectory**, not a measurement of
wartime production. Perfectly usable; just don't present it as something someone timed in 1944.

### The one number nobody can argue with

Goldstine 1972, p. 138: **"A typical trajectory or path required the order of 750 multiplications."**
That is work content, not wall-clock, and it survives every methodological quarrel above. His
comparative table for the same trajectory: Harvard-IBM Mark I ~2 h; Bell relay ~¾ h; Mark II ~¼ h;
differential analyzer 10–20 min; human with desk calculator ~12 h.

**Best script-safe formulation:** *"One trajectory was about seven hundred and fifty multiplications.
A woman with a desk calculator took the better part of a day to do it — accounts range from twelve
hours to three. The differential analyzer got it to fifteen or twenty minutes. ENIAC did it in well
under a minute. And a complete firing table still took about three months on two shifts."*

### Time for a COMPLETE table — and the caution that matters most

**~3 months on a two-shift basis** — Barnes→Buckley draft, c. Feb 1944 (above). **tier (b) quoting
(a).** Corroborating and looser: "a couple of months" (Augarten), "the better part of a month"
(Polachek, unread).

**On ENIAC: NOT ESTABLISHED — and the gap looks real rather than a search failure.** Harry L. Reed
Jr. (Aberdeen), "Firing Table Computations on the ENIAC," *Proc. 1952 ACM National Meeting*,
103–106 — the definitive paper by the man who ran the work — walks the entire pipeline (range
firings and reductions, least-squares fitting of the ballistic coefficient, separate trajectory sets
for range wind, density, temperature, muzzle velocity, weight and earth rotation, corrected time of
flight, osculatory interpolation, then the graphical table) and **gives no per-trajectory or
per-table wall-clock time anywhere.**

**W. Barkley Fritz, *A Survey of ENIAC Operations and Problems 1946–1952*, BRL Memorandum Report
No. 617 (Aug 1952) — tier (a) — is explicit:**

> "**The determination of the numerical data for Firing Tables and Bombing Tables is a more extensive
> computational problem than the mere computation of the trajectories.**"

Fritz also records that ~25% of ENIAC's computing time went to ballistic tables across 41 problems;
that eleven problems were completed between Feb 1946 and Mar 1948; and that machine productivity ran
"from 5% to as much as 25%" on one 8-hour shift, five days a week.

**Docent guidance:** *"ENIAC computed a trajectory in about thirty seconds"* is fine. *"So ENIAC
could make a firing table in thirty seconds times three thousand"* is not — trajectory integration
was one phase of many.

### NOT ESTABLISHED

- **A "tables in arrears" count.** The August 1944 memo deliberately declines to quantify it ("far
  exceeds"). Would live in BRL Computing Branch progress reports, **NARA RG 156**.
- **A global "N months behind."** Only Brainerd's weapon-specific "held up several months" is sourced.
- **Time to produce a complete firing table on ENIAC.** See above.
- **Polachek 1997 full text** — the "40 hours / 30 minutes / hundreds of trajectories / better part
  of a month" cluster all rests on it and it was **not read**. Polachek was a BRL insider, so this is
  the **highest-priority remaining chase**: IEEE Xplore, DOI 10.1109/85.586069, via a library.

---

## 2. The human computing group at the Moore School

**Status: ESTABLISHED on every part of the question, including the formal job classification and
the differential analyzer. This turned out to be the best-answered item in the pass.**

The load-bearing source throughout is **W. Barkley Fritz, "The Women of ENIAC," *IEEE Annals of the
History of Computing* 18:3 (1996), 13–28**, which prints first-person accounts collected directly
from the women in 1995. Free PDF:
https://courses.cs.washington.edu/courses/csep590a/06au/readings/00511940-frist.pdf — **tier (b)**,
first-person testimony in a peer-reviewed journal.

### The unit and its name

It was called **the Computing Unit** — Betty Snyder "joined the **Philadelphia Computing Unit at the
Moore School** on August 19, 1942" (Fritz 1996, 17). It began in a converted classroom: Kay McNulty,
arriving summer 1942, found "a large classroom… now housed some **12 women and four men** all busily
occupied with desk calculators and large sheets of columned paper," working alongside a group "who
had recently arrived from the APG… busily calculating trajectories for firing tables."

### Headcount — ESTABLISHED, with a range explained by date

| Figure | Source | Tier |
|---|---|---|
| ~12 women and 4 men (summer 1942, at the start) | Kay McNulty in Fritz 1996 | (b) |
| **"At one point, there were about 100 women on two shifts"** — after the unit outgrew the Moore School's first floor and moved into "a pair of three-story houses at 3436 Walnut St." | Kay McNulty in Fritz 1996, 17 | **(b)** |
| **"about 70 of us computing firing tables"** (Jean Jennings's own count, on arriving ~March 1945) | Betty Jean Jennings (Bartik) in Fritz 1996, 21 | **(b)** |
| **176 computers in the Computing Branch** (BRL-wide, c. **February 1944**) | **Barnes→Buckley draft, Goldstine 1972, p. 165** | **(b) quoting (a) — the strongest number available** |
| "about 100 human computers… were trained at BRL" | Martin 1995 | (b) |
| "seventy or even eighty" computers needed at the Moore School; winter 1943 "less than half that number"; first training class **21**, fall 1942 | Grier, p. 260, citing an unsigned report of 27 July 1942, Penn Archives | (b) citing (a) |
| ~**60 WACs** (two sections of ~30) at the Moore School | *Daily Pennsylvanian*, 29 Sep 1943, via Light fn 32 | (a) via (b) |
| **"a staff of about 200 trained computers was needed to complete the tables"** | **U.S. War Department, Bureau of Public Relations press release, 30 January 1946** — https://www.ece.rice.edu/~dhj/History/ENIAC1.pdf | **(a)** |
| **"nearly two hundred"** young women, civilian and military, on the ballistics project | Light 1999, 455 and 463 — **but see the caution below** | **(b)** |

**⚠️ Caution on Light's "200": it carries no citation.** The footnote marker in that paragraph
(fn 24) attaches to the *differential analyzer* sentence, and fn 24 is entirely about the analyzer
agreement. So the 200 figure sits in a peer-reviewed article with **no source given** — provenance
effectively tier (d) inside a tier (b) publication. It reconciles plausibly (~100 at Aberdeen + ~100
at Penn + ~60 WACs) and Light says "both civilian and military," so **treat it as a plausible
cumulative total, not a peak headcount.** The War Department release independently supports ~200 for
the project, which is why the figure is still usable.

**These are not rival figures — they count different things, and the script should not pick one.**
The **~70–100** figures are first-person accounts of *the Moore School unit at particular moments*
(McNulty describing its peak on two shifts; Bartik counting the room she walked into in 1945). The
**~200** figure is the *whole project* — civilian and military, Moore School and Aberdeen — and it
has the strongest source of all, the Army's own press release.

**Script-safe, and it works either way:** *"About a hundred women at a time worked in the
Philadelphia computing room, on shifts. By early nineteen forty-four the Ballistic Research
Laboratory's Computing Branch had a staff of a hundred and seventy-six. Over the course of the war,
close to two hundred women passed through the program."* The 176 is dated, contemporaneous and the
strongest figure in the set.

**⚠️ Avoid "two hundred women worked at the Moore School."** No source supports that; the ~200 is
project-wide and cumulative.

The shift system is documented and is good detail: "there were about 100 women on two shifts, with
those on the incoming shift continuing work on the incomplete trajectory computations from the
previous shift until each trajectory was completed" (McNulty). A single trajectory outlived a
working day and was handed across the shift boundary.

### Formal job classification — ESTABLISHED, tier (b), and this is the answer the script wanted

> "Fran and I went in together for the interview and were both accepted one week later as
> **computers, SP-4, a subprofessional civil service grade.**"
> — **Kathleen McNulty (Mauchly Antonelli)**, in Fritz 1996, 15.

Corroborated independently by **Lila Todd (Butler)**: "I accepted a **subprofessional appointment
(SP-4)** at the BRL at the APG" (Fritz 1996, 14).

**So the title was "computer" and the grade was SP-4 — literally "subprofessional."** The
classification that the script's closing argument turns on was not a metaphor or a later
interpretation; it was a civil-service grade code, applied at hire, in writing.

### And the statute defines "subprofessional" in a way that makes the point by itself

**Classification Act of 1923**, ch. 265, Pub. No. 516, **42 Stat. 1488, §13** — **tier (a)**. The
Subprofessional Service is defined as work "**incident, subordinate, or preparatory**" to
professional work, requiring training "**of any degree inferior to that represented by graduation
from a college or university of recognized standing.**"

**That is the whole thesis of the episode in one statutory sentence.** These women were hired onto a
pay scale legally defined as requiring *less than a college degree* — through a recruiting drive that
advertised specifically for *women with college degrees in mathematics*. The mismatch was not an
attitude; it was a grade code.

Statutory grade ladder: SP-1 minor, SP-2 under, SP-3 junior, **SP-4 assistant**, SP-5 main, SP-6
senior, SP-7 principal, SP-8 chief.

**Salary — documented for the Moore School group at $1,620/year.** Grier, *When Computers Were
Human*, p. 259, from Penn archival correspondence: Brainerd "had offered each of them a position as
an **assistant computer with a salary of $1,620 per annum**." Note the tight fit: "assistant
computer" matches SP-4's statutory name, and $1,620 is exactly step 3 of the SP-4 range.
**tier (b) citing (a).**

**⚠️ Do NOT use the $1,440 figure.** It is well known from NASA's "When the Computer Wore a Skirt"
(SP-3 Junior Computer $1,440 rising to SP-8 Chief Computer $3,200, against "Junior Engineer" — a
professional grade — starting at **$2,600** for men with similar qualifications). That comparison is
devastating and true, **but it is NACA Langley's, not BRL's.** Don't attribute it to the ENIAC women.
Also note the 1923 statutory dollar figures were adjusted by later legislation before 1942 — hedge
any dollar amount quoted as a 1942 salary.

Corroborating the contest over it: "Although most were college graduates, the 'girls' were told that
only 'men' could get professional ratings. Finally, in **November 1946**, many of the women received
professional ratings." — Moye 1996 (ARL), https://ftp.arl.army.mil/~mike/comphist/96summary/
**tier (c)**.

**Confidence: high.** This is a significant upgrade on the brief and should go straight into
Segment 3 and into the Part 2 hand-off.

### Relationship to Aberdeen / BRL — ESTABLISHED

The Moore School group was a **BRL section, stood up deliberately by Aberdeen inside Penn**:

> "Shortly after arriving, Major Paul N. Gillon (assistant director of BRL) told me of the plan to
> use the differential analyzer at the Moore School to compute trajectories for firing tables. I was
> in the BRL's Firing Tables Section when he asked me to **go to Philadelphia and form a section
> there**… **Six of us were sent to Philadelphia**, but after two months only Willa Wyatt Sigmund and
> I remained. We each supervised **the differential analyzer and the computer sections**. Each of us
> was responsible for an eight-hour shift, and together we covered 16 hours a day for six days each
> week. Penn students operated the analyzer. Shortly thereafter **John Holberton was transferred
> from BRL to be our supervisor**; and with the rapidly growing workload, we continued to add staff."
> — **Lila Todd (Butler)**, in Fritz 1996, 14. **tier (b)**

Corroborated from the Army side: **Major** Paul N. Gillon requested that **1st Lt. Herman H.
Goldstine** be assigned to the Moore School "as supervisor of the computational and training
activities," which put Goldstine "and **the BRL annex of firing table personnel**" inside the Moore
School — Moye 1996, **tier (c)**.

**⚠️ Two rank corrections.** Moye calls Gillon a *Captain* in mid-1942; two independent 1942 sources
call him **Major** (Lila Todd in Fritz, p. 14: "Major Paul N. Gillon, assistant director of BRL"; the
Zug inspection report of 14 July 1942 is addressed to Major Gillon). He made Colonel later.
**Say "Major," or give no rank.** And **Goldstine was a First Lieutenant from 7 August 1942**, in his
own words: "On 7 August 1942 I reported for duty. I was then a first lieutenant and was assigned at
once to Paul Gillon… On September 1 Gillon and I went to inspect the small activity the Laboratory
had at the University of Pennsylvania's Moore School… **I was placed in charge of the entire
operation in Philadelphia.**" (Goldstine, Jayne Lecture 1991, **tier (a)**.) He made Captain later.
BRL's director was **Colonel Leslie E. Simon**.

**⚠️ "Philadelphia Computing Section" is modern scholarship, not a wartime title.** The phrase is
standard in Kleiman and in recent articles, but **it was not found inside any tier (a) wartime
document.** What contemporaneous and Army sources actually call it: "the BRL annex of firing table
personnel" and "the sister branch and analyzer at Moore School" (Moye); "the small activity the
Laboratory had at the University of Pennsylvania's Moore School" (Goldstine, tier a); "a staff was
sent to Philadelphia to operate it for BRL" (*Ballisticians*, tier a); Lila Todd's own "go to
Philadelphia and **form a section there**." **Use it as "what's usually called the Philadelphia
Computing Section" — don't present it as a quoted wartime name.**

Employment was formally split. The January 1946 Army photo captions distinguish women "in the employ
of the **Ballistic Research Laboratory, Aberdeen Proving Ground**" (Bilas, Jennings, Lichterman,
Snyder, Wescoff) from a "**Moore School employee** on the ENIAC project" (Akrevoe Kondopria).
— War Department photo captions appended to Goldstine to Capt. J. J. Power, 17 January 1946,
Goldstine Papers; reproduced in Jennifer S. Light, "When Computers Were Women," *Technology and
Culture* 40:3 (July 1999), 476. **tier (a) via (b)**

And the section was wound back to Aberdeen before ENIAC moved: "all of the BRL group (except for
Fran Bilas, who was one of those selected to work on the ENIAC) were **transferred back to BRL in
November 1945**, long before the ENIAC was scheduled for its move" — Lila Todd (Butler), Fritz 1996.

### The differential analyzer — YES, the script can name it, and the size question is now resolved

**The Moore School had a Bush-design differential analyzer, built in the Moore School's own shops,
completed 1935, with 14 integrators to Aberdeen's 10.**

**Integrator counts — RESOLVED, tier (b) quoting (a):** the Barnes→Buckley draft of c. 1 February
1944 (see §1) states both in one sentence — "a **10-integrator** differential analyzer at Aberdeen
and a **14-integrator** one at Philadelphia." This is contemporaneous, written by the man who ran
the Philadelphia operation, and predates by 17 years the two 1961 Army publications (Weik, Kempf)
that were previously the only support for "14." **Confidence: medium-high.** For comparison, MIT's
original 1931 machine had **6** integrators (Larry Owens, "Vannevar Bush and the Differential
Analyzer," *Technology and Culture* 27:1 (1986), 72).

A competing "ten" for the Moore School traces to **1934 newspaper coverage written while the machine
was still under construction** — describing an unfinished machine. **Bulletproof fallback if
challenged:** "a Bush differential analyzer, larger than the Army's own at Aberdeen," which three
independent Army sources support, including *Ballisticians in War and Peace* (tier a): BRL "arranged
to have access to a **larger analyzer of the same type** in the Moore School… Rather than move this
machine to Aberdeen Proving Ground, **a staff was sent to Philadelphia to operate it for BRL**."

**Who built it — the builder's own testimony. tier (a).** Irven Travis, oral history by Nancy Stern,
21 October 1977, Charles Babbage Institute **OH 36**
(https://conservancy.umn.edu/handle/11299/107688):

> "So I visited Bush at MIT and **borrowed his chief draftsman**, and got all the information that he
> thought was right… And so **we built a differential analyzer at the Moore School, sponsored by
> Aberdeen**."

> "**One was built at the Moore School, in the Moore School shops.** The other was built by contract…
> so **two identical machines were built from the same plans.** And… there was **a clause in the
> agreement between Aberdeen and the Moore School that in the event of war, the Moore School machine
> would be made available to Aberdeen**… And that's really how the whole computer project at the
> Moore School got started."

**Date: completed 1935** (Penn Engineering history timeline; Living New Deal citing the FERA's own
1935 report). ⚠️ Grier, p. 258, says 1937, citing sources that do not say 1937 — judged an error, do
not repeat. **Say "completed in 1935" or "built in the mid-1930s."**

**Funding — genuine conflict, so keep it loose:** PWA (Travis, hedged) / CWA + FERA (Living New Deal
citing the 1935 FERA report) / CWA with War Department endorsement (Augarten) / "the proving ground
had financed it" (Grier). **Safe: "built with New Deal relief money, sponsored by the Army."**

**⚠️ Do NOT say "designed by Oscar Schuck."** One tier-(c) page says this; it is uncorroborated and
contradicted by the builder's own testimony. The Moore School figure who secured the funding was
**Professor Charles Fawcett**.

**⚠️ Do NOT say "there were only two Bush analyzers in America."** Owens 1986, 65: General Electric,
Aberdeen, and the universities of Pennsylvania, California and Texas all built them, plus MIT's own
second machine (the Rockefeller Differential Analyzer No. 2, operational Dec 1941, **18** integrators).
**Correct wartime-relevant statement:** "The Army had one at Aberdeen, and the only other one it
could get its hands on was Penn's."

**⚠️ Do NOT say the machine was "seized," "commandeered" or "confiscated."** The record shows a
mid-1930s contractual clause plus a June 1942 contract at **$3.00 per hour** — Grier, p. 259, from
the archives: "**In June 1942, proving ground officials notified the University of Pennsylvania that
they needed to use the differential analyzer… and offered to reimburse the school $3.00 an hour.**"
Light's "commandeered" and Augarten's "requisitioned" are both looser than the archival record.

**Under-told beat worth the airtime:** the Army took over the *better* machine and found it
neglected. Army inspection, 14 July 1942 (R. S. Zug to Major Gillon, Penn Archives, in Grier p. 259):
the Philadelphia analyzer "**has not been under the compulsion of the great accuracy demanded at
Aberdeen, and therefore has not been as assiduously cared for** as the Aberdeen analyzer." Grier,
p. 258: "For other periods, the machine stood idle, gathering dust and dripping oil."

**Two caveats the popular story omits:**
- **It was not simply "the fast option."** It had to be physically re-geared for each equation, so
  "it wasn't practical to readjust the analyzer every time a new variable had to be calculated, [and]
  the bulk of the BRL's work was relegated to human computers" (Augarten, tier c).
- **It was LESS accurate than hand computation.** "The solutions obtained on the Differential
  Analyzer were not as accurate as those obtained by manual calculation" (Polachek 1997, quoted in
  Maarten Bullynck, *Revue de Synthèse* 139:3–4 (2018), tier b). Goldstine puts analyzer precision at
  ~5 parts in 10,000 — "about the utmost in accuracy attainable by such a machine." **This is a good
  corrective: the women were not simply slower than the machine, they were more precise than it.**

Further details, tier (b) unless noted:

- **Provenance:** "The differential analyzer had been **loaned by the University of Pennsylvania to
  APG for the duration of the war.**" — Kay McNulty in Fritz 1996, 16. From the Army's side,
  "in **June 1942**, the Ordnance Department contracted with Moore School to operate its **somewhat
  faster** Bush differential analyzer exclusively for the Army" — Moye 1996, **tier (c)**.
- **BRL's own machine** was ready for use at Aberdeen in **1935** under Major James Guion, with two
  firing tables computed on it "with gratifying results by mid 1936" (Kempf 1961 ch. 1, **tier (a)**).
- **Who ran it:** "Professor **Cornelius Weygandt** was in charge for the Moore School and **Joseph
  Chapline**, a former student of John Mauchly at Ursinus College, was in charge of changeovers and
  maintenance of the analyzer." Two young men from Aberdeen, **Seymour Goodman and Ted Ricci**, were
  in charge of operating it; Penn students also operated it. — Fritz 1996, 16 and 14.
- **What operating it involved:** "setting up the boundary conditions in the integrators, repairing
  or replacing the strings and bands on the torque amplifiers, guiding the arbitrary functions from
  input tables, and punching out the results of the calculations at specified times and at summit and
  ground." — Fritz 1996, 16.
- **Division of labour:** "The analyzer was used to produce trajectories, and desk calculators were
  used to generate the more complex firing tables." — Lila Todd (Butler), Fritz 1996, 14. Worth
  getting right: the machine did trajectories, the women did the tables *and* trajectories both.
- **A detail worth the airtime:** "The room housing the analyzer was **the only air-conditioned room
  at the Moore School.** Because of this Fran and I quickly learned the names of the Moore School
  personnel who came to cool off during the very hot summer of 1942." — Kay McNulty, Fritz 1996, 16.

**Confidence: high on all of it.** The script's caution was warranted and is now discharged.

### Recruiting — ESTABLISHED

- Newspaper advertising: "Just after graduation, I happened to see an ad in the daily paper. **The
  Army was looking for women with a degree in mathematics** — right here in Philadelphia."
  — Kay McNulty, Fritz 1996, 15.
- Standards fell as demand rose: **Marie Bierstein (Malone)**, a Duke French/Spanish major with one
  year of college math — "when the BRL was reduced to advertising for female college grads with
  '**some mathematics**,' I saw no impediment to applying." — Fritz 1996, 24.
- In-house training: classes at the Moore School "taught by **Adele Goldstine, Mary Mauchly**" and
  **Mildred Kramer**; some recruits had been "trained in math at the college level by some aging
  ex-teachers from the Moore School." — Fritz 1996, 16.
- **University placement offices** — Ruth Rauschenberger (Ammlung), tier (a): recruited "through the
  Temple University placement office."
- **Penn's own alumnae lists**, which failed: hoping for "twenty to thirty women with bachelor's
  degrees in mathematics or physics," they "scoured the school's alumna lists" and "**had identified
  only eight**." — Grier, p. 259.
- **Professional-society circulars.** Brainerd "sent circulars to the **American Mathematics
  Society** and the **American Association of University Women**, and wrote to university faculty to
  ask the professors to **volunteer their daughters or their daughters' friends**." — Grier, p. 260,
  citing Moore School Office of the Vice Dean Records, UPD 8.1, Penn Archives. **tier (b) citing (a).**
- **Adele Goldstine's recruiting road trips — the richest verified detail in this item.** Grier,
  p. 260: "**Goldstine took to the road, visiting Bryn Mawr and Swarthmore Colleges in suburban
  Philadelphia, Goucher College in Baltimore, Douglass in New Jersey, and her own Hunter College.**"
  In her own words to Brainerd: "I've arranged to be at **Queens College** Tues[day]… **next week is
  exam week. Also I was not able to arrange for any very effective means of advertising the job.**"
  At one college she found "**only 25 or so women seniors** all of whom have good prospects in their
  own fields and so probably could not be enticed by our offer."
- **An outsourcing attempt.** February 1943, Brainerd wrote to Lyman Briggs at the National Bureau of
  Standards hoping the **Mathematical Tables Project** could supply computers. — Grier, 257–258.
- **The WACs** — Colonel Simon's answer when all of the above ran dry.

**⚠️ Was hiring exam-based? NOT ESTABLISHED.** They held civil-service appointments, and Goldstine
speaks of "civil service women," implying a register — but McNulty describes an **interview**, not an
examination, and no exam document was found. Wartime war-service indefinite appointments often waived
examination, but that was not verified. Would live in **NARA RG 146** (US Civil Service Commission)
or the USCSC Annual Report FY1942–43.

**Two statistics that make the recruiting problem concrete:** Kay McNulty graduated Chestnut Hill
College in 1942 with "one of the **three** math degrees awarded in her class" (Light, 463). Better
still, **Lila Todd** graduated Temple in June 1941 "as **the only female with a major in mathematics
out of some 1,600 in the graduating class. The head of the math department didn't think women should
major in math**" (Fritz, 14, **tier (a)**).
- Fritz's summary of the labour market: "Several men originally involved as civilian computers by
  the Army were drafted… **By 1943, and for the balance of World War II, essentially all computers
  were women as were their direct supervisors.**" — Fritz 1996, 14. This is the sentence that makes
  Segment 3's argument, from a peer-reviewed source.

---

## 3. Eckert and Mauchly

**Status: ESTABLISHED for roles and ages. The "how they came to work together" mechanism is
sourced at low resolution here — see the caveat.**

### Roles on the project — tier (c), Army historian

"The so-called 'Project PX' was placed under the supervision of [John Grist] Brainerd, with
**Eckert as chief engineer** and **Mauchly as principal consultant**. Goldstine was the resident
supervisor for the Ordnance Department… Three other principal designers worked closely on the
project: Arthur W. Burks, Thomas Kite Sharpless, and Robert F. Shaw."
— Moye 1996 (ARL).

Moye also identifies them, at the point Goldstine arrived in 1942, as "**Dr. John W. Mauchly, a
physicist, and J. Presper Eckert, Jr., an engineer**."

### Dates and ages — ESTABLISHED, tier (a)

**J. Presper Eckert Jr.: born 9 April 1919, Philadelphia; died 3 June 1995.** Locked to a primary
source by Eckert himself — CBI oral history **OH 13**, interviewed by Nancy Stern, 28 October 1977
(https://conservancy.umn.edu/items/06db4836-2170-4f8f-84cf-1a66c6ff2a1d), on the 9 April 1943
proposal meeting at Aberdeen: "**It was my 24th birthday when we started the project.**"
1919 + 24 = 1943. ✓ **tier (a).**

**John W. Mauchly: born 30 August 1907, Cincinnati; died 8 January 1980**, Abington PA, during heart
surgery. — Penn RBML, John W. Mauchly papers finding aid, Ms. Coll. 925
(https://findingaids.library.upenn.edu/records/UPENN_RBML_PUSP.MS.COLL.925), **tier (a)/(b)**.
⚠️ Minor conflict: the *Complete Dictionary of Scientific Biography* gives 9 January, Ambler PA —
probably the NYT obituary date and his home town. **Use 8 January; note the conflict exists.**

| Moment | Mauchly | Eckert |
|---|---|---|
| June 1941, the Atanasoff visit | 33 | 22 |
| Summer 1941, the defense-training course | 33 (turned 34 on 30 Aug) | 22 |
| **9 April 1943, the Aberdeen proposal** | 35 | **turns 24 that day** |
| June 1943, contract signed | 35 | 24 |
| February 1946, the unveiling | **38** | **26** |

The Feb 1946 ages are independently confirmed contemporaneously: the *New York Times* of 15 February
1946 describes "Dr. John William Mauchly, **38**, a physicist and amateur meteorologist, and his
associate, **J. Presper Eckert Jr., 26**, chief engineer on the project." — T. R. Kennedy,
"Electronic Computer Flashes Answers, May Speed Engineering," quoted in Light 1999, 474. **tier (a).**

**⚠️ The age gap is about 11½ years, not 12.** Precisely 11 years, 7 months, 10 days. The commonly
repeated "twelve years older" overshoots. Say "about eleven and a half years older," or "roughly a
dozen."

**Best line available:** *"Eckert was twenty-four the day the ENIAC proposal went to the Army — it
was literally his twenty-fourth birthday — and still only twenty-six when the machine was unveiled."*

### Backgrounds

**Mauchly:** PhD in physics, **Johns Hopkins, 1932** — entered in 1925 as an *engineering* student,
switched to physics as a sophomore, and **never took a bachelor's degree**. Penn finding aid: "earned
a Ph.D. in physics from Johns Hopkins University in 1932 **without completing his undergraduate
degree**." **tier (a)/(b).** Dissertation on molecular band spectroscopy. Then **Ursinus College,
1933–1941: head of the physics department — and its only member** ("he was, in fact, **the only staff
member**"). ⚠️ His rank at Ursinus is disputed three ways (he called himself "a full professor" in
1973; other sources say "professor" or "associate professor"). **Say "head of the physics department
at Ursinus — a department of one."** Everyone agrees, and it is the better line.
⚠️ IEEE *Computer Pioneers* lists "physics, Johns Hopkins University, 1929" — that is not a
bachelor's degree and contradicts the well-established no-undergraduate-degree fact. **Do not report
a 1929 BS.**

**Great script line, high confidence:** *"He walked into Johns Hopkins in nineteen twenty-five to
study engineering, switched to physics as a sophomore, and walked out in nineteen thirty-two with a
PhD — and no bachelor's degree at all."*

**Eckert:** BS in electrical engineering, Moore School, **1941**; MS **1943** (NAE; MacTutor says
"nearly completed by May 1943" — no registrar-level confirmation found). **⚠️ The Wharton story is
NOT ESTABLISHED** — the claim that his parents pushed him toward Penn's business school before he
switched to engineering appears only in tertiary reference works, is absent from his own oral
history, and circulates with two incompatible timings. **Drop it, or say "by most accounts" and give
no year.** Also ⚠️ avoid the genealogical rendering "John Adam Presper Eckert Jr." — the "Adam" is
not confirmed by any tier (a)/(b) source. He went by "Pres."

**Mauchly's rank at Penn:** **instructor** from autumn 1941; promoted to **assistant professor in
1943** (Penn RBML finding aid). His own gloss, Smithsonian Computer Oral History, interviewed by
Henry Tropp, 10 January 1973 (https://www.si.edu/media/NMAH/NMAH-AC0196_mauc730110.pdf), **tier (a)**
— and it is a usable beat:

> "after the summer of '41, I was offered a position on the faculty, **not on the faculty, but the
> staff** of the Moore School as an instructor… **an instructor is a pretty low rank when you've been
> a full professor.**"

### How they came to work together — RESOLVED at tier (a). The earlier caveat is discharged.

**Summer 1941, a federally funded electronics defense-training course at the Moore School. Mauchly
was the student; Eckert was the laboratory instructor.** Eckert says so himself — CBI **OH 13**,
**tier (a)**, and this is the single best quote available for the segment:

> "…during conversations that I had with him in the laboratory when — the curious thing was —
> **I was the teacher and he was the student** — although he had a Ph.D. and I was simply studying
> for my masters at the time."

Corroborated three ways: Mauchly himself (Smithsonian OH, tier a) — "in the afternoon we had
laboratory sessions and **Eckert was the person in charge of some of those sessions**"; **Carl
Chambers**, who ran the course (CBI **OH 7**, tier a) — "Eckert was one of the instructors. He'd been
a graduate student here so he was an instructor in the class — in the laboratory"; and the Penn RBML
finding aid.

**Course specifics, tier (a) unless noted:** roughly two months, beginning shortly after mid-June
1941; run by Carl Chambers, who personally interviewed Mauchly for admission; Moore School faculty
gave the morning lectures and Eckert ran the afternoon labs; about **30 students**. Chambers on its
purpose: "designed to change people with master's or doctor's degrees in mathematics or physics into
**electronic engineers**… because at that time we knew that **radar** was a subject they had to
learn." ⚠️ **Cite no PhD count** — the NAE tribute says "sixteen with Ph.D.s," but Mauchly says Arthur
Burks "was the only other Ph.D.," and Chambers describes intake as "master's *or* doctor's degrees."
Both participants contradict the NAE figure.

**⚠️ NAMING CORRECTION — "ESMWT" is anachronistic for summer 1941.** The Office of Education program
began 9 October 1940 as **Engineering Defense Training (EDT)**, became **ESMDT** in 1941, and became
**ESMWT** only **after Pearl Harbor, in 1942** (National Archives, *Guide to Federal Records*, RG 12,
**tier (a)**). Mauchly himself called it "the Moore School Defense Training Course in Electronics."
**Script-safe: "a federally funded defense-training course in electronics at the Moore School — part
of the wartime Office of Education program later known as ESMWT."**

**The best narrative beat in this item — Mauchly took the course as a way in.** Chambers, tier (a):
"he said he wanted to come to the Moore School because **he was interested in the development of the
computer**. He thought that we would be sympathetic here and he wanted to get to know the people and
take a course. **The opportunity to take a course was a way to get associated with the Moore
School.**" And at the end of it: "**Mauchly and Burks** were the two people from the group of about
30 students who were continued as instructors here on the staff… **That was the beginning.**"

### The 1942 memorandum — and a correction worth the airtime

**"The Use of High Speed Vacuum Tube Devices for Calculating," August 1942.** Dated to August (not
"fall") by the University of Pennsylvania Archives' **ENIAC Trial Exhibits Master Index**
(https://archives.upenn.edu/wp-content/uploads/2017/01/ENIAC-Trial-Exhibits-Master-Index-by-Name-1.pdf),
which lists **two** exhibits both dated "1942, August" — **tier (a)**. No day of the month
established. Reproduced in B. Randell, ed., *The Origins of Digital Computers*, 3rd ed. (Springer,
1982), 355–358.

**It went to colleagues, not the Army,** and got no reply — Mauchly, tier (a): "I gave a copy of this
to three or four different people: **Dr. Chambers**… and certainly to **Dr. Brainerd**… I expected
then that I would get some criticism or response from them. **I didn't.**"

**Why he wrote it: Chambers made him.** Two primary accounts from opposite sides. Mauchly: Chambers
said "'All you're doing is making sounds in the air… You've got to put something more permanent on
paper.'" Chambers: "**Mauchly all the time… was a pest** talking about what he wanted — the computer
he wanted. At one point, I said, 'For goodness sake, write this up and put it down on paper so if the
opportunity comes for support, it'll be there.' And finally he did."

**⚠️ CORRECTION — it did not survive as a secretary's carbon copy. It survived as her Gregg
shorthand notes.** Two primary sources, interviewed four years apart, say so independently:

> "Unfortunately I found that I didn't have a copy myself, and when I found that no one else had a
> copy **we resurrected that, re-transcribing the secretary's shorthand notes, which were in good
> Gregg.**" — Mauchly, 1973, tier (a)

> "People have not been able to find an original copy, but **the shorthand notes were found. I
> remember he had dictated it originally.** Thus it was recovered, and has been reproduced."
> — Chambers, 1977, tier (a)

**Confidence: high.** And it is a far better story than the usual version: *the founding document of
the ENIAC survived because a secretary's Gregg shorthand notebook outlived every typescript.*

Full arc, Mauchly 1973: August 1942 memo circulated → **no response** ("It's like dropping a stone
into the well and never hearing it splash") → c. December 1942 Brainerd writes a handwritten comment
on his copy addressed "John," meaning to return it, and never does → c. April 1943 Lt. Goldstine
takes an interest and asks for the write-up; **no copy can be found** → reconstructed from the
shorthand → Brainerd's annotated original surfaces only decades later, "**after the files of the
Moore School were subpoenaed**." Mauchly first saw Brainerd's comment in the early 1970s.
⚠️ Goldstine's own memoir credits his discovery of Mauchly's ideas to a conversation with **Joseph
Chapline** rather than a direct approach — so the *route* has two versions. The shorthand
reconstruction is not in dispute.

### For Part 4 only — Atanasoff dates, not to be used in Part 1

First met **December 1940**, AAAS annual meeting, Philadelphia. The Ames visit: **arrived Friday
13 June 1941, departed Wednesday morning 18 June 1941** — Mauchly, tier (a): "I think it was one of
those **Friday the thirteenths**… **from late Friday night to early Wednesday morning** is the total
scope of time." **Independent check: 13 June 1941 was a Friday and 18 June was a Wednesday** — his
32-year-old recollection is internally consistent with the 1941 calendar, which is a meaningful
reliability signal. ⚠️ "Four days" vs "five days" is purely inclusive/exclusive counting; Mauchly
notes the duration was litigated. He stayed at the Atanasoffs' house, saw the partially built machine,
read parts of the 35-page manuscript, and was **denied a copy** on patent grounds.

### Contract facts the script may need

| Fact | Value | Source | Tier |
|---|---|---|---|
| Contract number | **W-670-ORD-4926** | the 1946 *Report on the ENIAC* itself | (a) |
| Proposal presented at Aberdeen | **9 April 1943** — Eckert's 24th birthday | Eckert, CBI OH 13 | (a) |
| Contract signed | **5 June 1943**; six months of R&D; initial obligation **$61,700** | Weik, "The ENIAC Story" (1961) | (a)/(b) |
| Work actually began | 31 May 1943, before formal execution | Moye 1996 | (c) |
| Final total cost | **$486,804.22** after nine supplements | Weik; Moye | (a)/(c) |

**⚠️ Two traps.** The *Penn Almanac* 50th-anniversary article prints "on June 5, **1942**, contract
No. W-670-ORD-4926 was signed" — a typo for 1943, contradicted by its own April 1943 proposal date
and by every Army source. And the NAE tribute says ENIAC cost the government $400,000; **prefer the
Army's own $486,804.22.**

**One corroborated background detail, tier (b):** Mauchly taught at **Ursinus College** before Penn.
Fritz 1996, 16, identifies Joseph Chapline — who maintained the Moore School differential analyzer —
as "a former student of John Mauchly at Ursinus College." Mauchly's wife **Mary Mauchly** also taught
mathematics classes to the incoming computers at the Moore School (Fritz 1996, 16), and Mauchly
himself was an active teacher of the women: John Holberton, the computing group's manager, "shared
an office with John Mauchly and was learning ENIAC the same way we were. **John Mauchly was a good
teacher** and also was very concerned that we learn all the ways it was possible to use ENIAC."
— Jean Jennings Bartik in Fritz 1996, 20. By contrast, "**Only Presper Eckert, the chief engineer,
seems to have had the complete design picture, but he was not accessible to the women**" (Fritz 1996,
27), and Bartik: "I never actually talked with Pres Eckert until much later." That contrast — Mauchly
teaching, Eckert unreachable — is sourced and is useful characterisation for a one-sentence
who-they-were.

**Script-safe minimum sentence:** "Mauchly was a physicist, in his late thirties, who had come to
the Moore School in 1941. Eckert was an engineer barely out of school — twenty-six when the machine
was unveiled — and he was the project's chief engineer. Mauchly wrote the 1942 memo proposing an
electronic calculator; he developed it in consultation with Eckert."

**Relevant for Part 4, noted not asserted here:** Mauchly's visit to Atanasoff was in **1941**, and
his memo was **fall 1942**. Both dates are load-bearing in the 1973 ruling. Keep them out of Part 1.

---

## 4. Tube reliability, physical scale, speed, and the acronym

This marker asks for four things. Taking them in order.

### 4a. The acronym — SETTLED, tier (a)

**The answer: Electronic Numerical Integrator and Computer.**

Not an inference from secondary sources — it is the title page of the machine's own documentation.
All five volumes of the 1946 report are headed:

> Report on THE ENIAC (*Electronic Numerical Integrator and Computer*) — Developed under the
> supervision of the Ordnance Department, United States Army

**Source:** *A Report on the ENIAC (Electronic Numerical Integrator and Computer)*, University of
Pennsylvania, Moore School of Electrical Engineering, June 1, 1946 (work under Contract
No. W-670-ORD-4926). Full text of all volumes at the Internet Archive —
Vol. 1 Operating Manual: https://archive.org/details/ReportonENIACEl1Moor ·
Vol. 2 Maintenance Manual: https://archive.org/details/ReportonENIACEl00MoorA ·
Vols. 3–4 Technical Description Pt. I: https://archive.org/details/ReportonENIACEl00MoorB

**Tier:** (a). **Confidence: very high.** Corroborated by the 1955 Army survey and the 1961 Army
monograph (both below) and by Penn.

**Conflict:** "Electronic Numerical Integrator **and Calculator**" circulates widely. I found no
primary document using it. Treat as a corruption, not a variant.

**Curiosity, handle with care:** the spelling "**Computor**" was genuinely in circulation. The
Norristown *Times Herald* headline of 15 February 1946 reads "Electronic Computor (sic) Flashes
Answers" (Martin 1995's clipping survey, sourced to Hagley Museum and Library, Acc. 1825,
*Sperry Rand v. Honeywell* court documents — **tier (a)**), and Mauchly's 1942 proposal is described
as being for an "electronic computor" (Martin 1995). It also appears to occur *inside* the 1946
report — the Operating Manual's introduction is headed "INTRODUCTION TO REPORT ON THE ELECTRONIC
NUMERICAL INTEGRATOR AND COMPUTOR (ENIAC)" and the Maintenance Manual's inner title page reads
"(Electronic Numerical Integrator and Computor)" — while every outer title page reads "Computer."
**Caveat: both internal instances are OCR of scanned typescript, and "e"/"o" is the classic OCR
error.** Two independent instances in two different volumes makes it more likely than not, but
**the official name is "Computer" and that is what should be said on air.** Do not build a bit
around "Computor" without eyes on the original pages.

### 4b. Reliability engineering — how the objection was actually beaten

Five techniques. Four are documented in primary sources; one is not.

**(0) The foundational one — digital regeneration. ESTABLISHED, tier (a). This is the real answer
and the script does not currently have it.**

The deepest reason eighteen thousand unreliable components did not compound into a machine that
never worked is that **ENIAC's circuits were designed so that component drift could not accumulate.**
Adele Goldstine's *Part I, Technical Description of the ENIAC* states it plainly:

> "**In all cases, vacuum tubes in the ENIAC circuits are used only as on-off devices instead of as
> amplitude sensitive devices**, i.e., the presence or absence of a signal depends on whether a tube
> is conducting or not-conducting and not on any measured magnitude of current and voltage.
> Furthermore, **the machine has been so designed that signals are not constantly being degenerated
> but instead are regenerated from time to time** out of the fundamental train of pulses and a gate
> emitted by the cycling unit."

Kempf 1961 says the same thing from the Army side: "**Accuracy of computation was assured by
designing the basic circuits to work independently of the variable tolerances of their components.**
Numbers were not represented by electrical quantities which could be affected by changes in
tolerance, but only by the presence or absence of dynamic pulses."

**Why this matters for the script.** Segment 4's skeptics' argument is that the odds compound. The
real rebuttal is not "we picked good tubes" — it is *"we made the machine indifferent to how good
the tubes were."* A tube either conducts or it doesn't; a weak tube that still switches is a working
tube; and the signal is rebuilt from a clean master pulse train at every stage, so error cannot
accumulate down a chain. That is the whole idea of *digital*, arrived at as a reliability strategy.
It is the strongest and most interesting thing in this entire verification pass, it is primary-
sourced twice over, and it is a genuinely better answer than any of the folklore.

**(i) Derating — running components below their ratings. ESTABLISHED, tier (a).**

Two independent Army-side statements:

> "To ensure reliable operation, circuits were constructed of rigidly tested standard components,
> **which were operated at current, voltage, and power levels below their normal ratings.**"
> — Karl Kempf, *Electronic Computers Within the Ordnance Corps*, Historical Monograph, Aberdeen
> Proving Ground, November 1961, ch. II.
> https://ftp.arl.army.mil/~mike/comphist/61ordnance/chap2.html

> "**Practically all circuits in the ENIAC were designed with at least a 2 to 1 safety factor.**
> Thus, parameters (such as loads, voltages, et cetera) can be varied considerably without effecting
> the operation of a normal unit."
> — *Report on the ENIAC, Maintenance Manual*, June 1, 1946, §1.7, p. I-5.

The **2-to-1 safety factor** is the best number the script can use, and it comes from the machine's
own maintenance manual. It is far more defensible than the widely repeated "Eckert ran the tubes at
one-quarter power," which appears on Penn Engineering's own history page
(https://www.engineering.upenn.edu/about/history-heritage/eniac/) **with no citation — tier (c),
arguably (d)**. Eckert's own recollection is looser: the team "decided that our tube filaments would
last a lot longer if we kept them below their proper voltage. Not too high or too low."
— Alexander Randall 5th, "A lost interview with ENIAC co-inventor J. Presper Eckert,"
*Computerworld*, 14 February 2006, from a 1989 recording.
https://www.computerworld.com/article/1701347/q-a-a-lost-interview-with-eniac-co-inventor-j-presper-eckert.html
**tier (b)** — oral history, 43 years after the fact.

**Script-safe:** "the circuits were built with at least a two-to-one safety margin, and the tubes
were run below their rated voltage and current." Both halves sourced. **Avoid "one-quarter power"** —
a specific number resting on nothing.

**(ii) Thermal cycling. ESTABLISHED as an engineering concern, tier (a) — but the popular version
overstates it.**

The Maintenance Manual documents that heating/cooling cycles were understood as *the* failure
driver, and that procedures were written around avoiding them:

> "This prevents any testing (by going through portions of the starting sequence) from subjecting
> the tubes to **numerous heating and cooling cycles (which would increase the probability of
> failure of the tubes)**."
> — *Report on the ENIAC, Maintenance Manual*, §11.3 "Starting Sequence."

**But "the machine was never turned off" is NOT supported by the primary documentation, and is
contradicted by it in detail.** The 1946 report describes:

- a stop switch that "turns the ENIAC off, including the heaters, the d-c power supplies, and the
  fans" (*Operating Manual*);
- a standing instruction that units not in use "may have their heaters turned off"
  (*Operating Manual*, §1.5);
- and, decisively, **per-panel heater switches and per-panel elapsed-hour meters on all forty
  panels**: "The heaters clock on the front of the initiating unit… keeps count of the number of
  hours that the power supply heaters are on… **On each of the remaining 39 panels of the ENIAC,
  there is also a heaters clock and an on-off switch for the heaters.** When the a-c is turned on,
  the heaters in a panel go on only if the switch for that panel is in the 'on' position."
  — Goldstine, *Part I, Technical Description of the ENIAC*, §9.

You do not build forty hour meters and forty heater switches into a machine that is never switched
off. What the design shows is a team **metering tube-hours panel by panel and switching off what
wasn't in use** — which is a more sophisticated practice than the myth, and a better line.

Also primary, and good on air: **every panel had a thermostat that shut the whole machine down if
the inside of that panel exceeded 115°F** ("Each panel, moreover, has a thermostat which prevents
the temperature inside the panel from exceeding 115 F by turning off the power to the ENIAC if this
limit is exceeded." — Goldstine, *Part I*, §1.5.1). The machine could and did turn *itself* off.

**Script-safe:** "they understood that switching a tube on and off was what killed it, and they
built their procedures around minimising that." **Not safe:** "they never turned the machine off" —
**tier (d)**: repeated everywhere, traceable to no contemporaneous document, undercut by the manuals.

**(iii) Tube testing, logging and marginal checking. ESTABLISHED, tier (a).**

- A dedicated **tube tester** was standard ENIAC test equipment (drawing PX-2-116, *Maintenance
  Manual* ch. XII).
- Standing order to maintenance staff: "**Keep log of all tube failures — list each tube.**"
  (*Maintenance Manual*, §1.2.)
- **Deliberate stress testing** to make marginal components fail on demand rather than mid-run:
  a variable oscillator and a variable power supply were built so the machine could be run
  off-frequency and off-voltage to "vary the voltages in a unit and **thus increase the probability
  of failure**." (*Maintenance Manual*, §1.7.) This is marginal checking, years before the term was
  in common use, and it is excellent material.
- At Aberdeen: "At the beginning of 1950 a **tube surveillance program** was initiated whereby tubes
  were life-tested and statistical data on the failures were compiled. All this led to methods of
  tube testing which were unique at the time." (Kempf 1961, ch. II.)

**(iv) Pre-installation burn-in / tube selection. NOT ESTABLISHED — tier (d).**

The claim that Eckert used "only tubes drawn from a special 'burnt-in' selection — tubes that had
been running long enough to be known to be good, but still young enough to have many useful hours
left" is repeated in many places. **Every trail I followed led back to a single University of
Pennsylvania course page (`seas.upenn.edu/~pws/EMX/eckert.html`), which is now a 404 and which
carried no citation of its own.** Nothing in the 1946 manuals, Kempf 1961, Weik 1955, the Eckert
interview, or CHM supports it.

**Recommendation: do not assert burn-in on air.** The 2-to-1 safety factor, the thermal-cycling
discipline, the tube log and the marginal-checking rig are all primary-sourced and are stronger
material anyway. If it exists, it would live in the Moore School progress reports under contract
W-670-ORD-4926, or in Eckert's 1946 Moore School Lecture on component reliability — neither online.

### 4c. Observed failure rate — CONFLICTING; the famous number is a single man's memory

| Figure | Source | Tier |
|---|---|---|
| "We had a tube fail about every two days and we could locate the problem within 15 minutes" | Eckert, interviewed 1989, publ. *Computerworld* 14 Feb 2006 | (b) — oral history, 43 yrs later |
| "ENIAC lost one vacuum tube roughly every day or two" | Computer History Museum, *Revolution* exhibit, https://www.computerhistory.org/revolution/birth-of-the-computer/4/78 | (c), unsourced — almost certainly downstream of Eckert |
| **"90% of the service interruptions were caused by vacuum tube failures"** | Kempf 1961, ch. II | **(a)** |
| **Average error-free running period 5.6 hours; operating ratio 0.69 — 113 "good" hours out of 164 hrs/week attempted (1955); 0.70 and 116 of 166 (1954)** | Martin H. Weik, *A Survey of Domestic Electronic Digital Computing Systems*, Ballistic Research Laboratories Report No. 971, December 1955, ENIAC entry. Text at https://ed-thelen.org/comp-hist/BRL-e-h.html | **(a)** |
| **"At the time of writing, the ENIAC is being tested about half of the time."** | R. F. Clippinger, *A Logical Coding System Applied to the ENIAC*, BRL Report No. 673, 29 September 1948, §E | **(a)** |

**The finding worth telling the client:** the beloved "one tube every two days" is one man's memory
from 1989 that everything else quotes. The Army's own contemporaneous numbers are less flattering
and much more interesting — **a mean error-free run of 5.6 hours**, roughly **31% of scheduled time
lost**, and in 1948 a machine that spent **about half its time being tested rather than computing**.

Kempf also records that heat was "a problem of major proportions and was **never solved** for the
ENIAC. Special air conditioning had not been provided and the blower system was not adequate to
dissipate the heat into the warm, humid atmosphere. The result was a shortening of tube life which
caused long periods of inoperation. For example, the checking routine alone took about eight hours."

**Caveat to state on air if these numbers are used:** the BRL and Clippinger figures describe ENIAC
at Aberdeen after modification, not the 1946 Moore School machine.

### 4d. Physical scale — CONFLICTING on every figure except weight

| Quantity | Figures found | Sources |
|---|---|---|
| Vacuum tubes | **18,000** (the machine's own 1946 documentation) / 17,468 / ~17,000 / 19,000 | **18,000: Adele Goldstine, *Part I, Technical Description of the ENIAC* (1946), §1.5.1 — "The ENIAC's 18,000 vacuum tubes generate a considerable amount of heat" — tier (a), and this settles it for the 1946 machine.** 17,468: Weik BRL 971 (1955) **(a)** and Haigh/Priestley/Rope, "Reconsidering the Stored Program Concept," *IEEE Annals* 36:1 (2014), n.3 **(b)** — the modified Aberdeen machine. ~17,000: Goldstine 1991 **(b)**; Martin 1995 "over 17,000" **(b)**. 19,000: Kempf 1961 **(a)** and Weik, "The ENIAC Story," 1961 **(c)** |
| Weight | "over thirty tons" — consistent everywhere | Kempf 1961 **(a)**; Martin 1995; Weik 1961; Penn |
| Floor area | **1,800 sq ft** (Aberdeen) / **1,500 sq ft**, a room 30 × 50 ft (Moore School) | 1,800: Weik BRL 971 and Kempf 1961 **(a)**. 1,500: Martin 1995 **(b)**; Penn's "30 by 50 feet" **(c)** |
| Dimensions | 40 panels in a U; ~80–100 ft of front; ~8–10 ft high; ~3 ft deep | Penn **(c)**; Goldstine 1991 "100 feet long, 10 feet high, and 3 deep" **(b)** |
| Power | **174 kW** / 150 kW / 140 kW / "almost 200 kW" | 174: Weik BRL 971, Kempf 1961 **(a)**, Martin 1995 "174,000 watts" **(b)**. 150: Penn **(c)**. 140: Goldstine 1991 **(b)**. ~200: Weik 1961 **(c)** |
| Other components | 1,500 relays; ~70,000 resistors; ~10,000 capacitors; ~6,000 switches; plus 7,200 crystal diodes and 4,100 magnetic elements by 1955 | Kempf 1961, Martin 1995, Goldstine 1991, Weik BRL 971 |
| Cooling / heat | forced-air blowers, **no special air conditioning**; heat "never solved" | Kempf 1961 **(a)**. The *Maintenance Manual* ch. XI documents the fan sets (American Blower Utility Sets No. 250C at 770 rpm), Fiberglas air filters, thermostatic dampers, and automatic shutdown on overheat — **(a)** |
| Cost | ~$500,000 (Martin) / ~$750,000 (Weik 1955 valuation); original contract $61,700, supplements to **$486,804.22** | Martin 1995; Weik BRL 971 **(a)**; Moye 1996 **(c)** |
| Build effort | ~1 year to design, ~1.5 years to build; ~200,000 man-hours | Martin 1995 **(b)** |

**Recommendation for air — this is now stronger than it was.** "**Eighteen thousand**" is not a
round-number convention; it is the figure the machine's own 1946 documentation uses, in Adele
Goldstine's volume. Say it without hedging. If a docent is pressed on the exact count, the correct
answer is: *"the 1946 Moore School documentation says eighteen thousand; the Army's 1955 inventory
of the modified machine at Aberdeen counts 17,468; a 1961 Army history says 19,000. They are
counting different machines at different times."*

Also safe on air: **it drew about 174 kilowatts, and it could not get rid of its own heat** —
Army-documented, and the second is the better line. And the primary detail behind it: every panel
carried a thermostat that killed power to the whole machine above 115°F.

**Also primary and usable:** ENIAC "requires **78 different d-c voltages**," derived from 240-volt
three-phase supply (Goldstine, *Part I*, §1.5.2). Seventy-eight separate supply voltages is a
vivid way to convey the engineering scale without another tube count.

### 4e. Arithmetic speed — ESTABLISHED, tier (a), with one wrinkle

Basic cycle: an "**addition time**" of **200 microseconds → 5,000 additions per second.**

**Best source is Adele Goldstine's own volume** — *Report on the ENIAC, Part I, Technical
Description of the ENIAC* (1946): the cycling unit's oscillator fires "at the rate of 100,000 per
second," an addition time is "200 micro-seconds (1/5000th of a second)," and the machine's signals
are "repeated every addition time (i.e. repeated **5000 times per second**)." **tier (a).**
Corroborated by Weik BRL 971 and Kempf 1961.

| Operation | Time | → per second |
|---|---|---|
| Addition | 200 µs | **5,000** |
| Multiplication (two 10-digit numbers) | 2,800 µs (Weik BRL 971) / 2.6 ms (Kempf 1961; Weik 1961) | ~**357** / ~385 |
| Division or square root (10 digits) | 24,000 µs (Weik BRL 971) / avg 25 ms (Kempf 1961) | ~**42** / ~40 |

Primary corroboration for multiplication: the 1946 *Operating Manual* states "A multiplication
requires from 6 to 14 addition times depending upon the setting of the [places switch]" —
14 × 200 µs = 2,800 µs, matching Weik exactly.

**Conflict / tier (d) flag:** the ubiquitous triplet "5,000 additions, 357 multiplications, **38
divisions** per second" (PBS, CHM captions, countless textbooks) does not match the Army's own
figures, which give division at 24–25 ms → ~40–42 per second. The 5,000 and 357 are sound.
**"38 divisions" is tier (d)** — I could not trace it to any primary document.

**Script-safe:** "five thousand additions a second, roughly three hundred and fifty multiplications,
about forty divisions." And, from Burks at the press demo: "The ENIAC added 5,000 numbers together
in one second. The problem was finished before the reporters had looked up."

### 4f. EDITORIAL FINDING — who actually wrote *A Report on the ENIAC*

**Raised separately by the coordinator. Resolved from the title pages themselves. The brief's §2
line that Adele Goldstine "wrote the manual" is imprecise in both directions — it overstates her
share of the five-volume work and it understates what she is credited with. The script's Segment 5
wording is closer to right than the brief's is.**

**Per-volume credit, verbatim from the title pages** (all five volumes, Moore School of Electrical
Engineering, University of Pennsylvania, June 1, 1946, work under Contract No. W-670-ORD-4926;
"This is copy No. 19 of 25 bound copies of this report"):

| Vol. | Title | Title-page credit — verbatim |
|---|---|---|
| **1** | ENIAC Operating Manual | "ENIAC OPERATING MANUAL **by Dr. Arthur W. Burks and Dr. Harry D. Huskey**" |
| **2** | ENIAC Maintenance Manual | "THE MAINTENANCE MANUAL **by C. Chu · J. A. Cummings · J. H. Davis · H. D. Huskey · T. K. Sharpless · R. F. Shaw**" |
| **3 & 4** | **Part I, Technical Description of the ENIAC** (Vol. I, chs. I–VI; Vol. II, chs. VII–XI) | "PART I — TECHNICAL DESCRIPTION OF THE ENIAC — **by Adele K. Goldstine** — Moore School of Electrical Engineering, University of Pennsylvania" |
| **5** | Part II, Technical Description of the ENIAC | "PART II — TECHNICAL DESCRIPTION … **by Dr. Harry D. Huskey**" |

**Sources:** the scanned volumes themselves —
Vol. 1 https://archive.org/details/ReportonENIACEl1Moor ·
Vol. 2 https://archive.org/details/ReportonENIACEl00MoorA ·
Vols. 3–4 https://archive.org/details/ReportonENIACEl00MoorB ·
Vol. 5 https://archive.org/details/reportoneniacele05moor
**Tier (a).** Indexed by The Online Books Page (ed. John Mark Ockerbloom, Penn), which lists the
Moore School as corporate author and the individuals as contributors — a cataloguing convention that
flattens exactly the distinction that matters here.

**So, precisely:**

- Adele K. Goldstine is the **sole credited author of two of the five volumes** — *Part I, Technical
  Description of the ENIAC*. She is not a "contributor" to a corporate work; her name stands alone
  on that part's title page, exactly as Burks's and Huskey's stand on Volume 1 and Huskey's on
  Volume 5.
- Part I is, by the report's own preface, "**intended for those who wish to have a general
  understanding of how the ENIAC works, without concerning themselves with the details of the
  circuits; it assumes no knowledge of electronics or circuit theory.**" Part II (Huskey) is the
  circuit-level document.
- **That is precisely the "documentation of the machine's logical operations" the script already
  attributes to her in Segment 5 — so Segment 5 is correct as written.** What is wrong is only the
  looser shorthand "she wrote the manual," which is what the brief carries.
- Corroborated by the scholarship: "In 1946 she had compiled two volumes of *A Report on the ENIAC*,
  somewhat confusingly called 'Part 1 Technical Description of the ENIAC.' **They remain the most
  detailed guide ever produced to the functioning and programming of ENIAC in its original mode.**"
  — Haigh, Priestley & Rope, "Engineering 'The Miracle of the ENIAC'," *IEEE Annals* 36:2 (2014), 45.
  **tier (b).** And Fritz 1996: Adele "was responsible for writing the two-volume 'Technical Report
  on ENIAC.'" **tier (b).** Both said "two volumes"; both were right.

**Recommended correction to `research/research-brief.md` §2:** replace "the technical manual. She
trained the programmers and wrote the machine's logical-operations documentation" with something
like — *"Adele K. Goldstine (1920–1964) is the sole credited author of* Part I, Technical
Description of the ENIAC *— two of the five volumes of the 1946 report, and the part that explains
how the machine works without reference to its circuits. The Operating Manual is Burks and Huskey;
the Maintenance Manual is a six-man team; Part II is Huskey."*

**Why this matters beyond accuracy.** The series is about how credit gets assigned. Our own brief
had compressed a specific, documented, sole-authored credit into a vague one — and a library
catalogue had compressed it further, into "contributor." That is the exact mechanism Segment 6
describes, operating on our own source material, in 2026. **This is worth a beat on air if the
episode wants one**, and it is the kind of thing a docent will enjoy being able to say.

**Adele K. Goldstine's dates: 1920–1964** (per The Online Books Page authority record and Fritz
1996, who records her death in 1964 and that she was "a math major, graduate of Hunter College").
Haigh/Priestley/Rope add that she held degrees in mathematics from **Hunter College and the
University of Michigan**, joined the Moore School staff in **1943**, and "had trained the human
'computers' at the Moore School, among them many of ENIAC's first programmers, in mathematical
techniques."

---

## 5. The dead-tube debugging scene

**The answer: there is NO documented single incident with a named person and an identifiable
occasion. What exists is better than an anecdote and weaker than a scene — named, first-person,
published testimony that this was routine practice. The script's existing treatment (routine
practice, not a dramatized event) is correct and should stand.**

### What IS documented — tier (b), first-person, named

**W. Barkley Fritz, "The Women of ENIAC," *IEEE Annals of the History of Computing* 18:3 (1996),
13–28.** Fritz worked with ENIAC and collected accounts directly from the surviving women.
Free PDF: https://courses.cs.washington.edu/courses/csep590a/06au/readings/00511940-frist.pdf

> "The biggest advantage of learning the ENIAC from the diagrams was that we began to understand
> what it could and what it could not do. As a result **we could diagnose troubles almost down to
> the individual vacuum tube.** Since we knew both the application and the machine, we learned to
> diagnose troubles as well as, if not better than, the engineer."
> — **Betty Jean Jennings (Bartik)**, in Fritz 1996, p. 20.

> "Some of my happiest times were trouble-shooting either the program or the ENIAC — or perhaps both
> at the same time… With respect to ENIAC operation, **we were often able to point out to a
> technician which individual vacuum tube needed to be changed.**"
> — **Homé McAllister (Reitwiesner)**, BRL ENIAC programmer, in Fritz 1996, p. 24 (Fritz ref. [15],
> private correspondence, 26 July 1995).

**Confidence: high** that this was routine practice and that the *programmers*, not only the
engineers, did the localizing. Note the division of labour in the second quote: **the women
localized the fault; a technician changed the tube.** That is more precise, and more interesting,
than "a programmer replaced a tube" — and it is what the sources actually say.

### The actual documented procedure — tier (a), and this is what the script should describe

The Maintenance Manual sets out fault localization as a formal, staged method. It is a better basis
for the segment than any anecdote, because it is what the machine's own documentation told people
to do. *Report on the ENIAC, Maintenance Manual*, June 1, 1946, §1.6 "General Remarks on Trouble
Shooting":

> "After a test problem has indicated a failure it becomes a problem of **localization**.
>
> **1.6.1 Find the Unit that Failed.** To the operating personnel the type of failure found in the
> test problem may indicate the unit (or kind of unit) in which the failure occurred…
>
> **1.6.2 Finding the Circuit that Failed.** The various unit tests are designed to localize the
> failure to a particular circuit. Complete knowledge of part II of the technical report and
> efficient use of block diagrams will help in this process.
>
> **1.6.3 Circuit Failures.** **The most frequent failure in circuits is burned out tubes.** Replace
> tubes in suspected circuits and test the tubes removed… Note that **cathode failures in metal case
> tubes can be detected at removal time by comparing case temperature with that of other tubes.**"

And the heuristics, which are wonderful and completely usable on air:

> "1) If a circuit operates when it shouldn't, look for failure of an **inverter** tube.
> 2) If a circuit does not operate when it should, look for failure of a **gate** or a **buffer**."

**This vindicates the script's approach exactly.** Segment 4 describes "reasoning backwards from the
wrong number to the part of the machine that must have produced it, then narrowing, and narrowing."
That is §1.6, almost line for line — wrong answer → unit → circuit → component — and it is
documented, not dramatized. The "you had to hold the logical structure and the physical structure in
your head at the same time" claim is directly supported by §1.6.2's requirement of "complete
knowledge of part II of the technical report and efficient use of block diagrams."

The detail worth stealing: **you could sometimes find the dead tube by touching it** — a failed
cathode ran cold, so a maintenance man comparing case temperatures by hand could pick it out of the
row. That is a primary-sourced physical image and it is better than anything the folklore offers.

### Two documented *incidents* exist — but neither is a dead tube

1. **The cleaning crew.** From Reitwiesner via Fritz 1996: the cleaning staff "would on occasion
   reconnect one or more of the cables into any convenient open position on the exposed open trays
   after they had happened to knock out a cable with their mops. This act provided an interesting
   challenge to the programmer to find, fix, and return ENIAC to reliable operation." **tier (b).**
   A real, sourced, funny, human debugging story — and not a tube.
2. **The V-2 theodolite run.** Reitwiesner in Fritz 1996: a program reducing theodolite data for a
   V-2 "suddenly became erratic. We tried to find out exactly where it went wrong and why and
   finally discovered that the missile had gone much higher than we were told it would go" — a
   fixed-point overflow from wrong input assumptions, not a hardware fault. **tier (b).**

### What is NOT documented

- **Jennifer Light, "When Computers Were Women," *Technology and Culture* 40:3 (July 1999), 469,**
  writes: "By crawling around inside the massive frame, the women located burnt-out vacuum tubes,
  shorted connections, and other nonclerical bugs." This is the sentence most later accounts descend
  from. **Light's own footnote 45 cites Philip Kraft, "The Routinization of Computer Programming,"
  *Sociology of Work and Occupations* 6 (1977), 141** — a sociology article, not an ENIAC primary
  source. So the vivid image is **tier (b) resting on (c)**. Very likely true; not independently
  evidenced.
- **A named person, on a named day, finding one specific tube: NOT ESTABLISHED.** Searched in full:
  Fritz 1996; Light 1999; the Haigh/Priestley/Rope *IEEE Annals* trilogy; the 1946 Maintenance
  Manual; Kempf 1961; Moye 1996; Martin 1995; the Eckert interview.
- **Eckert explicitly denies the folk version.** He calls the image of "some guy … running around
  with a box of tubes and [having] to change one every few minutes" "**Another myth**." (Randall
  interview, 1989/2006.) Worth saying on air — it is exactly the kind of correction this series is for.
- Where a documented incident would live if it exists: Kathy Kleiman's oral-history recordings at
  the **Schlesinger Library, Harvard**; Bartik, *Pioneer Programmer*; the full text of *ENIAC in
  Action*; the **ENIAC operations log book**, which Haigh/Priestley/Rope report they consulted and
  which "documents each day of machine activity" for the 1947–48 period. That log book is the single
  most likely home for a dated incident.

**Verdict:** keep it as routine practice. The Bartik quote gives the segment a voice, and it is
stronger than a dramatized composite because it is hers.

---

## 6. Plugboard setup time vs. run time

**The answer: setup ran from about a day to several weeks depending on which task you mean. The
single best-sourced number is contemporaneous and says "a day" — and it comes attached to something
far more useful than a number.**

### The primary figure — tier (a)

R. F. Clippinger, *A Logical Coding System Applied to the ENIAC*, Ballistic Research Laboratories
Report No. 673, Aberdeen Proving Ground, 29 September 1948
(https://ftp.arl.army.mil/~mike/comphist/48eniac-coding/index.html; full report at DTIC, ADB205179):

> "Since problems are put on the machine in the new system by setting switches on the function
> table, **problems can probably be changed in an hour instead of a day by the old method where many
> cables had to be plugged in and out.**"

and, in the same paragraph, the price:

> "This facility may very well result in causing the ENIAC to deliver results at a greater rate
> despite **the reduction in computing speed by a factor of six.**"

**This is the most useful single passage available for the segment.** It is better than a raw
setup-time number because it contains the trade: in 1948 the Army deliberately made ENIAC **six
times slower at arithmetic** in order to make it **a day faster to reprogram**, and judged that a
net win. That is the segment's thesis, stated by the people who did it, at the time they did it.

### Conflicting setup figures

| Setup time | Source | Tier |
|---|---|---|
| **"a day"** (old cable-plugging method) | Clippinger, BRL 673, Sept 1948 | **(a)** |
| **"weeks of checking and set up time"** | Kempf 1961, ch. II | **(a)** |
| "Designing the correct configuration for each new problem, and then connecting the wires and setting the switches, took many days" | Computer History Museum | (c) |
| "several days to do and many more days to check out" | widely repeated, downstream of Kempf's phrasing | (c)/(d) |
| "a reasonably complete ENIAC set-up in a few days" — for one specific problem | John von Neumann to Stanislaw Ulam, March 1947, quoted in Haigh, Priestley & Rope, "Los Alamos Bets on ENIAC," *IEEE Annals* 36:3 (2014), 45 | (a) via (b) |

**Checked and NOT found there:** the 1946 *Report on the ENIAC* contains **no setup-time figure**.
I searched the Operating Manual (Vol. 1) and Goldstine's *Part I, Technical Description* (Vols. 3–4)
in full text. Vol. 1 §2 is headed "Problem Set Up Remarks" but is entirely about *checking* the
machine's units before a run, not about elapsed time; Part I gives "essential instructions for
setting up a problem on the ENIAC" without ever saying how long it takes. This is a real absence,
and it is itself informative — the people who wrote the manuals did not think of setup as a
quantity worth reporting. The first person to put a number on it was Clippinger, in 1948, at the
moment he was arguing for replacing it.

**These are not really contradictory once the tasks are separated.** Clippinger's "a day" is the
physical replugging and switch-setting of a problem whose configuration already exists. Kempf's
"weeks" folds in *designing* the configuration and checking it out. **The script should say so
rather than pick a number — that distinction is precisely the "the discipline didn't exist yet"
point Segment 5 is already making.**

### Run time

- **A 60-second shell trajectory: 30 seconds on ENIAC** — Moye 1996; Weik 1961. **tier (c)**,
  Army-official. (See §1 for the competing 30-second/20-second version from Burks.)
- **The February 1946 demo problem: "exactly 15 seconds"** — *NYT*, 15 Feb 1946. **tier (a)**.
- **A real production run was not seconds.** Kempf 1961: at Aberdeen "the checking routine alone
  took about eight hours." The 1948 Monte Carlo runs consumed roughly a million punched cards and
  ran over days-to-weeks of wall-clock time (Haigh/Priestley/Rope, "Los Alamos Bets on ENIAC").

**Recommendation:** the cleanest true contrast is not setup-vs-run. It is **Clippinger's trade** —
a day of cable-plugging bought back for an hour of switch-setting, at the price of running six times
slower, and the Army took the deal. Nothing else in the episode makes the point as economically,
and it is a primary source.

---

## 7. ENIAC's first substantial job after delivery

**The answer: YES — ENIAC's first actual problem was a Los Alamos thermonuclear-feasibility
calculation, run in late 1945 / very early 1946, before the public demonstration. This is
established directly by the standard scholarship, not by inference. The script's caution was
correct in method and can now be released.**

**The popular association "ENIAC did the H-bomb calculations" is NOT a conflation with the IAS
machine — but three distinct nuclear episodes get merged, and separating them is the correction
worth making on air:**

1. **Late 1945 – early 1946, ENIAC at the Moore School.** A *greatly simplified* feasibility model
   of the ignition of a fusion weapon (Teller's "Super"), brought by Los Alamos physicists **Stanley
   Frankel** and **Nicholas Metropolis**. ENIAC's genuine first problem. **Not** Monte Carlo.
2. **March–April 1948, ENIAC at Aberdeen.** The first computerised **Monte Carlo** neutron
   diffusion/fission simulations, after the conversion to the modern code paradigm. Programmed
   largely by **Klara von Neumann** with Adele Goldstine, Richtmyer, and Jean Bartik's group.
   Fission, not fusion.
3. **Summer 1950, ENIAC.** The Monte Carlo runs that finally persuaded Teller his "Super" design
   was unworkable.

Von Neumann's IAS machine (operational 1951–52) is a *later* chapter, not the source of the
association. Where the popular story goes wrong is in implying the 1945 run was Monte Carlo, in
implying it produced the H-bomb, and in collapsing 1945, 1948 and 1950 into one event.

**Item 1 is what belongs in Part 1.**

### Sources

**Primary — the participant, in his own words. tier (a).**
Nicholas Metropolis, oral history interview by William Aspray, **Charles Babbage Institute OH 135**,
Los Alamos NM, 29 May 1987. https://hdl.handle.net/11299/107493

> "Frankel and I went with him in the spring of 1945 to view the physical surroundings at the Moore
> School… There we met Eckert and Mauchly, and Herman and Adele Goldstine, and the engineering staff."

> "…our problem would tax maybe **95% of the controls of the machine**, rather than what I suppose
> might have been only 20% or 25% when calculating the firing tables… **It was the very first problem
> that was done on the ENIAC.**"

> "Our problem was with one dimension in space and one dimension in time, of course, **to study some
> of the thermonuclear possibilities.** These were the first realistic, semi-realistic tests."

> "I must say that it was **Edward Teller** who urged us to continue running these problems even
> after the war was over. Indeed, **we stayed on until the very early part of the following year**
> and then came back to Los Alamos."

**Scholarly. tier (b).**

> "Although a greatly simplified model of the ignition of a fusion weapon provided **ENIAC with its
> first actual problem, run in late 1945 and very early 1946**, this was not a Monte Carlo
> simulation."
> — Thomas Haigh, Mark Priestley & Crispin Rope, "Los Alamos Bets on ENIAC: Nuclear Monte Carlo
> Simulations, 1947–1948," *IEEE Annals of the History of Computing* 36:3 (July–Sept 2014), 43.
> https://eniacinaction.com/wp-content/uploads/2014/02/LosAlamosBetsOnENIAC.pdf

> "…a team from the lab had taken control of ENIAC for several weeks from the end of 1945, before it
> had even been declared fully operational." — same paper, p. 45.

> "ENIAC's first application was to solve an important problem for the Manhattan Project. Involved
> were Nicholas Metropolis and Stanley Frankel from the Los Alamos National Laboratory… **the
> scheduled movement of ENIAC to APG was delayed so that the 'test' could be completed before the
> machine was moved.**" — Moye 1996 (ARL). **tier (c)**

The same authors, correcting Isaacson, date "the beginning of the Los Alamos computations" to
**December rather than October** 1945.
— https://eniacinaction.com/the-articles/eniac-errors-in-isaacsons-the-innovators/ **tier (b)**

### It was run before the demonstration — and it *was* the demonstration's finale

This is stronger than "before." **The Los Alamos problem was the climactic item at the February 1,
1946 press conference**, presented as an unnamed secret Ordnance problem. Arthur Burks's own
contemporaneous memorandum (tier (a), see §8.4):

> "The last problem demonstrated was of this character. **It is a problem of great importance to the
> Ordnance Department, but since it is classified as secret not very much can be said about it. It
> involves the solution of partial differential equations. In solving it the ENIAC did in 15 seconds
> what a mathematician would require several weeks to do.**"

Herman Goldstine, *The Computer from Pascal to von Neumann* (1972), lists that final segment as "A
modification of the E-2 ENIAC run as an illustration of a long and complicated calculation," with
the footnote: **"The so-called E-2 run was part of the Los Alamos problem."** **tier (a).**

Metropolis independently corroborates the practice: "I remember vividly that **the engineers,
whenever they were making a demonstration, would use our problem.** But this was no violation of
security because nobody could possibly unravel what it was that we were doing."

**The people running it were not told what it was.** Metropolis in 1987: "at that time it was highly
classified and **the people there did not know what the problem was.**" The women programmers and
Moore School staff who helped were given the mathematics and nothing else. **This is a strong beat
for the episode** and it is primary-sourced.

**Confidence: HIGH.**

### CONFLICT — the exact start date

| Date | Source | Tier |
|---|---|---|
| "November of 1945" | Winegrad & Akera, "ENIAC's 50th Anniversary," *Penn Almanac* 42:18 (1996) | (c) |
| "November, 1945" | Martin 1995 | (b) |
| "December 10, 1945" | APS News, "The ENIAC Computer Runs Its First, Top-Secret Program" (Nov 2022) | (c) |
| **"late 1945 and very early 1946" / "several weeks from the end of 1945" / December 1945** | Haigh/Priestley/Rope 2014; Stuart 2021; LA-UR-21-22202 | **(b)** |

**Say "late 1945, running into early 1946."** That is the range every tier-(b) source supports. Day
precision is **NOT ESTABLISHED**; it would live in the **ENIAC operations log book** in the BRL/ARL
records.

Light 1999 adds a fourth strand: she has the physicists arriving "in the summer of 1945,"
programming "by October," and getting their answer "within a month" — several design flaws. She
cites Martin 1995 for it.

### Scale of the job — the "one million cards" figure does NOT hold up

Light 1999 (citing Martin 1995): "Programming for Frankel and Metropolis took **one million IBM punch
cards**…" The *Penn Almanac* (2026) and APS News repeat it.

**But Metropolis was asked this directly in 1987 and declined to confirm it.** Aspray: "I've read in
journalistic accounts, of which I'm somewhat skeptical, that there were very large numbers of
punched cards shipped to do the problem, and that the problem took on the order of six weeks of
computation time." Metropolis never affirms the figure; he redirects to mechanism — the punch ran at
roughly one card per second, with a full cycle taking about a minute. Haigh/Priestley/Rope's
million-card discussions concern the **1948** Monte Carlo work, not this run.

**Verdict: "one million cards" for the 1945 run is tier (c)/(d)** — repeated by Penn's own
publication, not traceable to a count, and the one living participant asked about it wouldn't
endorse it. **Do not put a card number on air.** If texture is wanted, use Metropolis's own: cards
punched at about one a second, a full cycle about a minute.

### What came next — and the correction the script should keep

**Trajectory computation — the thing the machine was built for — was not first.** It came later:

> "Trajectory calculations were one of the first production jobs run on ENIAC, **in August 1946**."
> — Haigh/Priestley/Rope, "ENIAC errors in Isaacson's *The Innovators*." **tier (b)**

Timeline afterwards: all through 1946 ENIAC stayed at the Moore School working on "problems in such
fields as atomic energy and ballistic trajectories" (Kempf 1961) — including hosting the Moore School
Lectures in July 1946; **formal acceptance by the Ordnance Department took place in July 1946**
(Kempf 1961); dismantled winter 1946–47, first units arrived at Aberdeen **January 1947**; converted
to the converter code in **1948**; ran a total of **80,223 hours** between 1948 and its retirement in
**1955** (Moye 1996).

**CONFLICT on the restart at Aberdeen.** Moye 1996 and Kempf 1961 say ENIAC "was operational again
in **August 1947**." Haigh/Priestley/Rope cite the machine's own log: an entry dated **29 July 1947**
records that "ENIAC starts up again," "although its recovery was slow enough that little useful work
was performed that year." **The log date is the better-sourced one**; both agree the machine was
effectively down from roughly November 1946 to mid-1947.

**NOT ESTABLISHED: the date of ENIAC's first *production* firing table.** "From 1947–48 onward at
Aberdeen" is as precise as the sourcing supports. It would live in **BRL's "A Survey of ENIAC
Operations and Problems 1946–1952," DTIC AD1003735**, which refused automated retrieval, and in the
ENIAC operations log.

**Keep the stored-program conversion distinct in time:** BRL ordered the converter in early 1947;
the conversion was announced at an Aberdeen press conference on **12 December 1947** and reported in
the *New York Times*; the 60-instruction code was operational by **spring 1948**; Ulam's phrase "the
miracle of the ENIAC" refers to **May 1948**.

**Flag for the orchestrator:** Kempf's "acceptance by the Ordnance Department took place in July
1946" sits alongside the script's December 1, 1945 delivery date, which the script correctly
attributes to Judge Larson. These are different events — physical delivery vs. formal acceptance —
but the script's line "the machine was handed over to Army Ordnance on the first of December" would
be safer as "the Army took delivery," and the July 1946 acceptance is a nice second beat if you want
one. See §10.5.

**Script-safe line for Segment 6:** "The first substantial thing ENIAC actually did was not a firing
table. It was a calculation for Los Alamos — a simplified feasibility model for a fusion weapon,
brought east by two physicists, run in late nineteen forty-five, before the machine had been
publicly announced and before it had even been declared fully operational. The Army delayed shipping
it to Aberdeen so the run could finish. The firing tables it was built for didn't start coming off
it until August of nineteen forty-six."

---

## 8. The February 1946 demonstration

**Status: ESTABLISHED, and richer than the marker asked for. This is the best-sourced item in the
pass and it directly feeds the episode's thesis.**

### The dates — RESOLVED, and one widely repeated date is simply wrong

| Date | Event | Source | Tier |
|---|---|---|---|
| **Wed 30 January 1946** | War Department press release prepared (typed "1-30-46" at foot) | the release itself | **(a)** |
| **Fri 1 February 1946** | **press conference / press preview**, embargoed | Burks's memorandum, headed "DEMONSTRATION OF ENIAC / February 1, 1946"; Penn release: "At the request of several persons who attended the ENIAC press conference, February 1, 1946…"; Light 1999, 471 | **(a)** |
| **Fri 15 February 1946** | **formal dedication and dinner**, Houston Hall, Penn campus; radio embargo lifts after 7:00 p.m. EST | Moye 1996 (c); Kempf 1961 (a); War Dept release masthead (a); Stuart 2021 (b) | **(a)/(b)** |
| **Sat 16 February 1946** | print embargo date on **both** releases — "FOR RELEASE SATURDAY A.M., FEBRUARY 16, 1946" | both releases | **(a)** |

**CORRECTION — "Saturday, February 14, 1946" is impossible.** Martin 1995 states the press was
invited on "Saturday, February 14, 1946," and Penn Engineering's page says ENIAC was "originally
announced on February 14." **I checked the 1946 calendar: February 14 was a Thursday.** February 1
and February 15 were both Fridays; February 16 was the Saturday — matching the embargo on both press
releases. Jean Bartik settles it from the other side: she and Betty Snyder worked late on Valentine's
night, thinking about "an all-important demonstration we were to run **next day** for the world."

**How to handle the residual Feb 14 claims.** Two independent research passes disagreed on whether a
press event happened on the 14th at all. Only **1 February** and **15 February** have tier (a)
support — Burks's memo header and Penn's own release for the first, the War Department masthead and
the dedication record for the second. Every "February 14" claim traces to Martin, whose day-name is
demonstrably wrong, or to pages downstream of her. **Treat Feb 14 as most likely a slippage from the
15th, use 1 February and 15 February, and if a docent is asked, say the press was shown the machine
on the first and it was formally unveiled and dedicated on the fifteenth.** **Confidence: high.**

**UNRESOLVED CONFLICT — the embargo.** Both releases say hold until Saturday 16 February, yet the
clipping survey (drawn from the Hagley Museum's *Sperry Rand v. Honeywell* records) shows dozens of
stories dated **15 February**, including the *New York Times*. Possible explanations — the embargo
was moved up for dedication day, or a revised release superseded the 30 January draft — but I could
not verify either. **Report as an open discrepancy.** It would live in the Penn University Archives
ENIAC records or the Hagley collection.

### What was actually run — the Feb 1 and Feb 15 programs were DIFFERENT

Almost every popular retelling merges them. They should not be merged.

**February 1, 1946 (press preview) — the full documented program, tier (a),** from Arthur W. Burks,
"Demonstration of ENIAC," memorandum, February 1946 (ENIAC Patent Trial Plaintiff Exhibit 4024.5),
transcribed complete in Stuart 2021's appendix:

1. The number **97,367** loaded into an accumulator.
2. **5,000 additions** of it — "In one second the answer, **486,835,000**, appeared in the accumulator."
3. The same 5,000 additions **at 1/1000 speed** for contrast — "The fastest general purpose digital
   computor in existence before the ENIAC was completed takes **16⅔ minutes** to do what the ENIAC
   can finish in one second."
4. High-speed multiplier: **13,975 × 13,975 = 195,300,625**.
5. That product accumulated **500 times** → **97,650,312,500**, "after 1 second."
6. **A table of squares and cubes of 1 to 100**, punched to 100 cards — one minute, mostly punching.
7. The same table **without punching** — "finished in **1/10 second** — so fast, in fact, that some
   who blinked didn't see it."
8. **A table of sines and cosines** for 100 angles at 1/10-mil intervals, by difference equations.
9. **The classified Los Alamos problem** — "did in 15 seconds what a mathematician would require
   several weeks to do."

**No trajectory was run on February 1.**

**February 15, 1946 (the unveiling) — the trajectory replaced the Los Alamos problem.** This is
**reconstruction, not documentation**, and the script should treat it as such. Brian L. Stuart,
"Reconstructing the Unveiling Demonstration of the ENIAC," *IEEE Annals* 43:2 (April–June 2021),
open preprint https://pdfs.semanticscholar.org/4ff6/341e9588c9a532807e3c853e6b3662704e5f.pdf, is
explicit: "Although we have not found records of the programming details of the later demonstration…
it is our working hypothesis that the functions demonstrated on the 15th were essentially the same
as those on the 1st, but with the artillery trajectory computation replacing the Los Alamos
problem." **tier (b), flagged by its own author as hypothesis. Confidence: medium-high.**

Why the swap, in Stuart's words: "a classified computation that can't be explained to the audience
does not make for a very good demonstration."

**The famous "faster than the shell" line is retrospective, not contemporaneous.** It comes from
Burks's 1974 University of Michigan talk, 28 years later — see §1, Set B. His *contemporaneous*
February 1946 memorandum contains no such line, because no trajectory ran that day. **Attribute it
to the 15th and to memory, not to the press packet.**

**"155mm shell" — NOT ESTABLISHED.** No source documents the caliber. Stuart's reconstruction uses a
muzzle velocity of **1,550 ft/s at 22.5° elevation**, which is the likely origin of the "155mm"
claim by corruption. **Say "an artillery shell," not a caliber.**

The *NYT* of 15 February reports a problem "that would have required several weeks' work by a
trained man… done in exactly 15 seconds," and its photo caption describes "attendants preparing the
machine to solve a **hydrodynamical problem**." **tier (a)**, via Light 1999, 474–5.

### Who wrote the trajectory program — and the bug the night before

**Elizabeth "Betty" Snyder and Betty Jean Jennings.** Fritz 1996, 20–21, from Bartik directly: about
two weeks before the announcement the Goldstines invited them to their West Philadelphia apartment
and asked whether the trajectory program could be ready. Bartik: "They asked if we could have it up
and running for the demonstration at the announcement. We said we could. It still hadn't been put on
ENIAC, and Betty and I were dying to put it on the machine." **tier (b).**

**The bug.** On the night of 14 February the trajectory ran past the ground and would not stop.
Bartik: "The next morning, **Betty came in and knew exactly which switch on the master programmer was
set incorrectly**… She went over, flipped the switch over one position, and we were in business."
**Confidence on the story: high.** Stuart offers a candidate — stepper H's clear switch set to 2
instead of 3, which would skip the altitude test and loop forever — but says plainly that "we do not
know enough about the details… to say for sure." **Confidence on the specific switch: low. Do not
name the switch on air.**

**CONFLICTING credit claims, all three worth knowing:**
- Fritz/Light: Snyder and Jennings wrote it. **(b)** — best sourced.
- Penn Engineering: credits the demo test run to Marlyn Wescoff Meltzer and Ruth Lichterman
  Teitelbaum. **(c)**.
- Herman Goldstine's memoir: "Adele Goldstine and me with some help on the simpler problems from
  John Holberton and his girls" (*The Computer from Pascal to von Neumann*, 229) — an interested
  party, and a nice illustration of the episode's own thesis.

### Who issued the press materials — tier (a), and this is the load-bearing find

**The U.S. War Department, Bureau of Public Relations.** Two press releases:

- **"Ordnance Department Develops All-Electronic Calculating Machines,"** press release, February
  1946, Goldstine Papers.
- **"History of Development of Computing Devices,"** press release, 15–16 February 1946,
  Goldstine Papers.

— cited as Light 1999, footnotes 55 and 56. **tier (a) via (b).** The Goldstine Papers are at the
**American Philosophical Society / Hampshire College**; the press-clipping corpus Martin used is at
the **Hagley Museum and Library, Wilmington DE, Acc. 1825** (*Sperry Rand v. Honeywell* court
documents).

**What the press release said.** It characterized ENIAC as "designed and constructed for the
Ordnance Department at the Moore School of Electrical Engineering of the University of Pennsylvania
by a pioneering group of Moore School experts," and named **three** individuals as "primarily
responsible for the extremely difficult technical phases of work":

> "**Eckert** — engineering and design; **Mauchly** — fundamental ideas, physics; **Goldstine** —
> mathematics, technical liaison."

— War Department Bureau of Public Relations, Feb 1946, quoted in Light 1999, 473. **tier (a).**

**This is the document the entire episode is about, and the script can now name it, name its issuer,
and quote what it said.** It is a War Department press office, not a university one — worth getting
right on air.

### THE TWO RELEASES ARE DIFFERENT DOCUMENTS — and both are online

This is the sharpest correction of the pass. There were **two** press artifacts with **two different
authors and two different jobs**:

1. **U.S. War Department, Bureau of Public Relations, Press Branch** — the hype. Marked "FOR RELEASE
   SATURDAY A.M., FEBRUARY 16, 1946," radio after 7 p.m. EST Feb 15, dated 1-30-46, three pages.
   **Full scan: https://www.ece.rice.edu/~dhj/History/ENIAC1.pdf** — **tier (a), directly citable.**
2. **University of Pennsylvania — Henry Herbert, Publicity Manager** — the technical clarification,
   issued *because reporters asked what they had actually seen*: "At the request of several persons
   who attended the ENIAC press conference, February 1, 1946, the following statement concerning the
   ENIAC demonstration has been prepared by **Dr. Arthur Burks, who conducted the demonstration**."
   Survives as **ENIAC Patent Trial Plaintiff Exhibit 4024.5**; transcribed complete in Stuart 2021's
   appendix. **tier (a).**

**So: the Army wrote the hype, Penn wrote the correction, and Arthur Burks personally ran both
demonstrations.** That division of labour is itself the episode's thesis in miniature.

### The headline number came from the classified problem — and this is the best fact in the pass

The line that generated the entire press wave is in the **War Department** release, **tier (a)**:

> "**The first problem put on the ENIAC, which would have required 100 man-years of trained
> computer's work, was completed in two weeks — of which two hours was actual electronic computing
> time**, and the remaining time devoted to review of the results and details of operation."

**That sentence is about the Los Alamos hydrogen-bomb feasibility calculation.** The War Department
handed the press its headline number about a computation whose subject was classified, and the press
reported it as a story about engineering design. The resulting headlines:

- "Army 'Robot Brain' Does 100 Years Math in 2 Hours" — *New York Journal-American*
- "100-Year Problem Done in 2 Hours" — *Baltimore Sun*
- "Man-Made 'Mental Giant' No Longer Army's Secret; 100 Years of Mathematical Work Cut to Two Hours"
  — *The Oregonian*
- "Amazing Electronic Machine Capable of 100 Years of Math in Two Hours" — New Orleans paper

**For a series about how credit gets assigned, this is close to a perfect artifact.** The number
everyone remembers came from a press office, described work nobody was allowed to describe, and was
transcribed by a hundred reporters who had no way to check it.

Both releases also carried the "**1000 times faster**" line: War Dept — "The ENIAC is capable of
computing 1000 times faster than the most advanced general-purpose calculating machine previously
built"; Burks — "It is 1000 times as fast as any other general purpose digital computor."

### How the press ran with it

From the Hagley clipping file (*Sperry Rand v. Honeywell* records, Acc. 1825), via Martin 1995:

- **"Electronic Computer Flashes Answers, May Speed Engineering"** — *New York Times*, 15 Feb 1946,
  p. 1, bottom of the front page, two columns. Byline usually given as **T. R. Kennedy, Jr.** —
  **byline attribution is tier (c); I could not verify it against the page image.** Page images at
  https://www.computerhistory.org/revolution/birth-of-the-computer/4/78/323 (thumbnails only).
- "30-Ton Electronic Brain at U. of P. Thinks Faster than Einstein" — *Philadelphia Evening Bulletin*
- "Blinkin' ENIAC a Blinkin' Whiz: Electronic Calculator Operating at Penn Does Work of 20,000
  Persons" — *Philadelphia Record*
- "New Computer Lightning Fast: Army Calls It the World's Best Calculator" — *New York Sun*
- "World's Fastest Calculator Cuts Year's Task to Hours" — *Boston Daily Globe*
- "5000 Problems A Second Easy for Calculator" — *Washington Post*
- "It Won't Mind the Baby — Yet; But Little Else Stops 'ENIAC'" — *New York Post*
- "Electronic Computor (sic) Flashes Answers; Top War Secret Rivaled A-Bomb, Radar" — Norristown
  *Times Herald*
- "Tear Up the Books, Kids: Little Daisy (ENIAC, for short) Is Going to End Math" — *Philadelphia
  Record*, 19 Feb
- **"Hill Men Helped Make ENIAC Atom-Conscious" — *Los Alamos Times*, 26 February 1946.** The Los
  Alamos hometown paper quietly claiming its share, eleven days after the unveiling, while the
  problem itself stayed secret. **A gift for the script.**

Arthur Godfrey described ENIAC on air on 16 February as a "man-made mental giant."

The *NYT* also carried "Had it not been available the job would have kept busy **100 trained men for
a whole year**" — Light's point being that BRL's computers were almost all women. **tier (a).**

### The dinner

**Moye 1996: "The formal dedication *and dinner* were held on February 15, 1946 in Houston Hall on
the Penn Campus. The Penn president presided, and the president of the National Academy of Sciences
was the featured speaker. Major General Gladeon M. Barnes, Chief of Research and Development in the
Office of the Chief of Ordnance, pressed the button that turned on ENIAC."** **tier (c)**, ARL
historian.

**The exclusion is well attested but rests on testimony, not a document.** It comes through Jean
Bartik's memoir and Kathy Kleiman's interview corpus (oral histories now at the Schlesinger Library,
Harvard). Bartik's recorded reaction: **"We were sort of horrified!"** Penn's own current framing
concedes it: after the demonstration "the women weren't invited to a celebratory dinner at Houston
Hall." **No guest list was found** — that would be the thing to chase in the Penn University
Archives. Several of the women *were* present at the demonstration and appear in press photographs,
but were not introduced, not named in the coverage, and in some photographs misidentified.
**Confidence: high on the exclusion; the sourcing is testimonial.**

---

## 9. The six women's names

**Status: ESTABLISHED for the canonical six. "The six" IS a simplification, and the correction is
well sourced.**

### The canonical six, with name variants

| Maiden name (as in 1946 documents) | Married / later name | Commonly cited as |
|---|---|---|
| **Kathleen "Kay" McNulty** | Mauchly, then Antonelli | Kathleen McNulty Mauchly Antonelli |
| **Frances Bilas** | Spence | Frances Bilas Spence |
| **Betty Jean Jennings** | Bartik | Jean Jennings Bartik |
| **Ruth Lichterman** | Teitelbaum | Ruth Lichterman Teitelbaum |
| **Elizabeth "Betty" Snyder** | Holberton | Betty Snyder Holberton |
| **Marlyn Wescoff** | Meltzer | Marlyn Wescoff Meltzer |

**Sources for the maiden-name spellings — tier (a):** the War Department photograph captions of
January 1946 name, with hometowns, "Miss **Frances Bilas** (Philadelphia, Pa.)," "Miss **Betty
Jennings** (Stanbury, Mo.)," "Miss **Ruth Lichterman** (Rockaway, NY)," "Miss **Betty Snyder**
(Narberth, Pa.)," "Miss **Marlyn Wescoff** (Philadelphia, Pa.)." — captions appended to Herman
Goldstine to Capt. J. J. Power, Office of the Chief of Ordnance, 17 January 1946, Goldstine Papers;
reproduced in Light 1999, 476.

**Source for the six as a set, and for married names — tier (b):** Fritz 1996 names them as a set
and gives each a biographical section; Light 1999, n. 47 notes the marriages ("Frances Bilas married
Homer Spence, Kathleen McNulty became Mauchly's second [wife]…"). Penn Engineering's list agrees on
all six.

**Two name traps a docent will get caught by:**

1. **Betty Snyder's given name really was Frances.** Fritz's section heading is "**Frances Elizabeth
   (Betty) Snyder (Holberton)**" — born **7 March 1917**, the oldest of the six, journalism degree
   from Penn 1939, joined the Philadelphia Computing Unit 19 August 1942, married John Holberton
   15 July 1950. So there were **two Frances**es among the six (Frances Bilas and Frances Elizabeth
   Snyder) and **two Betty**s (Betty Snyder and Betty Jean Jennings). Penn's "Frances (Betty) Snyder
   Holberton" is therefore **correct**, not a conflation. **tier (b).**
2. **The variant spellings come from Herman Goldstine's own book.** Fritz records that Goldstine
   "incorrectly identified [Betty Jean Jennings] as **Elizabeth Jennings**" and "incorrectly listed
   [Marlyn Wescoff] as **Marilyn Wescoff**" (Fritz 1996, 14). Those two errors are the origin of much
   of the downstream spelling variance. Use **Marlyn Wescoff** and **Betty Jean Jennings**.

Also note: "Stanbury, Mo." in the 1946 Army caption for Jean Jennings is the town normally spelled
**Stanberry, Missouri**.

**Confidence: very high** on the six names and their variants.

**One correction to the tidy version of the story — and it is a good one.** The six were not a clean
first-choice slate. **Jean Bartik got in as the second alternate because another woman didn't want
to give up her apartment.** In her own words, via Fritz 1996, 21:

> "Afterward, I was notified that **five programmers and two alternates** had been selected. **I was
> the second alternate.** I thought that's that, close but no cigar!… Four of those selected — Betty
> Snyder, Kay McNulty, Marlyn Wescoff, and Ruth Lichterman — had accepted. **The fifth person
> (Greenie — Helen Greenman (Malone)) had a nice apartment in West Philadelphia and didn't want to
> give it up to go to APG. She turned down the offer.** … The first alternative was on vacation in
> Missouri and didn't want to cut it short… Thus I became the fifth ENIAC programmer trainee.
> **Fran Bilas was apparently selected later.**"

**tier (b)**, from Bartik's own 1995 correspondence. Arguably the most consequential of the six
made the list by attrition. **Confidence: high.**

Fritz also records that **Ruth Lichterman Teitelbaum was the only one of the six who had died as of
1996** (d. 1986), and that **two of the six — Jean Jennings and Marlyn Wescoff — never actually
worked at Aberdeen**, while Ruth Lichterman stayed on at BRL for about two years.

### Is "the six" a simplification? YES — and here is the defensible sentence

**Fritz 1996 is the source that breaks it open.** Fritz surveyed a much wider group and prints
first-person accounts from ten women. Beyond the canonical six he names, among others:

- **Adele Katz Goldstine** — trained the programmers, wrote the technical description
- **Akrevoe Kondopria** — a Moore School employee on the ENIAC project, named in the 1946 Army photo
  captions alongside the six
- **Lila Todd (Butler)** — began at the Moore School
- **Homé McAllister (Reitwiesner)**, **Gloria Gordon (Bolotsky)**, **Ester Gersten**, **Winifred
  "Wink" Smith (Jonas)**, **Marie Bierstein (Malone)**, **Helen Greenman (Malone)** — the BRL/Aberdeen
  ENIAC programming group from 1946 on, "a large percentage of [whom] were again women"
- A cohort of **Women's Army Corps** members who received "some eight months of training for
  ballistics computation… at the Moore School" — and who, Fritz notes, "apparently were not
  considered" for ENIAC, and of whom the civilian women were largely unaware

**Fritz named far more than six, in two papers:**
- Fritz 1996's abstract: **"Ten of them report on their background and experiences"** — the ten
  first-person accounts include four women who are *not* among the canonical six.
- Fritz's earlier paper — **"ENIAC—A Problem Solver," *Annals of the History of Computing* 16:1
  (1994), 25–45 — "included the names of 23 of the women who were in various ways associated with
  ENIAC."** That is the number to quote.
- Fritz's scope: women were involved with ENIAC across **1942–1955**, spanning pre-development,
  development, and ten years of operation.
- From Clippinger's converter-code papers, two more names: **Kathe Jacobi** and **Sally Spear**.

**And the pool they were drawn from was ~200, not ~100 — see the correction in §2.** Both Light 1999
("nearly two hundred" young women, civilian and military, worked as human computers on the ballistics
project) and **the War Department's own 1946 release** ("beyond that, **a staff of about 200 trained
computers** was needed to complete the tables") support 200 for the whole project. The ~70 and ~100
first-person figures in §2 are the Moore School unit at particular moments. **Do not treat 100 and
200 as rival figures — they count different things.**

**Never list as one of the six:** **Adele Katz Goldstine** (trainer and author of Part I of the
report — see §4f) or **Mildred Kramer** (taught mathematics to the computing group alongside Adele
Goldstine and Mary Mauchly). Both are essential to the story; neither was a programmer of the six.

**Defensible sentence for air:** *"Six women were chosen from a pool of roughly two hundred women
human computers to program ENIAC: Kathleen 'Kay' McNulty, later Mauchly Antonelli; Frances Bilas,
later Spence; Betty Jean Jennings, later Bartik; Ruth Lichterman, later Teitelbaum; Frances
Elizabeth 'Betty' Snyder, later Holberton; and Marlyn Wescoff, later Meltzer. They put the machine
through its paces at the February nineteen forty-six unveiling. But they were never the only women
on ENIAC. Barkley Fritz — himself an ENIAC programmer — named twenty-three, and the machine's
documentation, its training, and its later stored-program conversion were substantially the work of
Adele Goldstine, Klara von Neumann, and a second cohort of women at Aberdeen."*

That sentence survives a follow-up question. **Confidence: high.**

**One note for Part 2:** Fritz records that Adele Goldstine was "responsible for writing the
two-volume 'Technical Report on ENIAC'." **Fritz is right** — the full report runs to five volumes,
but Goldstine's sole-authored part is exactly two of them. See §4f, which resolves this from the
title pages.

---

## Bonus A. McTiernan, "The ENIAC Patent" — availability

### CORRECTION FIRST — the author's name in the brief is wrong

**The brief says "Patrick D. McTiernan." The journal printed initials only: "C. E. McTiernan."** No
source uses "Patrick D."; searching that exact string returns only the brief's own claim. **Cite as
printed: C. E. McTiernan.** **Confidence: high** that "Patrick D." is an error to fix in the brief.

Circumstantial identification (not needed for citation, and tier (c)): the initials appear to belong
to **Charles Edward "Mac" McTiernan (1917–2012)**, a patent attorney at IBM and later VP of Sperry
Rand UNIVAC's patent and licensing division — i.e. the office that held the ENIAC patent —
corroborated by a 7 January 1964 letter from "C. E. McTiernan of UNIVAC" notifying J. Presper Eckert
that the patent had been granted. **If that identification holds, the standard scholarly treatment of
the ENIAC patent was written by the lawyer for the company that owned it.** That is worth knowing
before Part 4 leans on it — it is a source with a position, like Goldstine and like the Burkses.
Flagged, not asserted.

**Full citation:** McTiernan, C. E. "The ENIAC Patent." *IEEE Annals of the History of Computing*,
vol. 20, no. 2 (April–June 1998), pp. 54–58. **DOI: 10.1109/85.667303** (confirmed via Crossref
publisher-deposited metadata; resolves to https://ieeexplore.ieee.org/document/667303).

**Minor conflict on pagination:** Crossref/IEEE give **54–58**; the Utah TeX bibliography of *Annals*
tables of contents gives **54–58, 80** — a magazine jump-page continuation. Cite `pp. 54–58` to match
the DOI record, or `pp. 54–58, 80` for physical extent.

### Availability: PAYWALLED. No legitimate free copy exists.

**Unpaywall reports `is_oa: false`, `oa_status: "closed"`, zero OA locations** — no repository,
preprint, or free-to-read version indexed anywhere. Archive.org's *IEEE Annals* collection holds only
volumes 11–12 (1989–90), so **there is no controlled-lending route to vol. 20**. HathiTrust holds the
serial (ISSN 1058-6180) but all items are **"Limited (search-only)"** — searchable, not readable. No
institutional or course-page PDF surfaced. **No paywall circumvention was attempted and none is
recommended.**

**Legitimate routes:** institutional IEEE Xplore or IEEE CS Digital Library subscription; IEEE or
IEEE-CS membership; single-article purchase from IEEE; **interlibrary loan of the bound volume**;
ACM DL if subscribed.

**Recommendation:** place the ILL now. The brief makes this a precondition for Part 4, and Part 4 is
the last episode — the lead time is free if it starts today. Nothing in Part 1 depends on it.
**Confidence: high.**

## Bonus B. Owen Gingerich and *A Computer Perspective*

**Status: ANSWERED — NO. Gingerich is not a credited contributor to either edition.** This closes
the brief's §7 open item, and it turns up a contributor the brief had missed.

**1973 first edition, title-page statement of responsibility**, transcribed by the NYPL Research
Catalog from the physical book (https://www.nypl.org/research/research-catalog/bib/b10094533):

> "By the office of Charles & Ray Eames; edited by **Glen Fleck**; **produced by Robert Staples**;
> introduction by **I. Bernard Cohen**."

Harvard University Press, 1973. 174 pp. ISBN 0674156250. LCCN 72088399. "Based on an exhibition
conceived and assembled for International Business Machines Corporation." **tier (a)** — a catalogue
transcription of the physical title page.

**This surfaces a fourth credited contributor the brief omits: Robert Staples (producer).** The
**1990 edition** (ISBN 0674156269) adds **Brian Randell (epilogue)**.

**Why the confusion is plausible, and worth recording:** Gingerich genuinely *was* an Eames Office
collaborator — *Contemporary Authors* lists him as "Consultant to… Office of Charles and Ray Eames,
1969–77." But his documented Eames work is the IBM **Copernicus** exhibition (1972–73) and the Newton
exhibit — the astronomy and history-of-science projects, not the computer exhibit. His consultancy
window does overlap the 1971 IBM History Wall and the 1973 book, so an uncredited advisory role is
not impossible; nothing supports it.

**A tier (d) claim to be aware of and not repeat:** search synthesis repeatedly asserts that
Gingerich, Philip Morrison and Raymond M. Redheffer were outside consultants on *A Computer
Perspective* specifically. **That claim traces to no retrievable source.** Morrison and Redheffer are
well documented as consultants on the Eameses' earlier IBM *Mathematica* exhibit, so this looks like
cross-exhibit conflation.

**Recommendation:** credit the 1973 edition as *Office of Charles & Ray Eames; ed. Glen Fleck;
produced by Robert Staples; introduction by I. Bernard Cohen* (add *epilogue by Brian Randell* for
1990). **Do not credit Gingerich.** If he must be mentioned: consultant to the Eames Office 1969–77,
principally on Copernicus and Newton.

**Confidence: high** that he is not a named contributor; **medium** that he had no uncredited
advisory role. The Library of Congress Eames Papers finding aid would settle the latter and was
unreachable; both archive.org scans (`computerperspect00harv` 1973, `computerperspect00flec` 1990)
are borrowable and their front matter would close it.

---

## 10. At a glance — gaps, tier (d) claims, conflicts, and flags

### 10.1 NOT ESTABLISHED — do not assert

| # | Item | Where it would live |
|---|---|---|
| 1 | **A BRL "tables in arrears" count.** The Aug 1944 memo deliberately declines to quantify it ("far exceeds"). Production throughput and demand rate ARE now established — see §1 | BRL Computing Branch progress reports, **NARA RG 156** |
| 1b | **Time to produce a complete firing table on ENIAC.** Reed 1952, the definitive paper, gives no timings | BRL Computing Lab production records, NARA RG 156; Fritz, *IEEE Annals* 16:1 (1994) |
| 1c | **Polachek, "Before the ENIAC," *IEEE Annals* 19:2 (1997)** — paywalled, not read; the "40 hours / hundreds of trajectories" cluster rests entirely on it. **Highest-priority remaining chase** | IEEE Xplore via a library, DOI 10.1109/85.586069 |
| 1d | **Stern, *From ENIAC to UNIVAC*, pp. 13–14** — the source behind Light's "20 minutes to several days" | Any academic library; IA copy is lending-restricted |
| 2b | **Whether hiring involved a civil-service examination.** McNulty describes an interview | NARA RG 146; USCSC Annual Report FY1942–43 |
| 2c | **Whether "Philadelphia Computing Section" was the official wartime name** — no tier (a) document with that phrase found | Penn Archives UPD 8.1 / 8.4; NARA RG 156 |
| 3b | **Eckert's Wharton enrollment/transfer** — no tier (a)/(b) source; absent from his own oral history | Penn Archives registrar records; Stern 1981; Smithsonian 1988 Eckert interview |
| 3c | **Exact dates: Eckert named chief engineer; Mauchly's autumn 1941 appointment; day-of-month of the Aug 1942 memo** | Penn Archives, Moore School records UPD 8.4 |
| 2 | ~~The exact civil-service grade the women computers were classified under~~ — **RESOLVED during this pass: SP-4, "subprofessional," see §2** | — |
| 3 | **Eckert as Mauchly's lab instructor on the 1941 defense-training course** (very likely true, not verified in this pass) | Penn/Moore School course records; Stern, *From ENIAC to UNIVAC*, ch. 1 |
| 4 | **Pre-installation tube burn-in / selection** | Moore School progress reports; Eckert's 1946 Moore School Lecture on component reliability |
| 5 | **A documented dead-tube incident with a named person and a date** | ENIAC operations log book (cited by Haigh/Priestley/Rope); Kleiman oral histories, Schlesinger Library; Bartik, *Pioneer Programmer* |
| 6 | **"Computor" as an official name** | — treat as a period spelling variant only |
| 7 | **A free/legitimate copy of McTiernan 1998** — confirmed closed-access, zero OA locations | ILL of the bound volume, IEEE purchase, or a secondhand print issue |
| 8 | ~~Owen Gingerich's involvement in *A Computer Perspective*~~ — **RESOLVED: he is not a credited contributor. See Bonus B** | — |
| 9 | **The Feb 15 1946 demonstration program** — reconstructed by Stuart from the Feb 1 memo, Burks's 1974 talk and Bartik's memoir; no contemporaneous record found | Penn University Archives; Hagley, Acc. 1825 |
| 10 | **Why papers ran 15 Feb when both releases embargoed to 16 Feb** | Penn University Archives ENIAC records; Hagley, Acc. 1825 |
| 11 | **The specific master-programmer switch in Holberton's overnight fix** — Stuart offers a candidate and declines to assert it | ENIAC setup sheets, if any survive |
| 12 | **The Feb 15 dinner guest list** — the exclusion is well attested testimonially (Bartik, Kleiman) but no list was found | Penn University Archives |
| 13 | **Date of ENIAC's first *production* firing table** — "1947–48 at Aberdeen" is as tight as the sourcing goes | BRL, "A Survey of ENIAC Operations and Problems 1946–1952," DTIC AD1003735; ENIAC operations log |

### 10.2 Tier (d) — widely repeated, traceable to nothing

These are findings in their own right and the client will want them.

| Claim | What it actually rests on |
|---|---|
| **"They never turned the machine off."** | No contemporaneous source, and the 1946 report contradicts it: a stop switch, **an on-off heater switch and an elapsed-hour meter on every one of the 40 panels**, instructions to switch off unused units' heaters, and a per-panel thermostat that shut the machine down above 115°F. What IS documented is that thermal cycling was understood as the failure driver and procedures were written to minimise it. |
| **"Eckert ran the tubes at one-quarter power."** | Penn's own history page, uncited. The sourced version is the *2-to-1 safety factor* from the 1946 Maintenance Manual. |
| **"Tubes were drawn from a special burnt-in selection."** | A single now-dead Penn course page (`seas.upenn.edu/~pws/EMX/eckert.html`), uncited. |
| **"One tube failed every two days."** | Eckert's memory in a 1989 interview. Everything else — including CHM — is downstream of it. The Army's contemporaneous numbers say something different and harder. |
| **"38 divisions per second."** | Untraceable. The Army's own figures give 24–25 ms per division → ~40–42/sec. |
| ~~"~200 human computers" is untraceable~~ | **WITHDRAWN.** I initially recorded this as tier (d). It is **tier (a)**: the War Department's own press release says "a staff of about 200 trained computers was needed to complete the tables," and Light 1999 says "nearly two hundred." It counts the whole project, where the ~70–100 first-person figures count the Moore School unit. See §2. |
| **"Saturday, February 14, 1946."** | Impossible — Feb 14 1946 was a **Thursday** (calendar checked). Originates with Martin 1995 and is repeated by Penn Engineering and EBSCO. The press preview was **Friday 1 February**; the unveiling and dedication **Friday 15 February**. See §8. |
| **"Six firing tables a day were demanded."** | It was six *requests for new tables* per day (BRL Memo, 16 Aug 1944). Moye 1996 dropped the word "requests" and everyone copied him. See §1. |
| **"A trajectory took 30 days by hand."** | A mangling of Goldstine p. 138: 750 hours ≈ 30 days was the **differential analyzer**, doing the trajectories for **a whole table**. See §1. |
| **"20 hours / 15 minutes / 30 seconds" as a wartime measurement.** | A 1961 Army-official *capability* comparison for a hypothetical 60-second trajectory, restated by ARL in 1996. Usable — just not a 1944 stopwatch reading. |
| **"ENIAC could produce a firing table in 30 seconds × 3,000."** | Trajectory integration was one phase of many (Reed 1952; Fritz, BRL MR 617, 1952: table determination "is a more extensive computational problem than the mere computation of the trajectories"). |
| **"The Army seized/commandeered the Moore School analyzer."** | A mid-1930s contractual clause plus a June 1942 contract at **$3.00/hour**. See §2. |
| **"Gillon was a Captain in 1942."** | He was a **Major**. And Goldstine was a **First Lieutenant** from 7 Aug 1942, not a Captain. See §2. |
| **"The 1942 memo survived as a secretary's carbon copy."** | It survived as her **Gregg shorthand notes**, re-transcribed — attested independently by Mauchly (1973) and Chambers (1977). See §3. |
| **"ESMWT course, summer 1941."** | Anachronistic. The program was EDT (Oct 1940) → ESMDT (1941) → ESMWT (only after Pearl Harbor, 1942). See §3. |
| **"Mauchly was twelve years older than Eckert."** | 11 years, 7 months, 10 days. Say "about eleven and a half." |
| **"Eckert was pushed toward Wharton by his parents."** | No tier (a)/(b) source; absent from his own oral history; two incompatible timings circulate. Drop it or heavily hedge. |
| **"Some of the ENIAC Six were WACs."** | Fritz is explicit: "**All of those selected for the ENIAC came from the civilian women.**" |
| **"The ENIAC women were paid $1,440."** | That is **NACA Langley's** SP-3 rate, not BRL's. The documented Moore School offer was **$1,620** as an "assistant computer" (SP-4 step 3). |
| **"One million punched cards" for the 1945 Los Alamos run.** | Repeated by Penn's own *Almanac* and by APS News. Metropolis was asked about it directly in 1987 and declined to endorse it. Not traceable to a count. |
| **"A 155mm shell" at the demonstration.** | No source documents the caliber. Probably a corruption of the 1,550 ft/s muzzle velocity in Stuart's reconstruction. Say "an artillery shell." |
| **"Patrick D. McTiernan."** | The brief's own error. The journal printed **C. E. McTiernan**. See Bonus A. |
| **Gingerich as a contributor to *A Computer Perspective*.** | Not on the title page of either edition. The 1973 credits are Eames Office / Glen Fleck (ed.) / **Robert Staples (produced)** / I. Bernard Cohen (intro). See Bonus B. |
| **"The ENIAC programmers had no documentation."** | Already correctly rebutted in the script. Reinforced here: the five-volume 1946 report, the wiring and block diagrams, and the on-site engineers all existed. |

### 10.3 Conflicts — report both, never average

| Question | The competing figures |
|---|---|
| Tube count | **18,000 (the 1946 report itself — use this)** / 17,468 (BRL 1955, modified machine) / ~17,000 (Goldstine 1991, Martin) / 19,000 (Kempf, Weik 1961) |
| Power | 174 kW (BRL 1955, Kempf, Martin) / 150 kW (Penn) / 140 kW (Goldstine) / ~200 kW (Weik 1961) |
| Floor area | 1,800 sq ft (Aberdeen) / 1,500 sq ft, 30×50 ft room (Moore School) |
| Divisions per second | ~40–42 (Army figures) / 38 (everywhere else, untraceable) |
| Trajectory comparison | 60-sec flight: 20 hrs hand / 15 min analyzer / 30 sec ENIAC (Moye, Weik) **vs** 30-sec flight: 3 days hand / 30 min analyzer / 20 sec ENIAC (Burks 1974) **vs** ~12 hrs hand / 10–20 min analyzer (Goldstine 1972) **vs** "20 minutes to several days" by method (Light citing Stern) **vs** "exactly 15 seconds" for a *different* demo problem (*NYT* 1946) |
| Trajectories per firing table | 2,000–4,000, "assume 3,000" (Goldstine, Augarten) **vs** "hundreds" (Polachek) **vs** ~156/table implied by *Ballisticians*' 1,560 trajectories across 10 tables, Feb–Jun 1945 |
| Moore School analyzer integrators | **14** (Barnes→Buckley, Feb 1944 — use this) **vs** 10 (1934 press, describing a machine still under construction). Aberdeen's was 10; MIT's original 6 |
| Moore School analyzer completion | **1935** (Penn, FERA report) **vs** 1934 construction (Augarten) **vs** 1937 (Grier — judged an error) |
| Mauchly's rank at Ursinus | "full professor" (his own 1973 recollection) / "professor" (IEEE, NAE) / "associate professor" (secondary). Say "head of a one-man department" |
| Mauchly's death date | 8 Jan 1980, Abington (Penn RBML) **vs** 9 Jan 1980, Ambler (DSB) |
| Setup time | "a day" (Clippinger 1948, primary) **vs** "weeks of checking and set up time" (Kempf 1961, primary) — reconcilable if you separate replugging from designing |
| Date of the Los Alamos run | Nov 1945 (Martin, *Penn Almanac* 1996) / "December 10, 1945" (APS News) / **"late 1945 into very early 1946"** (Haigh/Priestley/Rope, Stuart, LA-UR-21-22202 — use this) |
| Press event dates | **RESOLVED** — press preview **1 Feb**, unveiling and dedication **15 Feb**. Martin's "Saturday 14 Feb" is impossible; Feb 14 1946 was a Thursday |
| Press embargo vs. publication | Both releases embargo to **Sat 16 Feb**; dozens of stories, including the *NYT*, are dated **15 Feb**. **UNRESOLVED** |
| ENIAC restarts at Aberdeen | "August 1947" (Moye, Kempf) vs. **29 July 1947** log entry, "ENIAC starts up again" (Haigh/Priestley/Rope, citing the operations log — better sourced) |
| Who wrote the demo trajectory program | Snyder & Jennings (Fritz, Light) **vs** Wescoff & Lichterman (Penn) **vs** "Adele Goldstine and me" (H. Goldstine's memoir) |
| Delivery vs acceptance | Delivered to Army Ordnance 1 Dec 1945 (Judge Larson, per the brief) **vs** "acceptance by the Ordnance Department took place in July 1946" (Kempf 1961) |

### 10.4 FLAG — a finding that complicates the script's cold open

The cold open says: *"And underneath each photograph, a caption. The captions named some of the
people and not the others."*

**The archival Army photo captions Light 1999 reproduces DO name the women** — by name and hometown:
Frances Bilas, Akrevoe Kondopria, Betty Jennings, Ruth Lichterman, Betty Snyder, Marlyn Wescoff,
alongside the two male maintenance engineers Pfc. Homer W. Spence and Cpl. Irwin Goldstein. Those
photographs were judged unsuitable for publication (Goldstine to Power, 17 Jan 1946: "many of them
are exceedingly poor, and, I think, unsuitable for publication").

What actually omitted the women was **the War Department press release** (which named only Eckert,
Mauchly and Goldstine) and **the published newspaper coverage** that followed from it. Light's
critique of the surviving captions is different and subtler: they *named* the women but described
their work as "setting switches," "plugging cables," "standing at function tables" — language that
"understate[s] the complexities of women's work."

**This does not break the cold open — it sharpens it.** The available correction is that the
naming machine was the *press release*, and that the captions which did name the women described
them as furniture-adjacent. That is a better and more precise version of the same point, and it is
now primary-sourced. **Recommend the orchestrator revisit the cold open's caption line with §8 in
hand.**

### 10.4b FLAG — a correction owed to our own research brief

**`research/research-brief.md` §2 says Adele Goldstine wrote the *Report on the ENIAC*. The title
pages say something more specific: she is the SOLE credited author of *Part I, Technical Description
of the ENIAC* — two of the five volumes. The Operating Manual is Burks and Huskey; the Maintenance
Manual is a six-man team; Part II is Huskey.** The Online Books Page catalogue record, which lists
her as one "contributor" among eight to a corporate work, compresses it further in the other
direction. **Full per-volume table and recommended replacement wording in §4f.**

The script's Segment 5 wording ("she wrote the documentation of the machine's logical operations")
is **accurate as written** and needs no change. It is the brief that needs the correction.

### 10.5 Two smaller flags for the orchestrator

- **Segment 6's delivery line.** "Handed over to Army Ordnance on the first of December, nineteen
  forty-five" is fine as a court finding, which is how the script frames it. But Kempf 1961 puts
  *formal acceptance* in July 1946. "The Army took delivery" is safer phrasing than "was handed
  over," and the gap between delivery and acceptance is itself a nice detail if wanted.
- **Segment 4's "eighteen thousand."** Keep it, but the Source Anchors table should record that the
  Army's own 1955 inventory says 17,468 and its 1961 monograph says 19,000, so a docent asked for
  the exact number has an answer.

### 10.6 The five strongest new pieces of material this pass produced

0. **Digital regeneration as the actual answer to the tube objection** (§4b(0)). "Vacuum tubes in
   the ENIAC circuits are used only as on-off devices instead of as amplitude sensitive devices…
   signals are not constantly being degenerated but instead are regenerated from time to time."
   Adele Goldstine's own volume, corroborated by the Army in 1961. The skeptics' compounding-odds
   argument was beaten not by better tubes but by making the machine indifferent to how good the
   tubes were. **This is the single most valuable thing in this document** and Segment 4 currently
   does not have it.
1. **"Computers, SP-4, a subprofessional civil service grade" — and what the statute says that
   means.** Kay McNulty's own words in Fritz 1996, corroborated by Lila Todd Butler. And the
   **Classification Act of 1923, 42 Stat. 1488 §13** defines the Subprofessional Service as work
   "incident, subordinate, or preparatory" to professional work, requiring training "**of any degree
   inferior to that represented by graduation from a college or university.**" These women were hired
   onto a scale legally defined as requiring *less than a degree*, by a recruiting drive that
   advertised for *women with mathematics degrees*. The word "operator" in Segment 6 is the **second**
   classification they were given. SP-4 was the first, and it was in writing from day one.
2. **The War Department press release, and what its headline number was really about.** The release
   is online in full (https://www.ece.rice.edu/~dhj/History/ENIAC1.pdf), names exactly three men —
   Eckert, Mauchly, Goldstine — and supplies the line every paper in America ran with: "The first
   problem put on the ENIAC, which would have required **100 man-years** of trained computer's work,
   was completed in two weeks — of which **two hours** was actual electronic computing time."
   **That first problem was the classified hydrogen-bomb feasibility calculation.** A press office
   handed reporters a headline about work nobody was permitted to describe, and it became the first
   draft of the record. This is the episode's thesis, as a document, with a URL.
3. **Clippinger, BRL Report 673, September 1948** — the setup/speed trade in the Army's own words:
   an hour instead of a day, at the price of running six times slower, and they took the deal.
4. **The 1946 Maintenance Manual's reliability engineering** — the 2-to-1 safety factor, the tube
   log, the deliberate marginal-checking rig, and the explicit warning about heating and cooling
   cycles. All primary, all better than the folklore it replaces.
