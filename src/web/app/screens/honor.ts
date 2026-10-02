// S11 About and honor roll (UX 14.6, PRD FR-41, FR-43, FR-44): four pages,
// one screen each, no scrolling, no swipe. Page 1 credits Brian L. Stuart,
// whose simulator runs everything on this kiosk; page 2 the six women who
// first programmed ENIAC; page 3 its builders; page 4 this exhibit and the
// sources of our missions. All words: content/honor.ts.
//
// Static: it keeps working while the core is down (UX 14.7, coreOptional).
// Idle: the setup timer (90 s, then "Still there?", then S1). Back returns
// to where the visitor came from (the picker, S7, or the finale).

import type { App, Screen, View } from "../app.ts";
import { h } from "../ui/dom.ts";
import { onTap } from "../ui/tap.ts";
import { button } from "../ui/overlays.ts";
import { HONOR, shown } from "../content/honor.ts";
import { builderPlates, programmerPlates, qrBlock, stuartPlate } from "../ui/plates.ts";
import { EXPLORE } from "../explore/content.ts";

export const HONOR_PAGES = HONOR.pages.filter(shown);

/** Opens S11 on a page (1 to 4); Back returns to `back` (default: the picker). */
export function openHonor(app: App, page = 1, back?: View): void {
  app.show({ name: "honor", page, back });
}

function pageStuart(): HTMLElement {
  const s = HONOR.stuart;
  const left = h(
    "div",
    { class: "hp-left" },
    stuartPlate("page"),
    ...s.lead.map((p, i) => h("p", { class: i === s.lead.length - 1 ? "lead strong" : "lead" }, p)),
    h("p", { class: "body" }, s.paper.text),
    h("p", { class: "body muted" }, s.alsoLine),
  );
  const right = h(
    "div",
    { class: "hp-right qr-card" },
    qrBlock(s.qr, 280, "main"),
    h("div", { class: "qr-more" }, ...s.more.filter(shown).map((l) => qrBlock(l, 150, "small"))),
  );
  return h("div", { class: "honor-page page-stuart" }, left, right);
}

function pageProgrammers(): HTMLElement {
  const p = HONOR.programmers;
  return h(
    "div",
    { class: "honor-page page-programmers" },
    h("p", { class: "lead" }, p.lead),
    h("div", { class: "plate-role" }, p.role),
    h("div", { class: "plate-grid" }, ...programmerPlates()),
    h("p", { class: "body foot" }, p.shell),
  );
}

function pageBuilders(): HTMLElement {
  const b = HONOR.builders;
  return h(
    "div",
    { class: "honor-page page-builders" },
    h("p", { class: "lead" }, b.lead),
    h("div", { class: "plate-grid" }, ...builderPlates()),
    h("p", { class: "body foot" }, b.thanks),
  );
}

function pageExhibit(): HTMLElement {
  const e = HONOR.exhibit;
  const sources = h(
    "div",
    { class: "sources" },
    h("div", { class: "src-title" }, e.sourcesTitle),
    ...e.sources.filter(shown).map((s, i) =>
      h("div", { class: "src" }, h("span", { class: "src-badge", "aria-hidden": "true" }, String(i + 1)), h("div", {}, h("div", { class: "src-what" }, s.what), h("div", { class: "src-from" }, s.from))),
    ),
  );
  const left = h("div", { class: "hp-left" }, h("p", { class: "lead" }, e.lead), sources, h("p", { class: "body small type-credit" }, e.type));
  const right = h(
    "div",
    { class: "hp-right museum-card" },
    h("div", { class: "src-title" }, e.museumTitle),
    h("p", { class: "body" }, e.museum),
    qrBlock(e.qr, 150, "museum-qr"),
    h("p", { class: "body made-by" }, h("strong", {}, e.madeBy), h("br", {}), h("span", { class: "small" }, e.madeByRole)),
    h("p", { class: "body welcome" }, e.welcome),
  );
  return h("div", { class: "honor-page page-exhibit" }, left, right);
}

const BUILD: Record<string, () => HTMLElement> = {
  stuart: pageStuart,
  programmers: pageProgrammers,
  builders: pageBuilders,
  exhibit: pageExhibit,
};

export function honorScreen(app: App, view: View): Screen {
  const pages = HONOR_PAGES;
  let index = Math.min(Math.max((view.page ?? 1) - 1, 0), pages.length - 1);
  const host = h("div", { class: "honor-host" });
  const tabs = pages.map((p, i) => {
    const t = h("div", { class: "btn honor-tab", role: "tab", "data-page": String(i + 1) }, p.tab);
    onTap(t, () => go(i));
    return t;
  });
  const next = button("", "primary light honor-next", () => go(index + 1));

  const back = () => {
    const to = view.back ?? { name: "picker" };
    // A mission screen without its session is gone: the menu instead.
    if (["mission", "run", "result"].includes(to.name) && !app.mirror.session) app.show({ name: "picker" });
    else app.show(to);
  };

  function go(i: number): void {
    if (i < 0 || i >= pages.length) return;
    const first = !host.firstChild;
    if (!first && i === index) return;
    index = i;
    tabs.forEach((t, k) => {
      t.classList.toggle("on", k === i);
      t.setAttribute("aria-selected", k === i ? "true" : "false");
    });
    const page = BUILD[pages[i].id]();
    page.dataset.page = String(i + 1);
    host.replaceChildren(page);
    const nxt = pages[i + 1];
    next.textContent = nxt ? `Next: ${nxt.tab} ›` : "";
    next.classList.toggle("hidden", !nxt);
    cables.classList.toggle("hidden", pages[i].id !== "programmers");
    app.metric({ t: "metric", ev: "honor_page_view", n: i + 1 });
  }

  // UX 14.3.7: page 2 opens Explore ENIAC on card 12, the program trays; its Back returns here.
  const cables = button(`${EXPLORE.fromHonor} ›`, "light outline honor-cables", () =>
    app.show({ name: "explore", explore: { from: "honor", card: "pt", back: { name: "honor", page: index + 1, back: view.back } } }),
  );

  const el = h(
    "div",
    { class: "screen honor" },
    h("div", { class: "header" }, h("span", { class: "title" }, HONOR.screenTitle)),
    h("div", { class: "honor-tabs", role: "tablist" }, ...tabs),
    host,
    h("div", { class: "honor-actions" }, button(HONOR.back, "primary light outline honor-back", back), cables, next),
  );

  return {
    el,
    idle: "setup",
    coreOptional: true,
    mount: () => go(index),
  };
}
