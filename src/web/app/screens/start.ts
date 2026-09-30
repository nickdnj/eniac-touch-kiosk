// Interim S1 start, S2 mission picker and S0 waking screens (issue #22;
// UX 7.1, 7.2, 3.1). Live attract is M2. No machine is drawn on any of
// these: there is nothing to show until a session exists (no demo fallback).

import type { App, Screen } from "../app.ts";
import type { MissionSummary } from "../protocol.ts";
import { fetchMission } from "../net/api.ts";
import { h } from "../ui/dom.ts";
import { onTap } from "../ui/tap.ts";
import { COPY } from "../copy.ts";

/** Taps landing on S2 this soon after S1 are the same visitor's double tap (FR-31). */
export const PICKER_ARM_MS = 600;

export function startScreen(app: App): Screen {
  const el = h(
    "div",
    { class: "screen start", role: "button", "aria-label": COPY.start.pill },
    h("div", { class: "start-title" }, COPY.start.title),
    h("div", { class: "start-sub" }, COPY.start.subtitle),
    h("div", { class: "start-pill" }, COPY.start.pill),
  );
  // The whole screen is the target; the first touch only leaves S1.
  onTap(el, () => app.show({ name: "picker" }));
  return {
    el,
    idle: "none",
    mount: () => app.root.querySelector("#admin-zone")?.classList.add("hide-mark"),
    unmount: () => app.root.querySelector("#admin-zone")?.classList.remove("hide-mark"),
  };
}

export function pickerScreen(app: App): Screen {
  const armedAt = app.now() + PICKER_ARM_MS;
  const armed = () => app.now() >= armedAt;
  const list = (app.missions ?? []).filter((m) => m.available).sort((a, b) => a.order - b.order);
  const cards = h("div", { class: "mission-cards" });
  list.forEach((m, i) => cards.append(missionCard(app, m, i, armed)));
  if (!list.length) cards.append(h("div", { class: "waiting" }, h("span", { class: "spinner" }), COPY.waitingMachine));
  const el = h(
    "div",
    { class: "screen picker" },
    h("div", { class: "header" }, h("span", { class: "screen-title" }, COPY.picker.title)),
    cards,
  );
  return { el, idle: "setup" };
}

function missionCard(app: App, m: MissionSummary, i: number, armed: () => boolean): HTMLElement {
  const steps = h("div", { class: "mc-meta" });
  // Step count comes from the compiled mission (not in the summary).
  fetchMission(m.id)
    .then((c) => (steps.textContent = COPY.picker.wire(c.steps.length)))
    .catch(() => {});
  const start = h("div", { class: "btn primary mc-start", role: "button" }, COPY.picker.start);
  const card = h(
    "div",
    { class: "mission-card", "data-mission": m.id },
    h("div", { class: "mc-top" }, h("span", { class: "mc-badge" }, String(m.order)), i === 0 ? h("span", { class: "mc-here" }, COPY.picker.startHere) : null),
    h("div", { class: "mc-title" }, m.title),
    steps,
    h("div", { class: "mc-teaser" }, m.summary),
    start,
  );
  const go = () => {
    if (!armed()) return;
    void app.startMission(m.id, "briefing");
  };
  onTap(card, go);
  onTap(start, go);
  return card;
}

export function wakingScreen(): Screen {
  const el = h("div", { class: "screen waking" }, h("div", { class: "waiting" }, h("span", { class: "spinner" }), COPY.wakingUp));
  return { el, idle: "none" };
}
