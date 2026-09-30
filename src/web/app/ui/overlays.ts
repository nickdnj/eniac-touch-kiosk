// D1 "Start over?" confirm and D2 "Tell me more" slide-over (UX 5.3, 5.5).

import type { App } from "../app.ts";
import { h } from "./dom.ts";
import { onTap } from "./tap.ts";
import { COPY } from "../copy.ts";

export function button(label: string, cls: string, fn: () => void, attrs: Record<string, string> = {}): HTMLElement {
  const b = h("div", { class: `btn ${cls}`, role: "button", ...attrs }, label);
  onTap(b, fn);
  return b;
}

/** D1: two 96 px buttons. Resolves true for "yes". */
export function confirm(app: App, text: string, yes: string): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (v: boolean) => {
      scrim.remove();
      resolve(v);
    };
    const scrim = h(
      "div",
      { class: "scrim confirm-scrim" },
      h(
        "div",
        { class: "dialog confirm", role: "dialog" },
        h("p", {}, text),
        h("div", { class: "dialog-actions" }, button(yes, "primary", () => done(true)), button(COPY.confirm.no, "primary outline", () => done(false))),
      ),
    );
    app.overlay.append(scrim);
  });
}

/** D2: up to 120 words, 1000x700 from the right edge; pauses idle (max 2 min). */
export function tellMore(app: App, headline: string, body: string): void {
  app.idle.pause();
  const close = () => {
    panel.animate([{ transform: "translateX(0)" }, { transform: "translateX(1000px)" }], { duration: 250, easing: "ease-in" }).finished.then(() => scrim.remove());
    app.idle.resume();
  };
  const panel = h(
    "div",
    { class: "tellmore", role: "dialog" },
    h("h2", {}, headline),
    h("p", {}, body),
    button(COPY.rail.close, "primary", close),
  );
  const scrim = h("div", { class: "scrim tellmore-scrim" }, panel);
  app.overlay.append(scrim);
  panel.animate([{ transform: "translateX(1000px)" }, { transform: "translateX(0)" }], { duration: 300, easing: "ease-out" });
}
