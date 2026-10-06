# Handoff from the VCF workspace: floor install on Wednesday (2026-10-04)

## What Nick wants

> From my point of view, this could be ready to put out on the floor as soon as we pop this on a mini PC and touchscreen display and replace the monitor that's there now. We could do it on Wednesday.

**Target: install at the museum on Wednesday 2026-10-07.** It replaces the current ENIAC exhibit screen: an old Pi at 10.130.10.27 running Stuart's `eniactk` with `trajdemo.e -D`, on a VIZIO monitor. See wiki `teams/vcf-museum/eniac-exhibit.md`.

## Where things stand

- **Email to Doug (Nick's demarconet Drafts, not sent yet):** "ENIAC: I went down a rabbit hole (kiosk + an 8-minute video)". It shares the v2 video, says the kiosk is ready for the floor, and offers Wednesday for the install. It also asks Doug to introduce Nick to Brian Stuart. **Wait for Doug's OK on Wednesday before installing.**
- **Video:** https://www.youtube.com/watch?v=RCvTUH0kJxI (eniac-kiosk-youtube, v2, 7:58). It was uploaded **Private**, but the email calls it unlisted, so Nick has to switch it to **Unlisted** in YouTube Studio before he sends.
- **Brian Stuart:** **nothing has been sent.** The patch email ("ENIAC simulator: three small fixes, and a museum kiosk built on your simulator") is still a draft in Nick's Drafts. Nick wants Doug to introduce him first. Once that happens, rework the draft as a reply on Doug's intro thread, with the video link.
- **Pre-share fact check:** `docs/fact-check-2026-10-04-preshare.md` (copied from vcf `workspace/2026-10-04-eniac-review/`). Verdict: fine for Doug and the history is clean, but there are 4 real items to fix before Stuart sees it, and they show on the floor too.

## To do before Wednesday

### 1. Fix the four fact-check items in the kiosk (text only)

Visitors read these screens. Full rewordings are in the fact-check file.

| # | Where | Fix |
|---|---|---|
| R1 | `missions/trajectory.yaml` (briefing, step texts, result), `explore/content.ts` MISSION_TAILS trajectory | "One hop = one card" is wrong. `trajdemo.e` takes 0.02 s Heun steps, 50 per card, so one card = 1 s of flight. Use: "ENIAC works out the flight in tiny time steps and punches a card for every second of flight." |
| R2 | `explore/content.ts:67` | "Laid in a line… about 80 feet" contradicts the note on the next line. Use: "Forty panels stood in a U shape, about 80 feet long along the front." |
| R3 | `tubes/content.ts`, `docs/tubes.md` 2.5 | Nothing sources the all-fives "5555555555" test, yet it sits beside "follow the 1946 maintenance manual". Either cite the manual section or say: "a test problem with a known answer; every accumulator should show the same lamps." |
| R4 | `honor.ts` exhibit page | "recreation of the shell path…": use "Brian Stuart's reconstruction of the shell trajectory from ENIAC's February 1946 unveiling." |

Recommended soft edits from the same file, cheap to do at the same time:
- N1 `honor.ts` stuart.lead and `squares.yaml:192`: say "simulates ENIAC at the level of individual pulses" (Stuart's own words).
- N2: say "cards the simulator punches".

Run `make test` and check that the mission still reads well. The video narration has the same R1/R2/R4 lines baked in (N03, tour-05, N04, chapter card K). **Leave the video alone until Stuart has seen it.**

### 2. Hardware dry run, on a desk, before the gallery

- The procedure is `docs/deploy-x86.md` (OptiPlex 9020M, Ubuntu 24.04, X11 + Chromium kiosk, 24" USB touchscreen).
- The one-stick installer is proven in QEMU only. **Run it once on the real mini PC and touchscreen before Wednesday**, then do the power-cut test and the touch check.
- Confirm which mini PC and display Nick is using. The doc assumes an OptiPlex 9020M and a 1920×1080 touch panel.

### 3. Questions for Doug (raise on the day if he doesn't answer them by email)

- **The old exhibit Pi** (10.130.10.27): unplug it and keep it as a fallback, or retire it? Its known issues (no autologin, under-voltage) go away if it's retired.
- **Network:** does the kiosk need the museum LAN, or does it run offline?
- **Stuart's permission:** the wiki notes say to ask Stuart before baking his simulator into a kiosk image. Credit is on every screen and the code is fetched, not copied, but it does run with 3 local patches. Ask Doug whether he's comfortable going to the floor before Brian replies, or whether the intro should come first.

## Done already

- The ENIAC trial on the Model 4 kiosk's Pi 5 was removed on 2026-10-01.
