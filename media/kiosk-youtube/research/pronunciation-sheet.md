# Pronunciation sheet: spoken names in the ENIAC kiosk video (M3)

**Date:** 2026-10-12. **For:** v6 voice regeneration (Nick 2, ElevenLabs). **Scope:** every spoken voice-over line in the v5 / v5b cut and the published 45 s Short (v2, trajectory). On-screen text is not covered. Research only: no audio generated and no scripts edited.

**How the list was built.** I took every line actually heard in v5/v5b: the voice events in `storyboard/storyboard-data.json` (v5), mapped through the line texts and source times in `output/build/v5-line-positions.json`, plus N01–N06 (`assets/audio/narration/*.txt`) and the two reused WAVs. The Short lines come from `storyboard/short-teaser.md`. v5b has the same narration and timings as v5; only the music-only S21 end screen was removed. **Times** are in the final file (8.12 s intro included). Where I give a word time, it comes from a word-level alignment of `output/eniac-kiosk-v5b.mp4`; otherwise it is the line start.

**Status key.**
- **VERIFIED:** an authoritative recording exists at the locator (the person, a family member, or a colleague who worked with them), and two independent machine reads of it agree with the spoken form: the YouTube ASR spelling and a wav2vec2 phoneme recognizer (`facebook/wav2vec2-lv-60-espeak-cv-ft`). **No one on the team has listened yet.** The ear-check list at the end takes about 2 minutes. Do it before locking the aliases.
- **PROBABLE:** a secondary source only (a historian or a second-hand family voice), or primary voices whose machine reads disagree.
- **UNVERIFIED:** no source. Reword.

## 1. Names spoken in v5/v5b and the Short

| Name | Spoken in (line id @ time, count) | Spoken form for TTS | IPA (machine-read from the source unless noted) | Source + locator | Status |
|---|---|---|---|---|---|
| **ENIAC** (incl. "ENIAC's") | **v5: 24.** N01 0:08.4 · tour-01 0:21.0 · tour-02 0:33.1 · tour-05 0:53.7 · tour-07 1:10.7 · tour-09 1:33.4 · tour-13 2:25.0 · tour-14 2:40.7 · tour-27 3:49.7 · tour-28 bridge 4:07.5 · squares-04 4:20.3 · squares-09 4:59.2 · squares-10 5:06.6 · squares-11 5:22.0 · squares-13 5:45.2 · squares-18 6:29.2 · N02 6:37.9 · N03 6:46.8 · N04 6:54.3 · finale-02 7:13.3 (×2) · N05 7:31.2 · N06 7:44.5 (×2). **Short: 4.** L1 0:00.3 · L2 0:06.3 · L5 0:17.1 · L7 0:24.9 | EN-ee-ack | /ˈɛniæk/ (Wikipedia, lead only); Stuart's own read /ɛnɛak/ | Brian L. Stuart's review (briefing M2). Stuart, "Brian Stuart — The Eniac", VCF channel, https://www.youtube.com/watch?v=tEOFDA6nOOA&t=4 (0:00:04, "The ENIAC") | VERIFIED (the alias text is M2's job to test) |
| **Stuart** (Brian L. Stuart) | **2.** N04 6:55.8 ("Brian Stuart's") · N05 7:34.4 ("Brian L. Stuart"). Also "Brian" alone, N05 7:42.4 | STOO-ert (same as "Stewart") | /ˈstuːərt/ | Stuart says his own name: same video, https://www.youtube.com/watch?v=tEOFDA6nOOA&t=19 ("My name is Brian Stuart", 0:00:19–0:00:21) | VERIFIED |
| **Drexel** (University) | **1.** N05 7:34.9 | DREK-sul | /ˈdrɛksəl/ | Stuart, same video, 0:00:22 ("I'm a professor at Drexel University") | VERIFIED |
| **Eckert** | **1.** tour-25 3:44.4 ("Eckert said a hunt like this…") | EK-ert | /ˈɛkərt/ | Bill Mauchly (son of John Mauchly), "VCF East: History of the ENIAC", https://www.youtube.com/watch?v=EcWsNdyl264&t=1197 (about 0:20:00). Jean Bartik (worked for Eckert–Mauchly), CHM "Oral History of Jean Bartik" (2008), https://www.youtube.com/watch?v=jU7ZwcrsBbw&t=3823 (about 1:03:43–1:03:55, "Pres Eckert says") | VERIFIED |
| **Kay McNulty** | **1.** tour-27 3:52.6 | KAY mək-NUL-tee | /məkˈnʌlti/ | Bill Mauchly, her son: EcWsNdyl264 about 0:32:44–0:32:46 ("my mother, Kathleen McNulty"). Jean Bartik, her friend of 61 years: jU7ZwcrsBbw about 0:54:47 and 0:55:36. Kathy Kleiman, VCF talk, https://www.youtube.com/watch?v=cA6tKzZtbhc&t=422 (0:07:02) | VERIFIED. **Ear-check our v5b take at 3:52.6:** the machine read of the current TTS was /kaɪ mək-naʊ-tɪ/ |
| **Betty Jean Jennings** | **1.** tour-27 3:54.0 | JEN-ingz | /ˈdʒɛnɪŋz/ | Jean Jennings Bartik herself, naming her family: https://www.youtube.com/watch?v=jU7ZwcrsBbw&t=1025 (0:17:08). Kleiman, cA6tKzZtbhc 0:04:22 | VERIFIED |
| **Betty Snyder** | **1.** tour-27 3:55.0 | SNY-der (rhymes with "spider"; not "SHNY-der") | /ˈsnaɪdər/ (an /s/, not /ʃ/) | Jean Bartik, her programming partner: OH jU7ZwcrsBbw about 0:54:47 and 1:49:06; CHM lecture "Jean Jennings Bartik – ENIAC Pioneer" (2008), https://www.youtube.com/watch?v=buAYHonF968&t=1372 (0:22:52). Bill Mauchly, EcWsNdyl264 about 0:31:42 | VERIFIED |
| **Marlyn** (first name) | **1.** tour-27 3:55.8 | MAR-lin (not "Marilyn") | /ˈmɑːrlɪn/ | Jean Bartik: OH jU7ZwcrsBbw about 0:54:50 and 1:06:02 (ASR heard "Marlon"); CHM lecture buAYHonF968&t=2060 (0:34:24). Kleiman TEDx, https://www.youtube.com/watch?v=Zevt2blQyVs&t=247 (0:04:07, ASR heard "Marlin"). **Conflict:** Bill Mauchly 0:32:34, ASR heard "Marilyn" | PROBABLE (the primary voices' machine reads disagree; ear-check) |
| **Wescoff** | **1.** tour-27 3:56.0 | WESS-koff | /ˈwɛskɑːf/ | Jean Bartik, CHM lecture https://www.youtube.com/watch?v=buAYHonF968&t=2060 (0:34:24–0:34:26, "Marlyn Wescoff had been hired…"). Bill Mauchly, EcWsNdyl264 about 0:32:34 | VERIFIED |
| **Fran Bilas** | **1.** tour-27 3:57.1 | BEE-lus | /ˈbiːləs/ | Kay McNulty, her college schoolmate and shift partner: "Kay Mauchly and ENIAC" (Bill Mauchly channel), https://www.youtube.com/watch?v=9Jh5SCM75Xg&t=65 (0:01:09–0:01:16, "Fran Bilas and I worked on opposite shifts"). Jean Bartik: OH jU7ZwcrsBbw&t=4320 (about 1:12:04–1:12:15). Bill Mauchly: about 0:32:28. **Conflict:** Kleiman, cA6tKzZtbhc 0:04:24, machine-read "BY-luh" | VERIFIED (Kay and Bill read as /iː/; Bartik read as /eɪ/, but ASR spelled "Beelis"; Kleiman differs, so ear-check) |
| **Ruth Lichterman** | **1.** tour-27 3:58.3 | LICK-ter-man | /ˈlɪktərmən/ | Kathy Kleiman, historian of the six, who met the programmers in 1986: https://www.youtube.com/watch?v=cA6tKzZtbhc&t=1236 (0:20:36–0:20:42, said twice). Bill Mauchly, EcWsNdyl264 about 0:32:42 (read LIK-jer-men). **I found no recording of Ruth herself, her family, or a colleague saying the surname.** | PROBABLE |
| **InfoAge** (sent as "Info Age") | **v5: 1.** N06 7:52.1. **Short: 1.** L8 (line from 0:32.4) | IN-foh-ayj | /ˈɪnfoʊ eɪdʒ/ | InfoAge's own "Welcome to InfoAge", https://www.youtube.com/watch?v=MhWqgJi15pE (0:00:01) | VERIFIED |
| **Wall, New Jersey** | **v5: 1.** N06 7:55.1. **Short: 1.** L8 | WAWL | /wɔːl/ | Same InfoAge video, 0:00:06 ("located here in Wall, New Jersey") | VERIFIED (no alias needed) |
| **vcfed.org** (sent as "V C F E D dot org") | **v5: 1.** N06 7:57.2. **Short: 1.** L8 | vee-see-eff-ee-dee dot org | n/a | Jeff Brace, VCF East showrunner: "VCF East 2024 Update #1", https://www.youtube.com/watch?v=V93m5bFmTnk&t=725 (about 0:12:07, read letter by letter). He also says "V C fed dot org" in Update #3, https://www.youtube.com/watch?v=myVo0ujf3SE&t=40 (0:00:43) | VERIFIED for the current form. Jeff can choose which form he prefers |

**No entry needed: plain English, or the narrator himself.** Nick (N01 0:09.0, self) · Vintage Computer Federation (N01 0:10.4, N06 7:49.6, Short L8) · Army (tour-02 0:33.1, Short L2) · Brian · the unit names Cycling Unit (tour-07), Master Programmer (tour-08), Constant Transmitter (squares-05), Accumulator One (squares-09) · the UI names Walk the room, Original room tour, See the whole room, Squares, Mission Two/Three.

**The new 30 s and 8 s Short drafts** (`storyboard/short-30s.md`, `short-8s.md`, Gate 1, written in parallel today) speak at most ENIAC (0 or 1 times, depending on the option), Vintage Computer Federation, and Wall, New Jersey. All are covered above. Neither draft speaks a person's name.

**Other TTS-risk token (not a name).** **INIT**: squares-11 at 5:22.0, "Press INIT, ENIAC's go button." It is the kiosk's button label. Neither Stuart's talks nor anything else I found gives a spoken form; in the captions Stuart says "initiating unit". **UNVERIFIED.** Nick owns this label, so he can rule on it; otherwise use the rewording below.

**Spoken 0 times in v5/v5b and the Short** (on screen at most). Mauchly, Atanasoff, von Neumann, Goldstine, Holberton, Bartik, Teitelbaum, Meltzer, Spence, Antonelli, Zuse, Hopper, Lehmer, De Mol, Bullynck, Aberdeen, Moore School, Ballistic Research Laboratory, Philadelphia, EDVAC, UNIVAC, Dekatron, Eniactk. Two of them have a written source in case the 30 s or 8 s cuts need them:
- **Mauchly:** MAWK-lee. NLS "Say How?" (Library of Congress) has "Mauchly, Dr. John (MÔK-lē)", https://www.loc.gov/nls/other/sayhow.html.
- **von Neumann:** von-NOI-män (same NLS page).

Lehmer stays unspoken, as the kiosk decided.

**Correction to the counts in the kiosk `narration.md`.** That file counts Stuart 16 and Eckert 5 across *all* kiosk scripts. In the v5/v5b cut, Stuart is spoken 2 times (N04 attribution, N05 thanks) and Eckert once (tour-25). The myth line with "Eckert … total fiction" and the tubes clip are cut. Each of the six programmers is spoken once, all in tour-27. **Fran Bilas is missing from the kiosk list** and needs the same check.

**What the current v5b take already says** (machine read, not a listen): MAR-lin, WES-ko(ff), BEE-lə(s), LIK-ter-m…, SNY-d…, EK-…, STOO-ert, DREK-səl, IN-foh-ayj. All match the sources. McNulty (3:52.6) is the one to check by ear. The aliases are there to stop drift when the lines are regenerated (the M2 lesson), not because v5b is known to be wrong.

## 2. Rewordings proposed

**No name came out UNVERIFIED, so no name-avoiding rewrite is required.** These are the exact before/after texts for the one UNVERIFIED token, plus a fallback for the two PROBABLE names. Neither change adds a Stuart mention: Stuart stays as the N04 attribution, and N05 remains the **single thank-you, near the end**.

1. **squares-11 (INIT), only if Nick does not rule on how to say it.** −2 syllables.
   - Before: "Press INIT, ENIAC's go button. Those lamps are the simulator's real accumulators."
   - After: "Press ENIAC's go button. Those lamps are the simulator's real accumulators."
   - Note: this is a baked kiosk line, so the change belongs in the kiosk narration, which is being re-recorded for M1 anyway.
2. **tour-27, fallback only.** Use it if Nick holds Marlyn and Lichterman (PROBABLE) to the strict Lehmer standard and no confirmation comes back. The better route is to get one confirmation (see the asks below), because this version drops all six names, including the verified ones. 35 to 33 syllables. The wording follows fact-check B10.
   - Before: "And these are ENIAC's first programmers: Kay McNulty, Betty Jean Jennings, Betty Snyder, Marlyn Wescoff, Fran Bilas, and Ruth Lichterman."
   - After: "And these are ENIAC's first programmers: six women, chosen in nineteen forty-five, and you can read all six names right here on the screen."
   - The rest of the line ("There was no programming language…") is unchanged. "Right here on the screen" works because the honor-roll screen shows the names before the P3 cutaway begins. Re-check this after the M1 re-record.

## 3. Lamp-position wording (M1 check)

I scanned every spoken v5/v5b and Short line for top, bottom, up, down, row, column, count, line, high and low. **None describes accumulator lamp position or digit order.** The hits, all safe:
- **tour-06:** "the map along the bottom, to walk down the room". The screen's map, not the lamps.
- **tour-08:** "It counts". The Master Programmer.
- **tour-20, tour-21, tour-25:** "lines up / out of line". These compare accumulators side by side, so they are true under either digit order.
- **squares-03, squares-04, squares-16:** "rows, a row, a column". The tile analogy.
- **finale-02:** "the squares you counted".
- **Short L6:** "Up to the highest point… and down to the landing". The shell's path.

There is no "from the top", "counts down" or "top row".

## 4. Ear-check list (about 2 minutes; a human must do this before the aliases lock)

Each clip runs about 5 s from the time given:
- **Kay McNulty** saying "Fran Bilas": 9Jh5SCM75Xg at 1:09.
- **Jean Bartik:**
  - "Fran Bilas": jU7ZwcrsBbw at 1:12:04.
  - "Betty Snyder … Marlyn": jU7ZwcrsBbw at 54:45.
  - "Marlyn Wescoff": buAYHonF968 at 34:22.
  - "Jennings": jU7ZwcrsBbw at 17:05.
- **Bill Mauchly**, the six names: EcWsNdyl264 at 32:25–32:50.
- **Kleiman**, "Ruth Lichterman": cA6tKzZtbhc at 20:34.
- **Our own v5b take:** 3:49.5–3:59 (the six names) and 3:44 (Eckert).

## Method and limits

- The phoneme reads are a machine aid. Whisper-style ASR alone is not enough, because it normalizes spellings (the M2 lesson).
- Clip times were taken from YouTube caption cues and are good to about ±5 s.
- I did not find a recording of Ruth Lichterman, of Frances Bilas Spence herself, or of their families.
- The Feb 15, 2026 "ENIAC 80" talks were by family members: Chris Eckert, Gini Mauchly, Bill Mauchly and Tim Bartik. I found no posted recording of them.
- I could not query NLS Say How by name. I searched its full page text: no entries for Eckert, Stuart, McNulty, Snyder, Wescoff, Bilas or Lichterman.
- The exact TTS strings sent for the Short were not saved in the repo. I used the display text in `short-teaser.md`.
