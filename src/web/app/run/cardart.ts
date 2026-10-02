// Punched-card graphic (UX 8.2.5 "card graphic", FR-21). Pure string
// builder, no DOM. A cream card with the top-left corner cut; a window of
// columns on a torn left edge when it does not start at column 1; the
// characters printed along the top margin above their columns; 12 rows
// (12, 11, 0..9) with a dark hole where each character is punched. The
// text is always a real `punch` line: this module never makes a card up.

import { CARD_ROWS, columns, holeRow } from "./cards.ts";

export interface CardArtOpts {
  w: number;
  h: number;
  first: number; // first column shown (1-based)
  last: number;
  /** Columns to emphasise (e.g. the hop number), 1-based. */
  mark?: number[];
  cls?: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** SVG markup of one card. */
export function cardSvg(text: string, o: CardArtOpts): string {
  const { w, h, first, last } = o;
  const cols = columns(text, first, last);
  const n = cols.length;
  const padL = first > 1 ? 14 : 8, padR = 8, top = Math.round(h * 0.17), bottom = 6;
  const pitch = (w - padL - padR) / n;
  const rowH = (h - top - bottom) / CARD_ROWS.length;
  const cut = Math.min(18, h * 0.14);
  // Torn left edge (a zig-zag) when columns are cut off on the left.
  let edge = `M${cut} 0H${w}V${h}H0`;
  if (first > 1) {
    const teeth = 12;
    for (let i = teeth; i >= 0; i--) edge += `L${i % 2 ? 5 : 0} ${(h * i) / teeth}`;
    edge += "Z";
  } else edge += `V${cut}Z`;
  let b = `<path d="${edge}" fill="#F4EFE3" stroke="#B9AE8C" stroke-width="1.5"/>`;
  const digitSize = Math.max(7, Math.min(pitch * 0.95, top * 0.8));
  const tiny = Math.max(5, Math.min(pitch * 0.62, rowH * 0.8));
  cols.forEach((ch, i) => {
    const cx = padL + pitch * (i + 0.5);
    const col = first + i;
    if (o.mark?.includes(col)) b += `<rect x="${(cx - pitch / 2).toFixed(1)}" y="1" width="${pitch.toFixed(1)}" height="${h - 2}" fill="#F0E442" opacity=".28"/>`;
    if (ch.trim()) b += `<text x="${cx.toFixed(1)}" y="${(top * 0.78).toFixed(1)}" font-family="IBM Plex Mono, monospace" font-size="${digitSize.toFixed(1)}" font-weight="700" fill="#1B1D21" text-anchor="middle">${esc(ch)}</text>`;
    const hole = holeRow(ch);
    CARD_ROWS.forEach((r, k) => {
      const cy = top + rowH * (k + 0.5);
      if (r === hole) {
        b += `<rect class="hole" data-col="${col}" data-row="${r}" x="${(cx - pitch * 0.28).toFixed(1)}" y="${(cy - rowH * 0.36).toFixed(1)}" width="${(pitch * 0.56).toFixed(1)}" height="${(rowH * 0.72).toFixed(1)}" rx="1" fill="#1B1D21"/>`;
      } else if (k >= 2 && pitch >= 7) {
        b += `<text x="${cx.toFixed(1)}" y="${(cy + tiny * 0.36).toFixed(1)}" font-family="IBM Plex Mono, monospace" font-size="${tiny.toFixed(1)}" fill="#B3A988" text-anchor="middle">${r}</text>`;
      }
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" class="card-art${o.cls ? " " + o.cls : ""}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" data-cols="${first}-${last}">${b}</svg>`;
}

/** Holes of a card as "col:row" strings (tests). */
export function holesOf(text: string, first: number, last: number): string[] {
  const out: string[] = [];
  columns(text, first, last).forEach((ch, i) => {
    const r = holeRow(ch);
    if (r) out.push(`${first + i}:${r}`);
  });
  return out;
}
