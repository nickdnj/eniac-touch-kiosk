// S2 mission picker (UX 8.4: suggested order, paged past three missions, START HERE /
// UP NEXT / Done) and S0 waking screens (issue #22; UX 3.1). S1 is the live
// attract screen (screens/attract.ts, UX 14.2), re-exported here as
// `startScreen`. No machine is drawn on S2 or S0 (no demo fallback).

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
import { pickerArtFor } from "../missions/registry.ts";

/** Taps landing on S2 this soon after S1 are the same visitor's double tap (FR-31). */
export const PICKER_ARM_MS = 600;

/** S1 is the live attract screen (UX 14.2): screens/attract.ts. */
export { attractScreen as startScreen } from "./attract.ts";

/** Cards on screen at once: three fill the screen (UX 8.4). More missions page through them. */
export const PICKER_PAGE = 3;

export function pickerScreen(app: App): Screen {
  const armedAt = app.now() + PICKER_ARM_MS;
  const armed = () => app.now() >= armedAt;
  const list = (app.missions ?? []).filter((m) => m.available).sort((a, b) => a.order - b.order);
  const cards = h("div", { class: "mission-cards" });
  // UX 8.4: START HERE on card 1 until a mission is done this visit; then
  // UP NEXT on the lowest-numbered card not done; no chip when all are done.
  const nextUp = list.find((m) => !app.done.has(m.id))?.id ?? null;
  const anyDone = list.some((m) => app.done.has(m.id));
  // With more than PICKER_PAGE missions the cards page; it opens on the page that holds the next one to do.
  const pages = Math.max(1, Math.ceil(list.length / PICKER_PAGE));
  let page = Math.max(0, Math.floor(list.findIndex((m) => m.id === nextUp) / PICKER_PAGE));
  const pager = h("div", { class: "pk-pager" });
  function renderCards(): void {
    cards.replaceChildren();
    list.slice(page * PICKER_PAGE, (page + 1) * PICKER_PAGE).forEach((m, i) => {
      if (i > 0) cards.append(h("div", { class: "mc-then", "aria-hidden": "true" }, h("span", { class: "chev" }, "›"), h("span", {}, COPY.picker.then)));
      cards.append(missionCard(app, m, armed, m.id === nextUp ? (anyDone ? COPY.picker.upNext : COPY.picker.startHere) : null));
    });
    if (!list.length) cards.append(h("div", { class: "waiting" }, h("span", { class: "spinner" }), COPY.waitingMachine));
    if (pages > 1) {
      const first = page * PICKER_PAGE + 1;
      const last = Math.min(list.length, (page + 1) * PICKER_PAGE);
      pager.replaceChildren(
        h("div", { class: "pk-pager-note" }, COPY.picker.showing(first, last, list.length)),
        h(
          "div",
          { class: "pk-pager-btns" },
          button(`‹ ${COPY.picker.earlier}`, `light outline${page === 0 ? " disabled" : ""}`, () => armed() && page > 0 && (page--, renderCards())),
          button(`${COPY.picker.more} ›`, `primary light${page === pages - 1 ? " disabled" : ""}`, () => armed() && page < pages - 1 && (page++, renderCards())),
        ),
      );
    }
  }
  renderCards();
  const el = h(
    "div",
    { class: "screen mission-picker" },
    h("div", { class: "header" }, h("span", { class: "screen-title" }, COPY.picker.title)),
    pages > 1 ? pager : null,
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

/** Static card art (UX 8.4): the mission's own picture from missions/registry.ts, or a generic numbered card. */
export function pickerArt(id: string, order = 0): string {
  return pickerArtFor(id, order);
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
    svgFromString(pickerArtFor(m.id, m.order)) as unknown as HTMLElement,
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
