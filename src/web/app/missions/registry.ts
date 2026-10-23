// Per-mission presentation, in one place. The bridge serves every mission's
// words and steps (missions/*.yaml); this is only the art that cannot be
// data: the picker card picture and the two explanatory animations (S3
// briefing, S3b plan). A mission with no entry still works: the picker draws
// a generic card and the briefing and plan fall back to the room plan.
//
// To give a new mission its own art, add an entry keyed by its id. Nothing
// else in the web code names a mission.

import type { Figure } from "../stage/primesfig.ts";
import { CheckersFigure, SharingFigure } from "../stage/primesfig.ts";
import { TileFigure } from "../stage/tiles.ts";
import { DotsFigure, HopFigure } from "../stage/trajfig.ts";
import { DifferenceBriefFigure, DifferenceFigure } from "../stage/diffig.ts";
import { GunneryPlanFigure, GunneryTitleFigure, gunneryPicker } from "../stage/gunneryfig.ts";

export interface MissionArt {
  /** The picker card picture: SVG elements for a 480 x 200 canvas on the panel colour. */
  picker?: () => string;
  /** The S3 briefing animation. */
  briefing?: (reduceMotion: boolean) => Figure;
  /** The S3b plan animation; `math` is the mission's content.plan.math line. */
  plan?: (math: string, reduceMotion: boolean) => Figure | null;
}

const LAMP = "#FFB000";
const CREAM = "#F4EFE3";

const tile = (x: number, y: number, s = 30) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="4" fill="${LAMP}" stroke="${CREAM}" stroke-width="2"/>`;

const ART: Record<string, MissionArt> = {
  squares: {
    picker: () => {
      let b = "";
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) b += tile(186 + c * 38, 46 + r * 38);
      return b;
    },
    briefing: () => TileFigure.briefing(),
    plan: (math, reduce) => TileFigure.plan(math, reduce),
  },
  primes: {
    picker: () => {
      // 12 as a 3 x 4 block (it shares evenly) beside 7 in a row with a star (prime).
      let b = "";
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) b += tile(44 + c * 34, 50 + r * 34, 28);
      for (let c = 0; c < 7; c++) b += tile(212 + c * 34, 118, 28);
      b += `<path d="M427 64l8 16 18 3-13 12 3 18-16-9-16 9 3-18-13-12 18-3z" fill="${CREAM}"/>`;
      return b;
    },
    briefing: (reduce) => new SharingFigure(reduce),
    plan: (math, reduce) => new CheckersFigure(math, reduce),
  },
  trajectory: {
    picker: () => {
      let b = `<path d="M30 176H450" stroke="#9AA0A8" stroke-width="2" stroke-dasharray="6 6"/>`;
      b += `<g transform="rotate(-35 54 166)"><rect x="40" y="156" width="54" height="16" rx="4" fill="${CREAM}"/></g><circle cx="52" cy="172" r="12" fill="#1B1D21" stroke="${CREAM}" stroke-width="3"/>`;
      for (let i = 0; i < 8; i++) {
        const t = (i + 1) / 9;
        const x = 70 + t * 360, y = 176 - 4 * 130 * t * (1 - t) - 4;
        b += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${LAMP}" stroke="${CREAM}" stroke-width="2"/>`;
      }
      return b;
    },
    briefing: (reduce) => new DotsFigure(reduce),
    plan: (math, reduce) => new HopFigure(math, reduce),
  },
  difference: {
    // A column of table rows that shrink and then go below the line, with the "+" that builds each from the one above.
    picker: () => {
      const rows = [76, 62, 50, 40, 32];
      let b = `<g transform="translate(-100 0)"><path d="M150 150H330" stroke="#9AA0A8" stroke-width="2" stroke-dasharray="6 6"/>`;
      rows.forEach((w, i) => {
        const y = 22 + i * 28;
        b += `<rect x="${150}" y="${y}" width="${w * 2.4}" height="20" rx="4" fill="${LAMP}" stroke="${CREAM}" stroke-width="2"/>`;
        if (i) b += `<path d="M128 ${y + 10}h14M135 ${y + 3}v14" stroke="${CREAM}" stroke-width="3" stroke-linecap="round"/>`;
      });
      b += `<rect x="150" y="164" width="30" height="20" rx="4" fill="none" stroke="${CREAM}" stroke-width="2" stroke-dasharray="4 4"/></g>`;
      return b;
    },
    briefing: (reduce) => new DifferenceBriefFigure(reduce),
    plan: (_math, reduce) => new DifferenceFigure(reduce),
  },
  gunnery: {
    // A 1946 fairground shooting gallery: a marquee, a field gun, a flag (stage/gunneryfig.ts).
    picker: gunneryPicker,
    briefing: (reduce) => new GunneryTitleFigure(reduce),
    plan: (math, reduce) => new GunneryPlanFigure(math, reduce),
  },
};

/** The picker card picture for any mission: its own art, or a generic card with the mission's number. */
export function pickerArtFor(id: string, order: number): string {
  const W = 480, H = 200;
  const own = ART[id]?.picker?.();
  const body =
    own ??
    `<circle cx="240" cy="100" r="54" fill="none" stroke="${CREAM}" stroke-width="4"/><text x="240" y="122" text-anchor="middle" font-size="64" font-weight="700" fill="${LAMP}" font-family="sans-serif">${order}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="mc-art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><rect x="0" y="0" width="${W}" height="${H}" rx="12" fill="#1B1D21"/>${body}</svg>`;
}

/** The S3 briefing animation for a mission, or null (the room plan is shown instead). */
export function briefingFigureFor(id: string, reduceMotion: boolean): Figure | null {
  return ART[id]?.briefing?.(reduceMotion) ?? null;
}

/** The S3b plan animation for a mission, or null (the plan's math line is shown). */
export function planFigureFor(id: string, math: string, reduceMotion: boolean): Figure | null {
  return ART[id]?.plan?.(math, reduceMotion) ?? null;
}
