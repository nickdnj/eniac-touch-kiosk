# ENIAC Part 1 — Publish Package

Status as of this pass: **package assembled up to the audio boundary. No
voice, no master, no upload.** Nothing in this folder has been sent,
posted, or uploaded anywhere.

## What exists right now

| File | What it is | Status |
|---|---|---|
| `publish/metadata.json` | Show + episode metadata: title, keywords, category, IDs. Audio-dependent fields (`duration`, `fileSize`, `enclosureUrl`, `pubDate`) are explicitly `null` with a paired `<field>_pending` key explaining what fills them and from where. | Complete except audio-dependent fields |
| `publish/episode.xml` | A single, standalone, iTunes-namespaced RSS `<item>` block. Drop it into any `<channel>`. Placeholders (`PENDING_...`) mark exactly what needs real values and how to get them — see the comment block at the top of the file. | Complete except audio-dependent fields |
| `publish/promo/docent-email.md` | Draft email to a fellow VCF docent. Leads with the fact card, not the episode — that's the point of this one. | Draft, not sent |
| `publish/promo/vcf-forum-post.md` | Draft forum/community post for VCF or an IEEE-history-adjacent list. | Draft, not posted |
| `publish/promo/social-post.md` | Two short draft options for Mastodon/Bluesky, with character counts. | Draft, not posted |
| `publish/fact-card-part-1.md` | Docent floor reference. **Not mine — pre-existing, untouched.** | Complete (owned by another pass) |
| `publish/transcript-part-1.md` | Clean reading transcript. **Not mine — owned by the Podcast Show Notes Writer, who was running concurrently with this pass and finished it during this session.** | Complete (not my file) |
| `publish/show-notes.md` | Episode description, full show notes. **Not mine.** | **Did not exist when this package was assembled.** `episode.xml`'s `<description>` currently carries a clearly-marked DRAFT description written from `script/part-1.md` and `research/part-1-verification.md` §10.6 so the RSS item isn't empty. **Replace it with the Show Notes Writer's final copy verbatim** — see "Next steps" below. |
| `publish/chapters-part-1.txt` | Chapter timestamps. **Not mine.** | Exists, but explicitly marked **ESTIMATED, NOT MEASURED** by its owner — derived from word count at 150 wpm, not from real audio. Must be regenerated from `assets/audio/durations.json` once the voice pass runs; do not publish the estimated version as real chapter marks. |

## What's missing, in order of how much it blocks

1. **Audio, entirely.** `ELEVENLABS_API_KEY` and `VOICE_ID` (Nick's cloned
   "Nick 2" voice) are unset. Per project rules, that means the voice pass
   has not run and must not be faked with a stock voice. There is no
   `assets/audio/episode-vo.mp3` and no `publish/episode.mp3`. Every
   audio-derived number in this package (duration, file size, enclosure
   URL, pubDate, chapter timestamps) is a placeholder, not an estimate —
   none were invented.
2. **Cover art.** No image exists anywhere in this project. Documented
   slot only: `publish/metadata.json → show.coverArt`. Spec: 3000×3000px,
   RGB, JPEG or PNG, comfortably under 512KB (target ~500KB to be safe
   across hosts). Someone needs to either commission/generate one or
   decide the show doesn't need one at first upload — either way it's a
   decision, not a technical blocker like the audio is.
3. **Show notes / description.** The Show Notes Writer's `show-notes.md`
   had not landed yet as of this pass. `episode.xml` carries a draft
   description in the meantime, clearly marked. It needs to be swapped
   for the final copy once that file exists, so the RSS description and
   the show notes page never diverge.
4. **A chosen host.** This package is deliberately host-agnostic — no
   upload target was named, so none was assumed. Whichever of Spotify for
   Podcasters / Transistor / Buzzsprout / self-hosted RSS Nick picks will
   need its own specifics (some hosts generate the enclosure URL and guid
   for you, some want you to supply both).

## Exact ordered steps to finish

1. **Set the two env vars.** `ELEVENLABS_API_KEY` and `VOICE_ID` (Nick 2).
   Without both, the voice pass must not run — no stock-voice fallback,
   per the team's no-demo-fallback rule.
2. **Run the voice pass** (Podcast Voice Producer). Produces per-segment
   WAVs, a concatenated review MP3, and `assets/audio/durations.json`.
3. **GATE 2: Nick listens to the concatenated review MP3** before anything
   proceeds further. Non-negotiable per the team pipeline.
4. **Master to -16 LUFS** (Podcast Audio Engineer). Produces the final
   `publish/episode.mp3` and chapter marks.
5. **Regenerate chapter timestamps** from `assets/audio/durations.json` /
   the mastered file → `publish/chapters-part-1.txt` (Show Notes Writer).
6. **Finalize `publish/show-notes.md`** (Show Notes Writer), then copy its
   final description into `publish/metadata.json → episode.description`
   and into `publish/episode.xml`'s `<description>` / `<itunes:summary>`,
   replacing the DRAFT text.
7. **Fill the null fields in this package:**
   - `publish/metadata.json`: `episode.duration`, `episode.fileSize`,
     `episode.enclosureUrl`, `episode.pubDate`, `show.copyright`.
   - `publish/episode.xml`: `<enclosure url length>`, `<itunes:duration>`,
     `<pubDate>`, `<link>`. Measure file size with `stat -f%z
     publish/episode.mp3` (macOS) once the mastered file exists; take
     duration from `durations.json` or `ffprobe`. Do not estimate either
     from the script's ~44-minute word-count projection.
8. **Resolve cover art** — generate/commission and place at the
   `coverArt.path` slot in `metadata.json`, or make an explicit decision
   to launch without one.
9. **Confirm `show.ownerEmail` and `show.copyright`** in `metadata.json`
   with Nick before anything is published — both are currently
   placeholders/inherited values, not confirmed for public use.
10. **Nick picks a host and uploads.** This package stops here by design —
    no upload, no feed submission, no post happens automatically. The
    promo drafts in `publish/promo/` are drafts; Nick sends/posts them
    himself.

## What I did not touch

`publish/show-notes.md`, `publish/transcript-part-1.md`,
`publish/chapters-part-1.txt`, and `publish/fact-card-part-1.md` are all
owned by the Podcast Show Notes Writer (running concurrently with this
pass). I only reference them above.
