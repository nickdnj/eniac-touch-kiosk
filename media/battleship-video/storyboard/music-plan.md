# Music plan: ENIAC Plays Battleship (Gate 1 draft)

**Date:** 2026-10-23. **Status:** a ranked shortlist only. **No audio has been downloaded or saved.** Nick approves the downloads by file name, source and size (table in §4), and then we fetch them.
**Constraint (Nick, 2026-10-23):** no logged-in YouTube Audio Library. Only sources that need no login, with licences checked.
**Brief:** a light, ducked, playful naval-swing bed for the body; a tense, low-drama cue for the finale flight; a short sting for SUNK!.

## 1. Sources checked, and the verdict

| Source | Licence | Login? | Content ID risk | Verdict |
|---|---|---|---|---|
| **Kevin MacLeod, incompetech.com** | **CC BY 4.0**. Monetised YouTube use allowed with credit ([FAQ](https://incompetech.com/music/royalty-free/faq.html): "Yes, AND you can monetize the videos") | No (direct MP3 links) | **Real but manageable.** MacLeod now pre-registers his music in Content ID to block false third-party claims. A claim on a credited video is released after a dispute, "within 72 hours and likely much faster" ([his Content ID page](https://incompetech.com/music/royalty-free/youtube-contentid.html)). False claims by third parties still happen (a July 2026 Reddit report). Put the credit in the description **before** publishing. | **Use.** Every track below is verified from his catalogue (`pieces.json`: title, ISRC, length, bpm) and its MP3 link answers HTTP 200. The first ENIAC video already uses Hot Swing, so the channel sounds consistent. |
| Pixabay Music | Pixabay Content Licence: free, no credit required | No | **Higher and less predictable.** Some Pixabay composers fingerprint their tracks in Content ID; the defence is Pixabay's licence certificate in a dispute. Claims have also appeared after publishing. I could only confirm this from secondary sources, not a Pixabay primary page. | Not shortlisted. I did not verify any specific swing track there. |
| Free Music Archive | Varies by track (CC0, CC BY, CC BY-NC…) | Downloads may need an account | Varies | Not shortlisted. Each track needs its own licence check; **NC licences are out** if the video is ever monetised. No specific track verified. |
| Internet Archive 1940s swing / big-band **recordings** | **Not public domain in the US.** Under the Music Modernization Act, recordings first published 1923 to 1946 are protected for 100 years after publication ([copyright.gov](https://www.copyright.gov/music-modernization/pre1972-soundrecordings/)), so a 1945 record is protected until the end of 2045. Labels also fingerprint reissues. | No | **High** | **Rejected**, even though the period feel is tempting. |
| Uppbeat (free tier) | Credit code per video; free tier limited and scoped to small creators | **Yes** | Low, with the credit | Rejected: needs an account. |

## 2. Ranked shortlist (all Kevin MacLeod, incompetech.com, CC BY 4.0)

| Rank | Role | Title | Length · bpm | Why it fits |
|---|---|---|---|---|
| **1 (top pick, body)** | Body bed (M1 to M3, M6) | **Hot Swing** | 0:50 · 144 | Upbeat swing with saxes, clarinet and brass, a change-up in the middle and a **big ending**. Used in the first ENIAC video, so the series sounds the same. 0:50 means looping for the body; the first project already has measured loop and hit points (chord attack at 46.565 s, hits at 45.46 and 46.30 s; `~/Workspaces/eniac-kiosk-youtube/notes/short-assembly-v2-2026-10-12.md`). |
| 2 | Body bed, alternative | **Look Busy** | 1:47 · 100 | "Almost New Orleans-style; almost march": clarinet, tuba and trumpet. More band-on-deck than nightclub, and long enough to run Chapters 2 to 4 without a loop. |
| 3 | Body bed / end card, the "naval band" flavour | **Waunobe March** | 1:33 · 102 | A march for a 23-piece band with piccolo, snares and bass drum: the closest to a navy band in the catalogue. It is a march, not swing, so use it under the title and end card rather than the whole body. |
| **1 (top pick, finale tension)** | Flight-B tension (M7) | **Private Eye** | 1:16 · 132 | Bluesy swing with a prominent bass line and horn bursts. "The final thirty seconds builds in volume with the congas until the abrupt finish", so the build fits under flight B and the **abrupt finish** can land on the impact. It stays in the swing family, so it doesn't jar. |
| 2 | Flight-B tension, alternative | **Exciting Trailer** | 1:15 · 180 | Opens on a militaristic snare march (WWII feel), the most "gunnery" sound here. Darker than the rest of the video; use only the 0:00 to 0:36 snare section, low under flight B. |
| **1 (top pick, SUNK! sting)** | M5 hit on "Ship sunk!" | **Hot Swing**, ending | last ~1.5 s (chord at 46.565 s) | The same track's big final chord, already measured. A sting from the bed's own key closes the arc. |
| 2 | SUNK! sting, alternative | **Sweeter Vermouth** | 0:25 · 156 | Ends with "the bright thump of an ending" (vibraphone, saxes, brass). Use its last ~2 s. |
| 3 | Miss reaction (M4) / playful tag | **Bumbly March** | 0:58 · 120 | Tuba, trombones and snare, "lumbering", humorous. Audition for a 1 to 2 s trombone/tuba figure to play under the splash result. **Unverified that a clean 2 s figure exists:** to audition after download. |
| 4 | Short end-card tag (vertical cuts) | **Hamster March** | 0:36 · 120 | A snappy, bright march with a clean ending. Fits the 8 s and 30 s cuts' end cards. |

**Default plan:** Hot Swing (body, plus the SUNK! sting from its ending) + Private Eye (flight-B tension) + Bumbly March (miss figure, if one auditions well; otherwise a muted "wah" from Hot Swing's trombone). That is three tracks and one credit block.

## 3. Sound effects (not music)

- **Low drum on each punched card** (both flights' last hops) and **UI tap ticks:** **synthesise them in FFmpeg** (a decaying sine plus noise thump, as the first project did for `assets/audio/sfx/tap.wav`). No licence at all.
- **Splash (miss) and impact + water (sink):** pick from **Freesound with the licence filter set to CC0** (no credit, no Content ID registration expected). Synthesised water does not sound convincing. **Not yet chosen:** the files will be listed with URL, licence and size for Nick's approval at the visuals phase.
- **Avoid BBC Sound Effects.** Its RemArc licence is personal, educational and research use only, which rules out a YouTube channel.

## 4. Download list for approval (nothing fetched yet)

Sizes are `Content-Length` from HTTP HEAD requests on 2026-10-23. All return HTTP 200. Destination after approval: `assets/audio/music/`, untracked.

| File | Direct URL | Size | Track page |
|---|---|---|---|
| Hot Swing.mp3 | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hot%20Swing.mp3 | 2,108,107 bytes (2.1 MB) | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100202 |
| Private Eye.mp3 | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Private%20Eye.mp3 | 3,038,595 bytes (3.0 MB) | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100767 |
| Bumbly March.mp3 | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Bumbly%20March.mp3 | 2,430,413 bytes (2.4 MB) | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100425 |
| Look Busy.mp3 | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Look%20Busy.mp3 | 4,406,571 bytes (4.4 MB) | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100172 |
| Waunobe March.mp3 | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Waunobe%20March.mp3 | 3,818,040 bytes (3.8 MB) | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100016 |
| Exciting Trailer.mp3 | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Exciting%20Trailer.mp3 | 3,097,270 bytes (3.1 MB) | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100494 |
| Sweeter Vermouth.mp3 | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sweeter%20Vermouth.mp3 | 989,009 bytes (1.0 MB) | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100712 |
| Hamster March.mp3 | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hamster%20March.mp3 | 1,523,410 bytes (1.5 MB) | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100212 |

The default plan needs only the first three (7.6 MB). Hot Swing is also already on disk in the first project (`~/Workspaces/eniac-kiosk-youtube/assets/audio/music/Hot Swing.mp3`), so copying it from there avoids one download.

Only the track-page URLs with `?isrc=` were checked: they answer HTTP 200 for Hot Swing, and the others follow the same pattern. The MP3 links were each checked individually.

## 5. Attribution (exact text for the YouTube description)

The format is from incompetech's FAQ. List only the tracks actually used in the final mix:

```
Music by Kevin MacLeod (incompetech.com):
"Hot Swing", "Private Eye", "Bumbly March"
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```

## 6. Before publishing: checking the licence and Content ID

1. The credit block above is in the description **before** the first upload, including unlisted ones.
2. After the unlisted upload, open YouTube Studio → Content → Copyright for the video (Nick's session, at publish time only). If a claim appears from MacLeod's registration, dispute it citing CC BY 4.0 and the credit. If a claim comes from an unknown company, dispute it and email help@incompetech.com (per [his Content ID page](https://incompetech.com/music/royalty-free/youtube-contentid.html)).
3. Keep this file and the `pieces.json` entry (ISRC) as the record of the licence.
4. The 30 s, 8 s and vertical cuts each carry the same credit block in their own descriptions.
