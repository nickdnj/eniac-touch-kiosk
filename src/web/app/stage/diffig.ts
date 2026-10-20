// S3b plan figure for the Difference mission: the table built by adding. Each
// row's numbers come from the row above by adding the difference below them,
// which is what the four accumulators do. The numbers are computed here from
// the starting values (0, 1, 6, 6), the same ones the mission's program
// loads, so the figure cannot drift from them.

import { h } from "../ui/dom.ts";
import { button } from "../ui/overlays.ts";
import { COPY } from "../copy.ts";
import type { Figure } from "./primesfig.ts";

/** The cubes, f(x) = x^3, by the Method of Differences: f, change, next change, steady. (Stuart's own table starts 600, -89, -34, 6 and goes below zero; cubes only climb.) */
export const DIFF_START = [0, 1, 6, 6] as const;

/** `n` rows of the table, each from the one before by adding down the chain (f += d1, d1 += d2, d2 += d3). */
export function differenceTable(n: number): number[][] {
  const rows: number[][] = [];
  let [f, d1, d2, d3] = DIFF_START as unknown as number[];
  for (let i = 0; i < n; i++) {
    rows.push([f, d1, d2, d3]);
    f += d1;
    d1 += d2;
    d2 += d3;
  }
  return rows;
}

const ROWS = 5;
const STEP_MS = 2400;
const LOOP_MS = 2000 + ROWS * STEP_MS + 3000;
const num = (n: number) => String(n);

export class DifferenceFigure implements Figure {
  readonly el: HTMLElement;
  private table: HTMLElement;
  private caption: HTMLElement;
  private rows: HTMLElement[] = [];
  private data = differenceTable(ROWS);
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(reduceMotion: boolean) {
    const D = COPY.difference;
    this.table = h("div", { class: "diff-table" }, ...D.heads.map((t, i) => h("div", { class: `diff-head c${i}` }, t)));
    this.data.forEach((r, i) => {
      const cells = [String(i), ...r.map(num)].map((t, c) => h("div", { class: `diff-cell c${c}` }, t));
      this.rows.push(...cells);
      this.table.append(...cells);
    });
    this.caption = h("div", { class: "tiles-caption diff-caption", "aria-live": "polite" });
    const kids: HTMLElement[] = [this.table, this.caption];
    if (!reduceMotion) kids.push(button(COPY.tiles.again, "light outline tiles-again", () => this.play()));
    this.el = h("div", { class: "tiles diff-fig", "data-figure": "difference-plan" }, ...kids);
  }

  /** Cells of row `i` (0-based) are rows[i*5 .. i*5+4]. */
  private show(i: number, on: boolean): void {
    for (let c = 0; c < 5; c++) this.rows[i * 5 + c].classList.toggle("on", on);
  }

  private clear(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  play(): void {
    this.clear();
    this.el.classList.remove("still");
    for (let i = 0; i < ROWS; i++) this.show(i, false);
    this.caption.textContent = "";
    const D = COPY.difference;
    this.timers.push(
      setTimeout(() => {
        this.show(0, true);
        this.caption.textContent = D.start(this.data[0]);
      }, 600),
    );
    for (let i = 1; i < ROWS; i++) {
      const at = 2000 + (i - 1) * STEP_MS;
      const prev = this.data[i - 1];
      this.timers.push(setTimeout(() => (this.caption.textContent = D.add(prev[0], prev[1], this.data[i][0])), at));
      this.timers.push(setTimeout(() => this.show(i, true), at + STEP_MS / 2));
    }
    this.timers.push(setTimeout(() => (this.caption.textContent = D.only), 2000 + (ROWS - 1) * STEP_MS));
    this.timers.push(setTimeout(() => this.play(), LOOP_MS));
  }

  /** Reduced motion: the whole table at once. */
  showFinal(): void {
    this.clear();
    this.el.classList.add("still");
    for (let i = 0; i < ROWS; i++) this.show(i, true);
    this.caption.textContent = COPY.difference.only;
  }

  stop(): void {
    this.clear();
  }
}


const BARS = 6;
const BAR_MS = 1500;
const BAR_LOOP_MS = 1200 + BARS * BAR_MS + 3500;
const SCALE = 2.4; // px per unit of f(x): 125 -> 300 px, 8 -> 19 px

/**
 * S3 briefing figure: the table's values as bars, each one built from the
 * one above by adding a change that itself grows. The bars climb faster and
 * faster (the cubes: 0, 1, 8, 27, 64, 125). Numbers from differenceTable(),
 * so they are the program's.
 */
export class DifferenceBriefFigure implements Figure {
  readonly el: HTMLElement;
  private bars: HTMLElement[] = [];
  private caption: HTMLElement;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private data = differenceTable(BARS);

  constructor(reduceMotion: boolean) {
    const D = COPY.difference;
    const plot = h("div", { class: "diffb-plot" }, h("div", { class: "diffb-zero" }));
    this.data.forEach(([f, d1], i) => {
      const w = Math.round(Math.abs(f) * SCALE);
      const fill = h("div", { class: `diffb-fill ${f < 0 ? "neg" : "pos"}` });
      fill.style.width = `${w}px`;
      const val = h("span", { class: "diffb-val" }, num(f));
      if (f < 0) val.style.right = `${580 + w + 10}px`;
      else val.style.left = `${420 + w + 10}px`;
      const add = i === 0 ? null : h("span", { class: "diffb-add" }, D.change(this.data[i - 1][1]));
      const row = h("div", { class: "diffb-row" }, h("span", { class: "diffb-x" }, String(i)), h("div", { class: "diffb-lane" }, fill, val), add);
      void d1;
      this.bars.push(row);
      plot.append(row);
    });
    this.caption = h("div", { class: "tiles-caption diff-caption", "aria-live": "polite" });
    const kids: HTMLElement[] = [plot, this.caption];
    if (!reduceMotion) kids.push(button(COPY.tiles.again, "light outline tiles-again", () => this.play()));
    this.el = h("div", { class: "tiles diff-fig diffb", "data-figure": "difference-briefing" }, ...kids);
  }

  play(): void {
    this.clear();
    this.el.classList.remove("still");
    for (const r of this.bars) r.classList.remove("on");
    const D = COPY.difference;
    this.caption.textContent = "";
    this.bars.forEach((r, i) => this.timers.push(setTimeout(() => {
      r.classList.add("on");
      this.caption.textContent = i === 0 ? D.briefStart : D.briefAdd;
    }, 1200 + i * BAR_MS)));
    this.timers.push(setTimeout(() => (this.caption.textContent = D.only), 1200 + BARS * BAR_MS));
    this.timers.push(setTimeout(() => this.play(), BAR_LOOP_MS));
  }

  /** Reduced motion: every bar at once. */
  showFinal(): void {
    this.clear();
    this.el.classList.add("still");
    for (const r of this.bars) r.classList.add("on");
    this.caption.textContent = COPY.difference.only;
  }

  stop(): void {
    this.clear();
  }

  private clear(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }
}
