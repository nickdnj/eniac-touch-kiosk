# New narration lines for ElevenLabs (Nick 2)

v3, 2026-10-05: N03, N04, N05 reworded per the pre-share fact check (R1, R4, N1); N04_ALT dropped. Originally v2, Gate 1 decisions applied, 2026-10-03. Six lines plus one optional fallback. Every other spoken word in the video is reused source narration (see `edit-decision-list.md`).

**Voice settings (locked):**
- voice "Nick 2", `6SxuwKUiBpZjFTc06v9Y`;
- model `eleven_multilingual_v2`;
- stability 0.5, similarity 0.75, style 0.4, speed 1.12;
- run through `zsh -ic` so `ELEVENLABS_API_KEY` loads;
- no stock-voice fallback.

**Output:**
- one WAV per line at `assets/audio/narration/{ID}.wav`, resampled to 48 kHz mono to match the sources;
- normalize each line to about -20 LUFS, the measured level of the per-line source WAVs (-19.9) and the source MP4s (-19.4 to -19.7);
- plus one concatenated review MP3 for GATE 2.

**Never speak "Lehmer".** No line below contains it.

**TTS text vs display text.** Where they differ, the TTS column is what gets sent to ElevenLabs.
- "ENIAC" needs no respelling (checked 2026-10-02).
- "InfoAge" is sent as "Info Age".
- "vcfed.org" is sent as "V C F E D dot org".
- "1946" is sent as "nineteen forty-six", to match the source narration style (numbers spelled out).

The estimated durations below assume about 3.2 words per second, measured from tour-00. Re-time the scenes to the real WAV lengths after generation.

---

### N01, scene S02: docent intro (why this video exists)

Display:
> Hi, I'm Nick, a docent at the Vintage Computer Federation museum, and I want to introduce you to our new ENIAC exhibit: the room-sized computer of 1946, on a touch screen you can program yourself.

TTS:
> Hi, I'm Nick, a docent at the Vintage Computer Federation museum, and I want to introduce you to our new ENIAC exhibit: the room-sized computer of nineteen forty-six, on a touch screen you can program yourself.

Estimate: about 11 s. Warm and natural, a smile in the voice. The hook ("When nobody's at the screen, the kiosk doesn't play a canned video…", tour-01) follows straight after.

### N02, scene S13: teaser, Primes

Display:
> And that card punch? You'll meet it at the museum. In Mission Two, ENIAC hunts for prime numbers, and punches a card for every one it finds.

TTS: same as display.

Estimate: about 8.4 s; the clip is 8.5 s. It answers the last Squares line, "next time, ENIAC meets a card punch, and learns patience" (squares-17). Energetic and conspiratorial.

### N03, scene S14: teaser, Trajectory (v3, fact-check R1)

Display:
> Then, in Mission Three, you wire ENIAC to fly a cannon shell, with a punched card for every second of flight, all the way to the landing.

TTS: same as display.

Estimate: about 7.2 s. It deliberately avoids repeating "built to work out firing tables" (already said in tour-02). The Stuart attribution lives in N04, so it isn't said twice in 15 seconds.

> **Superseded (v2):** "Then, in Mission Three, you wire ENIAC to fly a cannon shell, one punched card per hop, all the way to the landing." Replaced because one card is one second of flight, not one hop (fact check R1). Old WAV: `assets/audio/narration/v2/N03.wav`.

### N04, scene S15: the museum invite (v3, fact-check R4)

Display:
> The primes hunt, and Brian Stuart's reconstruction of ENIAC's 1946 shell flight? Live, card by card, only at the museum. Come wire them up yourself.

(Tightened 2026-10-05: the longer "…of the shell flight from ENIAC's 1946 unveiling? They run live…" voiced at 12.96 s, too slow for the invite. "Reconstruction" keeps the R4 hedge.)

TTS:
> The primes hunt, and Brian Stuart's reconstruction of ENIAC's nineteen forty-six shell flight? Live, card by card, only at the museum. Come wire them up yourself.

Estimate: about 9.5 s. Slight lift on "Brian Stuart's reconstruction", and a pause after the question mark.

> **Superseded (v2):** "The primes hunt, and Brian Stuart's recreation of the 1946 shell demo? They run live, card by card, only at the museum. Come wire them up yourself." Replaced because "reconstruction", hedged, is the supportable claim, not "recreation of the 1946 demo" (fact check R4). Old WAV: `assets/audio/narration/v2/N04.wav`.

### N04_ALT: DROPPED in v3

Superseded. It carried the same "recreation of the 1946 demo" claim as v2 N04 (fact check R4) and is no longer voiced. Old text and WAV are kept in `assets/audio/narration/v2/N04_ALT.*`.

> Superseded text (v2): "Primes, hunted live. A cannon shell, flown on Brian Stuart's recreation of the 1946 demo. Card by card, only at the museum. Come wire them up yourself."

> **Stuart rule (Gate 1).** N04 names Brian Stuart only as the author of the reconstruction. It contains no thanks language. **The single thank-you remains N05.** It is spelled Stuart.

> **Release-timing swap.** Use this only if the video goes public anywhere before the kiosk is installed. N04 ends "…They're coming soon to the museum, live, card by card." N06 opens "So that's our new ENIAC exhibit, coming soon to the Vintage Computer Federation…". Keep the in-person wording for the InfoAge/VCF channel release.

### N05, scene S18: the single Brian L. Stuart thank-you (v3, fact-check N1; the only one in the video)

Display:
> And the person who made all of this possible: Brian L. Stuart of Drexel University. He wrote the simulator behind every lamp you've seen, and it simulates ENIAC at the level of individual pulses. Brian, thank you.

TTS: same as display.

Estimate: about 12 s. Sincere, unhurried. It plays over the kiosk's own "Brian L. Stuart wrote this simulator" screen. The wording follows Stuart's own words and makes no claims about his views.

> **Superseded (v2):** "...and it follows the real ENIAC pulse by pulse." Replaced with Stuart's own phrasing (fact check N1). Old WAV: `assets/audio/narration/v2/N05.wav`.

### N06, scene S20: close and call to action (echoes N01, not word for word)

Display:
> So that's our new ENIAC exhibit. Come see it in person, and program ENIAC yourself, at the Vintage Computer Federation, inside the InfoAge Science and History Museums in Wall, New Jersey. Plan your visit at vcfed.org. Thanks for watching!

TTS:
> So that's our new ENIAC exhibit. Come see it in person, and program ENIAC yourself, at the Vintage Computer Federation, inside the Info Age Science and History Museums in Wall, New Jersey. Plan your visit at V C F E D dot org. Thanks for watching!

Estimate: about 12.2 s. Warm, inviting, with a smile on "Thanks for watching!"

---

### Optional fallback (generate only if needed)

**N-ALT1, scene S11.** Use it only if the trimmed reuse of `tour-27.wav` (0.00 to 2.21) sounds clipped at GATE 2.

> Now it's my turn to program ENIAC.

Estimate: about 2.1 s.
