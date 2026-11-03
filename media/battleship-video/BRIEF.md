# Creative brief: "Can a 1946 Computer Sink a Battleship?" (working title), YouTube video

Pre-filled 2026-10-23 from Nick's direction in the ENIAC kiosk session. The content-studio orchestrator should treat this as the Phase 0 creative brief, confirm anything marked **(confirm)** in one batch, and go. This is a **new project**, separate from `~/Workspaces/eniac-kiosk-youtube` (the "Program ENIAC: Our New Touch-Screen Exhibit" video, already public on @nickdnj). Reuse its voice, pronunciation, editorial rules and footage recipe (paths below), but do not edit that repo.

## What Nick asked for (his words, lightly trimmed)

> "Create a video whose aim is to drive museum traffic to come see our new ENIAC exhibit, and learn about the ENIAC through Battleship. So: 'You sunk my battleship.'"

## The one job of this video

**Get people to walk into the VCF museum and play the ENIAC Battleship game.** Everything else (the history, the machine) is there to make that feel irresistible and to leave the viewer understanding one true thing: *a 1946 computer could fly a shell across the sky by doing tiny arithmetic steps, and here you can aim it yourself.*

- **Audience:** families and curious people in central/coastal NJ first (the museum is a local draw), then anyone on YouTube who likes retro computing or the old board game. Not ENIAC experts. Nick, a docent learning ENIAC through the kiosk, is the benchmark viewer.
- **Call to action (locked, do not re-open):** Vintage Computer Federation, InfoAge Science and History Museums, 2201 Marconi Rd, Wall NJ. **Wed, Sat & Sun, 12 to 5.** (Hours locked by Nick 2026-10-12.)
- **Tone:** warm, playful, a little cheeky. The hook is a game, the payoff is real history. First-person docent voice ("I'm Nick, a docent at the VCF museum...").

## What exists (the thing to film)

Two new missions in the ENIAC touch kiosk, built 2026-10-22/23, running the **real pulse-level ENIAC simulator** (Brian L. Stuart's). Full design, measured shot tables and open questions: `research/kiosk-gunnery-battleship-mission.md` (copy of `docs/gunnery-mission.md`).

- **Gunnery** (mission 5): a 1946 shooting-gallery look. Aim a gun at a flag.
- **Battleship** (mission 6): **the one for this video.** The look of the old board-game TV commercials: navy room, red banner, the ten-by-ten ocean grid, grey warships, a "SUNK!" stamp.
  1. **Pick your ship** (Destroyer, Cruiser, Battleship; each drawn differently).
  2. **Pick one of its two guns** (Light/Quick, Medium/Long, Heavy/Big) and an **elevation** (5, 10, 15, 20 degrees).
  3. An **enemy ship** is named with a distance ("Enemy cruiser: 14,000 feet away"). Colour zones ring it; bigger hulls are easier to hit.
  4. **Load the guns:** ENIAC wires itself (297 cables, 1,148 switches), and the kiosk walks the room: Initiating Unit, Master Programmer, accumulators, multiplier, function table, constant transmitter, card reader and punch.
  5. **READ, INIT:** ENIAC flies the shell for real, one second of flight at a time, punching a card per hop. The arc draws itself dot by dot with the flag/ship, zones and a live "ship distance vs shell distance" readout.
  6. **Result:** rank (Ship sunk! / Sharpshooter / Good shot / Near miss / Splash!), how far off, points, a touch keyboard for your name, and a today/all-time top list.
- **Where it lives:** repo `nickdnj/eniac-touch-kiosk`, branch **`gunnery-game`** (pushed 2026-10-23, last commit 56274b7). It sits on the unmerged `your-turn` draft stack, **not on `main` and not on the museum's kiosk yet.** A dev copy runs from the Mac (`make dev`, port 8740; the kiosk repo `README.md` has the Chrome-at-kiosk-size recipe).
- **The museum's kiosk (OptiPlex, 10.130.10.42) runs an older release without these missions.** See Preconditions.

## Suggested arc (about 2.5 to 3 minutes; confirm length)

1. **Hook (0:00-0:10).** Straight into the Battleship title screen: the grid, a shell arcs, **SUNK!** Voice: "That's a Battleship game. But the computer playing it was built in 1946." (Do not open on talking.)
2. **What it is (0:10-0:35).** ENIAC, the room-sized computer (public-domain Army photos, 2 or 3, credited). Why it was built: to work out where artillery shells land (firing tables for the Army's Ballistic Research Laboratory). "So aiming a gun is the most ENIAC thing you can do."
3. **People (0:35-0:50).** The women who programmed ENIAC, by name, from the kiosk's honor roll (see `~/Workspaces/eniac-kiosk-youtube/research/` and the kiosk's honor screens; names are on the sheet there). People before hardware, always.
4. **You play (0:50-1:50).** One full round, real time, clean kiosk screen recording: pick a ship and a gun, see the pictures; lock in; **ENIAC wires itself and the room walk** (a few of the stops, fast); READ, INIT; the arc builds dot by dot; the shell lands; the zones, the "770 ft long" tag, the points, the rank. Explain the machine **through** the game, one idea per beat:
   - your gun and angle become **two numbers** dialled into the Constant Transmitter;
   - ENIAC does **50 tiny steps of arithmetic for every second of flight** (the Master Programmer is the conductor);
   - the **accumulators** hold the numbers: the hop, how far along, how high;
   - the **multiplier** squares the shell's speed, and **Function Table 2** holds the air-drag table to look up how much the air slows it;
   - the **card punch** punches one card per hop. **Each card is one dot.** Join the dots: that's the shell's path.
5. **The twist (1:50-2:10).** A near miss, then a second shot that sinks the ship (determinism is real: the same shot always lands in the same place, which is how the museum can promise a perfect shot exists for every ship). Maybe show a top-scores board.
6. **Invite (2:10-2:30).** Cool, specific: "Beat the high score on a computer older than your grandparents." Hours/address end card. One thank-you to Brian L. Stuart (spelled Stuart), once, near the end.

## Facts to be careful with (read before writing a word)

- **ENIAC** was shown to the public **February 15, 1946**; built to compute artillery firing tables (BRL, Aberdeen). Use `~/Workspaces/eniac-kiosk-youtube/research/fact-check.md` and `research/trajectory-history.md` (both in that repo) as the fact base; every new claim goes in a fact-check row.
- **This is Brian Stuart's reconstruction.** Nobody has found a record of the real 1946 demo set-up. Say "Brian Stuart's recreation of the trajectory program". The method (Heun's, 0.02 s steps, drag looked up by speed squared) is faithful to 1940s practice; air density is held constant (a simplification he states); **the drag table is Stuart's own best attempt.**
- **The guns and ships are a game, not history.** The six gun speeds (600 to 1,300 ft/s) come from the range we measured on the simulator, **not real naval gun figures**, and the drag table is for a 105 mm shell. **Do not state real ranges or real gun performance, and never say "this is how a real battleship gun works."** The game's "feet" are the simulator's feet.
- **Speed claim [FC]:** the kiosk says the real ENIAC could work out a shell's path faster than the shell takes to fly. That comparison is still on the fact-check list (to be checked with Doug and Stuart); **do not use it in the video until cleared.**
- **"INIT"** is Stuart's label for the initiating pulse button; speak it as a word, "init"; never say "start button" for it; do not claim ENIAC labelled it GO. (Details: `~/Workspaces/eniac-kiosk-youtube/docs/video-briefing-2026-10-12.md` section M2b.)
- **Exact numbers you can show, because the machine will produce them every time** (all measured through the kiosk bridge on the real core, repeatable): Destroyer + Light gun + 10 degrees lands at 3,709 ft (7 hops, about 12 s); Cruiser + Medium gun + 15 degrees at 11,694 ft; Battleship + Heavy gun + 15 degrees at 19,721 ft. The full table, with hops and times, is in `research/kiosk-gunnery-battleship-mission.md`. Flights run about 1.5 s of wall time per hop; the longest game flight is 27 hops (about 40 s). Cut flights in the edit; the full one is real time.

## The title and the trademark (decision for Nick; recommendation inside)

"Battleship" is a Hasbro trademark and **"You sunk my battleship" is their catchphrase** from the commercials. A museum volunteer's YouTube video using the phrase in the **title or thumbnail**, or any clip, logo, music or voice from the Hasbro commercials, risks a claim or takedown. **Recommendation:**

- **Do not** use the Hasbro logo, box art, commercial footage or audio, or the exact catchphrase in the title or thumbnail. Our visuals are our own drawings; keep it that way.
- Use a title that **refers to the game without claiming it**: working title **"Can a 1946 Computer Sink a Battleship?"** Alternatives: "ENIAC Plays Battleship" (shorter, still names the game; nominative use), "Fire! A 1946 Computer Does the Math".
- A **spoken wink** at the old commercial in the body ("you know the line") is Nick's call; keep the exact phrase out of titles, tags, thumbnail and captions. **(confirm)**
- The kiosk's own on-screen words are already our own ("Ship sunk!", "Splash!").

## Style and production rules (locked, inherited from the ENIAC kiosk video)

- **Voice:** Nick's ElevenLabs clone **"Nick 2"** (`6SxuwKUiBpZjFTc06v9Y`, `eleven_multilingual_v2`, stability 0.5, similarity 0.75, style 0.4, speed 1.12). `ELEVENLABS_API_KEY` is in `~/.zshrc`; run TTS via `zsh -ic`. No stock-voice fallback; if the voice call fails, stop and ask.
- **Pronunciation:** ENIAC is spoken **"Ennie-ack"** via the alias (`~/Workspaces/eniac-kiosk-youtube/research/pronunciation-aliases.json`, `scripts/gen_narration.py` there applies it). "INIT" is the word "init". Never speak "Lehmer". **Gate:** build a listening reel of every spoken "ENIAC" and "init" and have Nick listen before audio is approved (Whisper cannot judge this).
- **Footage:** real **1920x1080 kiosk screen recordings** from the fixed kiosk build, **no burned-in caption boxes** (record with `CLEAN=1`; the voiceover carries it). Never flip footage in post (the accumulator lamps are right-way-up only in the fixed build).
- **Overlays:** never bake text into images; animated overlays in the FFmpeg assembly. Vertical cuts: pre-crop to 9:16 before zoompan. No DALL-E (gpt-image-1 or newer only); **no AI images of ENIAC itself**; period photos only public-domain, sourced and credited.
- **Music:** light, ducked, period-friendly bed (1940s royalty-free was chosen for the first video; a playful swing/naval feel could suit this one, **confirm**).
- **Editorial rules carried over:** thank Brian L. Stuart exactly once, near the end; link his simulator page and `github.com/blstuart/eniac-simulator`, **not** the private kiosk repo; each idea once; keep the kiosk UI footer credit visible.
- **Cuts:** a main video plus a **30 s** and an **8 s** cut, and a **vertical short** for social (the first project's `scripts/` and `storyboard/` have the short-assembly recipe; start from `notes/short-assembly-v2-2026-10-12.md` there). **(confirm which)**

## How to record the footage

1. Get the code: `cd ~/Workspaces/eniac-touch-kiosk && git fetch && git worktree add .claude/worktrees/gunnery gunnery-game` (or use the existing `.claude/worktrees/gunnery`). `make upstream` once, then `make dev` serves on http://localhost:8740 against the real core. (`build/` and `src/web/node_modules` are not in the worktree; link them from the main checkout.)
2. The Playwright recording specs live in `tests/web/video/` (`clip-*.spec.ts`, `flows.ts`, `overlay.ts`, `narrate.ts`). **There is no spec for Battleship yet.** Write one, modelled on `clip-difference-cubes.spec.ts` (that file is on the `gunnery-game` branch, not on `main`). Drive: briefing, Let's go, Next step, pick ship, pick gun, pick elevation, Load the guns, tour (use Next a few times, then Skip), READ, INIT, wait for the landing, hold on the result.
3. **To film a chosen target** (the target is random each round): in a dev build, `window.__eniac` is the app; before the aim screen opens set `__eniac.game = { target, hit, name, ship: null, charge: null, elevation: null }` (copy the values from a `targets` entry in `missions/battleship.yaml`), then `__eniac.show({name: "aim"})`. Pair each target with the shot that sinks it (table in the research file). If that proves fiddly, ask the software team in the kiosk repo for a `?target=` dev hook.
4. The chosen shot must be flown **alone on the machine**; do not run other heavy jobs while recording (we saw flights vary under load in an early harness; through the bridge on an idle Mac they are exact).

## Preconditions before anything is published

1. **The museum kiosk must actually have the game.** Merge the draft PR stack and `gunnery-game` to `main`, build a release (`make release ARCH=amd64`), install on the OptiPlex (procedure: `docs/deploy-x86.md` in the kiosk repo). The video invites people to play it. Until it is installed, **do not publish**, or the first visitors find nothing. (Nick owns this step; ask him for status.) **(blocking)**
2. Brian L. Stuart should see the cut before it is called final or goes to VCF / InfoAge / the VCF channel (as with the first video).
3. Nick's Gate 1 (storyboard) and Gate 2 (audio listening, including the ENIAC/init reel) as usual.
4. Run `/Users/nickd/Workspaces/AgentArchitect/scripts/youtube-whoami.py` before any upload (the token drifts).

## Publish

**Draft only. Prepare an upload-ready package** (render, thumbnail, title, description, chapters, tags). **Do not upload or publish without Nick's explicit go.** If uploading, unlisted first, then Nick decides; channel is Nick's @nickdnj (the review channel) until moved to the VCF channel. No emails from Claude; any email drafts go in the personal Gmail account. The description should carry the museum hours/address, link Stuart's simulator, and **not** use the Hasbro catchphrase or trademark as a tag.

## Open questions for Nick (answer in one batch at Gate 0)

1. Title: "Can a 1946 Computer Sink a Battleship?" (recommended) or another? Spoken wink at the commercial, yes or no?
2. Length: about 2.5 to 3 minutes plus 30 s and 8 s cuts and a vertical short? Or longer?
3. Is the kiosk update scheduled? When can the museum's OptiPlex have these missions installed (this decides the publish date)?
4. Anyone from the museum on camera (Doug, a visitor playing)? The first video was screen and voice only.
5. Music: 1940s bed again, or something with a naval swing?
