// Mission screen: S3 briefing, Step 0 "the plan", S4 setup steps and S5
// "the rest is done for you" (issues #17, #18; UX 4, 5, 7.3, 7.4, 8.1.4).
// All mission copy comes from the mission JSON.

import type { App, Screen, View } from "../app.ts";
import type { ConfigItem, MissionStep, ServerMsg } from "../protocol.ts";
import { Runner, type Feedback } from "../mission/runner.ts";
import { hitTest } from "../mission/hit.ts";
import { unitOf, termId } from "../mission/ids.ts";
import { Workbench, workbenchPlan } from "../stage/workbench.ts";
import { StepWindows } from "../stage/windows.ts";
import { roomPlanSvg, unitsForPlan } from "../stage/roomplan.ts";
import { TileFigure } from "../stage/tiles.ts";
import { CheckersFigure, SharingFigure, type Figure } from "../stage/primesfig.ts";
import { DotsFigure, HopFigure } from "../stage/trajfig.ts";
import { PICKER, RAIL, STAGE } from "../stage/layout.ts";
import { LampRenderer } from "../lamps/render.ts";
import { h, s, svgFromString, wait } from "../ui/dom.ts";
import { after, finishAll, play } from "../ui/anim.ts";
import { onTap, setDisabled, type TapPoint } from "../ui/tap.ts";
import { button, confirm, tellMore } from "../ui/overlays.ts";
import { switchDefault } from "../panels/art.ts";
import { COPY } from "../copy.ts";

type Phase = "briefing" | "plan" | "step" | "rest";

/**
 * Pure: the S5 timeline for n cables and m switches. Up to 40 cables they
 * are staggered one by one (Squares, UX 7.4); more come in 8 waves of 600 ms
 * (Primes 264, Trajectory 293). Up to 60 switches click one by one; more
 * click in 8 blocks (Trajectory's 711 drag-table dials included). The whole
 * screen takes at most about 8 s.
 */
export function restPlan(n: number, m: number) {
  const waves = n > 40;
  const cableGap = waves ? 600 : Math.min(250, 2500 / Math.max(1, n));
  const perWave = Math.max(1, Math.ceil(n / 8));
  const cableAt = (i: number) => (waves ? Math.floor(i / perWave) * cableGap : Math.round(i * cableGap));
  const cableMs = waves ? 600 : 400;
  const cablesEnd = n === 0 ? 0 : cableAt(n - 1) + (waves ? cableMs : cableGap);
  const swStart = cablesEnd + 200;
  const blocksOf = m > 60;
  const swGap = blocksOf ? 250 : Math.min(150, 1500 / Math.max(1, m));
  const perBlock = Math.max(1, Math.ceil(m / 8));
  const switchAt = (i: number) => swStart + (blocksOf ? Math.floor(i / perBlock) * swGap : Math.round(i * swGap));
  const total = (m === 0 ? swStart : switchAt(m - 1) + swGap) + 300;
  return {
    cableMs,
    cableAt,
    switchAt,
    total,
    cablesBy: (e: number) => Math.min(n, waves ? Math.min(Math.floor(e / cableGap) + 1, 8) * perWave : Math.floor(e / cableGap) + 1),
    switchesBy: (e: number) => (e < swStart ? 0 : Math.min(m, blocksOf ? (Math.floor((e - swStart) / swGap) + 1) * perBlock : Math.floor((e - swStart) / swGap) + 1)),
  };
}

const REDUCE_MOTION = false; // UX 9.5: staff setting; wired to config in M3

/** The staff setting, or the browser's prefers-reduced-motion. */
function reduceMotion(): boolean {
  return REDUCE_MOTION || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
}

export function missionScreen(app: App, view: View): Screen {
  const mission = app.mission!;
  const content = mission.content;
  const planUnits = unitsForPlan(mission.units);
  const runner = new Runner(mission, () => app.now(), app.mirror.session?.applied ?? []);
  let phase: Phase = view.entry === "step1" ? "step" : "briefing";
  let windows: StepWindows | null = null;
  let figure: Figure | null = null; // the mission's explanation figure on the briefing / plan stage
  let animGen = 0; // bumps to cancel a running success choreography
  let acked = false;
  let assistedNow = false;
  let setupComplete = false;
  let restDone = false;
  const restTimers: ReturnType<typeof setTimeout>[] = [];
  let skippedSteps: MissionStep[] = [];
  const switchValues: Record<string, string> = {};

  // ------------------------------------------------------------------ DOM
  const el = h("div", { class: "screen mission" });
  const stepLabel = h("span", { class: "hdr-step" });
  const dots = h("span", { class: "dots" });
  const header = h(
    "div",
    { class: "header" },
    button(`‹ ${COPY.header.missions}`, "light outline hdr-missions", () => backToMissions()),
    h("span", { class: "title" }, COPY.header.mission(mission.order, mission.title)),
    h("span", { class: "spacer" }),
    h("span", { class: "hdr-progress" }, stepLabel, dots),
    button(COPY.header.startOver, "light outline hdr-startover", () => startOver()),
  );

  const stage = h("div", { class: "stage", "aria-label": "machine" });
  stage.style.left = `${STAGE.x}px`;
  stage.style.top = `${STAGE.y}px`;
  const workbench = new Workbench(workbenchPlan(mission));
  const wbWrap = h("div", { class: "wb-wrap" }, workbench.el);
  const scrim = h("div", { class: "stage-scrim" });
  const altView = h("div", { class: "alt-view" });
  const winHost = h("div", { class: "win-host" });
  const ripples = h("div", { class: "ripples" });
  stage.append(wbWrap, altView, scrim, winHost, ripples);
  onTap(stage, (p) => stageTap(p));

  // Rail (UX 5.1): step card, Tell me more, main action, Skip setup.
  const card = h("div", { class: "step-card" });
  const moreBtn = button(COPY.rail.tellMore, "outline more-btn", () => openMore());
  const mainBtn = button("", "primary main-btn", () => mainAction());
  const skipBtn = button(COPY.rail.skip, "link skip-btn", () => skipSetup());
  const rail = h("div", { class: "rail" }, card, moreBtn, mainBtn, skipBtn);
  rail.style.left = `${RAIL.x}px`;
  rail.style.top = `${RAIL.y}px`;

  const leader = svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="leader" viewBox="0 0 1920 1080" width="1920" height="1080"></svg>`);
  el.append(header, stage, rail, leader);

  const renderer = new LampRenderer(workbench.el, () => app.mirror.machine);

  // Visitor-applied items already in the core (e.g. after "Start over" they are gone).
  for (const [i, st] of mission.steps.entries()) if (runner.status[i] !== "todo") applyToWorkbench(st, false);

  // ------------------------------------------------------------------ helpers
  function configFor(st: MissionStep): ConfigItem | undefined {
    return mission.config.find((c) => c.owner === `step:${st.id}`);
  }

  function applyToWorkbench(st: MissionStep, animate: boolean, pending = false): Promise<void> {
    if (st.kind === "switch") {
      switchValues[`sw:${st.switch}`] = st.value;
      workbench.setSwitch(st.switch, st.value, animate);
      return Promise.resolve();
    }
    const c = configFor(st);
    const item = c && c.kind === "plug" ? c : { kind: "plug" as const, from: st.from, to: st.to, cable: st.cable, owner: `step:${st.id}` };
    return workbench.addCable(item, { animate, pending });
  }

  function valuesForWindows(): Record<string, string> {
    const v: Record<string, string> = { ...switchValues };
    for (const c of mission.config) if (c.kind === "switch" && c.owner === "preset") v[`sw:${c.switch}`] ??= switchDefault(`sw:${c.switch}`);
    return v;
  }

  function stepDoneCount(): number {
    return runner.status.filter((x) => x === "done" || x === "assisted").length;
  }

  function renderDots(): void {
    dots.replaceChildren();
    mission.steps.forEach((_, i) => {
      const st = runner.status[i];
      const cls = st === "done" ? "dot done" : st === "assisted" ? "dot assisted" : st === "skipped" ? "dot skipped" : i === runner.index && phase === "step" ? "dot current" : "dot";
      dots.append(h("span", { class: cls }));
    });
    stepLabel.textContent = phase === "step" && !runner.finished ? COPY.header.stepOf(runner.index + 1, mission.steps.length) : "";
  }

  function setIdle(): void {
    app.idle.setMode(phase === "rest" ? "none" : "setup");
  }

  function ripple(p: TapPoint): void {
    const r = h("span", { class: "ripple" });
    r.style.left = `${p.x - STAGE.x}px`;
    r.style.top = `${p.y - STAGE.y}px`;
    ripples.append(r);
    setTimeout(() => r.remove(), 500);
  }

  // ------------------------------------------------------------------ rail content
  function cardHead(kind: "cable" | "dial" | "none"): HTMLElement {
    const icon =
      kind === "cable"
        ? svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="kind-icon" viewBox="0 0 40 40" width="40" height="40"><path d="M6 30C6 10 34 30 34 10" fill="none" stroke="#1B1D21" stroke-width="4" stroke-linecap="round"/><circle cx="6" cy="31" r="5" fill="#1B1D21"/><circle cx="34" cy="9" r="5" fill="#1B1D21"/></svg>`)
        : kind === "dial"
          ? svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="kind-icon" viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="15" fill="#1B1D21"/><path d="M20 20L20 8" stroke="#F4EFE3" stroke-width="4" stroke-linecap="round"/></svg>`)
          : null;
    const label = phase === "step" ? COPY.header.stepOf(runner.index + 1, mission.steps.length).toUpperCase() : phase === "plan" ? "STEP 0" : "";
    return h("div", { class: "card-top" }, h("span", { class: "card-step" }, label), icon as unknown as HTMLElement);
  }

  function setCard(kind: "cable" | "dial" | "none", headline: string, body: string, extra: (HTMLElement | null)[] = []): void {
    card.replaceChildren(cardHead(kind), h("h2", {}, headline), h("p", { class: "card-body" }, body), ...extra.filter(Boolean) as HTMLElement[]);
  }

  function feedbackLine(kind: "ok" | "wrong" | "info", text: string): HTMLElement {
    const icon = kind === "ok" ? "✓" : kind === "wrong" ? "✕" : "●";
    return h("div", { class: `feedback ${kind}` }, h("span", { class: "fb-icon" }, icon), h("span", {}, text));
  }

  function setFeedback(kind: "ok" | "wrong" | "info" | null, text = ""): void {
    card.querySelector(".feedback")?.remove();
    if (kind) {
      const f = feedbackLine(kind, text);
      card.append(f);
    }
  }

  function setMain(label: string, style: "filled" | "outline" | "hidden", pulse = false): void {
    mainBtn.textContent = label;
    mainBtn.classList.toggle("outline", style === "outline");
    mainBtn.classList.toggle("hidden", style === "hidden");
    mainBtn.classList.toggle("pulse", pulse);
    setDisabled(mainBtn, false);
  }

  function showMore(show: boolean): void {
    moreBtn.classList.toggle("hidden", !show);
  }

  // ------------------------------------------------------------------ phases
  function render(): void {
    renderDots();
    setIdle();
    leader.replaceChildren();
    stopFigure();
    skipBtn.classList.toggle("hidden", phase === "briefing" || phase === "rest");
    if (phase === "briefing") return renderBriefing();
    if (phase === "plan") return renderPlan();
    if (phase === "step") return renderStep();
    return renderRest();
  }

  function renderBriefing(): void {
    closeWindows();
    workbench.spotlight(null);
    scrim.classList.remove("on");
    const fig = briefingFigure();
    if (fig) {
      startFigure(fig);
    } else {
      altView.replaceChildren(svgFromString(roomPlanSvg(planUnits)), h("div", { class: "alt-caption" }, COPY.rail.roomPlan));
    }
    altView.classList.add("on");
    setCard("none", content.briefing.headline, content.briefing.body);
    showMore(!!content.briefing.more);
    setMain(content.briefing.buttons?.[0] ?? COPY.rail.letsGo, "filled");
  }

  function renderPlan(): void {
    closeWindows();
    const p = content.plan;
    const fig = planFigure(p.math ?? "");
    if (fig) startFigure(fig);
    else altView.replaceChildren(h("div", { class: "plan" }, h("div", { class: "plan-math" }, p.math ?? "")));
    altView.classList.add("on");
    setCard("none", p.headline, p.body);
    showMore(!!p.more);
    setMain(p.buttons?.[0] ?? COPY.rail.next, "filled");
  }

  /** The briefing figure for this mission (UX 8.1.4 tiles, 8.2.3 sharing evenly), or null for the room plan. */
  function briefingFigure(): Figure | null {
    if (mission.id === "squares") return TileFigure.briefing();
    if (mission.id === "primes") return new SharingFigure(reduceMotion());
    if (mission.id === "trajectory") return new DotsFigure(reduceMotion());
    return null;
  }

  function planFigure(math: string): Figure | null {
    if (mission.id === "squares") return TileFigure.plan(math, reduceMotion());
    if (mission.id === "primes") return new CheckersFigure(math, reduceMotion());
    if (mission.id === "trajectory") return new HopFigure(math, reduceMotion());
    return null;
  }

  /** Shows a figure: looping, or finished at once with reduced motion. */
  function startFigure(fig: Figure): void {
    figure = fig;
    altView.replaceChildren(fig.el);
    if (reduceMotion()) fig.showFinal();
    else fig.play();
  }

  /** Stops the figure's timers and takes it (and its Again button) off the stage. */
  function stopFigure(): void {
    if (!figure) return;
    figure.stop();
    figure.el.remove();
    figure = null;
  }

  function renderStep(): void {
    altView.classList.remove("on");
    if (runner.finished) {
      phase = "rest";
      return render();
    }
    const st = runner.step!;
    acked = false;
    assistedNow = false;
    setCard(st.kind === "plug" ? "cable" : "dial", st.text.headline, st.text.body, [button(COPY.rail.showWhere, "link show-where", () => showWhere())]);
    showMore(!!st.text.more);
    setMain(COPY.rail.doIt, "outline");
    openWindows(st);
  }

  function openWindows(st: MissionStep): void {
    closeWindows();
    windows = new StepWindows(st, valuesForWindows());
    winHost.append(windows.el);
    windows.slideIn(REDUCE_MOTION);
    const units = windows.ids.map(unitOf);
    workbench.spotlight(units);
    workbench.frame(units.find((u) => u !== "trunks") ?? null, REDUCE_MOTION);
    scrim.classList.add("on");
    if (runner.phase === "dest") windows.showPreview(windows.ids[0]);
    updateGuide();
  }

  function closeWindows(): void {
    windows?.el.remove();
    windows = null;
    scrim.classList.remove("on");
    leader.replaceChildren();
  }

  function updateGuide(): void {
    if (!windows) return;
    const active = runner.activeTargets[0] ?? null;
    windows.setGuide(runner.phase === "pending" || runner.phase === "done" ? null : active, runner.ringLevel);
    mainBtn.classList.toggle("outline", !runner.doItFilled);
    mainBtn.classList.toggle("pulse", runner.doItFilled);
    drawLeader(active);
  }

  /** Leader line from the step card to the target's label chip (UX 4.3 step 5). */
  function drawLeader(active: string | null): void {
    leader.replaceChildren();
    if (!windows || !active || runner.phase === "pending" || runner.phase === "done") return;
    const a = windows.chipAnchor(active);
    if (!a) return;
    const from = { x: RAIL.x, y: RAIL.y + 140 };
    leader.append(s("path", { d: `M${from.x} ${from.y}C${from.x - 80} ${from.y} ${a.x + 80} ${a.y} ${a.x} ${a.y}`, class: "leader-line" }), s("circle", { cx: from.x, cy: from.y, r: 7, class: "leader-dot" }));
  }

  function renderRest(): void {
    closeWindows();
    workbench.spotlight(null);
    altView.classList.remove("on");
    showMore(false);
    const items = mission.config.filter((c) => c.owner === "preset" || skippedSteps.some((st) => c.owner === `step:${st.id}`));
    const cablesTotal = items.filter((c) => c.kind === "plug").length;
    const switchesTotal = items.length - cablesTotal;
    const cc = h("span", { class: "count" }, "0");
    const sc = h("span", { class: "count" }, "0");
    setCard("none", content.rest.headline, content.rest.body, [
      h("div", { class: "counters" }, h("div", { class: "counter" }, cc, h("span", {}, ` ${COPY.rail.cables(cablesTotal).replace(/^\d+ /, "")}`)), h("div", { class: "counter" }, sc, h("span", {}, ` ${COPY.rail.switches(switchesTotal).replace(/^\d+ /, "")}`))),
    ]);
    setMain(content.rest.buttons?.[0] ?? COPY.rail.continue, "hidden");
    card.dataset.cables = String(cablesTotal);
    card.dataset.switches = String(switchesTotal);
    if (restDone) return finishRest(cablesTotal, switchesTotal, cc, sc);
    // One fixed timeline (UX 7.4: about 5 s; UX 8.2.5 / 8.3.5: large presets
    // in waves and blocks, at most about 8 s): cables, then the dials.
    // Counters follow elapsed time and the screen completes on a single
    // timer, so nothing waits on animation frames or on the bridge (the
    // core already has the preset).
    const cables = items.filter((x): x is Extract<typeof x, { kind: "plug" }> => x.kind === "plug");
    const switches = items.filter((x): x is Extract<typeof x, { kind: "switch" }> => x.kind === "switch");
    const plan = restPlan(cables.length, switches.length);
    cables.forEach((c, i) => void workbench.addCable(c, { animate: true, ms: plan.cableMs, delay: plan.cableAt(i) }));
    // Dials click one by one (Squares) or in blocks (hundreds of switches).
    const blocks = new Map<number, typeof switches>();
    switches.forEach((c, i) => {
      const at = plan.switchAt(i);
      blocks.set(at, [...(blocks.get(at) ?? []), c]);
    });
    for (const [at, list] of blocks) restTimers.push(setTimeout(() => list.forEach((c) => workbench.setSwitch(c.switch, c.value, true)), at));
    const total = plan.total;
    const t0 = performance.now();
    const tick = setInterval(() => {
      const e = performance.now() - t0;
      cc.textContent = String(plan.cablesBy(e));
      sc.textContent = String(plan.switchesBy(e));
    }, 100);
    restTimers.push(tick);
    restTimers.push(
      setTimeout(() => {
        clearInterval(tick);
        restDone = true;
        finishRest(cablesTotal, switchesTotal, cc, sc);
      }, total),
    );
  }

  function finishRest(cables: number, switches: number, cc: HTMLElement, sc: HTMLElement): void {
    cc.textContent = String(cables);
    sc.textContent = String(switches);
    for (const c of mission.config) {
      if (c.kind === "plug") void workbench.addCable(c);
      else workbench.setSwitch(c.switch, c.value);
    }
    if (setupComplete) {
      setMain(content.rest.buttons?.[0] ?? COPY.rail.continue, "filled");
      void play(mainBtn, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
    }
  }

  // ------------------------------------------------------------------ actions
  function mainAction(): void {
    if (phase === "briefing") {
      phase = "plan";
      return render();
    }
    if (phase === "plan") {
      phase = "step";
      return render();
    }
    if (phase === "rest") {
      if (restDone && setupComplete) app.show({ name: "run" });
      return;
    }
    // step phase
    if (runner.phase === "done") {
      settleStep();
      if (runner.isLast) {
        runner.next();
        phase = "rest";
      } else runner.next();
      return render();
    }
    doItForMe();
  }

  function doItForMe(): void {
    const st = runner.step;
    if (!st) return;
    const res = runner.doItForMe();
    if (res.feedback.kind !== "ok") return;
    res.send.forEach((m) => app.send(m));
    assistedNow = true;
    setDisabled(mainBtn, true);
    setFeedback(null);
    playSuccess(st, true);
  }

  /**
   * The success choreography (cable across the windows, windows close, the
   * cable draws into the Workbench) runs in the background. The step is
   * complete when the bridge acks it (usually < 20 ms); Next step is live
   * from then on and jumps any remaining animation to its end.
   */
  function playSuccess(st: MissionStep, assisted: boolean): void {
    const gen = ++animGen;
    const w = windows;
    updateGuide();
    void (async () => {
      if (w) {
        if (st.kind === "plug") {
          const [a, b] = w.ids;
          w.ok(a);
          await w.drawCable(a, b, st.cable, assisted ? 900 : 600);
          w.ok(b);
        } else {
          w.closePicker();
          w.turnDial(w.ids[0], st.value);
          w.ok(w.ids[0]);
          await after(300);
        }
        await after(250);
        if (gen !== animGen) return;
        await w.close();
        if (windows === w) windows = null;
      }
      if (gen !== animGen) return;
      scrim.classList.remove("on");
      workbench.spotlight(null);
      leader.replaceChildren();
      await applyToWorkbench(st, true, !acked);
    })();
  }

  /** Jump the current step's choreography to its end state at once. */
  function settleStep(): void {
    animGen++;
    finishAll();
    const st = mission.steps[runner.index];
    closeWindows();
    workbench.spotlight(null);
    if (st && runner.status[runner.index] !== "todo") void applyToWorkbench(st, false);
  }

  function maybeShowDone(): void {
    const st = mission.steps[runner.index];
    if (!acked || !st) return;
    if (st.kind === "plug") {
      const c = configFor(st);
      if (c && c.kind === "plug") workbench.setPending(c, false);
    }
    setFeedback("ok", assistedNow ? `${COPY.rail.doneForYou}. ${st.text.done}` : st.text.done);
    setMain(runner.isLast ? (st.text.button ?? COPY.rail.finish) : COPY.rail.next, "filled");
    skipBtn.classList.toggle("hidden", runner.isLast);
    renderDots();
  }

  function stageTap(p: TapPoint): void {
    if (phase !== "step" || !windows) return ripple(p);
    if (windows.pickerOpen && p.y >= PICKER.y) return; // picker buttons handle themselves
    const id = hitTest(p, windows.targets, runner.activeTargets);
    const res = runner.tap(id);
    res.send.forEach((m) => app.send(m));
    handleFeedback(res.feedback, p);
  }

  function onPick(v: string): void {
    if (!windows) return;
    const res = runner.pick(v);
    res.send.forEach((m) => app.send(m));
    if (res.feedback.kind === "wrong") windows.pickerWrong(v);
    handleFeedback(res.feedback, null);
  }

  function handleFeedback(f: Feedback, p: TapPoint | null): void {
    const w = windows!;
    switch (f.kind) {
      case "neutral":
        if (p) ripple(p);
        return;
      case "ignored":
        return;
      case "ok-source":
        w.ok(f.id);
        w.showPreview(f.id);
        setFeedback(null);
        updateGuide();
        return;
      case "open-picker":
        w.openPicker((v) => onPick(v));
        updateGuide();
        return;
      case "wrong":
        w.wrong(f.id);
        if (f.snapBack) w.snapBack();
        setFeedback("wrong", f.text);
        updateGuide();
        return;
      case "ok":
        setFeedback(null);
        setDisabled(mainBtn, true);
        playSuccess(runner.step!, false);
        return;
    }
  }

  /** Always available during setup, including mid-transition (no dead taps). */
  function skipSetup(): void {
    if (phase === "rest") return;
    settleStep();
    const { send, stepsLeft } = runner.skipAll();
    skippedSteps = stepsLeft;
    send.forEach((m) => (m.t === "metric" ? app.metric(m) : app.send(m)));
    phase = "rest";
    render();
  }

  async function showWhere(): Promise<void> {
    if (!windows) return;
    const st = runner.step!;
    const units = windows.ids.map(unitOf).filter((u) => u !== "trunks");
    closeWindows();
    const plan = planUnits;
    altView.replaceChildren(svgFromString(roomPlanSvg(plan, units)), h("div", { class: "alt-caption" }, COPY.rail.roomPlan));
    altView.classList.add("on");
    await wait(1600);
    if (phase !== "step" || runner.step !== st) return;
    altView.classList.remove("on");
    openWindows(st);
  }

  function openMore(): void {
    if (phase === "briefing") return tellMore(app, content.briefing.headline, content.briefing.more ?? "");
    if (phase === "plan") return tellMore(app, content.plan.headline, content.plan.more ?? "");
    const st = runner.step;
    if (st) tellMore(app, st.text.headline, st.text.more ?? "");
  }

  async function backToMissions(): Promise<void> {
    if (stepDoneCount() > 0 && !(await confirm(app, COPY.confirm.textMenu, COPY.confirm.yesMenu))) return;
    app.endSession("menu");
    app.show({ name: "picker" });
  }

  async function startOver(): Promise<void> {
    if (!(await confirm(app, COPY.confirm.text, COPY.confirm.yes))) return;
    void app.startMission(mission.id, "step1");
  }

  // ------------------------------------------------------------------ bridge
  function onMessage(m: ServerMsg): void {
    if (m.t === "step_applied") {
      const st = runner.step;
      if (st && runner.ack(m.step, m.assisted)) {
        acked = true;
        app.metric({ t: "metric", ev: "step_done", mission: mission.id, step: m.step, assisted: m.assisted });
        maybeShowDone();
      }
    } else if (m.t === "setup_complete") {
      setupComplete = true;
      if (phase === "rest" && restDone) setMain(content.rest.buttons?.[0] ?? COPY.rail.continue, "filled");
    } else if (m.t === "session" && (m.state === "armed" || m.state === "running")) {
      setupComplete = true;
    }
  }

  return {
    el,
    idle: "setup",
    mount: () => {
      if (app.mirror.session && ["armed", "running", "result"].includes(app.mirror.session.state)) setupComplete = true;
      render();
      renderer.invalidate(null);
    },
    unmount: () => {
      renderer.dispose();
      stopFigure();
      for (const t of restTimers) clearTimeout(t);
      animGen++;
      closeWindows();
    },
    onMessage,
    onMachine: (units) => renderer.invalidate(units),
  };
}

export { termId };
