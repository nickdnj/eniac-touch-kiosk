// Before the first hello: say why the screen is waiting (UX 11), never blank.
// If the bridge never answers, E-LINK after 5 s takes over (S10).

import type { App, Screen } from "../app.ts";
import { h } from "../ui/dom.ts";
import { COPY } from "../copy.ts";

export function bootScreen(_app: App): Screen {
  const el = h("div", { class: "screen boot" }, h("div", { class: "waiting" }, h("span", { class: "spinner" }), COPY.waitingMachine));
  return { el, idle: "none" };
}
