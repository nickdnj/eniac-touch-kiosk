# Briefing for the content team: ENIAC kiosk video, revision after expert review

**Date:** 2026-10-12
**For:** Content Studio Team, project `eniac-kiosk-youtube`
**From:** Nick DeMarco (kiosk project)
**Current cut:** `output/eniac-kiosk-v5b.mp4`, unlisted at https://www.youtube.com/watch?v=mAW7AuKXLBE
**Status of the cut:** Draft. Nick shared it as a draft to get expert eyes before calling it final. It has now had them.

## 1. What happened

Brian L. Stuart (author of the simulator, Drexel), Doug Crawford (museum manager) and Jeff Brace (social media) reviewed the video. The reviews found two real errors, both in the picture or voice rather than the history. Stuart called the video "very cool" and plans a second, closer watch. Nothing in the fact-check was challenged so far, but he has not yet read it.

## 2. Must fix

### M1. The accumulator lamps are upside down (picture)

- **Error:** In every shot of an accumulator's neon lamps, digit 0 is at the top and 9 at the bottom. On the real machine, and in Stuart's own front end, **0 is at the bottom and 9 at the top**. The sign lamps P and M sit level with digits 0 and 1.
- **Reported by:** Stuart, and independently by Doug.
- **Fixed in the kiosk:** branch `accumulator-digit-order`, commit `52105ee` in `~/Workspaces/eniac-touch-kiosk`.
- **What to do:** re-record the footage from the fixed build. **Do not flip the old footage in post.** A flip would also mirror the "0 to 9" row labels, the P/M labels and every other piece of text in the frame.
- **Where it shows:** anywhere an accumulator grid is on screen: the Squares run (both accumulators), the tour, the Explore clip's Accumulator entry, and the room views. Treat every clip that comes from a `tests/web/video/*.spec.ts` recording as suspect until you have looked at it.
- **Narration:** no spoken line describes lamp position, so no script change is needed. Check by ear anyway for "from the top" or "counts down".
- **How to re-record:** the specs in `tests/web/video/` (`walkthrough*.spec.ts`, `clip-*.spec.ts`) drive the kiosk and capture the screen. Re-run them against a build of the fixed branch. Generate audio and mux as before (`narration-gen.py`, `narration-mux.py`).

### M2. ENIAC is pronounced inconsistently (voice)

- **Error:** Stuart heard "eNIac" with a long i at least once. Jeff heard it three different ways in the earlier social video. The correct and intended sound is **EN-ee-ack** (first syllable like "enter", then "ee", then "ack").
- **Why it happened:** `docs/video/narration.md` says "ElevenLabs needs no respelling", based on one transcription check on 2026-10-02. That check only showed the model *can* say it right. Each call is independent, so about 55 occurrences give it plenty of chances to drift. **That note is superseded; do not rely on it.**
- **What to do:**
  1. Add a pronunciation fix at the TTS level: an ElevenLabs pronunciation dictionary with an alias rule for ENIAC (and a phoneme rule only if the model supports it; check that for `eleven_multilingual_v2` before relying on it). Voice and settings stay as they are: "Nick 2", id `6SxuwKUiBpZjFTc06v9Y`, stability 0.5, similarity 0.75, style 0.4, speed 1.12. If the voice call fails, stop and ask; no fallback voice.
  2. Re-generate per scene (the project rule already asks for per-scene WAVs).
  3. **Listening gate:** cut every spoken "ENIAC" out of the final audio by timestamp and join them into one reel (about a minute). A human listens to that reel. Whisper cannot do this job: it transcribes any of the variants as the same word.
  4. Same gate for the 30 s and 8 s cuts.

### M2b. What to call the INIT button (voice and on-screen copy)

Nick noticed the voice says INIT oddly. Checked against the primary sources on 2026-10-12:

- **1946 name:** the **initiating pulse button**. *Report on the ENIAC* (Moore School, 1 June 1946), Part I, Chapter 2, section 2.3, "Reader Start Button and Initiating Pulse Button": "When the initiating pulse button is pushed, the computation begins." The remote terminal that parallels it is marked I[s] on drawing PX-9-302. The same chapter has a *reader start button* and an *initial clear push button*.
- **"INIT" is Brian Stuart's label, not ENIAC's.** In his simulator `i` is the initiating pulse button, and his `eniactk` labels it INIT, next to CLEAR (initial clear) and READ (reader start). Fine to show on screen, because that is what visitors see in his interface.
- **"GO button" is our plain-language gloss.** The 1946 report never uses "Go" or "Initiate" as a label. Careful: in that report the unit's *start button* (section 2.1.1) is the **power-on** button, so never say "start button" for INIT.
- **Why the voice trips:** a TTS voice has to guess how to read the all-caps token "INIT" ("in-it", the letters, or "initiate"), and may change between takes, as with ENIAC. Nick's decision, 2026-10-12: it should come out as a word, "init".

**What to do**

1. **Spoken, INIT is a word: "init"** (rhymes with "in it"), the way the simulator's own users say it. Not the letters I-N-I-T and not "initiate". Write it lowercase, "init", in the TTS script (or alias INIT to "init" in the pronunciation dictionary), because an all-caps token is what makes a voice guess. On screen it stays INIT. Introduce it once with the full name: "the initiating pulse button, which the simulator labels init".
2. Reword "ENIAC's GO button" / "ENIAC's go button" so it does not claim that ENIAC labelled it GO. Suggested: "Press INIT. It sends the initiating pulse, ENIAC's go signal."
3. Add "init" to the listening reel next to ENIAC; every take must say it as one syllable-pair word, "IN-it".
4. Source for the fact-check file: 1946 *Report on the ENIAC*, Part I, ch. 2 (section 2.3), https://ftp.arl.army.mil/~mike/comphist/46eniac-report/chap2.html; Stuart's reference, `ref.pdf` ("Initiating Unit": c, i, r).

**Kiosk copy to adjust later** (not in the Wednesday release): `src/web/app/explore/content.ts:117` says "ENIAC's GO button, called INIT". Suggested: "the initiating pulse button, which Stuart's simulator labels INIT".

## 3. Should fix

### M3. Spoken names (Jeff)

Jeff asked that people's names be checked. Names in the voice-over scripts and their counts in `docs/video/narration.md`: Stuart 16, Eckert 5, Wescoff 1, Snyder 1, Lichterman 1, Kay McNulty 1, Jennings 1. Lehmer appears in the script notes but is deliberately never spoken (see the "Pronunciation notes" section there).

- Build a one-page pronunciation sheet, **each entry with a source** (a recording, a family or colleague statement, an archive interview).
- Same standard as the Lehmer decision: if no authoritative source can be found, reword to avoid speaking the name rather than guess.
- Do not assume. The names above are my list from the narration file only; check the storyboard and `new-lines.md` for others.

### M4. Short versions (Jeff)

Jeff liked the 45-second Short and asked for something shorter still: **30 seconds, or even 8**. The goal is to bring people to the museum, not to teach ENIAC. Suggested shape:

- **30 s:** the attract screen, one tap, lamps playing, one line of voice, VCF address and hours as the end card.
- **8 s:** one image of lamps running, one sentence, the museum name.

Both inherit M1 and M2. Vertical 9:16, per the project rules (pre-crop before zoompan; text overlays added in assembly, never baked in).

## 4. Hold and gate

- **Do not call the revised long cut final** until Stuart's second pass and his read of the fact-check docs (`docs/fact-check.md`, `docs/fact-check-2026-10-04-preshare.md`) are in. Produce it as v6, circulate for one more round, then finalise.
- **Do not publish publicly.** Keep it unlisted. The current URL has already been sent to Stuart, Bill Mauchly, Jeff and Doug.
- **Upload:** YouTube cannot swap the file under an existing URL, so v6 will be a new unlisted video and a new link. Run `/Users/nickd/Workspaces/AgentArchitect/scripts/youtube-whoami.py` first (the token has drifted to the wrong channel before). Nick will tell the four reviewers which link replaces the old one.

## 5. Context to keep in mind

- **Audience for this round:** the museum's own people and the author of the simulator. They know the machine. Accuracy errors cost more than polish.
- **Stuart's wording is the source of truth** for anything about the simulator, and he plans to write a book on ENIAC. Where we are unsure, we say less.
- **The kiosk is on the floor but still in testing with visitors.** The video must not imply it is a finished, signed-off exhibit.
- **A thing not to overclaim:** Stuart mentions a graphical cable-and-switch interface "in my plans for a while". The kiosk's mission screens do something like that already, but say "Brian Stuart's simulator, with a touch front end", not that we built his interface.
