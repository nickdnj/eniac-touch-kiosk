// L1 Workbench (UX 4.2): Init, Constant, Acc 1, Acc 2 lined up, data trunk
// rail on top, program trunk rail below, live lamp bands, and the cables
// that are really in the machine. Context only: it never takes taps.

import type { ConfigItem } from "../protocol.ts";
import {
  accumulatorPanel,
  constantPanel,
  dataTrunkRail,
  initiatingPanel,
  programTrunkRail,
  CARD_W,
  type Panel,
} from "../panels/art.ts";
import { setDial } from "../panels/load.ts";
import { h, s, svgFromString } from "../ui/dom.ts";
import { termId, switchId, unitOf } from "../mission/ids.ts";
import { STAGE, WB } from "./layout.ts";
import { COPY } from "../copy.ts";

interface Placed {
  panel: Panel;
  x: number;
  y: number;
}

export interface CableOpts {
  animate?: boolean;
  ms?: number;
  pending?: boolean;
}

export class Workbench {
  readonly el: HTMLElement;
  private cableLayer: SVGSVGElement;
  private placed = new Map<string, Placed>();
  private cables = new Map<string, SVGGElement>();
  private laneUse = new Map<number, number>();
  private tagBoxes: { x: number; y: number; w: number; h: number }[] = [];

  constructor() {
    this.el = h("div", { class: "workbench" });
    const dr = dataTrunkRail();
    const pr = programTrunkRail();
    this.add("trunks-data", dr, WB.dataRail.x, WB.dataRail.y, "rail");
    const units: [string, Panel][] = [
      ["i", initiatingPanel()],
      ["c", constantPanel()],
      ["a1", accumulatorPanel(1)],
      ["a2", accumulatorPanel(2)],
    ];
    for (const [u, p] of units) this.add(u, p, WB.cardX[u], WB.cardsY, "card");
    this.add("trunks-program", pr, WB.programRail.x, WB.programRail.y, "rail");
    this.el.append(h("div", { class: "wb-caption" }, COPY.rail.workbench));
    this.cableLayer = svgFromString(
      `<svg xmlns="http://www.w3.org/2000/svg" class="cable-layer" viewBox="0 0 ${STAGE.w} ${STAGE.h}" width="${STAGE.w}" height="${STAGE.h}"></svg>`,
    );
    this.el.append(this.cableLayer);
  }

  private add(key: string, p: Panel, x: number, y: number, cls: string): void {
    const svg = svgFromString(p.markup);
    const wrap = h("div", { class: `wb-${cls} wb-${key}`, "data-unit": key });
    wrap.style.left = `${x}px`;
    wrap.style.top = `${y}px`;
    wrap.append(svg);
    this.el.append(wrap);
    this.placed.set(key, { panel: p, x, y });
  }

  /** Element for a unit card (for framing and spotlight). */
  unitEl(unit: string): HTMLElement | null {
    return this.el.querySelector(`[data-unit="${unit}"]`);
  }

  /** Stage-local centre of a jack. */
  jackPos(id: string): { x: number; y: number } | null {
    const unit = unitOf(id);
    const pl = this.placed.get(unit);
    const g = pl?.panel.geom.jacks[id];
    if (!pl || !g) return null;
    return { x: pl.x + g.x, y: pl.y + g.y };
  }

  private trunkY(id: string): number | null {
    for (const k of ["trunks-data", "trunks-program"]) {
      const pl = this.placed.get(k)!;
      const t = pl.panel.geom.trunks[id];
      if (t) return pl.y + t.y;
    }
    return null;
  }

  setSwitch(sw: string, value: string, animate = false): void {
    setDial(this.el, switchId(sw), value, animate);
  }

  /** Card gutter to route a cable up/down beside a card, with lanes. */
  private gutter(jackX: number): number {
    const cards = Object.values(WB.cardX);
    let best = 0;
    let bestD = Infinity;
    for (const cx of cards) {
      for (const g of [cx - 20, cx + CARD_W + 20]) {
        const d = Math.abs(g - jackX);
        if (d < bestD) {
          bestD = d;
          best = g;
        }
      }
    }
    const n = this.laneUse.get(best) ?? 0;
    this.laneUse.set(best, n + 1);
    return best + (n % 2 === 0 ? 1 : -1) * Math.ceil(n / 2) * 7;
  }

  private route(item: Extract<ConfigItem, { kind: "plug" }>): { d: string; ends: { x: number; y: number; tag: string }[] } | null {
    const a = termId(item.from), b = termId(item.to);
    const aIsTrunk = a.startsWith("trunk:"), bIsTrunk = b.startsWith("trunk:");
    if (aIsTrunk && bIsTrunk) return null;
    if (!aIsTrunk && !bIsTrunk) {
      const p = this.jackPos(a), q = this.jackPos(b);
      if (!p || !q) return null;
      const sag = 110;
      return {
        d: `M${p.x} ${p.y}C${p.x + 10} ${p.y + sag} ${q.x - 10} ${q.y + sag} ${q.x} ${q.y}`,
        ends: [
          { x: p.x, y: p.y, tag: item.from.split(".")[1] ?? "" },
          { x: q.x, y: q.y, tag: item.to.split(".")[1] ?? "" },
        ],
      };
    }
    const trunk = aIsTrunk ? a : b;
    const jack = aIsTrunk ? b : a;
    const j = this.jackPos(jack);
    const ty = this.trunkY(trunk);
    if (!j || ty === null) return null;
    const name = trunk.slice(6);
    if (item.cable === "program") {
      // Program jacks sit low on the card: drop straight to the program rail.
      const x = j.x;
      return {
        d: `M${x} ${j.y}C${x} ${j.y + 40} ${x + 4} ${ty - 40} ${x + 4} ${ty}`,
        ends: [
          { x: j.x, y: j.y - 26, tag: name },
          { x: x + 4, y: ty, tag: "" },
        ],
      };
    }
    // Data: drop, swing to the card gutter, run up to the data rail.
    const g = this.gutter(j.x);
    return {
      d: `M${j.x} ${j.y}C${j.x} ${j.y + 70} ${g} ${j.y + 70} ${g} ${j.y - 10}L${g} ${ty}`,
      ends: [
        { x: j.x, y: j.y - 28, tag: name },
        { x: g, y: ty, tag: "" },
      ],
    };
  }

  hasCable(key: string): boolean {
    return this.cables.has(key);
  }

  /** Draws a cable for a config item (UX 6.3). Resolves when drawn. */
  addCable(item: Extract<ConfigItem, { kind: "plug" }>, o: CableOpts = {}): Promise<void> {
    const key = `${item.from}>${item.to}`;
    if (this.cables.has(key)) {
      this.cables.get(key)!.classList.toggle("pending", !!o.pending);
      return Promise.resolve();
    }
    const r = this.route(item);
    if (!r) return Promise.resolve();
    const g = s("g", { class: `cable ${item.cable}${o.pending ? " pending" : ""}`, "data-cable": key }) as SVGGElement;
    const outline = s("path", { d: r.d, class: "cable-outline" });
    const core = s("path", { d: r.d, class: "cable-core" });
    g.append(outline, core);
    for (const e of r.ends) {
      g.append(s("circle", { cx: e.x, cy: e.y, r: 7, class: "cable-plug" }));
    }
    for (const e of r.ends) {
      if (!e.tag) continue;
      const w = 14 + e.tag.length * 15;
      // Skip a tag that would sit on top of another one (dense preset
      // fan-outs); the cable colour and the rail still say where it goes.
      const box = { x: e.x - w / 2, y: e.y - 36, w, h: 30 };
      if (this.tagBoxes.some((t) => t.x < box.x + box.w + 4 && box.x < t.x + t.w + 4 && t.y < box.y + box.h + 4 && box.y < t.y + t.h + 4)) continue;
      this.tagBoxes.push(box);
      const tag = s("g", { class: "cable-tag" });
      tag.append(
        s("rect", { x: e.x - w / 2, y: e.y - 36, width: w, height: 30, rx: 6 }),
        s("text", { x: e.x, y: e.y - 13, "text-anchor": "middle" }, e.tag),
      );
      g.append(tag);
    }
    this.cableLayer.append(g);
    this.cables.set(key, g);
    if (!o.animate) return Promise.resolve();
    const ms = o.ms ?? 600;
    const anims: Animation[] = [];
    for (const p of [outline, core] as SVGPathElement[]) {
      const len = p.getTotalLength();
      anims.push(
        p.animate([{ strokeDasharray: `${len} ${len}`, strokeDashoffset: len }, { strokeDasharray: `${len} ${len}`, strokeDashoffset: 0 }], {
          duration: ms,
          easing: "ease-in-out",
        }),
      );
    }
    g.querySelectorAll(".cable-tag, .cable-plug").forEach((t) =>
      anims.push((t as SVGElement).animate([{ opacity: 0 }, { opacity: 0, offset: 0.8 }, { opacity: 1 }], { duration: ms })),
    );
    return Promise.all(anims.map((a) => a.finished)).then(() => undefined);
  }

  setPending(item: Extract<ConfigItem, { kind: "plug" }>, pending: boolean): void {
    this.cables.get(`${item.from}>${item.to}`)?.classList.toggle("pending", pending);
  }

  /** Spotlight: dim everything except the given units (UX 4.3 step 2). */
  spotlight(units: string[] | null): void {
    this.el.classList.toggle("dimmed", units !== null);
    this.el.querySelectorAll<HTMLElement>("[data-unit]").forEach((e) => e.classList.toggle("lit", !!units?.includes(e.dataset.unit!)));
  }

  /** Brief framing zoom toward a unit (UX 4.3 step 1, 400 ms). */
  frame(unit: string | null, reduceMotion: boolean): void {
    if (reduceMotion || !unit) return;
    const x = WB.cardX[unit] ?? STAGE.w / 2 - CARD_W / 2;
    const ox = x + CARD_W / 2;
    this.el.animate([{ transform: "scale(1)", transformOrigin: `${ox}px 420px` }, { transform: "scale(1.06)", transformOrigin: `${ox}px 420px`, offset: 0.5 }, { transform: "scale(1)", transformOrigin: `${ox}px 420px` }], {
      duration: 800,
      easing: "ease-in-out",
    });
  }
}
