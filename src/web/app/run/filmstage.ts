// S6 run stage for a card mission with a plot and a film strip
// (Trajectory, UX 8.3.5): the arc drawn from the real punched cards, the
// helper readouts (Acc 15, 18, 20, 6, 4), the newest card large, the units
// at work (multiplier, function table 2, the H stepper) and the last cards
// as a film strip (tap one to see it large; the newest returns after 10 s).
// Before the first card the arc area shows the card reader with the real
// card from demo.card (the mission's pinned input file), never demo data.
// No units (feet, seconds) anywhere until they are fact-checked.

import type { App } from "../app.ts";
import type { PlotCopy, PunchCard } from "../protocol.ts";
import { ftRingStrip, mpStrip, multiplierStrip } from "../panels/art.ts";
import { h, s, svgFromString } from "../ui/dom.ts";
import { onTap } from "../ui/tap.ts";
import { play } from "../ui/anim.ts";
import { LampRenderer } from "../lamps/render.ts";
import { cardSvg } from "./cardart.ts";
import { cardValue, fieldText, fillCard, fmt, type CardLog, type Dot } from "./cards.ts";
import type { RunStage } from "./stackstage.ts";
import { COPY } from "../copy.ts";
import { FEET, judge, shotSpeeds } from "../game/logic.ts";
import { drawArmyTarget, drawBurst, drawFlag, drawShip, drawZones, outerFeet } from "../game/zones.ts";
import type { Game } from "../../../bridge/internal/mission/mission.gen.ts";

/** How long a tapped film-strip card stays large before the newest returns. */
export const FILM_HOLD_MS = 10_000;
/** Film-strip cards on screen: 64 px wide with 16 px gaps fit 16 across the stage. */
export const FILM_KEEP = 16;

export interface Scale {
  xMax: number;
  yMax: number;
  stretch: number; // how much more a unit of height is drawn than a unit of along
}

/**
 * Pure: plot scales that only ever grow (the arc never jumps around), with
 * a little headroom. Along and Up get their own scales so a flat flight is
 * readable; `stretch` says how much the height is stretched (UX 8.3.3:
 * "Height stretched so you can see it").
 */
export function plotScale(dots: Dot[], w: number, ht: number, prev: Scale | null = null, minX = 0): Scale {
  const nice = (v: number) => {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
    return 10 * p;
  };
  const xs = dots.map((d) => d.x).concat(minX > 0 ? [minX] : []), ys = dots.map((d) => d.y);
  const xMax = Math.max(prev?.xMax ?? 0, nice(Math.max(1, ...xs) * 1.08));
  const yMax = Math.max(prev?.yMax ?? 0, nice(Math.max(1, ...ys) * 1.12));
  const stretch = (ht / yMax) / (w / xMax);
  return { xMax, yMax, stretch };
}

/**
 * Where an ArcPlot reads its cards and labels. Default: the visitor's
 * mission (app.cards, mission.content.run.plot); live attract passes the
 * attract flight's log (app.attract), which is never the visitor's.
 */
export interface ArcSource {
  log: () => CardLog;
  copy: PlotCopy;
}

/** The arc on graph paper. Used by the run view, the result screen and live attract (S1). */
export class ArcPlot {
  readonly el: HTMLElement;
  private svg: SVGSVGElement;
  private layer: SVGGElement;
  private chip: HTMLElement;
  private note!: HTMLElement;
  private scale: Scale | null = null;
  private shown = -1;
  private shownLog: CardLog | null = null;
  private src: ArcSource;
  private app: App;
  private game: Game | null = null; // Gunnery: the flag and the zones, when this plot is the visitor's game mission
  private hud: HTMLElement | null = null;
  private w: number;
  private ht: number;
  private readonly pad: { l: number; r: number; t: number; b: number };
  onDot?: (n: number) => void;

  constructor(app: App, w: number, height: number, src?: ArcSource, pad = { l: 70, r: 30, t: 24, b: 54 }) {
    this.app = app;
    this.game = !src ? (app.mission?.content.game ?? null) : null;
    this.src = src ?? { log: () => app.cards, copy: app.mission!.content.run.plot! };
    this.pad = pad;
    this.w = w;
    this.ht = height;
    const hgt = height;
    const P = this.src.copy;
    let g = "";
    for (let x = this.pad.l; x <= w - this.pad.r; x += 40) g += `<path d="M${x} ${this.pad.t}V${hgt - this.pad.b}" class="gp-line"/>`;
    for (let y = hgt - this.pad.b; y >= this.pad.t; y -= 40) g += `<path d="M${this.pad.l} ${y}H${w - this.pad.r}" class="gp-line"/>`;
    const gy = hgt - this.pad.b;
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg" class="arc-plot" viewBox="0 0 ${w} ${hgt}" width="${w}" height="${hgt}">` +
      `<g class="gp">${g}</g>` +
      `<path d="M${this.pad.l - 20} ${gy}H${w - this.pad.r}" class="ground"/>` +
      `<g class="cannon" transform="translate(${this.pad.l} ${gy})"><g transform="rotate(-30)"><rect x="-6" y="-12" width="54" height="18" rx="5"/></g><circle cx="0" cy="4" r="15"/></g>` +
      `<g class="arc-layer"></g></svg>`;
    this.svg = svgFromString(markup);
    this.layer = this.svg.querySelector(".arc-layer") as SVGGElement;
    this.chip = h("div", { class: "stretch-chip hidden" }, P.stretch);
    this.el = h(
      "div",
      { class: "arc-panel" },
      this.svg as unknown as HTMLElement,
      h("div", { class: "axis-x" }, `${P.x} →`),
      h("div", { class: "axis-y" }, `${P.y} ↑`),
      (this.note = h("div", { class: "dot-note" }, P.dot)),
      this.chip,
    );
    if (this.game) {
      this.el.classList.add("game");
      this.hud = h("div", { class: "arc-hud" });
      this.el.append(this.hud);
    }
    this.el.style.width = `${w}px`;
    this.el.style.height = `${hgt}px`;
  }

  /** Redraws when a new card arrived (or with force). */
  update(force = false): void {
    const log = this.src.log();
    if (log !== this.shownLog) {
      // A new log (another session, or the next attract flight): its own scale.
      this.shownLog = log;
      this.scale = null;
      force = true;
    }
    if (!force && log.count === this.shown) return;
    this.shown = log.count;
    const dots = log.dots;
    const P = this.src.copy;
    this.layer.replaceChildren();
    const G = this.game;
    const tgt = G && this.app.game ? this.app.game.target : null;
    const hitFt = this.app.game?.hit ?? G?.score.hitFeet;
    const label = this.app.game?.name || G?.board.flag || "";
    if (!dots.length && tgt === null) return;
    const pw = this.w - this.pad.l - this.pad.r, ph = this.ht - this.pad.t - this.pad.b;
    // The flag and its zones are always in view: the plot is at least as wide as the farthest zone.
    this.scale = plotScale(dots, pw, ph, this.scale, G && tgt !== null ? outerFeet(G, tgt, hitFt) * FEET * 1.04 : 0);
    const X = (x: number) => this.pad.l + (x / this.scale!.xMax) * pw;
    const Y = (y: number) => this.ht - this.pad.b - (y / this.scale!.yMax) * ph;
    this.chip.classList.toggle("hidden", this.scale.stretch < 1.2);
    const cross = log.crossing();
    const gy = this.ht - this.pad.b;
    const FX = (feet: number) => X(feet * FEET);
    if (G && tgt !== null) {
      drawZones(this.layer, G, tgt, FX, gy, this.pad.t, gy + 24, hitFt);
      if (G.kind === "army") drawArmyTarget(this.layer, FX(tgt), gy, label, this.app.game?.art ?? "");
      else if (G.kind === "ship") drawShip(this.layer, FX(tgt), gy, label);
      else drawFlag(this.layer, FX(tgt), gy, label);
    }
    this.hud?.classList.toggle("hidden", !!cross);
    if (this.hud && G && tgt !== null) {
      const here = dots.length ? Math.round(dots[dots.length - 1].x / FEET) : 0;
      this.hud.textContent = `${label}: ${tgt.toLocaleString("en-US")} ft   ·   ${here.toLocaleString("en-US")} ft`;
    }
    if (!dots.length) return;
    // The path: from the cannon through every dot (above ground), then to the crossing.
    let d = `M${X(0)} ${Y(0)}`;
    for (const p of dots) if (p.y >= 0) d += `L${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`;
    if (cross) d += `L${X(cross.x).toFixed(1)} ${Y(0).toFixed(1)}`;
    this.layer.append(s("path", { d, class: "arc-line" }));
    dots.forEach((p, i) => {
      if (p.y < 0) return; // the landing card is below ground: shown as the crossing instead
      const newest = i === dots.length - 1;
      const c = s("circle", { cx: X(p.x).toFixed(1), cy: Y(p.y).toFixed(1), r: newest ? 11 : 7, class: `arc-dot${newest ? " newest" : ""}`, "data-n": p.n });
      this.layer.append(c);
      if (newest) this.layer.append(s("circle", { cx: X(p.x).toFixed(1), cy: Y(p.y).toFixed(1), r: 18, class: "arc-ring" }));
    });
    const tag = (x: number, y: number, text: string, cls: string) => {
      const w = 22 + text.length * 14;
      const g = s("g", { class: `arc-tag ${cls}` });
      g.append(s("rect", { x: x - w / 2, y: y - 58, width: w, height: 38, rx: 8 }), s("text", { x, y: y - 31, "text-anchor": "middle" }, text), s("path", { d: `M${x} ${y - 20}V${y - 10}` }));
      this.layer.append(g);
    };
    if (log.apex) tag(X(log.apex.x), Y(log.apex.y), P.apex, "apex");
    this.note.textContent = cross ? `${P.dot}  ${P.landed}: ${P.cross}.` : P.dot;
    if (cross) {
      tag(X(cross.x), Y(0), P.landed, "landed");
      this.layer.append(s("circle", { cx: X(cross.x), cy: Y(0), r: 9, class: "arc-cross" }));
      if (G && tgt !== null) {
        // Where it landed against the flag: a line along the ground, how far off, and the points.
        const landed = Math.round(cross.x / FEET);
        const res = judge(G, tgt, landed, hitFt);
        const lx = X(cross.x), fx = FX(tgt);
        this.layer.append(s("circle", { cx: lx, cy: Y(0), r: 16, class: "land-pulse" }));
        if (Math.abs(lx - fx) > 14) this.layer.append(s("path", { d: `M${lx} ${gy - 34}H${fx}M${lx} ${gy - 42}V${gy - 26}M${fx} ${gy - 42}V${gy - 26}`, class: "miss-line" }));
        if (res.hit) drawBurst(this.layer, fx, gy - 70);
        const text = res.hit ? G.board.hit : G.board.missBy.replace("{feet}", res.miss.toLocaleString("en-US")).replace("{side}", res.side === "short" ? G.board.sideShort : G.board.sideLong);
        if (!res.hit) tag((lx + fx) / 2, gy - 86, text, "miss");
        this.layer.append(s("text", { x: lx, y: gy - 175, "text-anchor": "middle", class: "score-pop" }, `+${res.score}`));
      }
    }
  }
}

/** Film strip: the newest cards, hop number and holes; tap to see one large. */
class FilmStrip {
  readonly el: HTMLElement;
  private app: App;
  private shown = -1;
  onPick?: (c: PunchCard) => void;

  constructor(app: App) {
    this.app = app;
    this.el = h("div", { class: "film-strip" });
  }

  update(): void {
    const log = this.app.cards;
    if (log.count === this.shown) return;
    this.shown = log.count;
    const spec = log.spec!;
    const hop = spec.hop ?? spec.value;
    const kids = log.recent(FILM_KEEP).map((c) => {
      const n = cardValue(c, hop);
      const el = h(
        "div",
        { class: "film-card", "data-n": c.n, role: "button" },
        h("span", { class: "film-hop" }, n === null ? fieldText(c, hop).trim() : String(n)),
        svgFromString(cardSvg(c.text, { w: 56, h: 36, first: 51, last: 80, cls: "mini" })) as unknown as HTMLElement,
      );
      onTap(el, () => this.onPick?.(c));
      return el;
    });
    this.el.replaceChildren(...kids);
  }
}

/** The card reader with the real input card, until the first card is punched. */
function readerArt(app: App): HTMLElement {
  const rc = app.mission!.readCard;
  // Gunnery: the launch speeds come from the dials, not from card fields F and G, so those two are not shown as card numbers.
  const game = app.mission!.content.game;
  const shot = game && app.game?.charge && app.game.elevation ? shotSpeeds(game, app.game.charge, app.game.elevation) : null;
  const card = rc ? (svgFromString(cardSvg(rc.text, { w: 840, h: 150, first: 1, last: game ? 50 : 70, cls: "input-card" })) as unknown as HTMLElement) : h("div", {});
  const nums = rc ? readCardNumbers(game ? rc.text.slice(0, 50) : rc.text) : [];
  return h(
    "div",
    { class: "reader-art" },
    h("div", { class: "reader-hopper" }, h("div", { class: "pane-title" }, COPY.traj.reader), card),
    nums.length ? h("div", { class: "reader-nums" }, h("span", { class: "pane-title" }, COPY.traj.onTheCard), ...nums.map((v) => h("span", { class: "reader-num" }, v))) : null,
    game && shot
      ? h(
          "div",
          { class: "reader-nums" },
          h("span", { class: "pane-title" }, game.aim.dialled),
          h("span", { class: "reader-num" }, fillCard(game.aim.across, { n: fmt(Math.round(shot.across)) })),
          h("span", { class: "reader-num" }, fillCard(game.aim.up, { n: fmt(Math.round(shot.up)) })),
        )
      : null,
  );
}

/**
 * The numbers on the input card, as the reader splits a card into
 * 10-column numbers (constant.go proccard reads 8 groups of 10 columns;
 * blank groups are skipped). Shown as written, with thousands separators.
 */
export function readCardNumbers(text: string): string[] {
  const out: string[] = [];
  for (let i = 0; i + 10 <= text.length; i += 10) {
    const t = text.slice(i, i + 10).trim();
    if (!t) continue;
    const n = Number(t);
    out.push(Number.isFinite(n) && /^-?\d+$/.test(t) ? fmt(n) : t);
  }
  return out;
}

export function filmStage(app: App, reduceMotion: boolean): RunStage {
  const mission = app.mission!;
  const T = COPY.trajRun;
  const plot = new ArcPlot(app, 1360, 400);
  const reader = readerArt(app);
  const arcBox = h("div", { class: "arc-box" }, reader, plot.el);

  // Helper readouts: the accumulators that hold the flight (UX 8.3.5).
  const ro: { acc: string; field: "hop" | "x" | "y" | ""; el: HTMLElement; box: HTMLElement }[] = [];
  const readouts = h("div", { class: "traj-readouts" });
  for (const [acc, label, field] of T.readouts) {
    const v = h("span", { class: "ro-value", "data-acc": acc }, "–");
    const box = h("div", { class: "ro" }, h("div", { class: "ro-label" }, label, h("span", { class: "ro-acc" }, T.acc(acc))), v);
    readouts.append(box);
    ro.push({ acc, field, el: v, box });
  }
  const note = h("div", { class: "traj-note" }, mission.content.run.note ?? "");

  // The big card: the newest, or the one tapped in the film strip.
  const big = h("div", { class: "card-big" });
  const bigLabel = h("div", { class: "card-label" });
  const bigBox = h("div", { class: "traj-big" }, h("div", { class: "pane-title" }, mission.content.run.cards?.title ?? ""), big, bigLabel);
  let pinned: PunchCard | null = null;
  let pinTimer: ReturnType<typeof setTimeout> | null = null;

  const units = h(
    "div",
    { class: "units-at-work" },
    h("div", { class: "pane-title" }, T.atWork),
    h(
      "div",
      { class: "units-row" },
      svgFromString(multiplierStrip().markup) as unknown as HTMLElement,
      svgFromString(ftRingStrip(2).markup) as unknown as HTMLElement,
      svgFromString(mpStrip([7]).markup) as unknown as HTMLElement,
    ),
  );
  const film = new FilmStrip(app);
  const el = h("div", { class: "film-stage" }, arcBox, h("div", { class: "traj-mid" }, h("div", {}, readouts, note), bigBox), units, film.el);
  const renderer = new LampRenderer(el, () => app.mirror.machine);
  let lastBig = -1;

  function showBig(c: PunchCard | null): void {
    const spec = app.cards.spec!;
    if (!c) {
      big.replaceChildren(h("div", { class: "card-empty" }, mission.content.run.cards?.empty ?? ""));
      bigLabel.textContent = "";
      return;
    }
    big.replaceChildren(svgFromString(cardSvg(c.text, { w: 560, h: 150, first: spec.window[0], last: spec.window[1], mark: (spec.hop ?? []).flatMap((f) => [1, 2, 3, 4, 5].map((k) => f * 5 + k)) })) as unknown as HTMLElement);
    big.dataset.n = String(c.n);
    const v = cardValue(c, spec.value);
    bigLabel.textContent = fillCard(mission.content.run.cards?.label ?? "{v}", { n: c.n, v: v === null ? "" : String(v) });
    if (c.n > lastBig && lastBig >= 0 && !reduceMotion) void play(big, [{ transform: "translateY(-24px)", opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "ease-out" });
    lastBig = Math.max(lastBig, c.n);
  }

  function refreshBig(): void {
    showBig(pinned ?? app.cards.last);
    big.classList.toggle("pinned", !!pinned);
  }

  film.onPick = (c) => {
    pinned = c;
    if (pinTimer) clearTimeout(pinTimer);
    pinTimer = setTimeout(() => {
      pinned = null;
      refreshBig();
    }, FILM_HOLD_MS);
    refreshBig();
  };

  /**
   * Live from the accumulators while the shell flies. Once the landing card
   * is punched, the program has already begun setting up its next flight
   * (Hop back to 1, speeds reloaded) before the bridge freezes the clock, so
   * the readouts freeze on the landing card's own numbers (hop, along, up)
   * and the speeds, which are not on the card, go blank. The lamps keep
   * showing the real frozen state.
   */
  function refreshReadouts(): void {
    const m = app.mirror.machine;
    const landed = app.cards.landed;
    readouts.classList.toggle("frozen", !!landed);
    note.textContent = landed ? T.landedNote : (mission.content.run.note ?? "");
    for (const r of ro) {
      if (landed) {
        const card = app.cards.cards.find((c) => c.n === landed.n);
        const spec = app.cards.spec;
        const fields = r.field === "hop" ? spec?.hop : r.field === "x" ? app.cards.plot?.x : r.field === "y" ? app.cards.plot?.y : undefined;
        const v = card && fields ? cardValue(card, fields) : null;
        r.el.textContent = v === null ? "–" : fmt(v);
        r.box.classList.toggle("off", v === null);
        continue;
      }
      r.box.classList.remove("off");
      const v = m?.acc?.[r.acc]?.value;
      r.el.textContent = typeof v === "number" ? fmt(v) : "–";
    }
  }

  function refreshCards(): void {
    refreshReadouts();
    const any = app.cards.count > 0;
    reader.classList.toggle("hidden", any);
    plot.el.classList.toggle("hidden", !any);
    plot.update();
    film.update();
    refreshBig();
  }

  return {
    el,
    mount: () => {
      refreshReadouts();
      refreshCards();
      plot.update(true);
      renderer.invalidate(null);
    },
    onMachine: (u) => {
      renderer.invalidate(u);
      if (u === null || u.some((x) => x.startsWith("acc."))) refreshReadouts();
      // READ: the card leaves the hopper once the reader has it (real lamps).
      reader.classList.toggle("reading", app.mirror.machine?.init?.[6] === "1");
      reader.classList.toggle("read", app.checkpoints.has(mission.run.initAfter ?? ""));
    },
    onCards: refreshCards,
    dispose: () => {
      renderer.dispose();
      if (pinTimer) clearTimeout(pinTimer);
    },
  };
}
