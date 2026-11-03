# Handoff: kiosk session to the YouTube session

**Date:** 2026-10-12, about 09:30 EDT
**From:** the kiosk session (`~/Workspaces/eniac-touch-kiosk`), which is wrapping up
**To:** the "ENAIC Youtube" session (this repo). From here on you are the only session. You finish the video and finalization.
**Read with:** `research/video-briefing-2026-10-12.md` (the full brief; this file updates it with what has happened since).

## 1. What is finished on the software side (nothing for you to wait on)

Everything the video depends on is merged to `main` of `nickdnj/eniac-touch-kiosk` (now public, MIT). `main` is at `62ef8d7`.

| PR | What |
|---|---|
| #67 | Original UI switch, accumulator digit-order fix in the three panel drawings (0 at the bottom, 9 at the top), MIT license, NOTICE |
| #68 | INIT wording: Initiating Unit card says "the initiating pulse button, which Stuart's simulator labels INIT"; `docs/video/narration.md` says "init" |
| #70 | Same orientation fix in the "Find the dead tube" accumulators (tubes screens); test TUBE-22 |
| #71 | 28 doc screenshots regenerated; test that all five accumulator SVGs have 0 below 9 |

**Open on purpose:** PR #69 (upstream pin bump to Stuart's master `7c043c5`). It changes nothing the video shows. Nick decides when to merge.

**Footage rule:** record from `main` (`62ef8d7` or later). The older kiosk worktrees are stale:
- `~/Workspaces/eniac-touch-kiosk/.claude/worktrees/video-v6` is pinned at `52105ee`. It has the panel fix but **not** the tubes fix (#70) and **not** the INIT copy (#68). Re-point it at `main` before any new capture.
- `video-v5` (`a8bbf3a`) has none of the fixes.
- Both have uncommitted files from your work; I did not touch them.

## 2. Facts decided since the briefing was written

1. **Accumulators:** 0 at the bottom, 9 at the top, everywhere. Brian L. Stuart and Doug Crawford both caught it. Re-record, never mirror old footage.
2. **ENIAC** is "EN-ee-ack". Pronunciation dictionary alias, one take per scene, human listening reel of every occurrence. Do not trust whisper for this.
3. **INIT is spoken as the word "init"** (rhymes with "in it"). Write it lowercase `init` in the TTS script, keep INIT on screen. Introduce it once as "the initiating pulse button, which the simulator labels init". Source: 1946 *Report on the ENIAC*, Part I, ch. 2, section 2.3 ("When the initiating pulse button is pushed, the computation begins"), https://ftp.arl.army.mil/~mike/comphist/46eniac-report/chap2.html. Never call it the "start button" (in that report that is the power-on button). "GO" is our gloss; do not say ENIAC labelled it GO.
4. **Names:** every spoken name needs a sourced pronunciation or gets reworded (the Lehmer precedent). Jeff Brace asked for this explicitly.
5. **Shorts:** Jeff wants 30 s or even 8 s. I can see `output/short-30s-DRAFT-contact.jpg` and `output/short-8s-contact.jpg` and your PR #1, so you are already on it.

## 3. What is waiting on other people (do not finalize past these)

- **Brian L. Stuart's second pass.** He said he will watch again more carefully and read `docs/fact-check.md`. Nothing is back yet. He has the unlisted link `https://www.youtube.com/watch?v=mAW7AuKXLBE`, and so do Bill Mauchly, Doug, and Jeff.
- **Rule:** produce v6 as a review cut, circulate it, wait for Brian's notes, then finalize. Do not call v6 final before then.
- **Upload hygiene:** a replacement video is a new unlisted URL; run `/Users/nickd/Workspaces/AgentArchitect/scripts/youtube-whoami.py` first (the token has drifted channels before). Keep it **unlisted**. Nick tells the four reviewers which link replaces the old one; do not email them yourself.

## 4. Things you should not do

- **Do not send email to Brian, Doug, Jeff or Bill.** Nick sends those. Drafts are fine.
- **Do not tell Brian anything about the license** (Nick said: not needed). His simulator has no license file; our NOTICE already says so.
- **Do not commit files you did not change** (project rule); `.agentarchitect.json` in both repos is not yours or mine.
- **ElevenLabs voice "Nick 2"** (id `6SxuwKUiBpZjFTc06v9Y`). Key is only in `~/.zshrc`, so run generators through `zsh -ic`. If the voice call fails, stop and ask. No fallback voice.

## 5. Context for the decisions you will meet

- **Nick is the benchmark viewer** and is learning ENIAC himself. Accuracy over polish for this round: the audience is Stuart, Doug and Jeff.
- **Kiosk status:** installed on the floor at the museum, still being tested with visitors. The video must not imply a signed-off exhibit.
- **Wednesday 2026-10-14:** school group at 8 AM. Nick installs the fixed build (release `993f52c`) after they leave, over the wired network. He has the install email. The video does not block that.
- **Brian's remarks to be careful with:** he has a cable-and-switch GUI "in my plans"; do not claim we built his interface. Say "Brian Stuart's simulator, with a touch front end".
- **Dropped on purpose (Nick's call):** rotating the museum staff PIN.

## 6. Where things are

- Kiosk repo (public): https://github.com/nickdnj/eniac-touch-kiosk, checkout `~/Workspaces/eniac-touch-kiosk`, now on `main`.
- Review notes: `docs/review-feedback-2026-10-12.md` there (ledger, plan, decisions).
- Video specs that drive the recordings: `tests/web/video/*.spec.ts`; narration source `docs/video/narration.md` (already carries the INIT edits).
- Feedback sources: Brian's reply 2026-10-11 (thread "ENIAC touch kiosk built on your simulator"), Doug 2026-10-05, Jeff 2026-10-08.

## 7. First three things to do

1. Re-point `video-v6` (or a fresh worktree) at kiosk `main`, then re-record every shot with an accumulator grid: Squares run, the tour, Explore's Accumulator entry, the room views, and the tubes exercise.
2. Regenerate voice-over with the ENIAC and "init" fixes; build the listening reel; get Nick to listen.
3. Hold at the review cut and tell Nick it is ready for Brian's second pass.
