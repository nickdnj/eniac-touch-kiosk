// S10 "ENIAC is resting" (issue #24; UX 7.9, FR-50..52, architecture 5.8).
// No demo fallback, ever: a static silhouette only. No lamps, no recorded
// run, no cards. The App shows this for health.core=down, a link down for
// more than 5 s (E-LINK) or no runnable mission (E-MISSION), and returns to
// S1 by itself on recovery (FR-51).

import type { App, Screen } from "../app.ts";
import type { ServerMsg } from "../protocol.ts";
import { panelFace } from "../panels/art.ts";
import { h, svgFromString } from "../ui/dom.ts";
import { COPY } from "../copy.ts";

function silhouette(): SVGSVGElement {
  // Four unlit cabinet outlines: shape only, no lamps, no state.
  let b = "";
  for (let i = 0; i < 4; i++) b += `<g transform="translate(${i * 330} 0)" opacity=".35">${panelFace(300, 680)}</g>`;
  return svgFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="silhouette" viewBox="0 0 1290 680" width="1290" height="680">${b}</svg>`);
}

export function errorScreen(app: App): Screen {
  const body = h("p", { class: "err-body" });
  const trying = h("p", { class: "err-trying" });
  const code = h("div", { class: "err-code" });
  const el = h(
    "div",
    { class: "screen error" },
    silhouette() as unknown as HTMLElement,
    h("div", { class: "err-text" }, h("h1", { class: "screen-title" }, COPY.error.title), body, trying),
    code,
  );

  const refresh = () => {
    const hl = app.mirror.health;
    const c = app.errorCode ?? "";
    const final = c !== "E-LINK" && c !== "E-MISSION" && hl.final === true;
    body.textContent = final ? COPY.error.staff : COPY.error.body;
    body.classList.toggle("staff", final);
    trying.textContent = final ? "" : c === "E-CORE-DOWN" || hl.core === "down" ? COPY.error.trying(hl.attempt, hl.of) : COPY.error.trying();
    code.textContent = hl.detail && c !== "E-LINK" && c !== "E-MISSION" ? `${c} (${hl.detail})` : c;
  };

  return {
    el,
    idle: "none",
    mount: refresh,
    onMessage: (m: ServerMsg) => {
      if (m.t === "health" || m.t === "hello") refresh();
    },
    onMachine: () => refresh(),
  };
}
