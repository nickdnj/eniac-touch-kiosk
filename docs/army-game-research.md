# Army artillery game: research brief

**For:** Nick. **Date:** 2026-10-29. **Status:** research note, not kiosk copy. Written for a new Army mission beside Battleship (`docs/gunnery-mission.md`) using the same engine (`gunnery.e`: visitor picks charge and elevation, ENIAC flies one shell, score by miss distance).

**Confidence tags:** [V] verified in an Army/primary or two independent sources I opened; [S] one reasonable secondary source I opened (mostly Wikipedia, which I used for dates and credits; its own citations were not followed); [C] community or paraphrased, treat as plausible not citable; [U] could not verify, do not use.

**Limits, stated plainly:** I did not open any current Army field manual (FM 6-40, FM 3-09.30, TC 3-09.81 and similar) or any scan of TM 6-215 in this pass. Adjust-fire doctrine below is from community and encyclopedia sources and must be checked against a real manual before it goes on screen. I did not re-open the women-computers sources; that part relies on the repo note `docs/trajectory-history.md` (which cites Fritz 1996 and Goldstine 1972). A search for "Mike Gaskey", "Bomber" and "Mother of All Artillery Games" returned nothing, so they are dropped.

## 1. Lineage of artillery and trajectory games

| Year | Game | Creator / platform | Tag | Source |
|---|---|---|---|---|
| 1958 (18 Oct) | Tennis for Two | William Higinbotham (helped by Robert Dvorak), Brookhaven National Lab; analog computer (Donner Model 30) + oscilloscope. Ball path with air drag, from the computer's projectile-with-drag capability. Player sets only angle and hit timing | [S] | https://en.wikipedia.org/wiki/Tennis_for_Two |
| 1962 | Spacewar! | Steve Russell and MIT students, PDP-1. Not an artillery game | [S] | search results; not opened in detail |
| ~1968-69 | Potshot | Arthur Luehrmann, Dartmouth time-sharing, Tektronix storage display; two players lob shells over a random mountain; an orbital version too. Year is Luehrmann's uncertain recollection | [S] | https://www.atariarchive.org/an-interview-with-arthur-leuhrmann/ |
| 1973 | Gunner | Tom Kloos | [S] | https://en.wikipedia.org/wiki/Artillery_game |
| 1972-79 | War 3 / Artillery-3, a BASIC artillery game ported across systems; the 1979 cross-platform version was published in Creative Computing's *More BASIC Computer Games* | Mike Forman (FOCAL), M. E. Lyon Jr. (1972), Brian West (1975) | [S] | same Wikipedia page |
| 1974 | **Tank** (Kee/Atari) | Steve Bristow, finished by Lyle Rains. **A maze shooter, not an arc game. Do not put it in the lineage.** | [S] | https://en.wikipedia.org/wiki/Tank_(video_game) |
| 1980 | Missile Command | Dave Theurer, Atari arcade, June 1980. Trackball crosshair; defence game, no lobbed arc. A "wrong-genre" cousin (aim ahead of a moving target) | [S] | https://en.wikipedia.org/wiki/Missile_Command |
| 1980 / 1982-84 | Artillery Duel | John Perkins (Perkins Engineering), Astro BASIC; BASIC type-in in *The Arcadian* 19 May 1980; Astrocade release Oct 1982; Xonox ports to Atari 2600 (Nov 1983), ColecoVision (1984), C64, VIC-20. Angle and force, hill between guns | [S] | https://en.wikipedia.org/wiki/Artillery_Duel |
| 1983 | Tanx (ZX Spectrum type-in) | Paul Stanley; the stated inspiration for Scorched Earth | [S] | https://en.wikipedia.org/wiki/Scorched_Earth_(video_game) |
| 1991 | **Scorched Earth** | Wendell Hicken, MS-DOS shareware | [S] | same |
| 1990/91 | **Gorillas** (GORILLA.BAS) | Microsoft, QBasic demo; bundled with MS-DOS 5. Wikipedia says 1990; DOS 5/QBasic as 1991 in other results. **Date disagreement: write "around 1991" or avoid** | [C] | https://en.wikipedia.org/wiki/Gorillas_(video_game) |
| 1995 | Worms | Team17 (Andy Davidson, Cris Blyth); started 1990 as "Artillery"; Amiga, 17 Nov 1995 Europe | [S] | https://en.wikipedia.org/wiki/Worms_(1995_video_game) |
| 2001 | Pocket Tanks | Michael P. Welch, Blitwise; Windows/Mac 26 Oct 2001; based on his Amiga Scorched Tanks | [S] | https://en.wikipedia.org/wiki/Pocket_Tanks |
| 2009 | Angry Birds | Rovio; iOS, 11 Dec 2009 (soft launch Finland 1 Dec); designer Jaakko Iisalo | [S] | https://en.wikipedia.org/wiki/Angry_Birds_(video_game) |

**Dropped as unverifiable:** Atari/Kee Tank as an artillery game (it is not), any "Bomber" mainframe game.

**What truly descends from the firing-table problem.** Honest answer: the *physics* does, the *credit chain* mostly does not.
- Tennis for Two is the one clear case of ballistic computation turned into a game: an analog computer built to model projectiles with drag, used for a tennis ball [S]. Wikipedia documents no direct influence on later games.
- ENIAC itself: **no credible source has ENIAC playing a game** (the repo's history note says so; my search agrees: it found only the thematic claim that artillery was ENIAC's job and artillery games came later). Luehrmann's interview never mentions ENIAC or ballistics [S].
- Safe line: "ENIAC was built to fly shells so gunners could aim. Thirty-some years later, schoolkids were writing BASIC games that did the same sums for fun." The second sentence is true of the 1970s BASIC games above; it does not claim ENIAC caused them. Do **not** write "ENIAC inspired artillery games".

## 2. Real Army practice a game can honestly mimic

**Funding and who (for the curator's point).** The US Army Ordnance Department funded ENIAC under a contract with the Moore School dated 5 June 1943: initial $61,700, nine supplements, total $486,804.22. Ballistic Research Laboratory at Aberdeen Proving Ground took over technical supervision. Accepted by Army Ordnance July 1946 [V]. Source: https://ftp.arl.army.mil/mike/comphist/eniac-story.html (Army Research Laboratory history page). Navy is not in that account; this supports the curator.

**Human computers.** Repo note: BRL had "a staff of 176 computers" in early 1944, most women; one trajectory about 750 multiplications, hours by hand [S via `docs/trajectory-history.md` §1.4, citing Goldstine 1972 and Fritz 1996; not re-opened]. The Army page above says BRL's group was "skilled civilian Ordnance employees" with desk calculators and the differential analyzer [V]; it does not mention women, so keep the women claim tied to the repo's sources.

**Adjust-fire vocabulary** (all [C]; community and flashcard sources, not doctrine. Verify against a manual):

| Term | Meaning for a game |
|---|---|
| Forward observer (FO) | Sees the target, never fires; radios target location and corrections to guns. "The eyes of the guns" [S] (https://en.wikipedia.org/wiki/Artillery_observer). US method: FO calls a request for fire to the Fire Direction Center, which turns it into firing data [S] |
| Adjust fire | Fire single rounds, correct each, walk onto target [C] |
| Over / short | Round landed beyond or in front of the target along the observer-target line; FO says ADD/DROP a distance [C] |
| Bracket | One round over, one short; then halve the correction each time (the "split the bracket" idea) [C] (https://unitedtaskforce.net/handbook/block/808/bracketing, a wargame community page) |
| Fire for effect | Once on target, the whole battery fires volleys [C] |
| Shot / splash | Warning calls: gun fired / round about to land. Not verified in any source I opened [U]; check before use |
| Mil | 1/6400 of a circle in NATO use; about 1 m across at 1,000 m [S] (https://en.wikipedia.org/wiki/Angular_mil). TM 6-215 uses mils for elevation (repo note, TM6-215) |

**Firing tables.** TM 6-215 (15 Dec 1941) and its column-by-column explanation are already in the repo notes (range every 100 yd, elevation in mils, time of flight, fork, corrections for wind and muzzle velocity).

**WWII howitzer facts** (only the 105 mm, only one source): the M2A1 (M101) fired the HE M1 shell at 1,550 ft/s muzzle velocity (472 m/s), maximum range about 11,270 m (12,330 yd); elevation -5 to 65 degrees; 8,543 built by war's end [S] (https://en.wikipedia.org/wiki/M101_howitzer; the page's infobox is uncited in the excerpt I read, and it gives 11,160 m for HE M1 in the ammo table). I did not source the 75 mm pack howitzer or the 155 mm figures: [U], omit.

**Repo rule (do not break).** The simulator's drag table is Stuart's own reconstruction; with the 1,550 ft/s card the sim lands about 12,900 yd at only 22.5 degrees, longer than a real 105's maximum (`docs/trajectory-history.md` §5.3). So: **no on-screen "a real 105 would reach X"**, no yards-of-real-gun claims, no real muzzle velocity beside a score. Calling the gun "a howitzer of the period" and showing the *sim's* numbers labelled "ENIAC's shell" is fine. Also: the kiosk scores in **feet**; real tables are in **yards and mils**. Pick one unit per screen and say so.

## 3. Five concepts (all: choose charge + elevation, ENIAC flies one shell, score)

Constraint: a flight is about 25 to 40 s of wall time (gunnery doc: up to ~25 hops at ~1.5 s), so **two shots per visit at most**; any design needing three rounds is out.

| # | Name | 60-90 s play | Recalls | Teaches | Risks |
|---|---|---|---|---|---|
| A | **Spotter** (adjust-fire, 2 rounds) | Target hidden behind a ridge. Shot 1 is a "registration round"; the FO calls "OVER 1,300 FEET" (or SHORT). Visitor corrects elevation or charge for shot 2; score only shot 2 (shot 1 is free). | Artillery Duel / Gorillas (tweak angle after a miss) | Why firing tables have a fork and why real gunners "bracket"; one shell is one ENIAC run | Needs the FO line to be honest (a miss is distance along the line only); two flights fills the budget; visitors may try to ignore shot 1 |
| B | **Bracket** (over/short puzzle) | Target distance given. Visitor sees a *firing table strip* (elevation to distance, from the sim's own table, not a real gun), picks from it; ENIAC flies; the spotter says OVER/SHORT and "now split it". | Gorillas | Firing table as lookup; interpolation | Table must come from the sim's own runs (honest but not "real"); can feel like homework |
| C | **Fire for Effect** (volley score) | After the corrected shot, the sim "multiplies" it into a 6-gun volley using scatter (cosmetic spread, labelled as such). Score is coverage of the bunker area. | Missile Command (area burst), Worms | Why artillery fires many rounds; probable error exists in real tables (TM 6-215 columns 7-8) | Scatter is invented, not ENIAC's; the brief must say "pretend spread". The weakest honesty fit |
| D | **Charge and Wind** (puzzle) | Pick charge 1-3 *and* elevation; a wind flag shows on the map; ENIAC's shell flies with no wind but the *table* shows the wind correction. Score by miss distance in the corrected target. | Scorched Earth (wind) | Weather correction columns in real tables | The sim has no wind. Do not pretend it does. Discard unless the wind is applied by shifting the target honestly. |
| E | **Bridge or Bunker** (3 targets) | Three targets at different distances (a bridge, a bunker, a depot); one shell; pick which target to try. Hit radius differs per target. | Angry Birds (pick the structure), Pocket Tanks | Range is tied to elevation and charge; reuses Battleship table | Same as Battleship with a new skin. Easy to build, little new teaching |

(A counter-battery duel was considered and dropped: it needs two simultaneous flights and an opponent, and ENIAC time is the bottleneck.)

## 4. Recommendation

Build **A, Spotter** (with B's table strip as the hint tool). It is the only one that adds a real Army hook (the forward observer's "over/short, correct, fire again" loop) within two shots, and it is honest to the machine: ENIAC computes each shell; the human does the correcting, exactly as in 1944.

**Name:** **Fire Mission.** "Fire mission" is the Army's term for a request to engage a target [C]; it also fits the kiosk's "mission" language. Runner-ups: "Aberdeen" (accurate, a place name, less of a game), "Forward Observer" (too long for a picker card, but good as a subtitle), "Howitzer" (invites the "real 105" claim; avoid).

**Visitor blurb:** *"You are the forward observer. Your first shell is a test. A spotter tells you how far you missed, and ENIAC flies your second one."* (Short form for the card: *Spot, correct, fire.*)

**Did you know (eighth grade)** , pick one:
1. *"ENIAC was paid for by the US Army: a $61,700 contract in June 1943 that grew to $486,804 by the end."* [V] https://ftp.arl.army.mil/mike/comphist/eniac-story.html
2. *"In 1958, a physicist at Brookhaven built a two-player game on an analog computer made to model shells with air drag. It used the same math ENIAC's trajectory work did, but there is no record that it was inspired by ENIAC."* [S] https://en.wikipedia.org/wiki/Tennis_for_Two (the second clause is our caution, not a source claim)
3. *"A BASIC artillery game was printed in a 1980 hobby newsletter, and became Artillery Duel on the Atari 2600 in 1983."* [S] https://en.wikipedia.org/wiki/Artillery_Duel

## 5. Open items before build

1. Open a real manual (FM 3-09.30 or TC 3-09.81 / TM 6-215 original pages) to confirm the adjust-fire steps and "fire mission" wording, and whether "shot/splash" is a real call [U].
2. Decide the unit (feet, as in Battleship, or yards/mils for the table strip).
3. Spotter's "OVER n FEET" must use the measured crossing already computed for scoring (`game/logic.ts`); no new physics.
4. Ask Stuart before any real-gun claim (G2).
