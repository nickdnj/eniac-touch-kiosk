// S12's PIN entry (UX 7.11): digits only, 4 to 8 of them, Clear empties,
// OK is enabled from the 4th digit. Pure, so it is unit-tested; the screen
// (screens/pin.ts) draws it. The PIN is held only until it is posted.

export const PIN_MIN = 4;
export const PIN_MAX = 8;

export class PinEntry {
  private v = "";

  get value(): string {
    return this.v;
  }

  get length(): number {
    return this.v.length;
  }

  /** OK is enabled. */
  get canSubmit(): boolean {
    return this.v.length >= PIN_MIN && this.v.length <= PIN_MAX;
  }

  /** A digit key. Ignored past 8 digits or for anything but 0-9. */
  press(d: string): boolean {
    if (!/^[0-9]$/.test(d) || this.v.length >= PIN_MAX) return false;
    this.v += d;
    return true;
  }

  clear(): void {
    this.v = "";
  }

  /** The PIN to post; the entry is emptied. */
  take(): string {
    const v = this.v;
    this.v = "";
    return v;
  }
}
