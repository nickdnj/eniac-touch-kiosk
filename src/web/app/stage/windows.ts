// L2 close-up windows (UX 4.3, 7.3): where every tap happens.
// Plug steps: two 620x620 windows (source left, destination right) with a
// cluster of real neighbouring jacks. Switch steps: one window of dials plus
// a bottom-sheet picker with only the valid positions. Hit areas are
// computed here in app coordinates: jacks 88x88, dials 120x120, picker
// buttons 120x120, independent of the drawn size.

import type { MissionStep, SwitchStep } from "../protocol.ts";
import { dial, jack, panelFace, jackBlock, ACC_RP, DIGITS, text, C } from "../panels/art.ts";
import { setDial } from "../panels/load.ts";
import { h, s, svgFromString, wait } from "../ui/dom.ts";
import { onTap } from "../ui/tap.ts";
import { squareAt, type HitRect } from "../mission/hit.ts";
import { stepTargets } from "../mission/runner.ts";
import { choiceLabel, dialClusterFor, jackClusterFor, plainLabel, type JackCluster } from "./clusters.ts";
import { DIAL_HIT, JACK_HIT, PICKER, WIN_LEFT, WIN_RIGHT, WIN_SWITCH } from "./layout.ts";
import { COPY } from "../copy.ts";

type Box = { x: number; y: number; w: number; h: number };

interface Placed {
  id: string;
  x: number; // app coords, centre
  y: number;
  win: number; // window index
}

const JACK_R = 30;
const DIAL_R = 46;

function jackLayout(n: number, w: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const rows = n <= 4 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
  const ys = rows.length === 1 ? [380] : [266, 486];
  let k = 0;
  rows.forEach((cnt, r) => {
    for (let i = 0; i < cnt; i++, k++) out.push({ x: w / 2 + (i - (cnt - 1) / 2) * 136, y: ys[r] });
  });
  return out;
}

export class StepWindows {
  readonly el: HTMLElement;
  readonly targets: HitRect[] = [];
  private placed = new Map<string, Placed>();
  private wins: { el: HTMLElement; svg: SVGSVGElement; box: Box; chip: HTMLElement }[] = [];
  private ring: SVGGElement | null = null;
  private overlay: SVGSVGElement;
  private preview: SVGGElement | null = null;
  private picker: HTMLElement | null = null;
  readonly step: MissionStep;
  readonly ids: string[];
  private labels: Record<string, string>;

  constructor(step: MissionStep, values: Record<string, string>) {
    this.step = step;
    this.ids = stepTargets(step);
    this.labels = Object.fromEntries(this.ids.map((id) => [id, plainLabel(id)]));
    this.el = h("div", { class: "windows" });
    this.overlay = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="win-overlay" viewBox="0 0 1920 1080" width="1920" height="1080"></svg>`);
    if (step.kind === "plug") {
      const [a, b] = this.ids;
      this.addJackWindow(0, jackClusterFor(a), a, WIN_LEFT, "1");
      this.addJackWindow(1, jackClusterFor(b), b, WIN_RIGHT, "2");
    } else {
      this.addDialWindow(step, values);
    }
    this.el.append(this.overlay);
    // Inert, invisible markers of the hit areas (UX 6.6). Taps are resolved
    // geometrically by mission/hit.ts; these make the target sizes
    // inspectable (touch audit, e2e) without taking part in hit testing.
    for (const t of this.targets) {
      const m = h("div", { class: "hit", "data-id": t.id, "aria-hidden": "true" });
      m.style.left = `${t.x}px`;
      m.style.top = `${t.y}px`;
      m.style.width = `${t.w}px`;
      m.style.height = `${t.h}px`;
      this.el.append(m);
    }
  }

  // ------------------------------------------------------------------ building

  private frameWin(i: number, box: Box, badge: string, title: string, targetId: string): { el: HTMLElement; chip: HTMLElement } {
    const el = h("div", { class: "win", "data-win": String(i) });
    el.style.left = `${box.x}px`;
    el.style.top = `${box.y}px`;
    el.style.width = `${box.w}px`;
    el.style.height = `${box.h}px`;
    const head = h("div", { class: "win-head" }, h("span", { class: "badge" }, badge), h("span", { class: "win-title" }, title));
    const chip = h("div", { class: "chip" }, h("span", { class: "chip-arrow" }, "▼"), this.labels[targetId] ?? "");
    el.append(head, chip);
    return { el, chip };
  }

  private addJackWindow(i: number, cl: JackCluster | null, targetId: string, box: Box, badge: string): void {
    const cluster: JackCluster = cl ?? { key: "x", title: "", jacks: [{ id: targetId, label: "" }] };
    const { el, chip } = this.frameWin(i, box, badge, cluster.title, targetId);
    const pos = jackLayout(cluster.jacks.length, box.w);
    let body = panelFace(box.w, box.h);
    const top = pos.length > 3 ? 188 : 300;
    const bottom = pos.length > 3 ? 596 : 480;
    body += jackBlock(24, top, box.w - 48, bottom - top);
    cluster.jacks.forEach((j, k) => {
      const p = pos[k];
      body += jack(j.id, p.x, p.y, JACK_R);
      body += text(p.x, p.y + JACK_R * 1.35 + 44, j.label, { size: 24, fill: C.ink, weight: 700 });
      this.placed.set(j.id, { id: j.id, x: box.x + p.x, y: box.y + p.y, win: i });
      this.targets.push(squareAt(j.id, box.x + p.x, box.y + p.y, JACK_HIT));
    });
    const svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="win-art" viewBox="0 0 ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${body}</svg>`);
    el.prepend(svg);
    this.el.append(el);
    this.wins.push({ el, svg, box, chip });
  }

  private addDialWindow(step: SwitchStep, values: Record<string, string>): void {
    const id = this.ids[0];
    const cl = dialClusterFor(id);
    const dials = cl?.dials ?? [{ id, label: "" }];
    const box = WIN_SWITCH;
    const { el, chip } = this.frameWin(0, box, "1", cl?.title ?? "", id);
    let body = panelFace(box.w, box.h);
    const pitch = 140;
    dials.forEach((d, k) => {
      const x = box.w / 2 + (k - (dials.length - 1) / 2) * pitch;
      const y = 350;
      const positions = cl?.family === "repeat" ? ACC_RP : DIGITS;
      const v = values[d.id] ?? (cl?.family === "repeat" ? "1" : "0");
      body += text(x, 200, d.label, { size: 24, fill: "#C9C2A8", weight: 700 });
      body += dial(d.id, x, y, DIAL_R, positions, v, true);
      body += text(x, 474, v, { size: 32, fill: C.plateInk, mono: true, cls: "dial-value", id: `val:${d.id}` });
      this.placed.set(d.id, { id: d.id, x: box.x + x, y: box.y + y, win: 0 });
      this.targets.push(squareAt(d.id, box.x + x, box.y + y, DIAL_HIT));
    });
    const svg = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="win-art" viewBox="0 0 ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${body}</svg>`);
    el.prepend(svg);
    this.el.append(el);
    this.wins.push({ el, svg, box, chip });
    void step;
  }

  // ------------------------------------------------------------------ geometry

  center(id: string): { x: number; y: number } | null {
    const p = this.placed.get(id);
    return p ? { x: p.x, y: p.y } : null;
  }

  /** Label chip (app coords, left-middle) of the window holding `id`, for the leader line. */
  chipAnchor(id: string): { x: number; y: number } | null {
    const p = this.placed.get(id);
    if (!p) return null;
    const w = this.wins[p.win];
    return { x: w.box.x + w.box.w - 8, y: w.box.y + 104 };
  }

  // ------------------------------------------------------------------ guide

  /** Ring, badge and chevron on the active target (UX 4.3 steps 3-4). */
  setGuide(activeId: string | null, level: number): void {
    this.ring?.remove();
    this.ring = null;
    this.wins.forEach((w) => w.chip.classList.remove("active"));
    if (!activeId) return;
    const p = this.placed.get(activeId);
    if (!p) return;
    this.wins[p.win].chip.classList.add("active");
    const isDial = activeId.startsWith("sw:");
    const r = isDial ? DIAL_R + 26 : JACK_R * 1.35 + 14;
    const badge = this.step.kind === "plug" ? String(p.win + 1) : "1";
    const g = s("g", { class: `guide-ring lvl${Math.min(level, 3)}` }) as SVGGElement;
    const pulse = s("g", { class: "pulse" });
    pulse.style.transformOrigin = `${p.x}px ${p.y}px`;
    pulse.append(
      s("circle", { cx: p.x, cy: p.y, r, class: "ring-outer" }),
      s("circle", { cx: p.x, cy: p.y, r: r - 5, class: "ring-inner" }),
    );
    const chev = s("g", { class: "chevron" });
    chev.append(s("path", { d: `M${p.x - 22} ${p.y - r - 46}L${p.x} ${p.y - r - 18}L${p.x + 22} ${p.y - r - 46}Z`, class: "chev" }));
    const bx = p.x - r * 0.78, by = p.y - r * 0.78;
    const b = s("g", { class: "numbadge" });
    b.append(s("circle", { cx: bx, cy: by, r: 20 }), s("text", { x: bx, y: by + 9, "text-anchor": "middle" }, badge));
    g.append(pulse, chev, b);
    this.overlay.append(g);
    this.ring = g;
  }

  // ------------------------------------------------------------------ feedback (UX 5.2, 9.1)

  /** Vermillion X badge for 600 ms and a 2 x 6 px shake on the decoy. */
  wrong(id: string | null): void {
    if (!id) return;
    const p = this.placed.get(id);
    if (!p) return;
    const g = s("g", { class: "xbadge" });
    g.append(
      s("circle", { cx: p.x + 30, cy: p.y - 30, r: 22 }),
      s("path", { d: `M${p.x + 20} ${p.y - 40}L${p.x + 40} ${p.y - 20}M${p.x + 40} ${p.y - 40}L${p.x + 20} ${p.y - 20}` }),
    );
    this.overlay.append(g);
    setTimeout(() => g.remove(), 600);
    this.wins[p.win].svg.querySelectorAll(`[id="${id}"]`).forEach((el) =>
      (el as SVGElement).animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }],
        { duration: 300 },
      ),
    );
  }

  /** Bluish-green ring with a check mark, 200 ms snap. */
  ok(id: string): void {
    const p = this.placed.get(id);
    if (!p) return;
    const isDial = id.startsWith("sw:");
    const r = isDial ? DIAL_R + 20 : JACK_R * 1.35 + 10;
    const g = s("g", { class: "okmark" });
    g.append(
      s("circle", { cx: p.x, cy: p.y, r, class: "ok-ring" }),
      s("circle", { cx: p.x + r * 0.72, cy: p.y - r * 0.72, r: 20, class: "ok-dot" }),
      s("path", { d: `M${p.x + r * 0.72 - 10} ${p.y - r * 0.72}l7 7l13 -14`, class: "ok-check" }),
    );
    g.animate([{ transform: "scale(1.15)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 200, easing: "ease-out" });
    (g as SVGElement).style.transformOrigin = `${p.x}px ${p.y}px`;
    this.overlay.append(g);
  }

  /** Source held: a white dashed guide cable floats toward window 2. */
  showPreview(fromId: string): void {
    const p = this.placed.get(fromId);
    if (!p) return;
    this.preview?.remove();
    const end = { x: WIN_RIGHT.x + 30, y: WIN_RIGHT.y + 104 };
    const g = s("g", { class: "preview" }) as SVGGElement;
    g.append(
      s("path", { d: `M${p.x} ${p.y}C${p.x + 160} ${p.y + 120} ${end.x - 160} ${end.y + 200} ${end.x} ${end.y}`, class: "preview-line" }),
      s("circle", { cx: end.x, cy: end.y, r: 12, class: "preview-end" }),
    );
    this.overlay.append(g);
    this.preview = g;
  }

  /** Wrong destination: the floating end snaps back (source stays armed). */
  snapBack(): void {
    this.preview?.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 300 });
  }

  /** Right destination: the cable draws across the windows (600 ms). */
  async drawCable(fromId: string, toId: string, cable: "data" | "program", ms = 600): Promise<void> {
    this.preview?.remove();
    this.preview = null;
    const a = this.placed.get(fromId), b = this.placed.get(toId);
    if (!a || !b) return;
    const d = `M${a.x} ${a.y}C${a.x + 120} ${a.y + 200} ${b.x - 120} ${b.y + 200} ${b.x} ${b.y}`;
    const g = s("g", { class: `cable ${cable} live` });
    const o = s("path", { d, class: "cable-outline" }) as SVGPathElement;
    const c = s("path", { d, class: "cable-core" }) as SVGPathElement;
    g.append(o, c);
    this.overlay.append(g);
    const anims = [o, c].map((p) => {
      const len = p.getTotalLength();
      return p.animate([{ strokeDasharray: `${len} ${len}`, strokeDashoffset: len }, { strokeDasharray: `${len} ${len}`, strokeDashoffset: 0 }], { duration: ms, easing: "ease-in-out" });
    });
    await Promise.all(anims.map((x) => x.finished));
  }

  // ------------------------------------------------------------------ switch picker (UX 7.3)

  turnDial(id: string, value: string): void {
    setDial(this.el, id, value, true);
    const v = this.el.querySelector(`[id="val:${id}"]`);
    if (v) v.textContent = value;
  }

  openPicker(onPick: (v: string) => void): void {
    if (this.picker || this.step.kind !== "switch") return;
    const st = this.step;
    const fam = dialClusterFor(this.ids[0])?.family;
    const sheet = h("div", { class: "picker" }, h("div", { class: "picker-title" }, fam === "repeat" ? COPY.rail.pickRepeat : COPY.rail.pickNumber));
    sheet.style.left = `${PICKER.x}px`;
    sheet.style.top = `${PICKER.y}px`;
    sheet.style.width = `${PICKER.w}px`;
    const row = h("div", { class: "picker-row" });
    for (const c of st.choices) {
      const lab = choiceLabel(this.ids[0], st.family, c);
      const b = h("div", { class: "pick", role: "button", "data-value": c }, h("span", { class: "pick-v" }, c), lab ? h("span", { class: "pick-l" }, lab) : null);
      onTap(b, () => onPick(c));
      row.append(b);
    }
    sheet.append(row);
    this.el.append(sheet);
    this.picker = sheet;
    sheet.animate([{ transform: "translateY(60px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 250, easing: "ease-out" });
  }

  pickerWrong(value: string): void {
    const b = this.picker?.querySelector(`[data-value="${value}"]`);
    if (!b) return;
    b.classList.add("wrong");
    (b as HTMLElement).animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 300 });
    setTimeout(() => b.classList.remove("wrong"), 600);
  }

  closePicker(): void {
    this.picker?.remove();
    this.picker = null;
  }

  get pickerOpen(): boolean {
    return this.picker !== null;
  }

  // ------------------------------------------------------------------ lifecycle

  slideIn(reduceMotion: boolean): void {
    this.el.querySelectorAll<HTMLElement>(".win").forEach((w, i) =>
      w.animate(reduceMotion ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: `translateY(40px) scale(.96)` }, { opacity: 1, transform: "none" }], {
        duration: 400,
        delay: i * 80,
        easing: "ease-in-out",
        fill: "backwards",
      }),
    );
  }

  async close(): Promise<void> {
    await this.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).finished;
    this.el.remove();
  }
}

export { wait };
