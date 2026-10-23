// Gunnery: the visitor's round, and its score. Everything shown is read from the
// visitor's own punched cards: the landing is where the path between the last
// two dots crosses the ground (the same crossing the arc plot draws).

import type { Game } from "../../../bridge/internal/mission/mission.gen.ts";

/** The punched x is in feet with four decimals. */
const FEET_SCALE = 10000;

/** One visitor's round: the target they were given and the shot they chose. */
export interface GameRound {
  target: number;
  charge: string | null;
  elevation: string | null;
}

export function newRound(game: Game, rnd: () => number = Math.random): GameRound {
  const t = game.targets[Math.min(game.targets.length - 1, Math.floor(rnd() * game.targets.length))];
  return { target: t.feet, charge: null, elevation: null };
}

/** Where the shell landed, in whole feet, from the cards' crossing; null before the landing. */
export function landingFeet(cross: { x: number } | null): number | null {
  return cross ? Math.round(cross.x / FEET_SCALE) : null;
}

export interface Result {
  landed: number;
  miss: number;
  side: "short" | "long" | "hit";
  hit: boolean;
  score: number;
}

/** A miss of hitFeet or less scores the maximum; the score falls in a straight line to 0 at zeroFeet. */
export function judge(game: Game, target: number, landed: number): Result {
  const rule = game.score;
  const miss = Math.abs(landed - target);
  const hit = miss <= rule.hitFeet;
  const score = hit ? rule.max : Math.max(0, Math.round(rule.max * (1 - (miss - rule.hitFeet) / (rule.zeroFeet - rule.hitFeet))));
  return { landed, miss, side: hit ? "hit" : landed < target ? "short" : "long", hit, score };
}

/** Initials: 1 to 8 letters, digits, space, dot or dash (the bridge's rule). */
export function cleanName(raw: string): string {
  return raw.replace(/[^A-Za-z0-9 .-]/g, "").slice(0, 8).trim();
}

export interface ScoreEntry {
  name: string;
  score: number;
  missFeet: number;
  target: number;
  charge: string;
  elevation: string;
  at: string;
}

export interface Board {
  today: ScoreEntry[];
  all: ScoreEntry[];
}

/** The launch speeds a shot dials in, in feet per second (what the bridge sets on the J and K dials). */
export function shotSpeeds(game: Game, charge: string, elevation: string): { across: number; up: number } | null {
  const c = game.charges.find((x) => x.id === charge);
  const e = game.elevations.find((x) => x.id === elevation);
  if (!c || !e) return null;
  const rad = (e.deg * Math.PI) / 180;
  return { across: c.speed * Math.cos(rad), up: c.speed * Math.sin(rad) };
}
