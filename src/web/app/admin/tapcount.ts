// The hidden staff gesture (FR-70, UX 7.11): 5 taps in the top-left
// corner (hello.config.admin.tapZone, 120x96) within 3 s of the first.
// Any touch outside the corner resets the count. Pure: the App feeds it
// every first-finger pointerdown (docs/original-ui-switch.md 6.7).

export interface Zone {
  widthPx: number;
  heightPx: number;
  taps: number;
}

/** The window from the first tap (FR-70). */
export const TAP_WINDOW_MS = 3000;

/** Is an app-coordinate point inside the top-left zone? */
export function inZone(p: { x: number; y: number }, z: Pick<Zone, "widthPx" | "heightPx">): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < z.widthPx && p.y < z.heightPx;
}

export class TapCounter {
  private n = 0;
  private first = 0;
  taps: number;
  readonly windowMs: number;

  constructor(taps = 5, windowMs = TAP_WINDOW_MS) {
    this.taps = taps;
    this.windowMs = windowMs;
  }

  /** Taps counted so far in the current window. */
  get count(): number {
    return this.n;
  }

  /** One pointerdown. True when it completes the gesture (the count restarts). */
  down(inside: boolean, now: number): boolean {
    if (!inside) {
      this.reset();
      return false;
    }
    if (this.n === 0 || now - this.first > this.windowMs) {
      this.n = 0;
      this.first = now;
    }
    this.n++;
    if (this.n >= Math.max(1, this.taps)) {
      this.reset();
      return true;
    }
    return false;
  }

  reset(): void {
    this.n = 0;
    this.first = 0;
  }
}
