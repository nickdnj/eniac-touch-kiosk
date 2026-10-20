# Handoff, 2026-10-19 evening (for Nick, reviewing at home)

## What exists

**Review video (watch this first):** `~/Workspaces/tmp/difference-video/ENIAC-Difference-mission-review.mp4` on the `nickdemarco` Mac. 1:54, 1080p, 12 MB, macOS "Samantha" voice, real kiosk footage, no music. Rebuild: `python3 ~/Workspaces/tmp/difference-video/build.py` (reads the beat offsets, runs `say`, cuts with ffmpeg). It could not be sent to your phone (file-send tool unavailable; a GitHub release upload was blocked), so it needs AirDrop or a copy from that Mac.

**Raw footage:** `assets/video/difference-2026-10-19/difference-clean-raw.mp4` and `difference-beats.json` (untracked).

**Storyboard and metadata:** `storyboard/difference-storyboard-v1.md`, `output/upload/difference-upload-metadata-DRAFT.md`. Plan: `research/difference-video-plan-2026-10-19.md` (section 9 has your publish instructions).

## Still blocked for the real cut (this Mac lacks them)

ElevenLabs key (Nick 2 voice), `AgentArchitect/scripts/youtube-whoami.py`, YouTube credentials. Your decision: upload unlisted, both videos (Difference, and a re-cut of the main one), without waiting for the listening gate; send the link.

## Kiosk PRs (all draft, all stacked, none merged)

#76 panel fixes (decades, connectors) -> main. #77 pin to Stuart's master -> main. #78 Difference mission -> #77. #79 N missions -> #78. #80 footage spec, step-window connectors, chain readouts, plan figure, whole-visit specs -> #79 (also merges #76).

## Draft reply to Brian (NOT sent; you said hold it until code and video are done)

Brian, thank you for the careful look and for the tutorial. Done on our side: the master programmer decades now have 0 at the bottom, data connectors are drawn rectangular and control connectors round, and the kiosk now supports any number of missions. Your polynomial table is Mission 4, "Difference", and we ship difference.e with your permission. We moved to your master (ad9a7a7) and dropped our two patches now that you have taken both fixes. On the race: understood, we keep our local patch for the trajectory only and will drop it when you have worked out the 1'P question. Still to do on our side: the `eniacfp` graphics in the video, and the squares patching shot. One question: may we name you as the author of the mission program, and may we use the tutorial's wording in the video narration?

(Edit freely. Do not quote his email publicly without asking him.)

## Open decisions

1. Ask Brian: author credit; use of tutorial wording. 2. Babbage claims are sourced to his tutorial only. 3. Real voice and upload need the other machine. 4. The main-video re-cut: the existing specs now run four missions, but the footage is not re-recorded.

---

# First 30 minutes when you are back (added 2026-10-20 morning)

**The review video** is also copied to `~/Desktop/ENIAC-Difference-mission-review.mp4` on the `nickdemarco` Mac (12 MB; AirDrop it to your phone, or open it there).

**What to look at, in order**
1. Watch the review video (1:54). Things to judge: pacing, whether the plan screen (the animated table) reads well, the connector shot at about 0:45 (rectangular data jacks vs round control jacks), and how the system voice says "Ennie-ack" and "init".
2. Skim `storyboard/difference-storyboard-v1.md`: the narration lines are the script. Cut or reword anything that doesn't sound like you.
3. Kiosk: the four-mission picker (page 2 holds Difference) and the run screen are the visible changes. Screenshots can be regenerated from the PR #80 branch (`difference-footage`).

**Decisions that unblock the most work**
| # | Decision | My recommendation |
|---|---|---|
| 1 | Merge the kiosk PRs | In order: #77 (pin bump), #76 (panels), #78, #79, #80, each retargeted to `main` after the one before it merges. All are drafts; each needs "ready for review" first. The tests I could run here pass; the Pi/OptiPlex install and re-timing are not done. |
| 2 | Where the real voice and the upload happen | Run the video part on the `nickd` machine (it has the ElevenLabs key, `AgentArchitect` and YouTube access). Footage, beats and storyboard are in this repo; `git pull` the `difference-video-plan` branch. |
| 3 | Brian: author credit, tutorial wording, and the reply | Send the drafted reply (in the section above) once you have watched the video. It asks both questions. I have not sent anything. |
| 4 | Main-video re-cut | Re-record the clips from kiosk PR #80's branch (specs already run four missions), then re-voice. Not started. |

**Not done, in case you ask:** voice-over in your voice, final render, any upload, Doug Crawford's copy approval of the Difference text, Pi/OptiPlex timing of the run speeds, a museum-grade source for the Babbage claims (they rest on Brian's tutorial), a custom briefing animation for Difference (the plan animation is done).

**Gmail note:** the Oct 18 thread with Brian now shows three messages; the third is not visible to me (drafts are hidden from my tool), so it may be a draft reply someone started. I did not read or touch it.

---

**Status note (Nick, 2026-10-20):** still in development. A prototype is being tested on the floor at the museum, and none of this work is on it. So: keep everything on branches and draft PRs; the merge order above is a plan for when Nick decides, not a recommendation to merge now. The pin bump (#77) also changes the build toolchain to Go 1.27.2 and retires two patches, which is exactly the kind of change to hold until the floor prototype's feedback is in.
