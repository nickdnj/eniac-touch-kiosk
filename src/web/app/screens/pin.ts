// S12 Staff PIN (UX 7.11; docs/original-ui-switch.md 6.7). Opened by the
// 5th tap in the top-left corner, drawn on the staff layer over whatever
// screen was showing. A 3 x 4 pad of 120 px keys (Clear, 0, OK on the
// bottom row), dots for the digits entered, no keyboard. OK posts the PIN
// to /api/admin/login; a wrong PIN shows "Not right" for 1 s and goes back
// to the visitor screen, as does 30 s without a touch.

import type { App } from "../app.ts";
import type { StaffHost, StaffPanel } from "./admin.ts";
import { h } from "../ui/dom.ts";
import { onTap, setDisabled } from "../ui/tap.ts";
import { PinEntry, PIN_MAX, PIN_MIN } from "../admin/pinpad.ts";
import { adminLogin } from "../net/api.ts";
import { COPY } from "../copy.ts";

/** S12 returns to the visitor screen after this long without a touch (UX 7.11). */
export const PIN_IDLE_MS = 30_000;

/** How long each refusal stays on screen before the visitor screen returns. */
export const PIN_MESSAGE_MS = { wrong: 1000, locked: 2000, none: 3000, error: 3000 } as const;

export function pinPanel(app: App, staff: StaffHost): StaffPanel {
  const C = COPY.admin.pin;
  const entry = new PinEntry();
  const dots = h("div", { class: "pin-dots", "aria-hidden": "true" });
  const msg = h("div", { class: "pin-msg", role: "status" });
  const keys = h("div", { class: "pin-pad" });
  let idleT: ReturnType<typeof setTimeout> | null = null;
  let msgT: ReturnType<typeof setTimeout> | null = null;
  let busy = false;
  let disposed = false;

  const key = (label: string, cls: string, fn: () => void) => {
    const k = h("div", { class: `pin-key ${cls}`, role: "button", "aria-label": label }, label);
    onTap(k, fn);
    keys.append(k);
    return k;
  };
  for (const d of ["1", "2", "3", "4", "5", "6", "7", "8", "9"]) key(d, "digit", () => press(d));
  key(C.clear, "clear", () => {
    entry.clear();
    draw();
  });
  key("0", "digit", () => press("0"));
  const ok = key(C.ok, "ok", () => void submit());

  function draw(): void {
    dots.replaceChildren(...Array.from({ length: Math.max(PIN_MIN, entry.length) }, (_, i) => h("i", { class: i < entry.length ? "on" : "" })));
    setDisabled(ok, !entry.canSubmit || busy);
    keys.classList.toggle("inert", busy);
  }

  function press(d: string): void {
    if (busy) return;
    if (entry.length >= PIN_MAX) return;
    entry.press(d);
    msg.textContent = "";
    draw();
  }

  function armIdle(): void {
    if (idleT) clearTimeout(idleT);
    idleT = setTimeout(() => app.closeStaff(), PIN_IDLE_MS);
  }

  /** Show a refusal, then back to the visitor screen. */
  function refuse(text: string, ms: number): void {
    msg.textContent = text;
    msg.classList.add("bad");
    if (idleT) clearTimeout(idleT);
    msgT = setTimeout(() => app.closeStaff(), ms);
  }

  async function submit(): Promise<void> {
    if (busy || !entry.canSubmit) return;
    busy = true;
    msg.classList.remove("bad");
    msg.textContent = C.checking;
    draw();
    const r = await adminLogin(entry.take());
    if (disposed) return;
    draw();
    if (r.ok) {
      staff.showAdmin(r.token);
      return;
    }
    switch (r.code) {
      case "BAD_PIN":
        return refuse(C.wrong, PIN_MESSAGE_MS.wrong);
      case "LOCKED":
        return refuse(C.locked, PIN_MESSAGE_MS.locked);
      case "NO_PIN":
        return refuse(C.none, PIN_MESSAGE_MS.none);
      default:
        return refuse(C.error, PIN_MESSAGE_MS.error);
    }
  }

  const el = h("div", { class: "staff-panel staff-pin", role: "dialog", "aria-label": C.title }, h("h1", { class: "pin-title" }, C.title), dots, msg, keys);
  draw();
  armIdle();
  return {
    el,
    touched: () => {
      if (!msgT) armIdle();
    },
    dispose: () => {
      disposed = true;
      if (idleT) clearTimeout(idleT);
      if (msgT) clearTimeout(msgT);
    },
  };
}
