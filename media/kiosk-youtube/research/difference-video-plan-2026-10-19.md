# Plan: video for Mission 4, Difference

**Date:** 2026-10-19
**Status:** Planning only. Nothing is recorded, written or generated. Nothing here is fact-checked.
**Depends on:** the kiosk's Difference mission (kiosk repo, PR #78, `docs/difference-mission.md`). The mission is a draft; its UI is not built.
**Source material:** Brian L. Stuart's tutorial "Polynomial Tables on the ENIAC" and his `difference.e` (email to Nick, 2026-10-19).

## 1. What the video is for

Nick's call: the new mission gets its own video, separate from the exhibit-introduction video (`eniac-kiosk-v5b`/v6), which stays about the whole kiosk. This one is the Difference mission only.

- **Audience:** docents first, then the public. Curious non-experts. Same as the main video.
- **Idea in one line:** ENIAC can make a whole table of numbers by adding alone, the trick Charles Babbage designed his Difference Engine around.
- **Why it works as a story:** it ties two famous machines together, and the visitor does it themselves in five steps. Stuart's tutorial says it is "an effort to tie together these two seminal parts of computer history".
- **Tone and voice:** as the main video. First-person docent, warm and curious, Nick's "Nick 2" voice (ElevenLabs, settings in `project.json`). No stock-voice fallback.

## 2. Length and formats

| Cut | Length | Notes |
|---|---|---|
| Mission video | 3 to 4 min | The mission is about 4 minutes on the floor; the video can be shorter because it skips the waiting. |
| Short | 30 s | The table filling in, ending on the zero crossing. |
| Short | 8 s | One beat: the cards stacking up. |

Jeff Brace liked the 30 s and 8 s versions of the main video, so plan them from the start instead of after. Shorts are vertical: pre-crop to 9:16 before zoompan.

## 3. Proposed arc

| # | Beat | Picture | Idea |
|---|---|---|---|
| 1 | Hook | Cards stacking up on the kiosk, row after row | A table of numbers, made with nothing but adding |
| 2 | The old problem | One period photo or the kiosk briefing card | Tables were worked out by hand; mistakes crept in |
| 3 | Babbage's idea | The kiosk's plan card (the four-accumulator chain) | Use differences, so only adding is needed |
| 4 | The chain | The accumulator panels for 17 to 20, lit | Four accumulators; the last one never changes |
| 5 | Step 1 | Dial the 6 | The steady number |
| 6 | Steps 2 and 3 | Cable from A18 to Trunk 1 to A17 | Adding the difference into the table value. Show data jacks vs control jacks (Stuart's point) |
| 7 | Steps 4 and 5 | Printer switch, then the loop cable | Punch a card, then start the next row |
| 8 | INIT | The run view with lamps | Press INIT; watch the chain add |
| 9 | The table | Cards piling up; it goes negative | The zero crossing is the satisfying moment |
| 10 | Close | Result screen | Same machine, different cables, a fourth job. Come and try it |

Stuart is thanked once, near the end, per the standing rule. The kiosk footer stays.

## 4. Footage plan

Record from the kiosk once the mission UI exists. Rules carried over from the main video:

- **Clean recordings** (`CLEAN=1`, no burned-in caption boxes); the voice-over carries the explanation. Text overlays are added in assembly, never baked into images.
- **Re-record, do not flip.** Use a build with the fixed accumulator lamp order (0 at the bottom, 9 at the top) **and** the fixed master programmer decades (PR #76). Any shot that shows either panel from an older build is wrong.
- Use the new data/control connector styling (PR #76) in every wiring shot. This is the point Stuart raised at 5:02 of the main video, and a mission with five cables is the best place to show it well.
- Show the real-time punch rate honestly; speed up in the edit, say so in the voice-over if it matters.
- Stuart suggested the `eniacfp` first-person graphics rather than the `eniactk` ones for any "walk into the room" shot. That is for the main video's 2:13, but it applies here if there is an establishing shot of the accumulators.
- Period photos: public-domain US Army ENIAC photos already sourced for the main video. For Babbage's engine, find a public-domain image and record the source. No AI images of ENIAC or of Babbage's machine.

## 5. Voice and audio

- Per-scene WAVs for surgical re-record, plus one concatenated MP3 for the listening review (project rule).
- ENIAC is spoken with the alias that is already in the project's pronunciation setup; INIT is written lowercase "init" in the script (decisions in `notes/m3-decisions-2026-10-12.md`).
- **Listening gate:** cut every spoken "ENIAC" and "init" out of the final audio and join them into one reel for a human to hear. Do the same for the Shorts.
- New names and terms to check by ear before the gate: **Babbage** and **Difference Engine** (easy), **polynomial**, and any person we name. Add them to `research/pronunciation-sheet.md`.
- Music: ducked, same approach as the main video; swap the stand-in for a YouTube Audio Library track before publishing.

## 6. Facts that must be sourced before a script is written

Nothing below may be spoken until it is in `research/fact-check.md` with a source.

| Claim | Where it comes from now | Status |
|---|---|---|
| The Method of Differences builds a table by repeated addition | Stuart's tutorial, p.1 | Needs a second source |
| Babbage designed the Difference Engine around it; the tutorial says that was his motivation | Stuart's tutorial, p.1 | Needs a primary or museum source (e.g. Science Museum, Computer History Museum) |
| The example polynomial and its starting values 600, -89, -34, 6 | Tutorial p.1; confirmed by running `difference.e` on the pinned simulator | Verified by running it |
| The third difference of a cubic is constant, here 6 | Tutorial p.1 | Maths; easy to verify |
| ENIAC's card punch and 10-digit accumulators | Already in the main fact-check | Reuse |
| Did anyone run a difference-engine style table on the real ENIAC in 1946? | Not known | **Do not imply it.** The tutorial says ENIAC "can simulate" a Difference Engine; it is a modern teaching program, not a 1946 one. Say so plainly. |
| Last card of a 100-row run shows f(0), not f(100) | Tutorial, last paragraph | Optional trivia; only if it fits |

## 7. Steps and who does them

1. **Now (no dependencies):** Nick reviews this plan and the open decisions below.
2. **Content:** write the fact-check entries; get a public-domain Babbage image; draft the script as a storyboard in the same markdown-in-the-wiki form as earlier cuts, for Gate 1 review in Obsidian.
3. **Kiosk side (blocks recording):** finish the mission UI; get `difference.e` into Stuart's repo or his permission to ship it; time slow and full speed.
4. **Record** the kiosk specs from the fixed build; **audio**; **assemble**; Gate 2 listening reel; eye check; Nick's go.
5. **Publish** to Nick's channel first (run `youtube-whoami.py` before any upload). VCF and InfoAge channels stay gated on Stuart's review.

## 8. Decisions for Nick

| Id | Question | Recommendation |
|---|---|---|
| V-D1 | Separate video, or a chapter inside the main video? | Separate (you said so). The main video stays as is, and gets the connector, decade and `eniacfp` fixes in its own revision. |
| V-D2 | Should Stuart see the script or a rough cut before it is final? | Yes, the script. He found real errors in the main video; asking early is cheaper than re-recording. He has also offered to read fact-check documents. |
| V-D3 | Name Stuart as author of the mission program in the video? | Yes, once, near the end, with the tutorial title. Needs his OK (kiosk D2). |
| V-D4 | Publish timing: before or after the main video is cleared by Stuart's second pass? | After, so the same fixes are in both. |
| V-D5 | Length: 3 to 4 min as proposed, or shorter? | Start with 3 to 4; Jeff's guidance favours the Shorts for reach. |

## 9. Nick's instructions, 2026-10-19 (later)

- **Publish plan:** when everything is built, upload **unlisted** to YouTube and tell Nick the links. Both videos: the new Difference video (with its Shorts if made) **and** a re-cut of the main video with Stuart's fixes (data vs control connectors, master programmer decades, `eniacfp` graphics at about 2:13).
- **Listening gate:** Nick chose to upload without waiting for his listening pass on the ENIAC/init reel. The reel is still generated and sent with the links, and the upload is reported as **not gate-checked**. This overrides section 5's gate for the unlisted link only; VCF and InfoAge publication stays gated on Stuart's review.
- **Before any upload:** run `youtube-whoami.py` (the token can drift to the wrong channel). Unlisted, Nick's channel (@nickdnj).
- **Environment blockers found on the Mac this was planned from (user `nickdemarco`):** `AgentArchitect/scripts/youtube-whoami.py` is not present, no `ELEVENLABS_API_KEY` in `~/.zshrc`, and no YouTube credentials located. The pipeline needs the machine where those live (the `nickd` setup), or those three things copied here.
