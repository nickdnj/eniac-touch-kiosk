// Gunnery and Battleship: typing a name on a touchscreen. A full-screen letter keyboard
// with big keys (QWERTY, a space bar, delete), the name shown in slots as it grows. No
// physical keyboard, no little arrows. The bridge has the last word on the name (length,
// characters, and a short list of words it will not carry), so a refusal comes back as a
// message on this same pad rather than a dead end.

import { h } from "../ui/dom.ts";
import { button } from "../ui/overlays.ts";

/** The longest name the score board and the title plate have room for (the bridge's rule too). */
export const NAME_MAX = 8;

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export interface NamePad {
  el: HTMLElement;
  open(): void;
  close(): void;
  /** A line under the keys: why the name was not taken. */
  message(text: string): void;
  /** True while the score is being saved (the keys wait). */
  busy(on: boolean): void;
}

export interface NamePadOptions {
  ask: string;
  save: string;
  skip: string;
  max?: number;
  onSave(name: string): void;
  onSkip(): void;
}

export function namePad(o: NamePadOptions): NamePad {
  const max = o.max ?? NAME_MAX;
  let name = "";
  let waiting = false;
  const slots = Array.from({ length: max }, () => h("div", { class: "np-slot" }));
  const msg = h("p", { class: "np-msg", "aria-live": "polite" });
  const show = () => {
    slots.forEach((s, i) => {
      s.textContent = name[i] ?? "";
      s.classList.toggle("on", i === Math.min(name.length, max - 1) && name.length < max);
    });
    msg.textContent = "";
  };
  const put = (c: string) => {
    if (waiting || name.length >= max) return;
    if (c === " " && (name.length === 0 || name.endsWith(" "))) return;
    name += c;
    show();
  };
  const del = () => {
    if (waiting) return;
    name = name.slice(0, -1);
    show();
  };
  const rows = ROWS.map((r, i) => {
    const keys = [...r].map((c) => button(c, "np-key", () => put(c)));
    if (i === 2) keys.push(button("⌫", "np-key np-del", del, { "aria-label": "Delete" }));
    return h("div", { class: "np-row" }, ...keys);
  });
  const space = button("SPACE", "np-key np-space", () => put(" "));
  const saveBtn = button(o.save, "primary main np-save", () => {
    if (waiting) return;
    const n = name.trim();
    if (!n) {
      msg.textContent = o.ask;
      return;
    }
    o.onSave(n);
  });
  const skipBtn = button(o.skip, "np-skip", () => {
    if (!waiting) o.onSkip();
  });
  const el = h(
    "div",
    { class: "namepad hidden", role: "dialog", "aria-label": o.ask },
    h("div", { class: "np-panel" }, h("h2", { class: "np-ask" }, o.ask), h("div", { class: "np-name" }, ...slots), ...rows, h("div", { class: "np-row np-bottom" }, space), msg, h("div", { class: "np-actions" }, skipBtn, saveBtn)),
  );
  show();
  return {
    el,
    open: () => {
      name = "";
      waiting = false;
      show();
      el.classList.remove("hidden");
    },
    close: () => el.classList.add("hidden"),
    message: (t: string) => {
      waiting = false;
      saveBtn.classList.remove("busy");
      msg.textContent = t;
    },
    busy: (on: boolean) => {
      waiting = on;
      saveBtn.classList.toggle("busy", on);
    },
  };
}
