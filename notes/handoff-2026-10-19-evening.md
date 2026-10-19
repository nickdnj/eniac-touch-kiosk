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
