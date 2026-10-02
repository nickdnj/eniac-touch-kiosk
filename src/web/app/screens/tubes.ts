// S16 "Keeping ENIAC alive" (docs/tubes.md section 2; UX 14.11; PRD FR-99
// to FR-101): five cards and a myth check about ENIAC's 18,000 tubes, the
// power, how they burned out and how the crew kept the machine running,
// and "Find the dead tube", a five-step RE-ENACTMENT of the 1946 hunt.
//
// Layout (1920 x 1080), the same frame as S14: header; the stage x24-1384
// y112-1016 (one drawn figure per card, or the practice panels); the rail
// x1408-1896 y112-1016. Copy and numbers: tubes/content.ts. Drawings:
// tubes/art.ts. The exercise's state machine: tubes/reenact.ts.
//
// Honesty (docs/tubes.md 2.5.1): nothing here is live. The screen never
// reads the mirror, the session or the lamp store (it has no onMachine and
// imports none of them: tests/web/tubes.test.ts); the practice panels are
// drawn and every lamp is data-source="script"; the RE-ENACTMENT plate is
// on every state of the exercise. So it keeps working, unchanged and with
// no notice, while the core is down (coreOptional; Q24).

import type { App, Screen, TubesOpen, View } from "../app.ts";
import { h, svgFromString } from "../ui/dom.ts";
import { onTap, setDisabled, type TapPoint } from "../ui/tap.ts";
import { button } from "../ui/overlays.ts";
import { play } from "../ui/anim.ts";
import { hitTest } from "../mission/hit.ts";
import { CAPTIONS, MYTH, PLATE, TRY, TUBES, TUBE_CARDS } from "../tubes/content.ts";
import { FIGURES, LAYOUT, STAGE, TUBE_DEFS, banner, chassisSvg, figMyth, panelSvg, placeSvg, targets, tubeSvg } from "../tubes/art.ts";
import { Reenactment, type Outcome } from "../tubes/reenact.ts";

function reduceMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Mode = "card" | "myth" | "try";

export function tubesScreen(app: App, view: View): Screen {
  const open: TubesOpen = view.tubes ?? { from: "other" };
  const back: View = open.back ?? { name: "explore", explore: { from: "tubes", restore: true } };
  let mode: Mode = "card";
  let n = Math.min(Math.max(Math.round(open.card ?? 1), 1), TUBE_CARDS.length);
  const re = new Reenactment(0);
  let gen = 0; // bumps on every stage rebuild, so a late timer never touches a new state

  // ------------------------------------------------------------------ DOM
  const el = h("div", { class: "screen tubes" });
  const backLabel = open.from === "explore" ? TUBES.back.explore : open.from === "glossary" ? TUBES.back.glossary : TUBES.back.other;
  const header = h(
    "div",
    { class: "header" },
    button(`‹ ${backLabel}`, "light outline tb-back", () => goBack()),
    h("span", { class: "title" }, TUBES.title),
    h("span", { class: "spacer" }),
    button(TUBES.glossary, "light outline tb-gloss-btn", () => openGlossary()),
  );
  const defs = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="tb-defs" width="0" height="0" aria-hidden="true"><defs>${TUBE_DEFS}</defs></svg>`);
  const stage = h("div", { class: "tb-stage" });
  const rail = h("div", { class: "ex-rail tb-rail" });
  el.append(defs, header, stage, rail);

  // ------------------------------------------------------------------ the cards
  function showCard(i: number, count = true): void {
    mode = "card";
    n = i;
    gen++;
    if (count) app.metric({ t: "metric", ev: "tubes_card", n });
    render();
  }

  function renderCardStage(): void {
    const c = TUBE_CARDS[n - 1];
    const fig = h("div", { class: `tb-figure fig-${c.id}`, "data-card": String(n) });
    fig.append(svgFromString(FIGURES[c.id]()), h("div", { class: "tb-vt" }, c.stage.title));
    if (c.stage.sub) fig.append(h("div", { class: "tb-vs" }, c.stage.sub));
    if (c.id === "tubes") {
      fig.append(
        h("div", { class: "tb-cap where" }, h("b", {}, CAPTIONS.tubes.where[0]), ` ${CAPTIONS.tubes.where[1]}`),
        h("div", { class: "tb-cap parts" }, CAPTIONS.tubes.parts),
      );
    }
    stage.replaceChildren(fig);
  }

  function renderMythStage(): void {
    const fig = h("div", { class: "tb-figure fig-myth" });
    fig.append(svgFromString(figMyth()), h("div", { class: "tb-vt" }, MYTH.stage.title));
    stage.replaceChildren(fig);
  }

  function bannerEl(id: Parameters<typeof banner>[0]): HTMLElement {
    const b = h("div", { class: "banner tb-rail-banner", "aria-hidden": "true" });
    b.append(svgFromString(banner(id)));
    return b;
  }

  function closeBtn(fn: () => void, label = TUBES.close): HTMLElement {
    const x = h("div", { class: "close", role: "button", "aria-label": label }, "✕");
    onTap(x, fn);
    return x;
  }

  function renderCardRail(): void {
    const c = TUBE_CARDS[n - 1];
    const prev = button(`‹ ${TUBES.previous}`, "primary outline tb-prev", () => showCard(n - 1));
    setDisabled(prev, n === 1);
    const last = n === TUBE_CARDS.length;
    const next = button(last ? TUBES.finish : `${TUBES.next} ›`, "primary tb-next", () => (last ? goBack() : showCard(n + 1)));
    const extra: HTMLElement[] = [];
    if (c.id === "power") extra.push(button(`${MYTH.link} ›`, "link ex-link tb-myth-link", () => openMyth()));
    rail.replaceChildren(
      h("div", { class: "eyebrow" }, h("span", {}, `${TUBES.of(n, TUBE_CARDS.length)} · ${c.tag.toUpperCase()}`), closeBtn(() => goBack())),
      bannerEl(c.id),
      h("h2", {}, c.title),
      h("p", { class: "body" }, c.body),
      ...extra,
      h(
        "div",
        { class: "tb-foot" },
        c.id === "hunt" ? button(`${TUBES.cta} ›`, "primary tb-cta", () => startTry()) : null,
        h("div", { class: "nav" }, prev, next),
      ),
    );
  }

  function renderMythRail(): void {
    rail.replaceChildren(
      h("div", { class: "eyebrow" }, h("span", {}, TUBES.mythEyebrow), closeBtn(() => goBack())),
      bannerEl("myth"),
      h("h2", {}, MYTH.title),
      h("p", { class: "body" }, MYTH.body),
      h("div", { class: "tb-foot" }, h("div", { class: "nav" }, button(`‹ ${TUBES.mythBack}`, "primary outline tb-myth-back", () => showCard(2)))),
    );
  }

  function openMyth(): void {
    mode = "myth";
    gen++;
    app.metric({ t: "metric", ev: "tubes_myth_open" });
    render();
  }

  // ------------------------------------------------------------------ the re-enactment
  let host: HTMLElement | null = null;

  function startTry(): void {
    mode = "try";
    re.restart();
    app.metric({ t: "metric", ev: "tubes_try_start", n: re.variant });
    render();
  }

  function backToStory(): void {
    re.restart(); // the exercise state is discarded (docs/tubes.md 2.5.4)
    showCard(4);
  }

  function plate(): HTMLElement {
    return h("div", { class: "tb-plate", role: "note" }, h("b", { class: "tb-badge" }, PLATE.badge), h("span", { class: "tb-plate-text" }, PLATE.text));
  }

  function caption(parts: string[]): HTMLElement {
    return h("div", { class: "tb-cap tb-try-cap" }, h("b", {}, parts[0]), ` ${parts[1]}`);
  }

  function target(kind: "panel" | "place" | "tube", i: number, label: string, x: number, y: number, w: number, hgt: number, ...kids: Node[]): HTMLElement {
    const t = h("div", { class: `tb-target ${kind}`, role: "button", "aria-label": label, "data-kind": kind, "data-i": String(i) }, ...kids, h("i", { class: "tb-ring" }), h("i", { class: "tb-x", "aria-hidden": "true" }, "✕"));
    Object.assign(t.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${hgt}px` });
    return t;
  }

  /** Rebuilds the practice area for the current step. */
  function renderTryStage(enter: "none" | "fade" | "slide" = "none"): void {
    gen++;
    const st = re.step;
    const layer = h("div", { class: "tb-try-layer" });
    const frame = h("div", { class: "tb-prac", "aria-hidden": "true" });
    host = h("div", { class: "tb-host", "data-step": String(st) });
    onTap(host, (p) => tapAt(p));
    const fault = re.fault, ans = re.answer;
    if (st === 1 || st === 2 || st === "fixed") {
      host.append(caption(st === 1 ? TRY.cap.cleared : st === 2 ? TRY.cap.tested : TRY.cap.fixed));
      const p = LAYOUT.panel;
      for (let i = 0; i < 4; i++) {
        const art = svgFromString(panelSvg(re.panelDigits(i), i));
        const x = p.x + i * p.pitch;
        if (st === 2) host.append(target("panel", i, TRY.acc(i + 1), x, p.y, p.w, p.h, art));
        else {
          const d = h("div", { class: "tb-panel-art", "data-i": String(i) }, art);
          Object.assign(d.style, { left: `${x}px`, top: `${p.y}px` });
          host.append(d);
        }
      }
      if (st === "fixed") {
        const ring = h("div", { class: "tb-fixed-ring", "aria-label": `${TRY.acc(fault.acc)}, ${TRY.placeLabel(fault.place)}` });
        Object.assign(ring.style, { left: `${p.x + ans.panel * p.pitch + 50 + ans.place * 25 - 17}px`, top: `${p.y + 84}px` });
        host.append(ring);
      }
    } else if (st === 3) {
      host.append(caption(TRY.cap.place(fault.acc)));
      const q = LAYOUT.place;
      const art = h("div", { class: "tb-place-art" }, svgFromString(placeSvg(re.panelDigits(ans.panel), fault.acc)));
      Object.assign(art.style, { left: `${q.x}px`, top: `${q.y}px` });
      host.append(art);
      for (let c = 0; c < 10; c++) host.append(target("place", c, `${TRY.acc(fault.acc)}, ${TRY.placeLabel(c + 1)}`, q.x + q.gx + c * q.pitch - q.colW / 2, q.y + q.colTop, q.colW, q.colH));
    } else {
      host.append(caption(TRY.cap.unit(fault.place)));
      const unit = h("div", { class: "tb-unit" });
      const ch = h("div", { class: "tb-chassis-art" }, svgFromString(chassisSvg()));
      unit.append(ch);
      const t = LAYOUT.tube;
      for (let i = 0; i < 8; i++) {
        const f = re.felt.get(i);
        const lab = h("span", { class: "tb-tube-lab" }, f === "warm" ? TRY.warm : f === "cold" ? TRY.cold : TRY.touch);
        const tb = target("tube", i, `Tube ${i + 1}`, t.x + i * t.pitch, t.y, t.w, t.h, svgFromString(tubeSvg(f)), lab);
        if (f) tb.classList.add(f);
        unit.append(tb);
      }
      host.append(unit);
      const r = TRY.cap.read;
      host.append(h("div", { class: "tb-cap tb-read" }, h("b", {}, r[0]), ` ${r[1]} `, h("span", { class: "warm-w" }, r[2]), ` ${r[3]} `, h("span", { class: "cold-w" }, r[4]), ` ${r[5]}`));
    }
    layer.append(plate(), frame, host);
    stage.replaceChildren(layer);
    marks();
    if (enter !== "none") {
      const rm = reduceMotion();
      const what = enter === "slide" && !rm ? host.querySelector(".tb-unit") ?? host : host;
      if (enter === "slide" && !rm) void play(what, [{ transform: "translateY(360px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 400, easing: "ease-out" });
      else void play(host, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
    }
  }

  /** Ladder marks on the current targets: the thick ring from wrong tap #2 (UX 5.2). */
  function marks(): void {
    if (!host) return;
    const st = re.step;
    const right = st === 2 ? re.answer.panel : st === 3 ? re.answer.place : st === 4 ? re.answer.tube : -1;
    host.querySelectorAll<HTMLElement>(".tb-target").forEach((t) => t.classList.toggle("ring2", re.level >= 2 && Number(t.dataset.i) === right));
  }

  function wrongMark(i: number): void {
    const t = host?.querySelector<HTMLElement>(`.tb-target[data-i="${i}"]`);
    if (!t) return;
    const g = gen;
    t.classList.add("x-on");
    setTimeout(() => g === gen && t.classList.remove("x-on"), 600);
    if (!reduceMotion()) {
      t.classList.remove("shake");
      void t.offsetWidth;
      t.classList.add("shake");
      setTimeout(() => g === gen && t.classList.remove("shake"), 320);
    }
  }

  function ripple(p: TapPoint): void {
    if (!host) return;
    const r = h("span", { class: "ripple" });
    r.style.left = `${p.x - STAGE.x}px`;
    r.style.top = `${p.y - STAGE.y}px`;
    host.append(r);
    setTimeout(() => r.remove(), 500);
  }

  function tapAt(p: TapPoint): void {
    const st = re.step;
    if (st !== 2 && st !== 3 && st !== 4) return ripple(p);
    const id = hitTest(p, targets(st));
    if (id === null) return ripple(p);
    const i = Number(id);
    after(st === 2 ? re.tapPanel(i) : st === 3 ? re.tapPlace(i) : re.touchTube(i));
  }

  /** Applies an outcome: metrics, stage and rail. */
  function after(o: Outcome): void {
    if (o.kind === "ignored") return;
    if (o.kind === "wrong") {
      wrongMark(o.target);
      marks();
      renderTryRail();
      return;
    }
    if (o.kind === "warm") {
      renderTryStage();
      renderTryRail();
      return;
    }
    const to = o.to;
    if (typeof to === "number" && to >= 2) app.metric({ t: "metric", ev: "tubes_try_step", n: to });
    renderTryStage(to === 3 ? "fade" : to === 4 ? "slide" : to === "fixed" ? "fade" : "none");
    renderTryRail();
  }

  function doForMe(): void {
    after(re.doForMe());
  }

  function skip(): void {
    const from = re.step;
    const o = re.skip();
    if (o.kind === "ignored") return;
    app.metric({ t: "metric", ev: "tubes_try_skip", n: typeof from === "number" ? from : 5 });
    renderTryStage("fade");
    renderTryRail();
  }

  function plug(): void {
    const o = re.plugFresh();
    if (o.kind === "ignored") return;
    app.metric({ t: "metric", ev: "tubes_try_done", n: re.variant, assisted: re.assisted });
    renderTryStage("fade");
    renderTryRail();
  }

  function another(): void {
    re.another();
    app.metric({ t: "metric", ev: "tubes_try_start", n: re.variant });
    renderTryStage("fade");
    renderTryRail();
  }

  function feedback(): HTMLElement | null {
    const f = re.fb;
    if (!f || re.step === "fixed") return null;
    const icon = f.kind === "wrong" ? "✕" : f.kind === "ok" ? "✓" : "?";
    return h("div", { class: `tb-fb ${f.kind}`, role: "status" }, h("span", { class: "tb-fb-icon", "aria-hidden": "true" }, icon), h("span", { class: "tb-fb-text" }, f.text));
  }

  function renderTryRail(): void {
    const st = re.step;
    if (st === "fixed") {
      rail.replaceChildren(
        h("div", { class: "eyebrow" }, h("span", {}, TRY.fixedEyebrow), closeBtn(() => backToStory(), TRY.backToStory)),
        h("div", { class: "tb-win" }, h("h2", {}, `✓ ${TRY.fixed}`)),
        h("p", { class: "body" }, TRY.win),
        h("div", { class: "tb-foot" }, button(TRY.again, "primary tb-again", () => another()), button(`${TRY.backToStory} ›`, "primary outline tb-story", () => backToStory())),
      );
      return;
    }
    const info = TRY.steps[st - 1];
    const dots = h("span", { class: "tb-dots", "aria-hidden": "true" }, ...[1, 2, 3, 4, 5].map((i) => h("i", { class: i < st ? "on" : i === st ? "cur" : "" })));
    const foot = h("div", { class: "tb-foot" });
    if (st === 1) foot.append(button(TRY.run, "primary tb-act tb-run", () => after(re.runTest())));
    else if (st === 5) foot.append(button(TRY.plug, "primary tb-act tb-plug", () => plug()));
    else foot.append(button(TRY.doIt, `primary tb-dfm${re.offerFilled ? " filled" : " outline"}`, () => doForMe()));
    if (st !== 1) foot.append(button(TRY.skip, "link tb-skip", () => skip()));
    foot.append(button(`‹ ${TRY.backToStory}`, "link tb-story-back", () => backToStory()));
    rail.replaceChildren(h("div", { class: "eyebrow" }, h("span", {}, TRY.stepOf(st)), dots), h("h2", {}, info.h), h("p", { class: "body" }, info.p), feedback() ?? "", foot);
  }

  // ------------------------------------------------------------------ frame
  function render(): void {
    rail.classList.toggle("try", mode === "try");
    el.dataset.mode = mode;
    if (mode === "try") {
      renderTryStage();
      renderTryRail();
      return;
    }
    host = null;
    if (mode === "myth") {
      renderMythStage();
      renderMythRail();
    } else {
      renderCardStage();
      renderCardRail();
    }
  }

  function goBack(): void {
    app.show(back);
  }

  function openGlossary(): void {
    // Back from the glossary returns here, on the card the visitor was reading.
    const card = mode === "card" ? n : mode === "myth" ? 2 : 4;
    app.show({ name: "glossary", explore: { from: "tubes", back: { name: "tubes", tubes: { ...open, card, restore: true } } } });
  }

  return {
    el,
    idle: "explore",
    coreOptional: true,
    mount: () => {
      if (!open.restore) app.metric({ t: "metric", ev: "tubes_open", screen: open.from.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || "other" });
      showCard(n, !open.restore);
    },
    unmount: () => {
      gen++;
      host = null;
    },
  };
}
