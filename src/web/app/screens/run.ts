// S6 Run view (issue #19; UX 7.5, 8.1.4 S6, 9.3).
// Everything on the stage is real: lamps, helper readouts and the notebook
// tape come only from the bridge (state/frame/run.settled). Captions fire on
// real lamp changes, never on a timer.

import type { App, Screen } from "../app.ts";
import type { ButtonName, ServerMsg } from "../protocol.ts";
import { accumulatorRunGrid, cyclingPanel } from "../panels/art.ts";
import { LampRenderer } from "../lamps/render.ts";
import { CaptionTracker, fill, settledVars } from "../run/captions.ts";
import { h, svgFromString } from "../ui/dom.ts";
import { onTap, setDisabled } from "../ui/tap.ts";
import { button, confirm } from "../ui/overlays.ts";
import { RAIL, STAGE } from "../stage/layout.ts";
import { COPY } from "../copy.ts";

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
  const readouts: Record<string, HTMLElement> = {};
  const grids = h("div", { class: "grids" });
  for (const n of watch.slice(0, 2)) {
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
  const cyc = h("div", { class: "cyc-strip" }, svgFromString(cyclingPanel().markup));
  const tapeRows = h("div", { class: "tape-rows" });
  const tape = h("div", { class: "tape" }, h("div", { class: "tape-title" }, COPY.run.tape), tapeRows);
  stage.append(grids, cyc, tape);

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
  for (const sp of mission.run.speeds) {
    const label = sp === "slow" ? COPY.run.slow : sp === "full" ? COPY.run.full : sp;
    const b = h("div", { class: "btn speed-btn", role: "button", "data-speed": sp, "aria-pressed": "false" }, speedIcon(sp), label);
    onTap(b, () => setSpeed(sp));
    speedBtns[sp] = b;
    speedRow.append(b);
  }
  const showMe = button(run.extras.showResult, "primary show-me hidden", () => goResult());
  const rail = h("div", { class: "rail run-rail" }, card, initBtn, clearBtn, h("div", { class: "speed-label" }, COPY.run.speed), speedRow);
  rail.style.left = `${RAIL.x}px`;
  rail.style.top = `${RAIL.y}px`;
  el.append(header, stage, rail);

  const renderer = new LampRenderer(stage, () => app.mirror.machine);

  // ------------------------------------------------------------------ state
  const busy = () => app.mirror.run.state === "busy" || pending;

  function refreshButtons(): void {
    const b = busy();
    const noMachine = app.mirror.machine === null;
    initBtn.classList.toggle("busy", b);
    setDisabled(initBtn, b || noMachine);
    setDisabled(clearBtn, b || noMachine);
    for (const [sp, btn] of Object.entries(speedBtns)) {
      btn.setAttribute("aria-pressed", String(sp === speed));
      btn.classList.toggle("selected", sp === speed);
    }
    prompt.textContent = captions.prompt(b);
    captionEl.textContent = caption || (presses === 0 && !b ? captions.sub() : "");
    const extras = presses >= run.extras.afterPress;
    hint.classList.toggle("hidden", !extras || speed !== mission.run.defaultSpeed);
    showMe.classList.toggle("hidden", !extras && !app.checkpoints.has(mission.result));
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
          app.tape.push({ x: settled[watch[0]], sq: settled[watch[1]], text: fill(run.tape, settledVars(settled)) });
          const c = captions.onRun("idle", app.mirror.machine, settled);
          if (c) caption = c;
        }
        lastButton = null;
        renderTape();
      }
      refreshButtons();
    }
    if (m.t === "checkpoint" || m.t === "health" || m.t === "session") refreshButtons();
    for (const fn of runListeners) fn(m);
  }

  const extrasEls =
    hooks.extras?.({
      app,
      pressInit: () => press("init", true),
      setSpeed,
      onRunMsg: (fn) => runListeners.push(fn),
      goResult,
      isBusy: busy,
      getSpeed: () => speed,
      onClear: (fn) => clearListeners.push(fn),
    }) ?? [];
  const extrasBox = h("div", { class: "run-extras" }, ...extrasEls, showMe);
  rail.append(extrasBox);

  return {
    el,
    idle: "run",
    mount: () => {
      renderTape();
      refreshReadouts();
      refreshButtons();
      renderer.invalidate(null);
    },
    unmount: () => {
      renderer.dispose();
      if (pendingTimer) clearTimeout(pendingTimer);
      for (const fn of runListeners) fn({ t: "session", id: "", mission: "", mode: "visitor", state: "none", applied: [], remaining: 0 });
    },
    onMessage,
    onMachine: (units) => {
      renderer.invalidate(units);
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
