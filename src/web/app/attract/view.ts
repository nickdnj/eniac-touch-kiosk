// S1 Attract (live), the pure part (UX 14.2): the camera over the panorama,
// the LIVE chip, the FR-36 "no live status" rule, the scene and the landing
// lines. No DOM, unit-tested (tests/web/attract-view.test.ts); the screen
// is screens/attract.ts.

import type { AttractLanding, AttractPhase } from "../protocol.ts";
import { PITCH, ROOM, centreOn, maxX, visibleRange, type RoomUnit } from "../explore/room.ts";
import { LIVE_LOST_MS, type Liveness } from "./store.ts";
import { COPY } from "../copy.ts";

/** UX 14.2.1: the attract panorama is drawn at a panel pitch of 150 px (Explore: 184). */
export const ATTRACT_PITCH = 150;
export const ATTRACT_SCALE = ATTRACT_PITCH / PITCH;
/** The room's window on screen: x48 to 1872 (1,824 px), y300, about 12 of the 40 panels. */
export const ROOM_SCREEN = { x: 48, y: 300, w: 1824 } as const;
/** The same window in room px (pitch 184), as the panorama takes it. */
export const ATTRACT_VIEW_W = Math.round(ROOM_SCREEN.w / ATTRACT_SCALE);
/** UX 14.2.2 Camera: "about 80 px a second" on screen. */
export const DRIFT_PX_PER_S = 80;
/** Reduced motion (UX 14.2.4): a cut to the next framing every 10 s, with a 250 ms cross-fade. */
export const CUT_EVERY_MS = 10_000;
export const CUT_FADE_MS = 250;

/** The far end of the drift, in room px. */
export const DRIFT_END = maxX(ATTRACT_VIEW_W);

/**
 * Where flight n's drift starts and ends (UX 14.2.2): odd flights left to
 * right, even flights right to left, so every flight starts where the last
 * one stopped. Flight 0 (nothing flying yet) holds the control end.
 */
export function driftEnds(flight: number): { from: number; to: number } {
  if (flight <= 0) return { from: 0, to: 0 };
  return flight % 2 === 1 ? { from: 0, to: DRIFT_END } : { from: DRIFT_END, to: 0 };
}

/** Drift speed limits (screen px a second) when it is paced by a measured flight. */
export const DRIFT_MIN_PX_PER_S = 40;
export const DRIFT_MAX_PX_PER_S = 120;

/**
 * How long a drift from x to `to` takes. UX 14.2.2: one drift per flight,
 * "about 80 px a second" (a 49 s flight on the Mac). The flight's length
 * depends on the box, so once a flight has landed its real duration
 * (`landing.flightMs`, measured by the bridge) paces the next drift, within
 * 40 to 120 px a second; before that, 80 px a second.
 */
export function driftMs(x: number, to: number, lastFlightMs: number | null = null): number {
  const px = Math.abs(to - x) * ATTRACT_SCALE;
  if (!px) return 0;
  const full = DRIFT_END * ATTRACT_SCALE;
  let speed = DRIFT_PX_PER_S;
  if (lastFlightMs && lastFlightMs > 0) speed = Math.min(DRIFT_MAX_PX_PER_S, Math.max(DRIFT_MIN_PX_PER_S, full / (lastFlightMs / 1000)));
  return Math.round((px / speed) * 1000);
}

/**
 * Reduced motion: four fixed framings (UX 14.2.4), in room px: the control
 * end, the accumulator wall (Accumulators 3 to 10), the multiplier and the
 * function tables, the output end.
 */
export const FRAMINGS: readonly number[] = [0, centreOn(9, 8, ATTRACT_VIEW_W), centreOn(17, 15, ATTRACT_VIEW_W), DRIFT_END];

/** The lamp unit (lamps/derive.ts naming) a room unit's lamps belong to. */
export function lampKey(u: RoomUnit): string {
  return u.kind === "acc" ? `acc.${u.id.slice(1)}` : u.kind; // the three function tables share "ft"
}

/**
 * UX 14.2.3: only the panels on screen update. The lamp units standing in
 * the room window at x (room px), with `margin` panels either side so a
 * unit drifting in is already current.
 */
export function lampUnitsAt(x: number, margin = 1, viewW = ATTRACT_VIEW_W): Set<string> {
  const [a, b] = visibleRange(x, viewW);
  const out = new Set<string>();
  for (const u of ROOM) if (u.at + u.n - 1 >= a - margin && u.at <= b + margin) out.add(lampKey(u));
  return out;
}

/** What the LIVE chip shows: only while status frames arrive (UX 14.2.1). */
export type ChipState = "live" | "waiting" | "hidden";

export function chipOf(l: Liveness): ChipState {
  return l === "live" ? "live" : l === "waiting" ? "waiting" : "hidden";
}

/**
 * FR-36: S1 becomes S10 when no live status arrives for 5 s. `lost` is the
 * store's verdict (a due frame, a first flight or a next flight not live in
 * 5 s); `off` and `error` count too once they have lasted 5 s while S1
 * asked for attract (a bridge that never starts it is not a live screen).
 */
export function attractDown(l: Liveness, notRunningMs: number): boolean {
  if (l === "lost") return true;
  if (l === "off" || l === "error") return notRunningMs > LIVE_LOST_MS;
  return false;
}

/**
 * The scene, for the screen's classes:
 * - waking: a fresh core boots (or the request is on its way); the room is dark.
 * - live: reading or flying, lamps from the core.
 * - landed: frozen on the landing card, the finished plot is held.
 * - between: recycling; the last real frame, dimmed to 50%.
 */
export type Scene = "waking" | "live" | "landed" | "between";

export function sceneOf(p: AttractPhase): Scene {
  switch (p) {
    case "reading":
    case "flying":
      return "live";
    case "landed":
      return "landed";
    case "recycling":
      return "between";
    default:
      return "waking";
  }
}

/**
 * The landing numbers for the hold: the hop punched on the real landing
 * card and the number of cards the flight punched (the bridge decodes both
 * from the landing card, architecture 5.10). Nothing if there is no landing.
 */
export function landingLines(l: AttractLanding | null): [string, string] | null {
  if (!l || !(l.hop > 0)) return null;
  return [COPY.attract.landedOn(l.hop), l.card > 0 ? COPY.attract.cardsPunched(l.card) : ""];
}
