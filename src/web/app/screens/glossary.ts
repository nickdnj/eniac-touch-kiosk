// S15 Glossary (UX 14.4, 15; PRD FR-96): sixteen words in two pages of
// eight (2 columns x 4 rows), each with a "Show me" link to its card in
// Explore ENIAC. Static: it works with the core down (UX 14.3.8). The
// words are data in explore/content.ts.

import type { App, Screen, View } from "../app.ts";
import { h } from "../ui/dom.ts";
import { button } from "../ui/overlays.ts";
import { EXPLORE, GLOSSARY, GLOSSARY_COPY } from "../explore/content.ts";

export function glossaryScreen(app: App, view: View): Screen {
  const open = view.explore ?? { from: "explore" };
  const back: View = open.back ?? { name: "explore", explore: { from: "glossary", restore: true } };
  const pages = Math.ceil(GLOSSARY.length / GLOSSARY_COPY.perPage);
  let page = 0;

  const tiles = h("div", { class: "gl-tiles" });
  const pageBtn = button("", "light outline gl-page", () => {
    page = (page + 1) % pages;
    render();
  });
  const el = h(
    "div",
    { class: "screen glossary" },
    h(
      "div",
      { class: "header" },
      h("span", { class: "title" }, EXPLORE.title),
      h("span", { class: "spacer" }),
    ),
    h(
      "div",
      { class: "gl-head" },
      h("h2", {}, GLOSSARY_COPY.title),
      pageBtn,
      button(GLOSSARY_COPY.close, "light outline gl-close", () => app.show(back)),
    ),
    tiles,
  );

  function render(): void {
    pageBtn.textContent = page + 1 < pages ? `${GLOSSARY_COPY.more} ›` : `‹ ${GLOSSARY_COPY.first}`;
    pageBtn.classList.toggle("hidden", pages < 2);
    tiles.replaceChildren(
      ...GLOSSARY.slice(page * GLOSSARY_COPY.perPage, (page + 1) * GLOSSARY_COPY.perPage).map((t) =>
        h(
          "div",
          { class: "gl-tile", "data-term": t.term },
          h("b", {}, t.term),
          h("span", {}, t.meaning),
          t.show
            ? button(`${GLOSSARY_COPY.showMe} ›`, "link gl-show", () => {
                const restore = back.name === "explore" && !!back.explore?.restore;
                app.show({ name: "explore", explore: restore ? { from: "glossary", restore: true, card: t.show! } : { from: "glossary", card: t.show!, back } });
              })
            : null,
        ),
      ),
    );
  }

  return {
    el,
    idle: "setup",
    coreOptional: true,
    mount: () => {
      render();
      app.metric({ t: "metric", ev: "glossary_open" });
    },
  };
}
