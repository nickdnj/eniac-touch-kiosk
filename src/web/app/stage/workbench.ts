// L1 Workbench (UX 4.2): the mission's units lined up (Squares: Init,
// Constant, Acc 1, Acc 2; Primes: Init, Constant, Acc 1, Master Programmer;
// Trajectory: Init, Printer, Acc 19, Master Programmer), data trunk rail on
// top, program trunk rail below, live lamp bands, and the cables that are
// really in the machine. Context only: it never takes taps.

import type { CompiledMission, ConfigItem } from "../protocol.ts";
import {
  accumulatorPanel,
  constantPanel,
  dataTrunkRail,
  initiatingPanel,
  masterProgrammerPanel,
  printerPanel,
  programTrunkRail,
  CARD_W,
  DATA_TRUNKS,
  PROGRAM_TRUNKS,
  type Panel,
} from "../panels/art.ts";
import { setDial } from "../panels/load.ts";
import { play } from "../ui/anim.ts";
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
  /** Start the draw-in later (S5 staggers all cables on one timeline). */
  delay?: number;
  pending?: boolean;
}

/** What a mission's Workbench shows: four unit cards and the trunks. */
export interface WorkbenchPlan {
  units: string[];
  data: string[];
  program: string[];
}

const UNIT_RANK = (u: string): number => (u === "i" ? 0 : u === "c" ? 1 : u === "pr" ? 2 : /^a\d+$/.test(u) ? 3 + Number(u.slice(1)) / 100 : u === "p" ? 4 : 5);
const isTrunk = (t: string) => /^\d+(-\d+)?$/.test(t);
const unitOfTerm = (t: string) => t.slice(0, t.indexOf("."));
const trunkSort = (a: string, b: string) => {
  const [x1, y1] = a.split("-").map(Number), [x2, y2] = b.split("-").map(Number);
  return x1 - x2 || (y1 ?? 0) - (y2 ?? 0);
};

/**
 * Pure: the Workbench for a mission. Units are those the visitor steps
 * touch (UX 4.2: four 300 px cards), in machine order (Init, Constant,
 * Printer, accumulators, Master Programmer); trunks are the step trunks plus
 * the trunks of preset cables that land on those units, as many as the
 * rails hold (data 4, program 7), step trunks first.
 */
export function workbenchPlan(mission: Pick<CompiledMission, "steps" | "config">): WorkbenchPlan {
  const units = new Set<string>();
  const stepData = new Set<string>(), stepProg = new Set<string>();
  for (const st of mission.steps) {
    const ends = st.kind === "plug" ? [st.from, st.to] : [st.switch];
    for (const t of ends) {
      if (isTrunk(t)) (t.includes("-") ? stepProg : stepData).add(t);
      else units.add(unitOfTerm(t));
    }
  }
  const list = [...units].sort((a, b) => UNIT_RANK(a) - UNIT_RANK(b)).slice(0, 4);
  const data = new Set(stepData), program = new Set(stepProg);
  const more = { data: new Set<string>(), program: new Set<string>() };
  for (const c of mission.config) {
    if (c.kind !== "plug") continue;
    const [t, j] = isTrunk(c.from) ? [c.from, c.to] : [c.to, c.from];
    if (!isTrunk(t) || isTrunk(j) || !list.includes(unitOfTerm(j))) continue;
    (t.includes("-") ? more.program : more.data).add(t);
  }
  for (const t of [...more.data].sort(trunkSort)) if (data.size < 4) data.add(t);
  for (const t of [...more.program].sort(trunkSort)) if (program.size < 7) program.add(t);
  // Keep the Squares rails exactly as approved (1-3 and 1-1..1-5).
  const fill = (set: Set<string>, base: string[], max: number) => {
    for (const t of base) if (set.size < max && !set.has(t) && set.size < base.length) set.add(t);
  };
  fill(data, DATA_TRUNKS, 4);
  fill(program, PROGRAM_TRUNKS, 7);
  return { units: list, data: [...data].sort(trunkSort), program: [...program].sort(trunkSort) };
}

function unitPanel(u: string): Panel | null {
  if (u === "i") return initiatingPanel();
  if (u === "c") return constantPanel();
  if (u === "p") return masterProgrammerPanel();
  if (u === "pr") return printerPanel();
  if (/^a\d+$/.test(u)) return accumulatorPanel(Number(u.slice(1)));
  return null;
}

export class Workbench {
  readonly el: HTMLElement;
  readonly plan: WorkbenchPlan;
  private cableLayer: SVGSVGElement;
  private placed = new Map<string, Placed>();
  private cables = new Map<string, SVGGElement>();
  private laneUse = new Map<number, number>();
  private tagBoxes: { x: number; y: number; w: number; h: number }[] = [];
  private cardX: Record<string, number> = {};

  constructor(plan: WorkbenchPlan = { units: ["i", "c", "a1", "a2"], data: DATA_TRUNKS, program: PROGRAM_TRUNKS }) {
    this.plan = plan;
    this.el = h("div", { class: "workbench" });
    const dr = dataTrunkRail(false, plan.data);
    const pr = programTrunkRail(false, plan.program);
    this.add("trunks-data", dr, WB.dataRail.x, WB.dataRail.y, "rail");
    plan.units.forEach((u, i) => {
      const p = unitPanel(u);
      if (!p) return;
      this.cardX[u] = WB.cardXs[i];
      this.add(u, p, WB.cardXs[i], WB.cardsY, "card");
    });
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
    const cards = Object.values(this.cardX);
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

  private route(item: Extract<ConfigItem, { kind: "plug" }>): { d: string; ends: { x: number; y: number; tag: string; hub?: boolean }[] } | null {
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
          { x: x + 4, y: ty, tag: "", hub: true },
        ],
      };
    }
    // Data: drop, swing to the card gutter, run up to the data rail.
    const g = this.gutter(j.x);
    return {
      d: `M${j.x} ${j.y}C${j.x} ${j.y + 70} ${g} ${j.y + 70} ${g} ${j.y - 10}L${g} ${ty}`,
      ends: [
        { x: j.x, y: j.y - 28, tag: name },
        { x: g, y: ty, tag: "", hub: true },
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
      if (e.hub) g.append(s("circle", { cx: e.x, cy: e.y, r: 12, class: "cable-hub" }), s("circle", { cx: e.x, cy: e.y, r: 12, class: "cable-hub-ring" }));
      g.append(s("circle", { cx: e.x, cy: e.y, r: e.hub ? 6.5 : 7, class: "cable-plug" }));
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
    // The cable is already fully drawn; the draw-in is decoration (ui/anim.ts).
    if (!o.animate) return Promise.resolve();
    const ms = o.ms ?? 600;
    const delay = o.delay ?? 0;
    const runs: Promise<void>[] = [];
    for (const p of [outline, core] as SVGPathElement[]) {
      const len = p.getTotalLength();
      runs.push(
        play(p, [{ strokeDasharray: `${len} ${len}`, strokeDashoffset: len }, { strokeDasharray: `${len} ${len}`, strokeDashoffset: 0 }], {
          duration: ms,
          delay,
          easing: "ease-in-out",
          fill: "backwards",
        }),
      );
    }
    g.querySelectorAll(".cable-tag, .cable-plug, .cable-hub, .cable-hub-ring").forEach((t) =>
      runs.push(play(t, [{ opacity: 0 }, { opacity: 0, offset: 0.8 }, { opacity: 1 }], { duration: ms, delay, fill: "backwards" })),
    );
    return Promise.all(runs).then(() => undefined);
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
    const x = this.cardX[unit] ?? STAGE.w / 2 - CARD_W / 2;
    const ox = x + CARD_W / 2;
    void play(this.el, [{ transform: "scale(1)", transformOrigin: `${ox}px 420px` }, { transform: "scale(1.06)", transformOrigin: `${ox}px 420px`, offset: 0.5 }, { transform: "scale(1)", transformOrigin: `${ox}px 420px` }], {
      duration: 800,
      easing: "ease-in-out",
    });
  }
}
