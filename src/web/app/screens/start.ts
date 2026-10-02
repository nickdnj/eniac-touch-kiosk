// Interim S1 start, S2 mission picker (UX 8.4: three missions, suggested
// order, START HERE / UP NEXT / Done) and S0 waking screens (issue #22;
// UX 7.1, 3.1). Live attract is still to come. No machine is drawn on any
// of these: there is nothing to show until a session exists (no demo
// fallback).

import type { App, Screen } from "../app.ts";
import type { MissionSummary } from "../protocol.ts";
import { fetchMission } from "../net/api.ts";
import { h, svgFromString } from "../ui/dom.ts";
import { onTap } from "../ui/tap.ts";
import { COPY } from "../copy.ts";
import { button } from "../ui/overlays.ts";
import { HONOR } from "../content/honor.ts";
import { openHonor } from "./honor.ts";
import { EXPLORE } from "../explore/content.ts";
import { FINALE } from "../content/finale.ts";

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
  // UX 8.4: START HERE on card 1 until a mission is done this visit; then
  // UP NEXT on the lowest-numbered card not done; no chip when all are done.
  const nextUp = list.find((m) => !app.done.has(m.id))?.id ?? null;
  const anyDone = list.some((m) => app.done.has(m.id));
  list.forEach((m, i) => {
    if (i > 0) cards.append(h("div", { class: "mc-then", "aria-hidden": "true" }, h("span", { class: "chev" }, "›"), h("span", {}, COPY.picker.then)));
    cards.append(missionCard(app, m, armed, m.id === nextUp ? (anyDone ? COPY.picker.upNext : COPY.picker.startHere) : null));
  });
  if (!list.length) cards.append(h("div", { class: "waiting" }, h("span", { class: "spinner" }), COPY.waitingMachine));
  const el = h(
    "div",
    { class: "screen mission-picker" },
    h("div", { class: "header" }, h("span", { class: "screen-title" }, COPY.picker.title)),
    cards,
    // UX 14.5.1 / 14.9: once every mission is done, "See the finale" replaces the suggested order.
    list.length && !nextUp
      ? button(`${FINALE.pickerChip} ›`, "light pk-finale", () => armed() && app.show({ name: "finale", beat: 1 }))
      : list.length > 1
        ? h("div", { class: "mc-order" }, h("span", {}, COPY.picker.order), h("span", {}, COPY.picker.orderLine(list.map((m) => m.order))))
        : null,
    exploreButton(app, armed),
    honorButton(app, armed),
  );
  return { el, idle: "setup" };
}

/** UX 14.9: "About and honor roll", 480 x 96 at x912 y848 (S11; Back returns here). */
function honorButton(app: App, armed: () => boolean): HTMLElement {
  return button(HONOR.pickerButton, "primary light outline picker-honor", () => {
    if (armed()) openHonor(app, 1, { name: "picker" });
  });
}

/** UX 14.9: "Explore ENIAC", 800 x 96 at x80 y848, under the mission cards (not a fourth mission: no number). */
function exploreButton(app: App, armed: () => boolean): HTMLElement {
  const b = h(
    "div",
    { class: "btn primary light pk-explore", role: "button" },
    svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 56" width="64" height="56" aria-hidden="true"><path d="M8 50V8H56V50" fill="none" stroke="#1B1D21" stroke-width="8" stroke-linejoin="round"/></svg>`) as unknown as HTMLElement,
    EXPLORE.pickerButton,
  );
  onTap(b, () => armed() && app.show({ name: "explore", explore: { from: "picker", back: { name: "picker" } } }));
  return b;
}

/**
 * Static card art (UX 8.4): the tile floor from the missions, drawn in the
 * lamp colour on the panel colour with a cream outline. Not animated.
 */
export function pickerArt(id: string): string {
  const W = 480, H = 200;
  const tile = (x: number, y: number, s = 30) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="4" fill="#FFB000" stroke="#F4EFE3" stroke-width="2"/>`;
  let b = `<rect x="0" y="0" width="${W}" height="${H}" rx="12" fill="#1B1D21"/>`;
  if (id === "squares") {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) b += tile(186 + c * 38, 46 + r * 38);
  } else if (id === "primes") {
    // 12 as a 3 x 4 block (it shares evenly) beside 7 in a row with a star (prime).
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) b += tile(44 + c * 34, 50 + r * 34, 28);
    for (let c = 0; c < 7; c++) b += tile(212 + c * 34, 118, 28);
    b += `<path d="M427 64l8 16 18 3-13 12 3 18-16-9-16 9 3-18-13-12 18-3z" fill="#F4EFE3"/>`;
  } else if (id === "trajectory") {
    b += `<path d="M30 176H450" stroke="#9AA0A8" stroke-width="2" stroke-dasharray="6 6"/>`;
    b += `<g transform="rotate(-35 54 166)"><rect x="40" y="156" width="54" height="16" rx="4" fill="#F4EFE3"/></g><circle cx="52" cy="172" r="12" fill="#1B1D21" stroke="#F4EFE3" stroke-width="3"/>`;
    for (let i = 0; i < 8; i++) {
      const t = (i + 1) / 9;
      const x = 70 + t * 360, y = 176 - 4 * 130 * t * (1 - t) - 4;
      b += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="#FFB000" stroke="#F4EFE3" stroke-width="2"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="mc-art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${b}</svg>`;
}

function missionCard(app: App, m: MissionSummary, armed: () => boolean, chip: string | null): HTMLElement {
  const done = app.done.has(m.id);
  const reads = (m.buttons ?? []).includes("read");
  const steps = h("div", { class: "mc-meta mc-steps" });
  if (typeof m.steps === "number" && m.steps > 0) steps.textContent = COPY.picker.wire(m.steps, reads);
  else
    fetchMission(m.id)
      .then((c) => (steps.textContent = COPY.picker.wire(c.steps.length, reads)))
      .catch(() => {});
  const start = h("div", { class: "btn primary mc-start", role: "button" }, COPY.picker.start);
  const card = h(
    "div",
    { class: `mission-card${done ? " done" : ""}`, "data-mission": m.id },
    svgFromString(pickerArt(m.id)) as unknown as HTMLElement,
    h("span", { class: "mc-badge" }, String(m.order)),
    chip ? h("span", { class: "mc-here" }, h("span", { class: "mc-finger", "aria-hidden": "true" }, "☞"), chip) : null,
    done ? h("span", { class: "mc-done" }, h("span", { class: "mc-check", "aria-hidden": "true" }, "✓"), COPY.picker.done) : null,
    h("div", { class: "mc-title" }, m.title),
    m.minutes ? h("div", { class: "mc-meta mc-min" }, COPY.picker.about(m.minutes)) : null,
    steps,
    h("div", { class: "mc-teaser" }, m.summary),
    start,
  );
  const go = () => {
    if (!armed()) return;
    app.metric({ t: "metric", ev: "mission_picked", mission: m.id, n: m.order });
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
