# ENIAC, Part 1 — What They Built, and Who Got Named

*Reference notes for docents and other repeat listeners. This document is built for traceability,
not persuasion — every claim below is keyed back to `research/part-1-verification.md`, cited by
section. Tier codes are that document's: **(a)** primary/contemporaneous · **(b)** peer-reviewed
or archival scholarship · **(c)** reputable secondary · **(d)** widely repeated, traceable to
nothing. For floor use — checkable numbers, do-not-say lines, and the questions visitors actually
ask — see the companion `publish/fact-card-part-1.md`, which this document does not duplicate.*

## Description

Credit for ENIAC was assigned four separate times, by four different mechanisms, over roughly
thirty years: a press office in January 1946, an institution — in job titles and pay grades — for
years afterward, a market in the 1950s, and a federal court in 1973. This series is about that
machinery of assignment, not about naming a single inventor. Part 1 covers the first two
documents. On January 17, 1946, Herman Goldstine sent the Army a batch of photographs of the
machine and the people who ran it; the captions name them, by name and hometown, and describe them
setting switches and plugging cables. Thirteen days later, the War Department's Bureau of Public
Relations issued a release naming three men — Eckert, Mauchly, Goldstine — as primarily responsible
for the difficult technical phases of the work. It went to every newsroom in the country. The
photographs were judged unsuitable for publication.

In between: why the machine got built (the Army's firing-table backlog), who built it (Eckert and
Mauchly, and the hundred-plus women employed as human computers before there was a machine at
all), how it worked reliably despite eighteen thousand vacuum tubes (digital pulse regeneration,
not better tubes), and what it actually ran first — a classified hydrogen-bomb feasibility
calculation, not an artillery trajectory. The episode corrects roughly fifteen widely repeated
claims about ENIAC along the way and says, at each point, exactly where the documented record runs
out. It never calls ENIAC "the first computer," and explains why that word describes a definition,
not a fact.

## Chapters

Measured from the mastered audio. Total runtime **38:46**. Also embedded in `episode.mp3` as ID3v2
CHAP frames.

```
00:00 Cold Open
01:40 Segment 1 — What This Is
04:27 Segment 2 — The Forcing Function
08:46 Segment 3 — The Computers Were People
13:38 Segment 4 — Two Men and a Memo
15:58 Segment 5 — Eighteen Thousand Chances to Fail
23:28 Segment 6 — Programming Wasn't a Word Yet
28:10 Segment 7 — Too Late
30:51 Payoff / Close — The Two Documents, Again
37:50 Outro
```

*A note on the narration:* this episode is read by an OpenAI stock voice, not Nick's cloned voice —
the ElevenLabs credentials weren't available and the substitution was made deliberately rather than
silently. It affects delivery, not content; the script is unchanged.

## Corrections to common accounts

The verification pass behind this episode overturned roughly two dozen claims that circulate in
books, museum copy, and web pages about ENIAC (full list: verification doc §10.2). The ones this
episode addresses on air, in the order they come up:

**"Six firing tables a day were demanded."**
It was six *requests for new tables* a day — a BRL memo for the week ending August 15, 1944 gives
15 tables completed, 74 in progress, and six requests/day. The word "requests" dropped out of an
Army historian's 1996 summary and everyone downstream copied the version without it. *(§1; §10.2)*

**"The Army seized/commandeered the Moore School's differential analyzer."**
There was a contractual clause dating to the 1930s; the Army exercised it in June 1942 and paid
the university $3.00 an hour. *(§2; §10.2)*

**"20 hours by hand / 15 minutes on the differential analyzer / 30 seconds on ENIAC" as a
wartime measurement.**
It's a fair comparison and the episode uses it — but nobody timed it in 1944. It first appears in
two 1961 Army publications, as a capability comparison for a hypothetical 60-second trajectory.
*(§1 correction; §10.2)*

**"ENIAC computed roughly 3,000 trajectories per firing table" stated as settled.**
Goldstine says "assume 3,000." The Army's own institutional history records the Aberdeen analyzer
producing 1,560 trajectories across 10 tables in spring 1945 — about 156 per table, an order of
magnitude apart. They may be counting different things (basic vs. full tables), but no source says
so, and the episode declines to resolve it. *(§1; §10.3)*

**"Mauchly was twelve years older than Eckert."**
Eleven years, seven months, ten days — call it "about eleven and a half." *(§3; §10.2)*

**"The 1942 memo survived as the secretary's carbon copy."**
It survived as her Gregg shorthand notes, re-transcribed after the fact — attested independently
by Mauchly (1973) and Chambers (1977). *(§3; §10.2)*

**"Eckert ran the tubes at one-quarter power."**
Untraceable — it's on Penn's own history page with nothing behind it. The documented figure, from
the 1946 Maintenance Manual, is "at least a 2-to-1 safety factor" in practically all circuits.
*(§4b(i); §10.2)*

**"They never turned the machine off."**
Contradicted by the machine's own 1946 documentation: a stop switch that kills the heaters, power
supplies and fans; a standing instruction to switch off unused units' heaters; and a heater switch
plus an elapsed-hour meter on every one of the 40 panels. What *is* true is that thermal cycling
was understood as a failure driver and procedures were written to minimize it. *(§4b(ii); §10.2)*

**"A tube failed about every two days."**
This is Eckert's own memory, given in a 1989 interview about events 43 years earlier. Every other
citation of it, including the Computer History Museum's, is downstream of that one interview. The
Army's contemporaneous 1955 figures are harder: a mean error-free run of 5.6 hours, and about 69%
of scheduled hours actually delivering. *(§4c; §10.2)*

**"The women who ran ENIAC were operators — clerical, not technical."**
They were hired as "computers, S-P four," a *subprofessional* civil service grade, through a
recruiting campaign that specifically advertised for women with college degrees in mathematics.
The Classification Act of 1923 defines subprofessional work as requiring training "of any degree
inferior to that represented by graduation from a college or university." On the work itself: Jean
Bartik said the programmers "could diagnose troubles almost down to the individual vacuum tube...
as well as, if not better than, the engineer." *(§2)*

**"The ENIAC programmers had no documentation to work from."**
There was a five-volume *Report on the ENIAC* (June 1, 1946), including a two-volume technical
description of which Adele Goldstine is sole credited author. What was actually missing was a
programming model, a notation to reason in, and anyone further along than you to ask — not
paperwork. *(§4f; §10.2)*

**"Saturday, February 14, 1946" as the demonstration date.**
February 14, 1946 was a Thursday. The two actual dates are Friday, February 1 (an embargoed press
preview) and Friday, February 15 (the public unveiling and dedication) — two separate events that
most retellings merge into one. *(§8; §10.2)*

**The line that ENIAC computed an artillery shell's flight faster than the shell flew, demonstrated
live for the press.**
No record of what actually ran on February 15 has been found. The best current scholarship (Stuart,
2021) offers a program as an explicit working hypothesis, not a recovered record. The "faster than
the shell" line comes from a 1974 talk by Arthur Burks, not from the 1946 press material. *(§8;
§10.1 item 9)*

**"A 155mm shell" at the demonstration.**
No source documents a caliber. Likely a corruption of a 1,550 ft/s muzzle-velocity figure in the
reconstruction. *(§8; §10.2)*

**Delivery and formal acceptance treated as one event.**
The Army took delivery on December 1, 1945 — a date fixed twenty-eight years later by a federal
judge's finding, not by the Moore School's own records. Formal acceptance by the Ordnance
Department was a separate event, in July 1946. *(§7; §10.5)*

## What we could not establish

Said plainly, not apologetically — these are the honest edges of the research, and a docent who
knows them is better equipped than one who doesn't. Full detail and where each would live:
verification doc §10.1.

- **A count of how far behind the Army's firing-table production actually was.** The August 1944
  BRL memo says the backlog "far exceeds" tables in progress, but declines to give a number. No
  source does. *(Would live in BRL Computing Branch progress reports, NARA RG 156.)*
- **How long it took to produce a complete firing table on ENIAC itself**, as opposed to a single
  trajectory. The definitive 1952 paper on the machine's production work (Reed) gives no timings.
  *(BRL Computing Lab production records, NARA RG 156.)*
- **Whether hiring the women computers involved a civil-service examination.** Kay McNulty
  describes an interview; no document settles whether an exam was also required. *(NARA RG 146;
  U.S. Civil Service Commission Annual Report, FY1942–43.)*
- **A documented dead-tube debugging incident with a named person and a date.** The procedure is
  documented in detail in the Maintenance Manual, and the programmers' own accounts describe doing
  it — but no specific, dated incident has been located. *(ENIAC operations log book, cited by
  Haigh/Priestley/Rope; Kleiman oral histories, Schlesinger Library; Bartik's *Pioneer Programmer*.)*
- **What actually ran during the February 15, 1946 public demonstration.** Reconstructed, not
  recorded — see the correction above. *(Penn University Archives; Hagley Museum, Acc. 1825.)*
- **Why the newspapers ran stories dated February 15 when both War Department and Penn releases
  were embargoed to February 16.** Unresolved; not used on air. *(Penn University Archives ENIAC
  records; Hagley Acc. 1825.)*
- **Which master-programmer switch Betty Snyder reset the night before the public demonstration,
  fixing the overnight bug.** The episode says on air that this isn't known. *(ENIAC setup sheets,
  if any survive.)*
- **The guest list for the February 15, 1946 dedication dinner**, and therefore documentary
  confirmation that the women programmers were excluded from it. The exclusion is well attested by
  the women's own testimony (Bartik, and interviews collected by Kathy Kleiman) and by Penn's own
  later concession, but no guest list itself has been located. *(Penn University Archives.)*

## Sources and further reading

**Primary documents — free and online, read in full for this episode:**

- *A Report on the ENIAC*, Moore School of Electrical Engineering / U.S. Army Ordnance Department,
  Contract W-670-ORD-4926, June 1, 1946. All five volumes, Internet Archive, public domain:
  [Vol. 1](https://archive.org/details/ReportonENIACEl1Moor) ·
  [Vol. 2](https://archive.org/details/ReportonENIACEl00MoorA) ·
  [Vols. 3–4](https://archive.org/details/ReportonENIACEl00MoorB) ·
  [Vol. 5](https://archive.org/details/reportoneniacele05moor)
- U.S. War Department, Bureau of Public Relations, press release, January 30, 1946 (embargoed to
  February 16): [scanned copy](https://www.ece.rice.edu/~dhj/History/ENIAC1.pdf)
- R. F. Clippinger, *A Logical Coding System Applied to the ENIAC*, BRL Report No. 673, September
  29, 1948: [Army Research Laboratory server](https://ftp.arl.army.mil/~mike/comphist/48eniac-coding/)
- Karl Kempf, *Electronic Computers Within the Ordnance Corps*, Aberdeen Proving Ground, November
  1961: [ARL server](https://ftp.arl.army.mil/~mike/comphist/61ordnance/chap2.html)
- Martin H. Weik, *A Survey of Domestic Electronic Digital Computing Systems*, BRL Report No. 971,
  December 1955: [ed-thelen.org](https://ed-thelen.org/comp-hist/BRL-e-h.html)
- William T. Moye, *ENIAC: The Army-Sponsored Revolution*, ARL, January 1996:
  [ARL server](https://ftp.arl.army.mil/~mike/comphist/96summary/)
- Classification Act of 1923, 42 Stat. 1488, §13:
  [scanned copy](https://www.honorfirst.com/uploads/4/7/0/8/47087249/classification_act_of_1923.pdf)
- *Ballisticians in War and Peace*, Vol. 1, 1914–1956, DTIC AD-A300523:
  [Internet Archive](https://archive.org/stream/DTIC_ADA300523/DTIC_ADA300523_djvu.txt)
- Nicholas Metropolis, oral history, Charles Babbage Institute OH 135, May 29, 1987:
  [conservancy.umn.edu](https://hdl.handle.net/11299/107493) — a Los Alamos participant describing
  work he himself did; treat as a first-person account, not a disinterested one.
- John Mauchly, Smithsonian Computer Oral History, January 10, 1973:
  [si.edu](https://www.si.edu/media/NMAH/NMAH-AC0196_mauc730110.pdf) — Mauchly on his own project;
  a participant account, used here for dates and events he had no evident reason to misstate.
- J. Presper Eckert (CBI OH 13), Irven Travis (CBI OH 36), Carl Chambers (CBI OH 7) — oral
  histories, Charles Babbage Institute: [conservancy.umn.edu](https://conservancy.umn.edu/). Same
  caveat as above — these are the engineers and a colleague describing their own work.
- Brian L. Stuart, "Reconstructing the Unveiling Demonstration of the ENIAC," *IEEE Annals of the
  History of Computing* 43:2 (2021) — preprint freely available; the source for the February 15
  program as a stated hypothesis, not a record.
- Haigh, Priestley & Rope, the *ENIAC in Action* companion article trilogy, *IEEE Annals* (2014):
  [eniacinaction.com/the-articles](https://eniacinaction.com/the-articles/) — free.

**Scholarship and secondary accounts — not all freely available:**

- W. Barkley Fritz, "The Women of ENIAC," *IEEE Annals of the History of Computing* 18:3 (1996) —
  where the women speak in their own words, collected by a colleague who worked on ENIAC himself;
  freely readable copy: [University of Washington course page](https://courses.cs.washington.edu/courses/csep590a/06au/readings/00511940-frist.pdf)
- Jennifer S. Light, "When Computers Were Women," *Technology and Culture* 40:3 (1999) — the
  source for the January 17, 1946 photo captions reproduced in the cold open, and for the press
  release text. Academic-journal access (JSTOR); not confirmed free.
- C. Dianne Martin, "ENIAC: The Press Conference That Shook the World," *IEEE Technology and
  Society* 14:4 (1995): [freely available PDF](https://www2.seas.gwu.edu/~mfeldman/csci110/summer08/eniac2.pdf)
  — one source for February 1946 press coverage; this episode corrects Martin's "Saturday,
  February 14" date, which is impossible (a Thursday).
- Herman Goldstine, *The Computer from Pascal to von Neumann* (Princeton, 1972) — the source, via
  quotation, for the February 1944 Barnes-to-Buckley letter and the August 1944 BRL memo used in
  Segment 2. Goldstine ran the Philadelphia computing operation and later circulated the EDVAC
  First Draft under von Neumann's name alone; he is an insider account of real value and also an
  interested party, a point this series returns to in Part 3.
- David Alan Grier, *When Computers Were Human* (Princeton, 2005) — the standing history of hand
  computation as a profession, cited for the Moore School hiring campaign and salary figures.
- Arthur W. Burks, "Demonstration of ENIAC," February 1946 memorandum (ENIAC Patent Trial
  Plaintiff Exhibit 4024.5) — transcribed in full in Stuart 2021; Burks ran the February 1
  demonstration and wrote it up afterward at Penn's publicity office's request.

Not sourced above but named on air: Herman Goldstine's January 17, 1946 letter to Capt. Power
transmitting the photographs, and the photo captions themselves, are reproduced in Light 1999
rather than independently located as a standalone scan.
