// The "today's best" plate at the bottom of a game title screen, and the read of the score list that
// fills it. (Shared by the game title figures; Battleship's art is in battleshipfig.ts. Gunnery, the flag
// game this grew from, was removed on 2026-10-24.)

import { fetchScores } from "../net/api.ts";

const CREAM = "#F4EFE3";
const MUSTARD = "#F2B632";
const INK = "#1B1D21";

/** The "today's best" plate (markup), at the bottom of a title figure. `right` is its small right-hand line. */
export function scorePlate(right: string): string {
  let b = `<rect x="120" y="752" width="1120" height="124" rx="22" fill="${INK}" stroke="${CREAM}" stroke-width="6"/>`;
  b += `<text x="200" y="800" class="gf-label" fill="${MUSTARD}">TODAY'S BEST</text>`;
  for (let i = 0; i < 4; i++) b += `<rect x="${200 + i * 78}" y="814" width="64" height="44" rx="6" fill="${CREAM}"/>`;
  b += `<text class="gf-digits" data-best="" fill="${INK}" x="232" y="850" text-anchor="middle">-</text>`;
  b += `<text x="540" y="850" class="gf-who" data-who="" fill="${CREAM}"></text>`;
  b += `<text x="1180" y="800" text-anchor="end" class="gf-label" fill="${CREAM}">ONE PLAYER</text><text x="1180" y="848" text-anchor="end" class="gf-small" data-note="" fill="${MUSTARD}">${right}</text>`;
  return b;
}

/** Fills the plate from the mission's score list: today's best in the windows, with its initials. */
export async function fillBest(svg: SVGSVGElement, mission: string): Promise<void> {
  const b = await fetchScores(mission);
  const top = b?.today[0];
  const best = svg.querySelector("[data-best]");
  const who = svg.querySelector("[data-who]");
  if (!best || !who) return;
  if (!top) {
    who.setAttribute("class", "gf-who-first");
    who.textContent = "BE THE FIRST";
    return;
  }
  [...String(top.score).padStart(4, "0").slice(-4)].forEach((d, i) => {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(232 + i * 78));
    t.setAttribute("y", "850");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("class", "gf-digits");
    t.setAttribute("fill", INK);
    t.textContent = d;
    best.parentNode!.insertBefore(t, best);
  });
  best.textContent = "";
  who.textContent = top.name;
  // Up to eight letters share the plate with the right-hand line: squeeze the long ones to fit.
  if (top.name.length > 5) {
    who.setAttribute("textLength", String(Math.min(top.name.length * 44, 330)));
    who.setAttribute("lengthAdjust", "spacingAndGlyphs");
  }
}
