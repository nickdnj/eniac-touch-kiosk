# New narration lines for ElevenLabs (Nick 2)

v2, Gate 1 decisions applied, 2026-10-03. Six lines, plus an alternate N04 (voice both; Nick picks at Gate 2) and one optional fallback. Every other spoken word in the video is reused source narration (see `edit-decision-list.md`).

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

### N03, scene S14: teaser, Trajectory

Display:
> Then, in Mission Three, you wire ENIAC to fly a cannon shell, one punched card per hop, all the way to the landing.

TTS: same as display.

Estimate: about 7.2 s. It deliberately avoids repeating "built to work out firing tables" (already said in tour-02). **Unchanged at Gate 1:** the Stuart attribution lives in N04, so it isn't said twice in 15 seconds.

### N04, scene S15: the museum invite (primary)

Display:
> The primes hunt, and Brian Stuart's recreation of the 1946 shell demo? They run live, card by card, only at the museum. Come wire them up yourself.

TTS:
> The primes hunt, and Brian Stuart's recreation of the nineteen forty-six shell demo? They run live, card by card, only at the museum. Come wire them up yourself.

Estimate: about 8.4 s. The punchiest line in the video. Slight lift on "Brian Stuart's recreation", and a pause after the question mark.

### N04_ALT, scene S15: the museum invite (alternate; voice it too)

Display:
> Primes, hunted live. A cannon shell, flown on Brian Stuart's recreation of the 1946 demo. Card by card, only at the museum. Come wire them up yourself.

TTS:
> Primes, hunted live. A cannon shell, flown on Brian Stuart's recreation of the nineteen forty-six demo. Card by card, only at the museum. Come wire them up yourself.

Estimate: about 8.4 s. Staccato, trailer-style delivery.

> **Stuart rule (Gate 1).** N04 and N04_ALT name Brian Stuart only as the author of the recreation, which is the same attribution as the approved source line trajectory-00. They contain no thanks language. **The single thank-you remains N05.** It is spelled Stuart.

> **Release-timing swap.** Use this only if the video goes public anywhere before the kiosk is installed. N04 ends "…They're coming soon to the museum, live, card by card." N06 opens "So that's our new ENIAC exhibit, coming soon to the Vintage Computer Federation…". Keep the in-person wording for the InfoAge/VCF channel release.

### N05, scene S18: the single Brian L. Stuart thank-you (the only one in the video)

Display:
> And the person who made all of this possible: Brian L. Stuart of Drexel University. He wrote the simulator behind every lamp you've seen, and it follows the real ENIAC pulse by pulse. Brian, thank you.

TTS: same as display.

Estimate: about 11.2 s. Sincere, unhurried. It plays over the kiosk's own "Brian L. Stuart wrote this simulator" screen. The wording reuses the kiosk's approved copy ("follows the real 1946 machine pulse by pulse") and makes no claims about his views.

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
