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


const SVGNS = "http://www.w3.org/2000/svg";
const FACES = ["#8fd0f2", "#3c8fc0", "#2a6a94"]; // top, right, left: the data-cable blue, lit from above

/** An n x n x n stack of little blocks as an isometric drawing. Cubes are in painter's order (bottom up, back to front), so showing them in array order builds the block up. */
export function blockCube(n: number, unit: number, cx: number, cy: number): { svg: SVGSVGElement; blocks: SVGGElement[] } {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 1200 386");
  svg.setAttribute("class", "diffb-blocks");
  svg.setAttribute("aria-hidden", "true");
  const P = (x: number, y: number, z: number) => `${cx + (x - y) * unit * 0.866},${cy + (x + y) * unit * 0.5 - z * unit}`;
  const face = (g: SVGGElement, pts: string[], fill: string) => {
    const e = document.createElementNS(SVGNS, "polygon");
    e.setAttribute("points", pts.join(" "));
    e.setAttribute("fill", fill);
    e.setAttribute("stroke", "#101215");
    e.setAttribute("stroke-width", "3");
    e.setAttribute("stroke-linejoin", "round");
    g.appendChild(e);
  };
  const blocks: SVGGElement[] = [];
  for (let z = 0; z < n; z++)
    for (let d = 0; d <= 2 * (n - 1); d++)
      for (let x = 0; x < n; x++) {
        const y = d - x;
        if (y < 0 || y >= n) continue;
        const g = document.createElementNS(SVGNS, "g");
        face(g, [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], FACES[0]);
        face(g, [P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)], FACES[1]);
        face(g, [P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], FACES[2]);
        g.setAttribute("class", "diffb-block");
        svg.appendChild(g);
        blocks.push(g);
      }
  return { svg, blocks };
}

const BLOCK_STEP_MS = 210;       // one little block of the 2 x 2 x 2 appears
const BLOCK_STEP3_MS = 85;       // ... and of the 3 x 3 x 3
const CUBE2_AT = 600;
const CUBE3_AT = CUBE2_AT + 8 * BLOCK_STEP_MS + 2400;
const BARS_AT = CUBE3_AT + 27 * BLOCK_STEP3_MS + 2800;

const BARS = 6;
const BAR_MS = 1500;
const BAR_LOOP_MS = BARS_AT + 1200 + BARS * BAR_MS + 3500;
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
  private plot: HTMLElement;
  private cube2: { svg: SVGSVGElement; blocks: SVGGElement[] };
  private cube3: { svg: SVGSVGElement; blocks: SVGGElement[] };
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
    this.plot = plot;
    this.cube2 = blockCube(2, 88, 600, 193);
    this.cube3 = blockCube(3, 58, 600, 193);
    const stage = h("div", { class: "diffb-stage" }, plot);
    stage.append(this.cube2.svg as unknown as Node, this.cube3.svg as unknown as Node);
    this.caption = h("div", { class: "tiles-caption diff-caption", "aria-live": "polite" });
    const kids: HTMLElement[] = [stage, this.caption];
    if (!reduceMotion) kids.push(button(COPY.tiles.again, "light outline tiles-again", () => this.play()));
    this.el = h("div", { class: "tiles diff-fig diffb", "data-figure": "difference-briefing" }, ...kids);
  }

  play(): void {
    this.clear();
    this.el.classList.remove("still");
    for (const r of this.bars) r.classList.remove("on");
    for (const g of [...this.cube2.blocks, ...this.cube3.blocks]) g.classList.remove("on");
    this.plot.classList.add("hidden");
    this.cube2.svg.classList.remove("hidden");
    this.cube3.svg.classList.add("hidden");
    const D = COPY.difference;
    const at = (ms: number, fn: () => void) => this.timers.push(setTimeout(fn, ms));
    this.caption.textContent = "";
    // A cube, as blocks: 2 x 2 x 2, then 3 x 3 x 3.
    at(CUBE2_AT - 300, () => (this.caption.textContent = D.cubeIs));
    this.cube2.blocks.forEach((g, i) => at(CUBE2_AT + i * BLOCK_STEP_MS, () => g.classList.add("on")));
    at(CUBE2_AT + 8 * BLOCK_STEP_MS, () => (this.caption.textContent = D.cube(2)));
    at(CUBE3_AT - 400, () => this.cube2.svg.classList.add("hidden"));
    at(CUBE3_AT, () => {
      this.cube3.svg.classList.remove("hidden");
      this.caption.textContent = D.cubeIs;
    });
    this.cube3.blocks.forEach((g, i) => at(CUBE3_AT + i * BLOCK_STEP3_MS, () => g.classList.add("on")));
    at(CUBE3_AT + 27 * BLOCK_STEP3_MS, () => (this.caption.textContent = D.cube(3)));
    // Then the table of cubes, by adding.
    at(BARS_AT - 400, () => this.cube3.svg.classList.add("hidden"));
    at(BARS_AT, () => this.plot.classList.remove("hidden"));
    this.bars.forEach((r, i) => at(BARS_AT + 1200 + i * BAR_MS, () => {
      r.classList.add("on");
      this.caption.textContent = i === 0 ? D.briefStart : D.briefAdd;
    }));
    at(BARS_AT + 1200 + BARS * BAR_MS, () => (this.caption.textContent = D.only));
    at(BAR_LOOP_MS, () => this.play());
  }

  /** Reduced motion: every bar at once. */
  showFinal(): void {
    this.clear();
    this.el.classList.add("still");
    this.plot.classList.remove("hidden");
    this.cube2.svg.classList.add("hidden");
    this.cube3.svg.classList.add("hidden");
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
