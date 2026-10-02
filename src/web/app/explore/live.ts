// Where Explore ENIAC's live lamps come from (UX 14.2.4, 14.3.7, 14.3.8).
//
//  - Opened from a mission's briefing or result: that mission's own session
//    (the room is still the visitor's machine). Nothing is started: an
//    attract_start would end the visitor's session.
//  - Otherwise, with no visitor session: Explore asks for the live attract
//    loop through the app's AttractController (attract_start, idempotent on
//    the bridge; session/attract.go flies Mission 3's program on a real
//    core, flight after flight). App.show keeps it running through the
//    glossary and the honor roll and stops it ("menu") when the visitor
//    goes on to the picker or a mission.
//  - Core down: nothing is lit and the screen says so.
//
// The panorama's lamps are always `app.mirror.machine`, which is null unless
// a live session exists with the core and the link up: honest by
// construction.

import type { App } from "../app.ts";

/** Don't ask again sooner than this (the bridge takes a second or two to boot a core). */
const ASK_EVERY_MS = 5000;
let lastAsk = -Infinity;

/** Starts (or keeps) the attract loop if no visitor session holds the machine. True if it asked. */
export function ensureAttract(app: App): boolean {
  const s = app.mirror.session;
  if (s && s.mode !== "attract") return false;
  if (!app.link.isOpen || app.mirror.health.core !== "up") return false;
  const phase = app.attract.phase;
  if (app.attractCtl.wanted && phase !== "off") return false; // running, or on its way
  const now = app.now();
  if (now - lastAsk < ASK_EVERY_MS) return false;
  lastAsk = now;
  app.attractCtl.enter();
  return true;
}

/** What the room's live chip says (EXPLORE.live / resting), from real state only. */
export type LiveState = "resting" | "attract" | "mission" | "waking" | "between" | "none";

export function liveState(app: App): LiveState {
  if (!app.link.isOpen || app.mirror.health.core === "down") return "resting";
  const s = app.mirror.session;
  if (s && s.mode !== "attract") return app.mirror.machine ? "mission" : "waking";
  const phase = app.attract.phase;
  if (s && app.mirror.machine && (phase === "reading" || phase === "flying" || phase === "landed")) return "attract";
  if (phase === "recycling") return "between";
  if (app.attractCtl.wanted && phase !== "off" && phase !== "error") return "waking";
  return "none";
}
