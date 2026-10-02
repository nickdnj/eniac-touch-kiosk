// "Find the dead tube" (docs/tubes.md 2.5): the re-enactment's state
// machine. Pure: no DOM, no clock, no app. It imports only its own
// authored content, so it CANNOT read or write the live machine (RE-2,
// TUBE-15: tests/web/tubes.test.ts checks the imports).
//
// Steps: 1 run the test; 2 which panel; 3 which digit place; 4 which tube
// (touch until one is cold); 5 plug in a fresh unit; then "fixed".
// Wrong taps run the UX 5.2 ladder: #1 X badge and a hint, #2 the right
// target's ring thickens, #3 "Do it for me" turns filled. A warm tube is
// not an error but counts toward the ladder (2.5.3).

import { FAULTS, GOOD_DIGIT, PANELS, PLACES, TRY, TUBES_PER_UNIT, type Fault } from "./content.ts";

export type Step = 1 | 2 | 3 | 4 | 5 | "fixed";
export type FbKind = "ok" | "wrong" | "hint";

export interface Feedback {
  kind: FbKind;
  text: string;
}

/** What a tap did, for the screen to draw (and the metric to send). */
export type Outcome =
  | { kind: "advance"; from: Step; to: Step; assisted: boolean }
  | { kind: "wrong"; target: number; level: number }
  | { kind: "warm"; target: number; level: number }
  | { kind: "ignored" };

export class Reenactment {
  /** 0, 1, 2: which authored fault. Starts at 0 on every new screen (S1 resets it). */
  variant: number;
  step: Step = 1;
  /** Wrong taps (and warm touches) on the current step. */
  wrong = 0;
  /** Tubes touched on step 4 (0-based index -> warm or cold). */
  felt = new Map<number, "warm" | "cold">();
  /** "Do it for me" was used on any step of this run. */
  assisted = false;
  /** The last feedback line, or null. */
  fb: Feedback | null = null;

  constructor(variant = 0) {
    this.variant = ((variant % FAULTS.length) + FAULTS.length) % FAULTS.length;
  }

  get fault(): Fault {
    return FAULTS[this.variant];
  }
  /** 0-based answers for this fault. */
  get answer(): { panel: number; place: number; tube: number } {
    const f = this.fault;
    return { panel: f.acc - 1, place: f.place - 1, tube: f.tube - 1 };
  }
  get tested(): boolean {
    return this.step !== 1;
  }
  /** The ladder level shown: 0..3 (3 = "Do it for me" filled). */
  get level(): number {
    return Math.min(this.wrong, 3);
  }
  get offerFilled(): boolean {
    return this.wrong >= 3;
  }

  /**
   * The ten digits (left to right) a drawn panel shows. Before the test,
   * all zero; after it, 5555555555 except the faulty place; once fixed,
   * every place shows 5.
   */
  panelDigits(panel: number): number[] {
    if (this.step === 1) return Array(PLACES).fill(0);
    const d: number[] = Array(PLACES).fill(GOOD_DIGIT);
    if (this.step !== "fixed" && panel === this.answer.panel) d[this.answer.place] = this.fault.lamp;
    return d;
  }

  private advance(to: Step, assisted: boolean, fb: Feedback): Outcome {
    const from = this.step;
    this.step = to;
    this.wrong = 0;
    if (assisted) this.assisted = true;
    this.fb = fb;
    return { kind: "advance", from, to, assisted };
  }

  private wrongTap(target: number): Outcome {
    this.wrong++;
    const st = this.step as 2 | 3;
    this.fb =
      this.wrong === 1
        ? { kind: "wrong", text: TRY.fb.wrong1[st] }
        : this.wrong === 2
          ? { kind: "hint", text: `${TRY.fb.ring} ${TRY.fb.hint[st](this.fault)}` }
          : { kind: "hint", text: TRY.fb.offer };
    return { kind: "wrong", target, level: this.level };
  }

  /** Step 1: Run the test. */
  runTest(): Outcome {
    if (this.step !== 1) return { kind: "ignored" };
    return this.advance(2, false, { kind: "ok", text: TRY.fb.tested });
  }

  /** Step 2: a tap on panel i (0-based). */
  tapPanel(i: number): Outcome {
    if (this.step !== 2 || i < 0 || i >= PANELS) return { kind: "ignored" };
    if (i === this.answer.panel) return this.advance(3, false, { kind: "ok", text: TRY.fb.panelOk(this.fault.acc) });
    return this.wrongTap(i);
  }

  /** Step 3: a tap on digit place c (0-based, from the left). */
  tapPlace(c: number): Outcome {
    if (this.step !== 3 || c < 0 || c >= PLACES) return { kind: "ignored" };
    if (c === this.answer.place) return this.advance(4, false, { kind: "ok", text: TRY.fb.placeOk(this.fault.place, this.fault.lamp) });
    return this.wrongTap(c);
  }

  /** Step 4: a touch on tube t (0-based). Warm is not an error; cold moves on. */
  touchTube(t: number): Outcome {
    if (this.step !== 4 || t < 0 || t >= TUBES_PER_UNIT) return { kind: "ignored" };
    if (t === this.answer.tube) {
      this.felt.set(t, "cold");
      return this.advance(5, false, { kind: "ok", text: TRY.fb.tubeOk });
    }
    this.felt.set(t, "warm");
    this.wrong++;
    this.fb = this.wrong >= 3 ? { kind: "hint", text: `${TRY.fb.warm} ${TRY.fb.offer}` } : { kind: "ok", text: TRY.fb.warm };
    return { kind: "warm", target: t, level: this.level };
  }

  /** Step 5: Plug in a fresh unit. */
  plugFresh(): Outcome {
    if (this.step !== 5) return { kind: "ignored" };
    return this.advance("fixed", false, { kind: "ok", text: TRY.fixed });
  }

  /** "Do it for me" (steps 2 to 4): plays the step with the right answer. */
  doForMe(): Outcome {
    const done = (fb: string): Feedback => ({ kind: "ok", text: `${TRY.fb.doneForYou} ${fb}` });
    if (this.step === 2) return this.advance(3, true, done(TRY.fb.panelOk(this.fault.acc)));
    if (this.step === 3) return this.advance(4, true, done(TRY.fb.placeOk(this.fault.place, this.fault.lamp)));
    if (this.step === 4) {
      this.felt.set(this.answer.tube, "cold");
      return this.advance(5, true, done(TRY.fb.tubeOk));
    }
    return { kind: "ignored" };
  }

  /** "Skip to the answer" (steps 2 to 5): straight to the fixed state. */
  skip(): Outcome {
    if (this.step === 1 || this.step === "fixed") return { kind: "ignored" };
    return this.advance("fixed", false, { kind: "ok", text: TRY.fixed });
  }

  /** "Try another fault": the next authored fault, step 1 again. */
  another(): void {
    this.variant = (this.variant + 1) % FAULTS.length;
    this.restart();
  }

  /** Step 1 again with the same fault. */
  restart(): void {
    this.step = 1;
    this.wrong = 0;
    this.felt.clear();
    this.assisted = false;
    this.fb = null;
  }
}
