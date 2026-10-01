// Geometric hit testing for step targets (UX 6.6). Pure.
// A tap within `tol` px of a target's hit rect counts; decoys get the same
// tolerance; the nearest wins and the active target wins ties.

export interface HitRect {
  id: string;
  x: number; // left, app coordinates
  y: number; // top
  w: number;
  h: number;
}

export const TOLERANCE_PX = 16;

export function distToRect(px: number, py: number, r: HitRect): number {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

export function hitTest(
  p: { x: number; y: number },
  targets: HitRect[],
  activeIds: string[] = [],
  tol = TOLERANCE_PX,
): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const t of targets) {
    const d = distToRect(p.x, p.y, t);
    if (d > tol) continue;
    const better = d < bestD || (d === bestD && activeIds.includes(t.id) && !activeIds.includes(best ?? ""));
    if (better) {
      best = t.id;
      bestD = d;
    }
  }
  return best;
}

/** Centre-based square hit rect (jacks 88, dials 120). */
export function squareAt(id: string, cx: number, cy: number, size: number): HitRect {
  return { id, x: cx - size / 2, y: cy - size / 2, w: size, h: size };
}
