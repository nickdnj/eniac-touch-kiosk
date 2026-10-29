// Gunnery: the visitor's round, and its score. Everything shown is read from the
// visitor's own punched cards: the landing is where the path between the last
// two dots crosses the ground (the same crossing the arc plot draws).

import type { Game } from "../../../bridge/internal/mission/mission.gen.ts";

/** The punched x is in feet with four decimals. */
const FEET_SCALE = 10000;

/** One visitor's round: the target they were given and the shot they chose. */
export interface GameRound {
  target: number;
  /** This target's hit radius in feet (a big hull is easier to hit than a small one). */
  hit: number;
  /** What is there, when the mission names it ("Enemy cruiser"); "" for a plain flag. */
  name: string;
  /** The visitor's own ship, when the mission has ships (Battleship). */
  ship: string | null;
  charge: string | null;
  elevation: string | null;
  /** Which picture an Army target has ("tanks", "bridge"); "" otherwise. */
  art: string;
  /** 1 for the first shot at a target; 2 once the forward observer has called a correction (Army). */
  round: number;
  /** The observer's call after round 1, carried into round 2; null on round 1. */
  spotter: { feet: number; side: "short" | "long" } | null;
}

export function newRound(game: Game, rnd: () => number = Math.random, forced?: Game["targets"][number]): GameRound {
  const t = forced ?? game.targets[Math.min(game.targets.length - 1, Math.floor(rnd() * game.targets.length))];
  return { target: t.feet, hit: t.hit || game.score.hitFeet, name: t.name ?? "", ship: null, charge: null, elevation: null, art: t.art ?? "", round: 1, spotter: null };
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
export function judge(game: Game, target: number, landed: number, hitFeet: number = game.score.hitFeet): Result {
  const rule = game.score;
  const miss = Math.abs(landed - target);
  const hit = miss <= hitFeet;
  const score = hit ? rule.max : Math.max(0, Math.round(rule.max * (1 - (miss - hitFeet) / (rule.zeroFeet - hitFeet))));
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

/** Plot x is in feet with four decimals. */
export const FEET = FEET_SCALE;

/** A band of ground around the flag worth a score: land inside it for at least `points`. */
export interface Zone {
  lo: number; // feet from the gun
  hi: number;
  points: number;
  label: string;
  cls: "gold" | "green" | "yellow" | "orange" | "red";
}

/** The miss at which the straight-line score falls to `points`. */
function missFor(game: Game, points: number, hitFeet: number): number {
  const r = game.score;
  return hitFeet + (1 - points / r.max) * (r.zeroFeet - hitFeet);
}

/** The score zones around a target, outermost first (draw them in this order). Never reaches below the gun. */
export function zones(game: Game, target: number, hitFeet: number = game.score.hitFeet): Zone[] {
  const r = game.score;
  const spec: [number, number, Zone["cls"], string][] = [
    [missFor(game, 0, hitFeet), 0, "red", "1+"],
    [missFor(game, r.max * 0.25, hitFeet), r.max * 0.25, "orange", `${r.max * 0.25}+`],
    [missFor(game, r.max * 0.5, hitFeet), r.max * 0.5, "yellow", `${r.max * 0.5}+`],
    [missFor(game, r.max * 0.75, hitFeet), r.max * 0.75, "green", `${r.max * 0.75}+`],
    [hitFeet, r.max, "gold", `${r.max}`],
  ];
  return spec.map(([m, points, cls, label]) => ({ lo: Math.max(0, target - m), hi: target + m, points, label, cls }));
}

/** The title earned by a score (ranks are listed best first). */
export function rankFor(game: Game, score: number): string {
  const r = game.board.ranks.find((x) => score >= x.min);
  return (r ?? game.board.ranks[game.board.ranks.length - 1]).title;
}

/** Where a score would stand on a list (1 is the top). */
export function placeOn(list: ScoreEntry[], score: number): number {
  return 1 + list.filter((e) => e.score >= score).length - list.filter((e) => e.score === score).length;
}

/** This visit's shots, kept while the visitor keeps playing (cleared when the visit ends). */
export interface GameVisit {
  shots: number;
  best: number;
}
