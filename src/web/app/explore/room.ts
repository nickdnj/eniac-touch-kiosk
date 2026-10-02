// The ENIAC room, unrolled (UX 14.3.1): the single source of truth for
// where every unit stands. Pure data and geometry, no DOM, unit-tested
// (tests/web/room.test.ts).
//
// Panels are numbered 0 to 39, 0-based like the upstream offsets in Stuart's
// vis/eniactk.go (accoff, ftuoff, drawfixed, ray): panels 0-15 are the left
// wall, 16-23 the back wall and 24-39 the right wall, so the U is 16 + 8 + 16
// panels. stage/roomplan.ts reads its positions from here (F12).

export type UnitKind = "init" | "cyc" | "mp" | "ft" | "acc" | "div" | "mult" | "ct" | "pr";

export interface RoomUnit {
  /** Room id: init, cyc, mp, ft1..ft3, a1..a20, div, mult, ct, pr. */
  id: string;
  kind: UnitKind;
  /** First panel (0-based). */
  at: number;
  /** Number of panels. */
  n: number;
  /** Full name ("Accumulator 7", "Function Table 2"). */
  name: string;
  /** The two lines of the label chip under the panels. */
  chip: [string, string];
  /** The unit's name in .e programs (i, cy, p, f1, a7, d, m, c, pr). */
  e: string;
}

export const PANELS = 40;
/** Panel pitch in room px (UX 14.3.2): a 176 px panel plus an 8 px gap. */
export const PITCH = 184;
export const PANEL_W = 176;
/** The Explore viewport (1360 x 640 at pitch 184). */
export const VIEW_W = 1360;
/** An arrow moves the room by 6 panels. */
export const STEP_PANELS = 6;
/** The whole strip: 40 x 184 = 7,360 px. */
export const STRIP_W = PANELS * PITCH;

export const WALLS = [
  { id: "left", label: "LEFT WALL", from: 0, to: 15 },
  { id: "back", label: "BACK WALL", from: 16, to: 23 },
  { id: "right", label: "RIGHT WALL", from: 24, to: 39 },
] as const;

function acc(n: number, at: number): RoomUnit {
  return { id: `a${n}`, kind: "acc", at, n: 1, name: `Accumulator ${n}`, chip: ["Accumulator", String(n)], e: `a${n}` };
}
function ft(u: number, at: number): RoomUnit {
  return { id: `ft${u}`, kind: "ft", at, n: 2, name: `Function Table ${u}`, chip: ["Function Table", String(u)], e: `f${u}` };
}

/** The 30 units, left to right along the U (UX 14.3.1 table). */
export const ROOM: RoomUnit[] = [
  { id: "init", kind: "init", at: 0, n: 1, name: "Initiating Unit", chip: ["Initiating", "Unit"], e: "i" },
  { id: "cyc", kind: "cyc", at: 1, n: 1, name: "Cycling Unit", chip: ["Cycling", "Unit"], e: "cy" },
  { id: "mp", kind: "mp", at: 2, n: 2, name: "Master Programmer", chip: ["Master Programmer", ""], e: "p" },
  ft(1, 4),
  acc(1, 6),
  acc(2, 7),
  { id: "div", kind: "div", at: 8, n: 1, name: "Divider and Square-Rooter", chip: ["Divider and", "Square-Rooter"], e: "d" },
  ...[3, 4, 5, 6, 7, 8, 9, 10].map((n) => acc(n, n + 6)),
  { id: "mult", kind: "mult", at: 17, n: 3, name: "High-Speed Multiplier", chip: ["High-Speed Multiplier", ""], e: "m" },
  ...[11, 12, 13, 14, 15, 16, 17, 18].map((n) => acc(n, n + 9)),
  ft(2, 28),
  ft(3, 30),
  acc(19, 32),
  acc(20, 33),
  { id: "ct", kind: "ct", at: 34, n: 2, name: "Constant Transmitter", chip: ["Constant Transmitter", ""], e: "c" },
  { id: "pr", kind: "pr", at: 36, n: 4, name: "Printer", chip: ["Printer", ""], e: "pr" },
];

const BY_ID = new Map(ROOM.map((u) => [u.id, u]));
const BY_E = new Map(ROOM.map((u) => [u.e, u]));
const BY_PANEL: RoomUnit[] = [];
for (const u of ROOM) for (let p = u.at; p < u.at + u.n; p++) BY_PANEL[p] = u;

export function unitById(id: string): RoomUnit | undefined {
  return BY_ID.get(id);
}

/** The unit standing at panel p (0..39; clamped). */
export function unitAtPanel(p: number): RoomUnit {
  return BY_PANEL[Math.max(0, Math.min(PANELS - 1, Math.floor(p)))];
}

/** The unit an .e name belongs to ("a7" -> Accumulator 7, "f2" -> Function Table 2), or undefined (adapters, trunks). */
export function unitOfE(e: string): RoomUnit | undefined {
  return BY_E.get(e);
}

/** Which wall a panel is on. */
export function wallOf(p: number): "left" | "back" | "right" {
  return p <= 15 ? "left" : p <= 23 ? "back" : "right";
}

// ---------------------------------------------------------------- position

export function maxX(viewW = VIEW_W): number {
  return STRIP_W - viewW;
}

export function clampX(x: number, viewW = VIEW_W): number {
  return Math.max(0, Math.min(maxX(viewW), Math.round(x)));
}

/** The position that puts panels [at, at + n) in the middle (nearest legal position). */
export function centreOn(at: number, n: number, viewW = VIEW_W): number {
  return clampX((at + n / 2) * PITCH - viewW / 2, viewW);
}

/** First and last panel at least partly on screen at position x. */
export function visibleRange(x: number, viewW = VIEW_W): [number, number] {
  return [Math.max(0, Math.floor(x / PITCH)), Math.min(PANELS - 1, Math.floor((x + viewW - 1) / PITCH))];
}

/** "You are looking at: {first} to {last}" (UX 14.3.2), as the two unit names. */
export function readout(x: number, viewW = VIEW_W): [string, string] {
  const [a, b] = visibleRange(x, viewW);
  return [unitAtPanel(a).name, unitAtPanel(b).name];
}

/** Is the unit wholly inside the middle `frac` of the viewport at x? (UX 14.3.5: else the room pans.) */
export function inMiddle(u: { at: number; n: number }, x: number, viewW = VIEW_W, frac = 0.6): boolean {
  const lo = x + (viewW * (1 - frac)) / 2, hi = x + viewW - (viewW * (1 - frac)) / 2;
  return u.at * PITCH >= lo && (u.at + u.n) * PITCH - (PITCH - PANEL_W) <= hi;
}

/** The arrow step: 6 panels, clamped. */
export function stepX(x: number, dir: -1 | 1, viewW = VIEW_W): number {
  return clampX(x + dir * STEP_PANELS * PITCH, viewW);
}

/** A long pan is capped (UX 14.3.5: 450 ms a step, at most 900 ms). */
export function panMs(from: number, to: number): number {
  const d = Math.abs(to - from);
  if (d === 0) return 0;
  return Math.min(900, Math.max(450, Math.round((d / (STEP_PANELS * PITCH)) * 450)));
}

// ---------------------------------------------------------------- minimap (UX 14.3.2)

export const MINIMAP = { cell: 33, left: 20, cells: PANELS } as const;

/** The letter on a minimap cell: on the unit's first panel only. */
export function minimapLetter(p: number): string {
  const u = unitAtPanel(p);
  if (u.at !== p) return "";
  return { init: "I", cyc: "C", mp: "MP", ft: "F", acc: "A", div: "÷", mult: "×", ct: "CT", pr: "P" }[u.kind];
}

/** Tap at minimap cell coordinate cx (px from the cells' left edge): centre that spot. */
export function minimapToX(cx: number, viewW = VIEW_W): number {
  return clampX((cx / MINIMAP.cell) * PITCH - viewW / 2, viewW);
}

/** The cream bracket on the minimap: left and width in cell px. */
export function minimapBracket(x: number, viewW = VIEW_W): { left: number; width: number } {
  return { left: (x / PITCH) * MINIMAP.cell, width: (viewW / PITCH) * MINIMAP.cell };
}

// ---------------------------------------------------------------- the walk (UX 14.3.6)

/** Card ids in Walk-the-room order: the twelve stops. */
export const STOPS = ["init", "cyc", "mp", "acc", "mult", "div", "ft", "pft", "ct", "pr", "dt", "pt"] as const;
export type Stop = (typeof STOPS)[number];

/** The card (stop) a room target opens: a unit id, "pft:<ft id>" (a cart), "dt" or "pt" (the trays). */
export function stopOf(target: string): Stop | null {
  if (target === "dt" || target === "pt") return target;
  if (target.startsWith("pft")) return "pft";
  const u = unitById(target);
  if (!u) return null;
  return u.kind === "ft" ? "ft" : u.kind === "acc" ? "acc" : (u.kind as Stop);
}

/** The unit the walk shows for a stop (accumulators: Accumulator 1; tables: Function Table 2), or null for the trays. */
export function walkUnit(stop: Stop): RoomUnit | null {
  const id = { init: "init", cyc: "cyc", mp: "mp", acc: "a1", mult: "mult", div: "div", ft: "ft2", pft: "ft2", ct: "ct", pr: "pr" }[stop as string];
  return id ? unitById(id) ?? null : null;
}

// ---------------------------------------------------------------- missions (UX 14.3.7)

/**
 * Room targets a mission uses, from the compiled mission's `units` (the
 * bridge derives them from the program's own plugs and switches; never
 * typed). "trunks" lights both tray bands; adapters and the cycling unit's
 * switches are not units of the room.
 */
export function missionTargets(eUnits: string[]): Set<string> {
  const out = new Set<string>();
  for (const e of eUnits) {
    if (e === "trunks") {
      out.add("dt");
      out.add("pt");
      continue;
    }
    const u = unitOfE(e);
    if (u && u.kind !== "cyc") out.add(u.id);
  }
  return out;
}

/** The stops ("Used in") a mission's targets touch. */
export function missionStops(targets: Set<string>): Set<Stop> {
  const out = new Set<Stop>();
  for (const t of targets) {
    const s = stopOf(t);
    if (s) out.add(s);
  }
  // A program that sets a function table's switches used its portable table.
  if (out.has("ft")) out.add("pft");
  return out;
}

/** "Accumulators 1 to 14, and 19" style list of accumulator numbers. */
export function accRuns(nums: number[]): string {
  const s = [...nums].sort((a, b) => a - b);
  const runs: string[] = [];
  for (let i = 0; i < s.length; ) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    runs.push(j - i >= 2 ? `${s[i]} to ${s[j]}` : j === i ? `${s[i]}` : `${s[i]}, ${s[j]}`);
    i = j + 1;
  }
  if (runs.length <= 1) return runs.join("");
  return `${runs.slice(0, -1).join(", ")}, and ${runs[runs.length - 1]}`;
}

/**
 * The mission card's unit list, in room order, from the mission's real
 * targets: "the Initiating Unit, the Master Programmer, ..., and 15
 * accumulators: 1 to 14, and 19".
 */
export function missionUnitList(targets: Set<string>): { names: string[]; count: number } {
  const names: string[] = [];
  const accs = ROOM.filter((u) => u.kind === "acc" && targets.has(u.id)).map((u) => Number(u.id.slice(1)));
  const fts = ROOM.filter((u) => u.kind === "ft" && targets.has(u.id)).map((u) => Number(u.id.slice(2)));
  let count = accs.length + fts.length;
  for (const u of ROOM) {
    if (!targets.has(u.id) || u.kind === "acc") continue;
    if (u.kind === "ft") {
      // The tables are one entry, where the first of them stands.
      if (Number(u.id.slice(2)) !== fts[0]) continue;
      names.push(fts.length === 3 ? "all three Function Tables" : fts.length === 2 ? `Function Tables ${fts[0]} and ${fts[1]}` : `Function Table ${fts[0]}`);
      continue;
    }
    names.push(`the ${u.name}`);
    count++;
  }
  if (accs.length === 1) names.push(`Accumulator ${accs[0]}`);
  else if (accs.length === 2) names.push(`Accumulators ${accs[0]} and ${accs[1]}`);
  else if (accs.length > 2) names.push(`${accs.length} accumulators: ${accRuns(accs)}`);
  return { names, count };
}

/** Joins names as English: "a, b and c". */
export function andList(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
