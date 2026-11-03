# Creative brief: ENIAC touch kiosk, YouTube video

Pre-filled 2026-10-03 from Nick's direction in the eniac-touch-kiosk session. The content-studio orchestrator should treat this as the Phase 0 creative brief, confirm anything marked **(confirm)** in one batch, and go.

## What Nick asked for (his words, lightly trimmed)

> "Use this as a starting point to create a YouTube video that we can share. I want to include the squares demo. It's pretty good as is, but let's only thank Brian L. Stuart once. There seems to be some redundant stuff, so trim out anything redundant. Dress it up nice and get it ready so we can put it on YouTube. I'm going to share this with the docent team and then we can go from there."
>
> "We're going to show the squares demo. Say: come to the museum so you can see the trajectory run live and the primes run live, but make that sound cool."

## The piece

- **Topic and arc:** A touch-screen ENIAC kiosk for the Vintage Computer Federation museum (InfoAge, Wall NJ), running Brian L. Stuart's pulse-level ENIAC simulator. The arc:
  1. The live attract screen.
  2. Walk the room: Explore ENIAC.
  3. The tubes story and "Find the dead tube".
  4. The first programmers (honor roll).
  5. **The Squares mission, shown in full.**
  6. A teaser: Primes and the 1946 shell trajectory run live only at the museum. Come and see them. Make this sound exciting.
  7. The finale.
  8. Close.
- **Audience:** first the VCF docent team (internal share), then the public on YouTube. Curious people, not ENIAC experts. Nick, a docent learning ENIAC through this project, is the benchmark viewer.
- **Tone:** warm, curious, fun, first-person docent voice ("I'm Nick, a docent at the VCF museum…").
- **Narration voice:** Nick's ElevenLabs clone **"Nick 2"** (`6SxuwKUiBpZjFTc06v9Y`), model `eleven_multilingual_v2`, stability 0.5, similarity 0.75, style 0.4, speed 1.12.
  - `ELEVENLABS_API_KEY` is exported in `~/.zshrc`; run TTS via `zsh -ic`.
  - No stock-voice fallback.
  - ElevenLabs reads "ENIAC" correctly as written.
  - Never speak "Lehmer": the pronunciation is unverified.
- **Visual style:** real screen recordings of the kiosk (already captured, 1920×1080). Dress it up:
  - a branded title open;
  - chapter cards / lower thirds;
  - clean transitions;
  - light background music under the narration (ducked);
  - an end screen.

  No AI images of ENIAC itself: real recordings only. (confirm whether a few period public-domain photos are wanted)
- **Target length:** about 6–8 min. (confirm)
- **Publish preference:** **draft only, prepare an upload-ready package.** Nick shares with the docents first.
  - Do not upload or publish without Nick's explicit go.
  - If uploading at all, unlisted, and only after `youtube-whoami.py`.
  - Channel: VCF/InfoAge content is under Nick's documented InfoAge exception. (confirm the channel)

## Hard editorial rules from Nick

1. **Thank Brian L. Stuart exactly once,** prominently, near the end. The source videos thank him several times (title cards, end cards, narration). Cut the repeats.
   - Spell it **Stuart** on screen and in metadata.
   - Keep the persistent on-screen kiosk footer ("ENIAC simulator by Brian L. Stuart, Drexel University"). It's part of the UI, not a narrated thank-you.
2. **Trim redundancy:**
   - The tour and the clips overlap heavily: the attract flight, the Explore pan, the tubes cards and the finale each appear in more than one source.
   - The source narration repeats framing lines like "setting up could take a day or more".
   - Each idea should appear once.
3. **Include the Squares mission** (`eniac-touch-walkthrough-squares.mp4`), not just the tour's quick version.
4. **The "come to the museum" beat:**
   - Don't show the Primes and Trajectory runs in full.
   - Tease them (a few seconds of each at most) and invite people to the museum to see them run live on the real simulator.
   - Make it sound cool, e.g. "The primes hunt and the 1946 shell flight? Those run live, card by card, only at the museum."
5. **Facts:** use `research/fact-check.md` and `research/tubes.md` wording. Key points:
   - about 18,000 tubes;
   - the six women were "the first programmers";
   - the Goldstines are "the project team", not builders;
   - "the lights of Philadelphia dimmed" is a myth.

## Source material (in this repo)

- **`assets/video/source/`** holds the narrated kiosk recordings, all in Nick 2's voice, 1920×1080 H.264/AAC:

  | File | Length |
  |---|---|
  | `eniac-touch-tour.mp4` | 6:01, the flagship |
  | `eniac-touch-walkthrough-squares.mp4` | 2:52 |
  | `eniac-touch-walkthrough-primes.mp4` | 3:00, teaser only |
  | `eniac-touch-walkthrough-trajectory.mp4` | 2:35, teaser only |
  | `attract.mp4` | 1:07 |
  | `explore.mp4` | 1:24 |
  | `tubes.mp4` | 1:50 |
  | `finale.mp4` | 0:55 |

  The narration is baked into these files. Re-cutting needs either re-voicing new lines in Nick 2 or splitting at narration gaps.
- **`research/narration.md`:** the narration script for every source video. Each row is one spoken line with its beat.
- **`research/source-narration/`:**
  - `*-review.mp3`: voice-only tracks per source video;
  - `manifest.json`: line text, durations and clip names.

  The per-line WAVs (285 files, 86 MB) are at `/Users/nickd/Workspaces/eniac-touch-kiosk/.claude/worktrees/agent-a6cf402db789a1946/build/video/narration/`. Copy what you need before that worktree is cleaned up.
- **`research/fact-check.md`, `research/tubes.md`:** sourced wording.
- **Fresh footage:** the kiosk itself can record new clean footage (no captions, no narration) if needed. In `~/Workspaces/eniac-touch-kiosk`:
  - `make dev` serves it at http://localhost:8740;
  - Playwright video specs live in `tests/web/video/`.
- **Coming soon:** a sourced explainer of what the Army's Ballistic Research Lab gave the ENIAC programmers for trajectories (firing tables, drag functions). It will land in `eniac-touch-kiosk/docs/trajectory-history.md` and may help the Trajectory teaser line.

## Handling constraints

- The kiosk repo (`nickdnj/eniac-touch-kiosk`) is **private until Brian Stuart grants permission**.
  - The video can show the kiosk. Don't link the repo publicly.
  - Link Stuart's own simulator page instead: https://www.cs.drexel.edu/~bls96/eniac/simulator.html and github.com/blstuart/eniac-simulator.
- **Credit line for Nick:** "Exhibit by Nick DeMarco, Docent and Exhibit Developer, Vintage Computer Federation."
- **Museum:** Vintage Computer Federation, at the InfoAge Science and History Museums, Wall, New Jersey. vcfed.org.
- **Drafts only.** Never publish or send anything without Nick.
