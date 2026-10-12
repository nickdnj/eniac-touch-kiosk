# Expert review feedback and plan

**Date:** 2026-10-12
**Author:** Nick DeMarco with AI assistance
**Status:** Working plan. Item S1 is done; the rest is queued.
**Sources:** Brian L. Stuart's reply of 2026-10-11 (to Nick, Bill Mauchly; cc Doug, Jeff); Doug Crawford, 2026-10-05; Jeff Brace, 2026-10-08; Thomas Gesell's docent report of 2026-10-10.

Brian L. Stuart wrote the simulator this kiosk is built on. Doug is the museum manager. Jeff is the museum's social-media lead. Their notes are the first expert review of the kiosk and the video.

## 1. Feedback ledger

| # | Who | What they said | Verdict | Goes to |
|---|---|---|---|---|
| F1 | Stuart, Doug | The neon lamps on the accumulators are upside down: 0 at the bottom, 9 at the top. | **Correct.** Verified in Stuart's own `eniactk.go` (`neonpos`: `y = 149 + val*38`, y points up). Our UX spec had it backwards ("0 at the top, as on the real machine"). | S1 (done), C1 |
| F2 | Stuart, Jeff | ENIAC is pronounced inconsistently in the voice-over (Stuart heard "eNIac" with a long i; Jeff heard three different ways). | **Correct, and our own note was wrong.** `docs/video/narration.md` said ElevenLabs needs no respelling. Each call can say it differently, so that was luck on the test line. | C2 |
| F3 | Jeff | Check the pronunciation of people's names. | Open. Spoken names in the narration: Stuart (16), Eckert (5), Wescoff, Snyder, Lichterman, Kay McNulty, Jennings. | C3 |
| F4 | Jeff | Make a much shorter video: 30 seconds, or even 8. The 45 s Short is "good for those with short attention spans". | Open. | C4 |
| F5 | Stuart | GitHub link gives a 404. | **Our side.** The repo is private. | D1 |
| F6 | Stuart | Are you using the code on GitHub or the copy on the museum's Pi? There have been interface changes since. | Answered: GitHub, pinned to `c4b94f2` (2026-09-22). His master is now `7c043c5`, 3 commits later, all `ansi.go` and README. We are not behind in any way that matters. | R1 (reply), S3 |
| F7 | Stuart | The first-person interface (walk around the machine with arrow keys or a joystick) is newer than the museum's version and might be a better one to offer. | Real and already in the pinned tree: `vis/eniacfp.cpp` plus the `obj/` 3D model. Needs Irrlicht (C++), and a touch screen has no arrow keys. | S4 |
| F8 | Stuart | Will review the fact-check docs; wants to see the cable-and-switch GUI idea realised (it has been on his list). | Not a defect. Feeds the Original-UI conversation and the book project. | R1 |
| F9 | Stuart | A second, more careful watch may turn up smaller details. | Pending. **Do not call the video final until it arrives.** | C5 |
| F10 | Gesell (docent report) | "Nick's new interactive displays are very nice." Nothing ENIAC-specific broken. | Positive. No action. | none |

## 2. Plan

### Software (this repo)

| Id | Task | Status |
|---|---|---|
| S1 | Flip the accumulator digit rows in all three renderers (panel, run grid, compact), regenerate the 5 SVGs, correct UX spec 6.2. | **Done.** Branch `accumulator-digit-order`, commit `52105ee`. 209 web tests, mission checks and the deploy test pass. Checked by eye on the run grid: 9 at top, 0 at bottom, P and M level with rows 0 and 1, matching Stuart's layout. |
| S2 | Audit for any other place that encodes "0 is at the top": stale screenshots in `docs/screenshots/`, copy that mentions position, the perspective/room art, golden images. | Queued. I found no copy that describes lamp position (grep of narration, `explore/content.ts`, UX spec). Screenshots need regenerating. |
| S3 | Move the upstream pin from `c4b94f2` to `7c043c5` (`upstream.lock`, re-apply the 3 patches, rebuild cores). | Queued, small. It lets us tell Stuart we track his master as of 2026-10-01. A deliberate PR per NFR-12. |
| S4 | **Spike:** first-person interface (`eniacfp`) as a third Original-UI mode. Questions: does `libirrlicht-dev` build it on Ubuntu 24.04 x86; does it run on the OptiPlex's integrated GPU; how does a visitor steer without arrow keys (on-screen touch pad, or a USB gamepad on the stand)? | Queued. Needs a decision on input (D3) before building. |
| S5 | Release a new tarball (`make release ARCH=amd64`) and plan the install. | Blocked on D2. |

### Content (video project `eniac-kiosk-youtube`)

Full briefing: `docs/video-briefing-2026-10-12.md`.

| Id | Task |
|---|---|
| C1 | Re-record every shot that shows an accumulator lamp grid, from the fixed build. Do not mirror the old footage. |
| C2 | Re-voice with a pronunciation fix for ENIAC and a listening gate on every occurrence. |
| C3 | Pronunciation sheet for spoken names, sourced; reword where no source exists (the Lehmer precedent). |
| C4 | Cut a 30 s and an 8 s version for social. |
| C5 | Hold the final render until Stuart's second pass and his read of `docs/fact-check.md`. |

### Replies and outreach

| Id | Task | Status |
|---|---|---|
| R1 | Reply-all to Stuart (cc Doug, Jeff, Bill). Draft is in the chat for review. | Waiting on Nick's OK. |
| R2 | A short note to Jeff on the shorter video, once C4 has a first cut. | Later. |

## 3. Decisions for Nick

| Id | Decision | Recommendation |
|---|---|---|
| D1 | How does Stuart see the repo? Invite him as a read-only collaborator (his GitHub is almost certainly `blstuart`, the owner of upstream), or make the repo public. | Invite now. Decide on public later, and add a LICENSE first. Sending an invite emails him, so it needs your go. |
| D2 | When does the fixed build go on the floor? The school-group tour is Wednesday Oct 14 at 8 AM and you are there. | Build and rehearse in the container today and tomorrow. Install after the group, not before. |
| D3 | Input for the first-person view: an on-screen touch pad, or a USB gamepad? | **Decided (Nick, 2026-10-12): touch screen.** Brian suggested arrow keys or a joystick; the kiosk is touch-first, so S4 builds a touch control. |
| D4 | The fix sits on `original-ui-switch`, which is main plus 12 commits and has no PR yet. Open one PR for the lot, or split? | One PR. The museum box needs the Original UI anyway. |
