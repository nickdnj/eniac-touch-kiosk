// Button feedback sound: a short, soft relay-style tick, synthesized with
// Web Audio so there is no asset to ship. Plays on finger-down of an enabled
// button (the same moment the pressed state shows). Never throws, never
// blocks: if audio is missing or fails, the kiosk stays silent (the PRD's
// "visual feedback only" still holds as the fallback).

interface AudioLike {
  currentTime: number;
  state: string;
  destination: unknown;
  resume(): Promise<void> | void;
  createOscillator(): {
    type: string;
    frequency: { setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void };
    connect(n: unknown): void;
    start(t: number): void;
    stop(t: number): void;
  };
  createGain(): {
    gain: { setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void };
    connect(n: unknown): void;
  };
}

export const CLICK_VOLUME = 0.12;
export const CLICK_SECONDS = 0.045;
/** Taps closer together than this share one sound (a drag across keys is not a buzz). */
export const MIN_GAP_MS = 25;

let ctx: AudioLike | null = null;
let muted = false;
let lastAt = -Infinity;
let factory: (() => AudioLike) | null = null;

/** Tests inject a fake AudioContext. */
export function setAudioFactory(f: (() => AudioLike) | null): void {
  factory = f;
  ctx = null;
  lastAt = -Infinity;
}

export function setMuted(m: boolean): void {
  muted = m;
}

function context(): AudioLike | null {
  if (ctx) return ctx;
  try {
    if (factory) ctx = factory();
    else {
      const C = (globalThis as { AudioContext?: new () => AudioLike }).AudioContext;
      if (!C) return null;
      ctx = new C();
    }
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Plays the button tick. Returns true if a sound was scheduled. */
export function playClick(nowMs: number = Date.now()): boolean {
  if (muted || nowMs - lastAt < MIN_GAP_MS) return false;
  const a = context();
  if (!a) return false;
  try {
    if (a.state === "suspended") void a.resume();
    const t = a.currentTime;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + CLICK_SECONDS);
    g.gain.setValueAtTime(CLICK_VOLUME, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + CLICK_SECONDS);
    osc.connect(g);
    g.connect(a.destination);
    osc.start(t);
    osc.stop(t + CLICK_SECONDS + 0.01);
    lastAt = nowMs;
    return true;
  } catch {
    return false;
  }
}
