// The punched-cards pane, stack style (UX 8.2.5, FR-21): the newest card
// large (digits over holes), the older ones as a stack of rows, newest on
// top, a count and the latest value; optionally the per-hundred bars. Used
// by the run view and the result screen. Everything comes from app.cards,
// which only ever holds real `punch` lines.

import type { App } from "../app.ts";
import type { CardsCopy } from "../protocol.ts";
import { h, svgFromString } from "../ui/dom.ts";
import { play } from "../ui/anim.ts";
import { cardSvg } from "./cardart.ts";
import { fieldText, fillCard, fmt } from "./cards.ts";

export interface CardPaneOpts {
  rows: number; // older cards listed under the big one
  bigW: number;
  bigH: number;
  reduceMotion: boolean;
}

export class StackPane {
  readonly el: HTMLElement;
  private big: HTMLElement;
  private label: HTMLElement;
  private list: HTMLElement;
  private count: HTMLElement;
  private shown = -1;
  /** Cards closer than 1 s apart (Full) get the shorter 150 ms shift (UX 8.2.5). */
  private lastAt = 0;
  private app: App;
  private copy: CardsCopy;
  private o: CardPaneOpts;

  constructor(app: App, o: CardPaneOpts) {
    this.app = app;
    this.o = o;
    this.copy = app.mission!.content.run.cards ?? { title: "", label: "{v}", count: "{n}", empty: "" };
    this.big = h("div", { class: "card-big" });
    this.big.style.width = `${o.bigW}px`;
    this.big.style.height = `${o.bigH}px`;
    this.label = h("div", { class: "card-label" });
    this.list = h("div", { class: "card-rows" });
    this.count = h("div", { class: "card-count" });
    this.el = h("div", { class: "card-pane stack" }, h("div", { class: "pane-title" }, this.copy.title), h("div", { class: "card-slot" }, this.big), this.label, this.list, this.count);
  }

  /** Re-renders if a new card arrived (or always with force). */
  update(force = false): void {
    const log = this.app.cards;
    const spec = log.spec;
    if (!spec) return;
    if (!force && log.count === this.shown) return;
    const fresh = log.count > this.shown && this.shown >= 0;
    this.shown = log.count;
    const recent = log.recent(this.o.rows + 1);
    const newest = recent[0];
    const [first, last] = [spec.window[0], spec.window[1]];
    if (!newest) {
      this.big.replaceChildren(h("div", { class: "card-empty" }, this.copy.empty));
      this.label.textContent = "";
    } else {
      const v = log.valueOf(newest);
      this.big.replaceChildren(svgFromString(cardSvg(newest.text, { w: this.o.bigW, h: this.o.bigH, first, last })) as unknown as HTMLElement);
      this.big.dataset.n = String(newest.n);
      this.label.textContent = fillCard(this.copy.label, { n: newest.n, v: v === null ? fieldText(newest, spec.value).trim() : fmt(v) });
      const now = performance.now();
      const gap = now - this.lastAt;
      this.lastAt = now;
      if (fresh && !this.o.reduceMotion) void play(this.big, [{ transform: "translateY(-30px)", opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: gap < 1000 ? 150 : 300, easing: "ease-out" });
    }
    this.list.replaceChildren(
      ...recent.slice(1).map((c) => h("div", { class: "card-row", "data-n": c.n }, h("span", { class: "card-row-text" }, `...${fieldText(c, spec.value)}`))),
    );
    const latest = newest ? log.valueOf(newest) : null;
    const parts = [fillCard(this.copy.count, { n: log.count })];
    if (this.copy.latest && latest !== null) parts.push(fillCard(this.copy.latest, { v: fmt(latest) }));
    this.count.textContent = parts.join("   ");
  }
}

/** The per-hundred bars (UX 8.2.5 "primes per hundred"). */
export class BarsPane {
  readonly el: HTMLElement;
  private bars: HTMLElement[] = [];
  private app: App;
  private shown = -1;

  constructor(app: App, width: number, height: number) {
    this.app = app;
    const spec = app.cards.spec?.bars;
    const n = app.cards.bars.length;
    const box = h("div", { class: "bars" });
    box.style.height = `${height}px`;
    const gap = 4;
    const bw = Math.max(4, Math.floor((width - (n - 1) * gap) / Math.max(1, n)));
    for (let i = 0; i < n; i++) {
      const b = h("div", { class: "bar", "data-i": i });
      b.style.width = `${bw}px`;
      box.append(b);
      this.bars.push(b);
    }
    const ticks = h("div", { class: "bar-ticks" });
    if (spec) {
      const labels = [spec.per === 100 ? 3 : 1, 1000, 2000, spec.upTo].filter((v, i, a) => v <= spec.upTo && a.indexOf(v) === i);
      for (const v of labels) {
        const t = h("span", { class: "bar-tick" }, fmt(v));
        t.style.left = `${Math.min(width - 90, Math.max(0, ((v - 1) / spec.upTo) * width - (v === spec.upTo ? 90 : 0)))}px`;
        ticks.append(t);
      }
    }
    this.el = h("div", { class: "bars-pane" }, h("div", { class: "pane-title" }, app.mission?.content.run.cards?.bars ?? ""), box, ticks);
    this.el.style.width = `${width}px`;
  }

  update(): void {
    const log = this.app.cards;
    if (log.count === this.shown) return;
    this.shown = log.count;
    const max = Math.max(25, ...log.bars);
    log.bars.forEach((v, i) => {
      const b = this.bars[i];
      if (!b) return;
      b.style.height = `${Math.round((v / max) * 100)}%`;
      b.dataset.v = String(v);
    });
  }
}
