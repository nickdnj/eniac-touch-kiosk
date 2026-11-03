# ENIAC — Series Bible

**Format:** Solo narrated essay. One voice: Nick, in his own cloned voice. Locked in `project.json`; not open for relitigation.
**Length:** 4 parts, ~30 min each. *(Part 1 as delivered runs ~44 — see §4a and the runtime note at the head of `script/part-1.md`. Treat 30 as a target, not a constraint, and expect docent-grade sourcing to cost 30–40% more runtime than the same episode written for a general audience.)*
**Source of record:** `research/part-1-verification.md` for Part 1 facts; `research/research-brief.md` for historiography and guardrails. **Where the two disagree, the verification pass wins.**
**Outside review:** `research/review/codex-outside-review-2026-08-08.md`.
**Binding constraints:** brief §5.3 rules 1–6.
**Audience:** Nick, plus fellow docents at the Vintage Computer Federation museum.
**Level:** informed enthusiast — assume vacuum tube, plugboard, stored program. Assume no ENIAC history and no historiography.

---

## 1. What this series is

Not "the story of the first computer." The series' actual subject is **credit** — who gets named, who does the naming, and what machinery does the naming in each era. Four episodes, four mechanisms:

| Part | Credit is assigned by | The dispute |
|---|---|---|
| 1 | the press release and the photo caption | none, really — this is the setup |
| 2 | the institution and the job title | Dispute B (the programmers) |
| 3 | the document and the market | Dispute A (stored-program / EDVAC) |
| 4 | the court | Dispute C (the 1973 ruling) |

That escalation — press, institution, market, law — is the spine. Every episode should be able to answer "which naming machine is running in this one."

The series' governing editorial stance, inherited straight from the brief: **tidy stories are wrong, and the tidiest story is always the one with a single inventor in it.** The narrator's job is not to supply a better single inventor. It is to hold open the disagreement and explain why it stays open.

---

## 1a. Audience, level, and what that changes

**Primary listener: Nick. Secondary: fellow VCF docents.** This inverts the usual tradeoff. Docents repeat what they hear to visitors and then take follow-up questions on the floor. **A confident wrong number propagates into a museum's public interpretation.** So: traceability beats polish, and an acknowledged gap is strictly better than a plausible-sounding filled one.

**Level: informed enthusiast.** The listener knows what a vacuum tube, a plugboard and a stored program are. **Do not spend runtime defining hardware.** They do *not* know ENIAC's history or its historiography — that is the episode's job. Practical test: if a sentence would appear in a general-audience explainer about how computers work, cut it. If it would only appear in a book about ENIAC, keep it.

**Each episode ships a companion fact card** at `publish/fact-card-part-N.md`, built for floor use, not for listeners: checkable numbers with citations and tiers; conflicts with both figures and a recommendation; claims a docent must not make with the correct version of each; and the three or four questions a visitor will actually ask with a defensible answer to each. The fact card is the artifact that outlives the episode. **It is also a runtime valve** — a correction that needs three paragraphs to explain properly can be one clause on air and a full row on the card.

---

## 1b. The on-air uncertainty rule

**Uncertainty goes on air, in the narration.** When a figure traces only to received wisdom, the narrator says so out loud: *"this number is in every account of the machine and I could not find where it originally comes from."* For a docent this is among the highest-value content in the episode — it marks exactly which claims not to state confidently on the floor.

**The trigger test, so the flags don't feel arbitrary:**

> **Flag the evidence tier only where the claim is one a listener would otherwise repeat as fact.**

Not every hedge. Load-bearing ones only. In practice that means a flag earns airtime when **all three** hold:

1. **It's repeatable.** A number, a date, a quotable line — something that survives being retold at a museum rail.
2. **It's currently believed.** The listener probably already has the wrong version, or would acquire it from the next book they read.
3. **The correction is short.** If it takes three paragraphs, it belongs on the fact card and gets one clause on air.

**Do not flag:** things the script can simply state correctly (rank corrections, name spellings, the acronym); conflicts a docent will never be asked about; or any hedge that only signals the narrator's diligence. Flagging is a service to the listener, not a display of rigour. **Budget roughly one flag per segment.** More than that and they stop registering; fewer and the episode is asserting things it hasn't earned.

**Say it in the episode.** Part 1 states the convention in Segment 1 — *"When I hit one of those I'll stop and say so. Not for every hedge, that would be unbearable. Only where it's a number you'd otherwise walk out of here and repeat."* Every episode should carry an equivalent line early, so the flags read as a system rather than as attacks of conscience.

**And the standing instruction:** *a claim that circulates everywhere and sources nowhere gets said out loud as such.* Do not quietly drop it and do not quietly repeat it. Naming it is the content.

---

## 1c. The tier system as a writing standard

`research/part-1-verification.md` classifies every claim. Adopt its codes as the series standard, and apply them at the sentence level while drafting:

| Tier | Meaning | How it may be said on air |
|---|---|---|
| **(a)** | Primary / contemporaneous — 1940s–50s Army or Moore School reports, press releases, contemporaneous press | State it flat. Quote it if it's good. Name the document when the document is the point. |
| **(b)** | Peer-reviewed or archival scholarship; participant recollection published in those venues | State it, attribute where contested. For recollections, say how long after the fact. |
| **(c)** | Reputable secondary / institutional — Penn, CHM, ARL summaries, IEEE Spectrum | Usable, but check whether it's really an unfootnoted restatement of a tier (a) source, and prefer the original. Never let (c) outrank (a). |
| **(d)** | Widely repeated, traceable to nothing | **Never assert.** Either flag it on air per §1b or leave it out entirely. There is no third option and no "some say." |

Three working rules that fall out of this:

- **Chase the citation to its floor.** A (b) source resting on a (c) source is (c). Light 1999's crawling-inside-the-frame image is peer-reviewed and footnotes a 1977 sociology article — so it is (b) resting on (c), and the script treats it that way.
- **Prefer the machine's own paperwork to anyone's memory of it.** The 1946 report beat four separate pieces of folklore in this pass. When a manual and an oral history disagree about what a machine did, the manual wins.
- **Watch for a single upstream source wearing many hats.** "One tube every two days" appears in a dozen places and is one man's 1989 recollection. Counting sources is not the same as having sources.

---

## 1d. Wikipedia discipline

**Wikipedia is an index. It is never a citation.**

- Use it to find the footnote. Then **read the footnote's source** and cite that. If the footnote is dead, paywalled, or doesn't say what the article says it says, the claim does not exist for our purposes.
- **Watch for circular sourcing.** A figure can appear in Wikipedia, get copied by a museum page and a magazine feature, and then acquire three "independent" citations that are all the same origin — sometimes the article itself. Before treating corroboration as corroboration, ask whether the corroborating sources could plausibly have got it from each other.
- **An unsourced Wikipedia sentence is tier (d) by definition**, no matter how confident it reads or how long it has been there.
- The same discipline applies to institutional history pages, museum captions and course notes. Penn's own ENIAC page supplied one of the tier (d) claims corrected in Part 1; the Computer History Museum's failure-rate figure is downstream of a single interview. Being a good institution is not a citation either.

---

## 2. Voice and register

The brief is already written in the voice we want. It says things like *"That's a better episode than heroic-rediscovery,"* and *"The real story is hard enough,"* and *"Don't state a figure on air — the timeline is exactly what's murky, and a crisp number implies a precision the record doesn't support."* That is the register: dry, first person, self-correcting in public, allergic to a clean ending.

### Do

- **State the popular version fairly, then take it apart — in that order.** Never dismantle a version you didn't first state generously. "The story goes like this. It's a good story. Here's what's wrong with it."
- **Refuse out loud.** "Some accounts put a number on this. I'm not going to use it, because the number is exactly the part that isn't settled." Refusing on air is a feature; it's the thing a single narrator can do that two hosts can't.
- **Short declaratives at the turn.** "That's wrong." "It didn't." "Nobody knows."
- **Name the seam.** "I want to be careful here." "This next part I can't source as well as I'd like."
- **Concrete before abstract, always.** A photograph, a plugboard, a dead tube. Then the idea.
- **Let a sentence end early.** Periods do the pacing work. Em-dash for one beat, not three.
- **First person singular.** "I'm going to come back to that." "I've read four books that disagree."

### Don't

- **No "But here's where it gets interesting."** If it's interesting, it will be interesting.
- **No rhetorical questions as transitions.** "So what does that mean?" is filler wearing a tie. If a question is worth asking on air, it has to be one the episode genuinely doesn't answer.
- **No enthusiasm markers.** No "wow," "incredible," "astonishing," "mind-blowing." The material carries itself.
- **No recap of the sentence you just said.** Say it once.
- **No "imagine that you are…"** Put the listener in the room by describing the room, not by instructing them to picture it.
- **No "little did they know."** Foreshadowing by irony is the cheapest version of the thing this series is critiquing.
- **No superlatives we can't defend.** "First," "greatest," "revolutionary" are all claims in this series, not adjectives.
- **No second-person moral.** The listener draws the conclusion. The narrator lays the evidence.

### On the word "first"

The series never calls ENIAC the first computer. Not once, not casually, not in an intro. If a sentence needs a word there, use what the sentence can actually support: *electronic*, *general-purpose*, *programmable*, *fast*. Say on air, in Part 1, that we're not using the word and why. That is a load-bearing piece of the series and it has to be explicit early, not revealed late.

---

## 3. The guardrails as scriptable constraints

Brief §5.3 rules 1–6 are binding on all four scripts. Restated so a writer can check a line against them:

**Rule 1 — Never quote the Atanasoff sentence.** *Line check:* does any sentence about Larson's derivation finding contain quotation marks? If yes, delete them and paraphrase. The only approved formulation is the substance both circulating versions agree on: *Larson found that Eckert and Mauchly had derived core ideas from Atanasoff rather than originating them.*

**Rule 2 — No statute numbers.** *Line check:* search the script for "U.S.C.", "§", and "Section". If any appear in a legal context, cut. Say "derivation" in plain English.

> **Scope clarification, added at Part 1 scripting.** Rule 2 exists because we could not read the 1973 opinion and therefore cannot confirm its statutory basis. **It is scoped to the 1973 ruling, not to statutes generally.** Part 1 names the Classification Act of 1923 on air, because that statute was read in full, is tier (a), and its definition of "subprofessional" is the episode's thesis in one sentence. The general principle stands either way: **never recite a citation number aloud.** "The Classification Act of nineteen twenty-three" is speakable; "42 Stat. 1488, section 13" is not audio. Full citations live in the Source Anchors table and the fact card.

**Rule 3 — No "as a matter of law."** *Line check:* search for "as a matter of law," "held that," "ruled as," "concluded as." Replace all with **"the court found"** or **"Larson found."**

**Rule 4 — No Finding numbers.** *Line check:* search for "Finding," "Finding 1," "Finding 3," etc. Cut every one. The grounds get described in plain language and are never numbered on air.

**Rule 5 — Attribute the antitrust reading.** *Line check:* any sentence claiming the ruling was "really about" breaking Sperry's grip must begin with "Some historians read it as…" and must not contain "historians agree." No named source exists for this, so it never gets asserted.

**Rule 6 — The two inferences the listener must not leave with.** This one is different in kind. Rules 1–5 govern wording; rule 6 governs belief. **A script can pass 1 through 5 cleanly and fail 6 completely.**

### The rule 6 test

Don't audit the sentences. Write down **the one-sentence version a listener would repeat to a friend the next day.** If that sentence is either of these, the episode has failed regardless of how carefully it was worded:

- ❌ "So a judge proved Atanasoff invented the computer."
- ❌ "So the trial settled it."

The correct one-sentence takeaway for Part 4 is closer to: *"A patent got thrown out for a stack of reasons, one of which was that Eckert and Mauchly took ideas from someone else — and that's a business outcome, not a history verdict."*

**Prescriptions, not just prohibitions.** Rule 6 can't be satisfied by omission. Part 4 must:
1. Say the negation **out loud and in plain words**, at least twice, at two different points — once in the middle, once near the end. Not implied. Said.
2. State what the ABC actually was — a special-purpose machine that never ran fully — in the same breath as the derivation finding, every time the derivation finding comes up.
3. **Not end on the trial.** The last scene of the series is a person, not a courtroom. Ending on the ruling makes the ruling the conclusion no matter what words surround it.

### Rule 6, extended to the other episodes

The same failure mode exists everywhere. Each episode gets its own forbidden takeaway:

- **Part 1** ❌ "So ENIAC was the first computer." → ✅ "So 'first' turns out to be a question about definitions, and the definitions were chosen by people with stakes."
- **Part 2** ❌ "So nobody knew about the women until a book came out in the 2010s." → ✅ "So the correction took twenty-five years and a lot of hands, and the popular books were the last step, not the first." (Brief §4 is explicit: Light 1999, Fritz 1996, Bartik advocating from the 1980s.)
- **Part 3** ❌ "So the EDVAC report killed the ENIAC patent." → ✅ "So a report circulated under one man's name distorted the credit — and separately, it was one of several disclosures a court later pointed at." Brief §3 flags this exact trap: *"Don't make it the cause."*

Write the forbidden sentence at the top of each script draft. Check it at the end.

---

## 4. Sourcing discipline

**`[UNVERIFIED]` items are not sayable.** Anything the brief marks `[UNVERIFIED]` does not go in a script in any form — not hedged, not attributed, not "some say." Hedging an unverified claim still plants it.

**Tier (d) is not sayable as fact either** — see §1c. It is sayable *as a flagged tier (d) claim*, per §1b, and that is often the most valuable thing in the segment.

**`[NEEDS SOURCE]` is an in-script marker, not a hedge.** Where a script needs a fact the brief doesn't establish, the writer leaves `[NEEDS SOURCE: <the specific fact needed>]` inline rather than inventing, approximating, or writing around it. Rules:
- A marker names the *specific* fact wanted, so someone can go get it in one lookup.
- The surrounding narration must read correctly if the marker is cut entirely. Never build a paragraph that collapses without the missing number.
- **No script goes to the voice phase with unresolved markers.** Either the fact arrives or the line is cut before recording.
- Never fabricate a quote, a date, a figure, or a name. Not even a plausible one. Not even as a placeholder.

**Advocacy sources — declare the bias on air, in the same sentence you use them.** Not in the show notes. On air.
- **Alice Burks, *Who Invented the Computer?*** — the fullest trade account of the trial, drawn from transcripts. Her husband, Arthur Burks, was an ENIAC engineer and a witness at that trial. Say that. A reviewer called the book tendentious and said it answers, convincingly, what is fundamentally the wrong question — that line is worth quoting because it's a published review, not the unseen opinion.
- **Burks & Burks, *The First Electronic Computer*** — award-winning, and criticized for leaving out Colossus and Zuse.
- **Mollenhoff, *Atanasoff: Forgotten Father of the Computer*** — the original advocacy account; reviewers note a stridency toward Mauchly.
- **Jane Smiley, *The Man Who Invented the Computer*** — a novelist's narrative, pro-Atanasoff, thinner on the law.

The formulation to use: *"This next part comes from a book that is arguing a case, and I'll tell you whose."* Then use it anyway. Advocacy sources aren't disqualified; they're annotated.

**Interested parties — a primary source can be a participant.**
- **Herman Goldstine** is the sharpest case: an insider account of enormous value, written by the man who recruited von Neumann and who circulated the First Draft under von Neumann's name alone. He is *evidence about* the thing he is *testifying to*. Never cite him alone; always alongside Nancy Stern, who is the standing corrective. The ENIAC women themselves criticized him for minimizing the programmers — that goes on air in Part 2.
- **Jean Bartik's *Pioneer Programmer*** is a primary voice and the only memoir by one of the six. It is also posthumous and editor-assembled. Brief §2 says disclose that on air. Do.
- **Emerson Pugh** had internal IBM archive access and a career at IBM Research. Strong on what IBM did; not independent on why IBM did it.
- **Scott McCartney** adopts a definition of "computer" that excludes Atanasoff's ABC — which is taking a side while appearing to report. If used, name the move.
- **Walter Isaacson** popularized the women's story to a mass audience and got criticized for a men-did-hardware/women-did-software framing and for allocating pages by interview access. Both halves get said.
- **Jennifer Light's 1999 article** is a **landmark, not an origin.** Calling it "the article that started it" is the same rediscovery logic this series criticizes, moved back a decade. Brief §2 flags this explicitly.

**Numbers.** If the brief declines to give a figure, the script declines too, and says why. The eight-months-before-von-Neumann figure is the standing example: it never appears on air, and Part 3 should say out loud that it's leaving it out.

**Court material.** Everything about the 1973 ruling traces to a secondary compilation, not the opinion. When a date or a ground from §5 is used *outside* Part 4 — Part 1 uses the December 1945 delivery date — attribute it as a court finding rather than as plain history: *"the date a court would later fix as the handover."*

---

## 4a. Runtime, and the cost of being right

**~30 min is the target. It is not free, and Part 1 did not hit it.**

Measured on Part 1: a docent-grade episode costs roughly 30–40% more runtime than the same episode written for a general audience. Where the cost goes, in order:

1. **Answering a `[NEEDS SOURCE]` marker.** A marker costs zero seconds. Its answer costs 60–120. Nine markers cost Part 1 about fourteen minutes. **Budget for this at outline stage** — count the markers and add ninety seconds each before agreeing a runtime.
2. **Uncertainty flags** (§1b) — 30–60 seconds each, and they are the point of the episode for this audience.
3. **Conflict handling** (§1c) — reporting two figures and declining to average costs about twice what asserting one costs.

**Practical rules:**

- Estimate at **150 words per minute** for this register. Record the spoken word count in the script header, excluding headings and `[DIRECTION]` lines.
- **Compression saves 10–15%, not 30%.** Once a draft is dense, line-level tightening stops paying. Beyond that point the only lever is deleting whole blocks — which is an editorial decision, not a writing one.
- So: **when a script overshoots, do not silently gut it and do not silently ship it.** Deliver it with a cut menu — each candidate block, its word count, its runtime saving, and what is lost — and let Nick choose. That menu is at the head of `script/part-1.md` and is the model.
- **Use the fact card as the valve.** Corrections that need explanation go on the card and get one clause on air.

---

## 5. Cold-open convention

Adopted from brief §6(a), which is binding: **every episode opens on a scene, then earns the exposition. Never open on hardware.**

Operational form:
1. **Open on one concrete thing** — a photograph, a room, a document, a person doing something specific. Present tense or simple past. No preamble, no "welcome to."
2. **The scene has to contain the episode's thesis in miniature.** If the scene is just an attention-grab and then we change the subject, it's a bait. The turn out of the cold open should feel like a zoom-out from the same object, not a cut to a different show.
3. **Ninety seconds, maximum, before the turn.** Roughly 200–350 words.
4. **The turn is a flat sentence, not a flourish.** "That's the photograph. This episode is about the caption."
5. **The cold open gets paid back at the close.** The last segment returns to the same object and it means something different.
6. **No tube counts, no dimensions, no acronym expansions in the cold open.** Hardware is earned.

**The shared-night device.** Two episodes deliberately reuse one scene from two vantages, and this is a series signature, not a repetition:
- **February 1946** — Part 1 opens on it from *outside* (**the two documents**: the January 17 photo captions that named the women and described them setting switches, against the January 30 War Department release that named three men). Part 2 re-enters the same days from *inside* (the women who set the demonstration up, the dinner they weren't at). **Note for Part 2:** the two events are 1 February (press preview) and 15 February (unveiling and dedication); do not merge them, and do not use 14 February.
- **Election night 1952** — Part 3 opens on the first half of the night (the machine's early call, CBS refusing it) and stops before the resolution. The episode's second half returns and finishes it.

When a scene is reused, say so plainly: *"You've heard this night before. Not this way."*

---

## 6. Recurring structural elements

**File and tagging convention.** One file per episode: `script/part-N.md`. Every spoken line is tagged `NICK:`. Delivery notes go on their own `[DIRECTION: …]` line and are never spoken. Segments are numbered and named — `## Segment 3 — The Computers Were People` — so a re-record is addressable by number. Each script ends with `## Source Anchors` and `## Open Questions for Nick`.

**Standing episode skeleton:**
1. `## Cold Open` — scene, then the turn.
2. `## Segment 1 — <framing>` — what this episode is, what it is deferring, and what it will not claim. Short.
3. `## Segment 2..N` — the body, in rising order of contestedness. The undisputed material comes first; the disputes come after the listener has the ground under them.
4. `## Payoff / Close` — return to the cold open's object. Then the handoff.
5. `## Outro` — spoken sourcing, next episode, sign-off. Under 150 words.

**The declared deferral.** Every episode says out loud what it is not covering and where it goes instead. "I'm going to come back to that properly next time" is a legitimate move and it beats a half-version. This is also how the series avoids the bait-and-switch problem the outside review flagged: nothing is withheld for a reveal.

**The not-resolving beat.** Once per episode, minimum, the narrator states a disagreement and declines to settle it — with the reason. This is the whole argument for the solo format and it should be audible.

**How citations are spoken.** Naturally, inside the sentence, once, and only where the source is load-bearing or contested:
- ✅ "There's a book called *ENIAC in Action*, by Thomas Haigh, Mark Priestley and Crispin Rope, and it's the reason I can say that with any confidence at all."
- ✅ "This comes from David Alan Grier's *When Computers Were Human*."
- ✅ "Nancy Stern's book from 1981 argues the opposite, and she's the reason I'm not just repeating Goldstine."
- ❌ "Haigh, Priestley and Rope, 2016, MIT Press, page 214."
- ❌ Citing the same source four times in one segment. Once, at the point of first weight.

Rule of thumb: cite where a listener might reasonably not believe you, or where two books disagree. Don't cite the uncontested.

**Outro form.** Where the episode's material came from, in one or two sentences, named as books a listener could go read. What the next episode covers, in one sentence. No call to action, no "if you enjoyed." No flattery.

---

## 7. Structure recommendation

### Recommendation: **Option C — Option A, re-sequenced at two joints.**

Keep §6's four-episode shape. Change two things: **frame** Part 1 with the February 1946 unveiling instead of opening on hardware, and **move the EDVAC First Draft out of Part 4 into the head of Part 3**, where it functions as the cause of the split that creates the company. Then apply §6's own prescribed cuts to Part 3 (BINAC to a sentence, Goldstine-to-IBM gone, IBM's win as the closing beat rather than a section) and **move Holberton-to-COBOL from Part 3 back into Part 2**, where it belongs with the programmers.

### Rationale

Option B is right about the problem and wrong about the fix. It correctly identifies that Part 1 opens on the driest material in the series and that the human story is buried — but it solves that by putting the 1946 debut *and* the six women *and* an explanation of the machine into a single first episode, which cannibalizes Part 2 and splits Dispute B across two episodes with the emotional half in one and the analytical half in the other. It also makes the overload problem worse, not better: B's Part 3 takes on EDVAC, the split, EMCC, UNIVAC *and* 1952, which is more than Option A's Part 3 was carrying when the brief flagged it as overloaded. Option C takes B's genuinely good instinct — open on the debut — and implements it as a *frame* rather than a reallocation, so Part 1 gets a human opening without spending Part 2's material. Moving EDVAC into Part 3 is B's one clearly correct structural claim and it fixes something Option A got wrong: under A, the split that ends the Moore School group is narrated in the final episode, long after Part 3 has already needed it to explain why EMCC existed at all. It also lightens Part 4, which under A was carrying the report *and* the patent *and* the trial *and* the myth thesis — and Part 4 is the episode where the guardrails demand the most room.

### What the losing option was better at

**Option B was better at emotional priority.** Under B, a listener who samples one episode and quits hears the people. Under C they hear the machine, with the people promised. That is a real cost and I'm accepting it deliberately, on the grounds that Part 2 is a stronger episode intact than split — but if Nick's read is that the series has to lead with the women outright, B is the honest way to do it and the fix is to swap Parts 1 and 2 wholesale rather than to blend them.

**Option A was better at chronological cleanliness.** Under C, the listener hears February 1946 in Part 1's first ninety seconds, the 1943–45 build after it, and February 1946 again in Part 2. That requires the narrator to manage time explicitly and say where we are. It's a small tax, paid in a few sentences per episode.

### Segment-level outlines

#### Part 1 — What They Built, and Who Got Named
*Delivered at ~44 min / 6,616 spoken words. Full script: `script/part-1.md`; cut menu at its head; fact card at `publish/fact-card-part-1.md`.*
1. **Cold Open — The Two Documents.** 17 Jan 1946: Army photo captions naming the women, by name and hometown, describing them setting switches and plugging cables — judged unsuitable for publication. 30 Jan 1946: the War Department release naming Eckert, Mauchly, Goldstine. *"This series is about the distance between them."*
2. **Segment 1 — What This Is.** Credit as the subject. Four naming machines. The three disputes. "First" refused. **The on-air uncertainty convention stated out loud.**
3. **Segment 2 — The Forcing Function.** Firing tables, with the 1944 Army numbers. The differential analyzer, and why it was neither fast enough nor accurate enough. *Flags: "six requests, not six tables"; the 20/15/30 triad as a 1961 construction; trajectories-per-table unresolved.*
4. **Segment 3 — The Computers Were People.** The century-old profession. The Computing Unit. **SP-4 and the Classification Act of 1923 — the series' spine.** "Operator" was the second classification.
5. **Segment 4 — Two Men and a Memo.** Eckert as Mauchly's lab instructor. The 1942 memo, and its survival as Gregg shorthand.
6. **Segment 5 — Eighteen Thousand Chances to Fail.** The compounding-odds objection, and **digital regeneration as the actual answer**. The Maintenance Manual's real reliability engineering. The Army's own failure numbers. Fault localization as documented procedure. *Flags: the tube count; "never turned off"; "one tube every two days."*
7. **Segment 6 — Programming Wasn't a Word Yet.** The wiring *was* the program. The "no documentation" myth corrected precisely: Adele Goldstine is sole credited author of *Part I* — two of five volumes. **Clippinger's 1948 trade: an hour instead of a day, at six times slower, and they took it.**
8. **Segment 7 — Too Late.** Delivery vs. acceptance. The Los Alamos calculation as the machine's actual first problem. Trajectories not until August 1946.
9. **Payoff — The Two Documents, Again.** 1 February vs 15 February. The "100 man-years / two hours" line, and that it described the classified problem. "Operator," with SP-4 behind it. *Flags: the 15 February program is a reconstruction; the dinner exclusion is testimonial.*

#### Part 2 — The Programmers
*Segment-level.*
1. **Cold Open — the same February night, from inside.** The demonstration they set up, and the dinner afterward they weren't at.
2. **Segment 1 — Where we are and what this episode owes you.** Names the open question it's taking on.
3. **Segment 2 — Why they were there.** Bridge from Part 1: the end of a long tradition, not an anomaly. Grier, Abbate.
4. **Segment 3 — What the job actually was.** The "no documentation" correction owned in full. Adele Goldstine's *Report on the ENIAC*. Debugging as physical work — tracing a fault to a single dead tube.
5. **Segment 4 — How it became clerical.** ***The brief's open item, taken on here, not deferred.*** Why programming got demoted to "operator" work in the first place. Abbate and Grier both bear on it; the brief does not answer it, so this segment has to be honest that it's reasoning rather than reporting.
6. **Segment 5 — The erasure.** Unnamed in photographs. Written out of institutional histories that credited engineers over operators. Goldstine's own account and the women's criticism of it.
7. **Segment 6 — Twenty-five years of correction.** Fritz 1996. Light 1999 — a landmark, not an origin. Bartik advocating from the 1980s. Kleiman's interviews and *Proving Ground*. Isaacson, with both halves of the critique.
8. **Segment 7 — Holberton, onward.** *(moved here from Part 3.)* The compiler-era work and the road to COBOL. The programmer who got to keep programming.
9. **Payoff.** How recognition actually happens: slowly, through many hands, and mostly not through the book you've heard of.

#### Part 3 — The Document and the Company
*Segment-level.*
1. **Cold Open — election night, 1952, first half only.** The machine makes a call. CBS won't put it on the air. Stop before the resolution.
2. **Segment 1 — Rewind.** Where we are; what this episode connects.
3. **Segment 2 — The First Draft.** Dispute A, stated fairly. What is not disputed: it was a genuine and distinct synthesis; the Moore School group was already discussing storing instructions in memory before von Neumann joined; Goldstine circulated it under von Neumann's name alone. **No figure on the timeline, and say why we're not giving one.** What is disputed: the weighting. Goldstine vs. Stern vs. Haigh/Priestley/Rope — including that the last one isn't perfectly neutral either.
4. **Segment 3 — The split.** The exodus from the Moore School. Why a company had to exist.
5. **Segment 4 — EMCC.** Undercapitalization. BINAC in one sentence. The sale to Remington Rand.
6. **Segment 5 — UNIVAC I.**
7. **Segment 6 — Election night, finished.** Chinoy's *Predicting the Winner* as the centerpiece. Carries the whole second half.
8. **Payoff / closing beat — IBM.** Not a section. The last few minutes: IBM eats the market. Flamm's economic argument, and the published dispute over how he weights government R&D. Pugh named as IBM-interested.
9. Cut entirely: Goldstine-to-IBM.

#### Part 4 — How to Manufacture an Inventor
*Segment-level only. **Not to be scripted until McTiernan, "The ENIAC Patent," IEEE Annals 1998, is in hand** — brief §7 makes this a hard precondition and this bible does not soften it.*
1. **Cold Open — a scene, not a courtroom summary.** Selection deferred; the cold open should not be the Atanasoff finding, because leading on it hands the episode to the frame it means to attack.
2. **Segment 1 — The question is the problem.** Name it early, per §6(b): "who invented the computer" is a question a patent fight invented. No 30-minute reveal, no bait-and-switch.
3. **Segment 2 — The patent.** Filed June 1947; granted 1964; what Sperry Rand did with it and what it was worth.
4. **Segment 3 — What Larson actually did.** Several independent grounds at once: public use, on-sale, prior publication, derivation, and the rest — in plain language, no numbers, no statute.
5. **Segment 4 — The derivation finding.** Paraphrase only. Paired every time with what the ABC was: a special-purpose machine that never ran fully. **First explicit rule-6 negation lands here.**
6. **Segment 5 — What was rejected.** Prosecution delay and fraud on the Patent Office were considered and rejected. Loose accounts get this wrong.
7. **Segment 6 — Not appealed.** What an unappealed district-court decision is: a commercial outcome, not a historical verdict, and not binding precedent. **Second rule-6 negation.** The antitrust reading, attributed and not asserted.
8. **Payoff — who benefits.** Each available answer to "who invented the computer" and whose interest it serves. **Ends on a person, not the trial.** The Part 1 caption is the obvious closing callback and the series' cleanest ending.

---

## 8. Standing open items

Updated 2026-08-08 after the primary-source verification pass.

- **McTiernan (1998) — required before Part 4 is scripted. Still a hard block.** Confirmed **closed-access**: `is_oa: false`, zero OA locations, no controlled-lending route. ILL, IEEE purchase or a secondhand print issue are the only legitimate routes; **place the ILL now**, the lead time is free. **Two corrections:** the author is **C. E. McTiernan**, not "Patrick D."; and he circumstantially appears to have been **Sperry Rand UNIVAC's own patent VP** — the office that held the ENIAC patent. If that holds, the standard scholarly treatment of the patent was written by the lawyer for the company that owned it, and Part 4 must **declare it on air as a participant's account**, exactly as it declares the Tier 4 advocacy books. Verify the affiliation before leaning on it.
- **Stern, *From ENIAC to UNIVAC*** — out of print, not obtained. Load-bearing for Part 3's Dispute A, since she is the standing corrective to Goldstine. Also the source behind Light's "20 minutes to several days."
- ~~**The six women's names.**~~ **RESOLVED.** Kathleen "Kay" McNulty (Mauchly Antonelli) · Frances Bilas (Spence) · Betty Jean Jennings (Bartik) · Ruth Lichterman (Teitelbaum) · Frances Elizabeth "Betty" Snyder (Holberton) · Marlyn Wescoff (Meltzer). **Three traps for Part 2:** Betty Snyder's given name really was Frances, so Penn's "Frances (Betty) Snyder Holberton" is correct and not a conflation; the spellings "Elizabeth Jennings" and "Marilyn Wescoff" are Herman Goldstine's own errors and are the origin of most downstream variance; and **"the six" is a simplification** — Fritz named twenty-three women associated with ENIAC across 1942–1955. Never list Adele Goldstine or Mildred Kramer among the six.
- **Polachek, "Before the ENIAC," *IEEE Annals* 19:2 (1997)** — paywalled, unread, and the "40 hours / hundreds of trajectories / better part of a month" cluster rests entirely on it. Polachek was a BRL insider. **Highest-priority remaining chase.** Nothing shipped depends on it; Part 1 would tighten if it lands.
- **The ENIAC operations log book** (BRL/ARL records, consulted by Haigh/Priestley/Rope) — the single most likely home for a dated debugging incident and for the first production firing table.
- **Why programming got demoted.** Recommendation unchanged: **Part 2 takes it on.** But it now starts from a much stronger place than reasoning — **SP-4 is documentary**, and the Classification Act's statutory definition of "subprofessional" is tier (a). Part 2 should open from the paperwork and reason outward, not the reverse.
- **On the two research documents.** `research-brief.md` is a *historiography* brief — excellent on what's contested, thin on concrete specifics. `research/part-1-verification.md` is the *facts* document and is the authority where they conflict. **Parts 2, 3 and 4 have no equivalent verification pass yet.** Commission one before scripting each; Part 1's pass closed nine markers, overturned about twenty widely repeated claims, and produced the episode's two best beats. It is the highest-leverage step in this pipeline.
