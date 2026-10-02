// S6 Run view (issue #19; UX 7.5, 8.1.4 S6, 8.2.5 S6, 9.3).
// Everything on the stage is real: lamps, helper readouts, the notebook
// tape and the punched cards come only from the bridge (state/frame/
// run.settled/punch). Captions fire on real lamp changes and cards, never on
// a timer. Squares has the two lamp grids and the tape; card missions
// (Primes) get a card stage (run/stackstage.ts), INIT once, and extras that
// appear with the Nth card.

import type { App, Screen } from "../app.ts";
import type { ButtonName, ServerMsg } from "../protocol.ts";
import { accumulatorRunGrid, cyclingPanel } from "../panels/art.ts";
import { LampRenderer } from "../lamps/render.ts";
import { CaptionTracker, fill, settledVars } from "../run/captions.ts";
import { h, svgFromString } from "../ui/dom.ts";
import { onTap, setDisabled } from "../ui/tap.ts";
import { button, confirm } from "../ui/overlays.ts";
import { RAIL, STAGE } from "../stage/layout.ts";
import { stackStage, type RunStage } from "../run/stackstage.ts";
import { COPY } from "../copy.ts";

const REDUCE_MOTION = false; // UX 9.5: staff setting; wired to config in M3
function reduceMotion(): boolean {
  return REDUCE_MOTION || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/**
 * Optional stages by card-pane style. Squares (no run.cards) keeps its own
 * stage below; "stack" is Primes. Other styles register here.
 */
export const RUN_STAGES: Record<string, (app: App, reduceMotion: boolean) => RunStage> = { stack: stackStage };

export const INIT_DEBOUNCE_MS = 400;
const PENDING_TIMEOUT_MS = 2000;

export interface RunHooks {
  /** Extra rail controls (autopress, #20) get the screen's context. */
  extras?: (ctx: RunContext) => HTMLElement[];
}

export interface RunContext {
  app: App;
  pressInit: () => boolean;
  setSpeed: (s: string) => void;
  onRunMsg: (fn: (m: ServerMsg) => void) => void;
  goResult: () => void;
  isBusy: () => boolean;
  getSpeed: () => string;
  onClear: (fn: () => void) => void;
}

/** Snail (Slow) and bolt (Full) glyphs, drawn so no emoji font is needed. */
function speedIcon(sp: string): HTMLElement {
  const svg =
    sp === "slow"
      ? `<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 48 32" width="48" height="32"><path d="M4 28H40C44 28 46 25 46 22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="17" r="10" fill="none" stroke="currentColor" stroke-width="3"/><path d="M22 17m-4 0a4 4 0 1 0 4 -4" fill="none" stroke="currentColor" stroke-width="3"/><path d="M38 26L40 12M44 25L46 13" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`
      : sp === "full"
        ? `<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 32 32" width="32" height="32"><path d="M19 2L5 18H15L12 30L27 13H17Z" fill="currentColor"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 32 32" width="32" height="32"></svg>`;
  return svgFromString(svg) as unknown as HTMLElement;
}

export function runScreenFactory(hooks: RunHooks = {}) {
  return (app: App): Screen => runScreen(app, hooks);
}

function runScreen(app: App, hooks: RunHooks): Screen {
  const mission = app.mission!;
  const run = mission.content.run;
  const captions = new CaptionTracker(run);
  const watch = mission.run.watch;
  let speed = mission.run.defaultSpeed;
  let pending = false;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPress = -Infinity;
  let lastButton: ButtonName | null = null;
  let caption = "";
  let presses = 0;
  const runListeners: ((m: ServerMsg) => void)[] = [];
  const clearListeners: (() => void)[] = [];

  // ------------------------------------------------------------------ DOM
  const el = h("div", { class: "screen run" });
  const header = h(
    "div",
    { class: "header" },
    button(`‹ ${COPY.header.missions}`, "light outline hdr-missions", () => backToMissions()),
    h("span", { class: "title" }, COPY.header.mission(mission.order, mission.title)),
    h("span", { class: "spacer" }),
    button(COPY.header.startOver, "light outline hdr-startover", () => startOver()),
  );

  const stage = h("div", { class: "stage run-stage" });
  stage.style.left = `${STAGE.x}px`;
  stage.style.top = `${STAGE.y}px`;
  const cardStyle = mission.run.cards?.style;
  const cardStage: RunStage | null = cardStyle && RUN_STAGES[cardStyle] ? RUN_STAGES[cardStyle](app, reduceMotion()) : null;
  const extrasAt = run.extras.afterCards ?? 0; // card missions: extras with the Nth card
  const readouts: Record<string, HTMLElement> = {};
  const grids = h("div", { class: "grids" });
  for (const n of cardStage ? [] : watch.slice(0, 2)) {
    const ro = h("span", { class: "readout-value", "data-acc": n }, "–");
    readouts[n] = ro;
    const col = h(
      "div",
      { class: "acc-col" },
      h(
        "div",
        { class: "acc-head" },
        h("div", { class: "acc-title" }, h("span", {}, `ACCUMULATOR ${n}`)),
        h("div", { class: "readout" }, h("span", { class: "readout-label" }, COPY.run.helper), ro),
      ),
      svgFromString(accumulatorRunGrid(Number(n)).markup),
    );
    grids.append(col);
  }
  const tapeRows = h("div", { class: "tape-rows" });
  if (cardStage) stage.append(cardStage.el);
  else {
    const cyc = h("div", { class: "cyc-strip" }, svgFromString(cyclingPanel().markup));
    const tape = h("div", { class: "tape" }, h("div", { class: "tape-title" }, COPY.run.tape), tapeRows);
    stage.append(grids, cyc, tape);
  }

  // Rail.
  const prompt = h("h2", { class: "run-prompt" });
  const captionEl = h("p", { class: "run-caption" });
  const hint = h("p", { class: "run-hint hidden" }, run.extras.hint ?? "");
  const card = h("div", { class: "run-card" }, prompt, captionEl, hint);
  const initBtn = h(
    "div",
    { class: "btn primary init-btn", role: "button" },
    h("span", { class: "spinner" }),
    h("span", { class: "init-label" }, h("span", { class: "big" }, COPY.run.init), h("span", { class: "sub" }, COPY.run.initSub)),
  );
  onTap(initBtn, () => press("init"));
  const clearBtn = h("div", { class: "btn clear-btn", role: "button" }, h("span", {}, COPY.run.clear), h("span", { class: "sub" }, COPY.run.clearSub));
  onTap(clearBtn, () => press("clear"));
  if (!mission.run.buttons.includes("clear")) clearBtn.classList.add("hidden");
  const speedBtns: Record<string, HTMLElement> = {};
  const speedRow = h("div", { class: "speed-row" });
  const speedLabel = h("div", { class: "speed-label" }, COPY.run.speed);
  // One speed (Trajectory: Full only) means no speed control at all.
  const hasSpeeds = mission.run.speeds.length > 1;
  for (const sp of mission.run.speeds) {
    const label = sp === "slow" ? COPY.run.slow : sp === "full" ? COPY.run.full : sp;
    const b = h("div", { class: "btn speed-btn", role: "button", "data-speed": sp, "aria-pressed": "false" }, speedIcon(sp), label);
    onTap(b, () => setSpeed(sp));
    speedBtns[sp] = b;
    speedRow.append(b);
  }
  const showMe = button(run.extras.showResult, "primary show-me hidden", () => goResult());
  const rail = h("div", { class: "rail run-rail" }, card, initBtn, clearBtn, speedLabel, speedRow);
  if (!hasSpeeds) {
    speedLabel.classList.add("hidden");
    speedRow.classList.add("hidden");
  }
  rail.style.left = `${RAIL.x}px`;
  rail.style.top = `${RAIL.y}px`;
  el.append(header, stage, rail);

  const renderer = cardStage ? null : new LampRenderer(stage, () => app.mirror.machine);

  // ------------------------------------------------------------------ state
  const busy = () => app.mirror.run.state === "busy" || pending;
  /** INIT once per session (Primes, Trajectory): pressed already? */
  const initUsed = () => !!mission.run.initOnce && (presses > 0 || app.mirror.run.inits > 0);
  const extrasOn = () => (extrasAt > 0 ? app.cards.count >= extrasAt : presses >= run.extras.afterPress);

  function refreshButtons(): void {
    const b = busy();
    const noMachine = app.mirror.machine === null;
    initBtn.classList.toggle("busy", b);
    initBtn.classList.toggle("used", initUsed());
    setDisabled(initBtn, b || noMachine || initUsed());
    setDisabled(clearBtn, b || noMachine);
    for (const [sp, btn] of Object.entries(speedBtns)) {
      btn.setAttribute("aria-pressed", String(sp === speed));
      btn.classList.toggle("selected", sp === speed);
    }
    const extras = extrasOn();
    const done = app.checkpoints.has(mission.result);
    prompt.textContent = done && run.done ? run.done.headline : extras && run.extras.headline ? run.extras.headline : captions.prompt(b);
    captionEl.textContent = caption || (presses === 0 && !b ? captions.sub() : "");
    hint.classList.toggle("hidden", !extras || !hasSpeeds || speed !== mission.run.defaultSpeed);
    showMe.classList.toggle("hidden", !extras && !done);
    skipBtn?.classList.toggle("hidden", !extras || done);
    if (extrasAt > 0 && hasSpeeds) {
      // Card missions: the speed control arrives with the extras (UX 8.2.5).
      speedLabel.classList.toggle("hidden", !extras);
      speedRow.classList.toggle("hidden", !extras);
    }
    rail.classList.toggle("extras", extras);
  }

  function refreshReadouts(): void {
    const m = app.mirror.machine;
    for (const n of Object.keys(readouts)) {
      const v = m?.acc?.[n]?.value;
      readouts[n].textContent = typeof v === "number" ? String(v) : "–";
    }
  }

  function renderTape(): void {
    tapeRows.replaceChildren(...app.tape.map((r) => h("span", { class: "tape-row" }, r.text)));
  }

  function settledNow(): Record<string, number> {
    const m = app.mirror.machine;
    const out: Record<string, number> = {};
    for (const n of watch) {
      const v = m?.acc?.[n]?.value;
      if (typeof v === "number") out[n] = v;
    }
    return out;
  }

  /** Sends INIT or CLEAR: debounced, never while busy (UX-07, 9.3). */
  function press(b: ButtonName, auto = false): boolean {
    const t = app.now();
    if (busy() || (!auto && t - lastPress < INIT_DEBOUNCE_MS) || app.mirror.machine === null) return false;
    if (b === "init" && initUsed()) return false;
    if (app.send({ t: "button", b }) === null) return false;
    lastPress = t;
    lastButton = b;
    pending = true;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      pending = false;
      refreshButtons();
    }, PENDING_TIMEOUT_MS);
    if (b === "init") {
      presses++;
      caption = "";
      captions.onPress();
    }
    refreshButtons();
    return true;
  }

  function setSpeed(sp: string): void {
    if (sp === speed) return;
    speed = sp;
    app.send({ t: "set_speed", speed: sp });
    app.metric({ t: "metric", ev: "speed", mission: mission.id, speed: sp });
    refreshButtons();
  }

  function goResult(): void {
    app.show({ name: "result" });
  }

  /**
   * Card missions' "Skip to the answer" (UX 8.2.5): Full speed, then S7 at
   * once. The punch cannot go faster than the machine, so S7 waits for the
   * answer checkpoint with a live count; nothing is made up.
   */
  function skipToAnswer(): void {
    app.metric({ t: "metric", ev: "skip_to_answer", mission: mission.id });
    if (hasSpeeds && mission.run.speeds.includes("full") && speed !== "full") setSpeed("full");
    goResult();
  }

  async function backToMissions(): Promise<void> {
    if (!(await confirm(app, COPY.confirm.textMenu, COPY.confirm.yesMenu))) return;
    app.endSession("menu");
    app.show({ name: "picker" });
  }

  async function startOver(): Promise<void> {
    if (!(await confirm(app, COPY.confirm.text, COPY.confirm.yes))) return;
    void app.startMission(mission.id, "step1");
  }

  function onMessage(m: ServerMsg): void {
    if (m.t === "run") {
      if (m.state === "busy") {
        pending = false;
        if (pendingTimer) clearTimeout(pendingTimer);
        const c = captions.onRun("busy", app.mirror.machine);
        if (c) caption = c;
      } else {
        pending = false;
        const settled = m.settled ?? {};
        if (lastButton === "clear") {
          app.tape = [];
          presses = 0;
          caption = "";
          captions.onClear();
          for (const fn of clearListeners) fn();
        } else if (lastButton === "init" && watch.every((w) => typeof settled[w] === "number")) {
          if (run.tape) app.tape.push({ x: settled[watch[0]], sq: settled[watch[1]], text: fill(run.tape, settledVars(settled)) });
          const c = captions.onRun("idle", app.mirror.machine, settled);
          if (c) caption = c;
        }
        lastButton = null;
        renderTape();
      }
      refreshButtons();
    }
    if (m.t === "punch") {
      cardStage?.onCards();
      const c = captions.onCards(app.mirror.machine, { count: app.cards.count, apex: !!app.cards.apex, landed: !!app.cards.landed });
      if (c) caption = c;
      refreshButtons();
    }
    if (m.t === "checkpoint" && m.id === mission.result && run.extras.autoResultMs) {
      autoTimer = setTimeout(() => goResult(), run.extras.autoResultMs);
    }
    if (m.t === "checkpoint" || m.t === "health" || m.t === "session") refreshButtons();
    for (const fn of runListeners) fn(m);
  }

  let autoTimer: ReturnType<typeof setTimeout> | null = null;
  // Squares: "Keep pressing for me" and its "Skip to the answer" loop (#20).
  // Card missions: Skip goes to S7 at Full (no loop: one INIT runs it all).
  const skipBtn = extrasAt > 0 && run.extras.skipToAnswer ? button(run.extras.skipToAnswer, "skip-answer-btn", () => skipToAnswer()) : null;
  const extrasEls = skipBtn
    ? [skipBtn]
    : hooks.extras?.({
      app,
      pressInit: () => press("init", true),
      setSpeed,
      onRunMsg: (fn) => runListeners.push(fn),
      goResult,
      isBusy: busy,
      getSpeed: () => speed,
      onClear: (fn) => clearListeners.push(fn),
    }) ?? [];
  const extrasBox = h("div", { class: "run-extras" }, ...(skipBtn ? [showMe, ...extrasEls] : [...extrasEls, showMe]));
  rail.append(extrasBox);

  return {
    el,
    idle: "run",
    mount: () => {
      renderTape();
      refreshReadouts();
      refreshButtons();
      renderer?.invalidate(null);
      cardStage?.mount();
      // Re-entering the run view mid-run: the card captions catch up.
      if (app.cards.count) captions.onCards(app.mirror.machine, { count: app.cards.count, apex: !!app.cards.apex, landed: !!app.cards.landed });
    },
    unmount: () => {
      renderer?.dispose();
      cardStage?.dispose();
      if (autoTimer) clearTimeout(autoTimer);
      if (pendingTimer) clearTimeout(pendingTimer);
      for (const fn of runListeners) fn({ t: "session", id: "", mission: "", mode: "visitor", state: "none", applied: [], remaining: 0 });
    },
    onMessage,
    onMachine: (units) => {
      renderer?.invalidate(units);
      cardStage?.onMachine(units);
      if (units === null || units.some((u) => u.startsWith("acc."))) refreshReadouts();
      const c = captions.onMachine(app.mirror.machine);
      if (c) {
        caption = c;
        refreshButtons();
      }
      if (units === null) refreshButtons();
    },
  };
}
