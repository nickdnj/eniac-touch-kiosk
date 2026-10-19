// S3b plan figure for the Difference mission: the table built by adding. Each
// row's numbers come from the row above by adding the difference below them,
// which is what the four accumulators do. The numbers are computed here from
// the starting values (600, -89, -34, 6), the same ones the mission's program
// loads, so the figure cannot drift from them.

import { h } from "../ui/dom.ts";
import { button } from "../ui/overlays.ts";
import { COPY } from "../copy.ts";
import type { Figure } from "./primesfig.ts";

/** f(x) = x^3 - 20x^2 - 70x + 600 by the Method of Differences: f, change, next change, steady. */
export const DIFF_START = [600, -89, -34, 6] as const;

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
