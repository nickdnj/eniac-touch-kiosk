// S13 Admin, minimal v1 (UX 7.12.2; docs/original-ui-switch.md 6.7):
// exactly three buttons, Restart simulator, Original UI and Return to
// kiosk, under a header with "Exits in m:ss" (FR-74: 2:00, reset by any
// touch; at 0:00 the kiosk returns to S1). The health tiles, metrics and
// the M3 actions stack in under these later.
//
// S12 and S13 are drawn on the staff layer (#staff) above the current
// screen, which stays mounted underneath: "Return to kiosk" and a refused
// PIN go back to exactly that screen. The visitor idle timer is off while
// the layer is up (App.openStaff / closeStaff).

import type { App } from "../app.ts";
import { h, clear } from "../ui/dom.ts";
import { setDisabled } from "../ui/tap.ts";
import { button } from "../ui/overlays.ts";
import { adminAction, adminLogout } from "../net/api.ts";
import { COPY } from "../copy.ts";
import { pinPanel } from "./pin.ts";

/** FR-74: S13 exits after 2 minutes without a touch. */
export const ADMIN_EXIT_S = 120;

export interface StaffPanel {
  el: HTMLElement;
  /** Any touch while the panel is up (resets its own timer). */
  touched?(): void;
  dispose(): void;
}

/** The staff layer: one panel at a time (S12, then S13). */
export interface StaffHost {
  showPin(): void;
  showAdmin(token: string): void;
}

export class StaffLayer implements StaffHost {
  readonly el: HTMLElement;
  private panel: StaffPanel | null = null;
  private app: App;

  constructor(app: App) {
    this.app = app;
    this.el = h("div", { id: "staff" });
  }

  showPin(): void {
    this.set(pinPanel(this.app, this));
  }

  showAdmin(token: string): void {
    this.set(adminPanel(this.app, this, token));
  }

  touched(): void {
    this.panel?.touched?.();
  }

  dispose(): void {
    this.panel?.dispose();
    this.panel = null;
    clear(this.el);
  }

  private set(p: StaffPanel): void {
    this.dispose();
    this.panel = p;
    this.el.append(p.el);
  }
}

export function formatExits(leftS: number): string {
  const s = Math.max(0, Math.ceil(leftS));
  return COPY.originalUi.staff.exits(Math.floor(s / 60), String(s % 60).padStart(2, "0"));
}

export function adminPanel(app: App, staff: StaffHost, token: string): StaffPanel {
  const C = COPY.originalUi.staff;
  let left = ADMIN_EXIT_S;
  let paused = false;
  let busy = false;
  let disposed = false;
  const exits = h("span", { class: "adm-exits", role: "timer" }, formatExits(left));
  const status = h("div", { class: "adm-status", role: "status" });
  const available = app.config.originalUi?.available === true;

  const row = (cls: string, label: string, note: string, btn: HTMLElement) =>
    h("div", { class: `adm-row ${cls}` }, h("div", { class: "adm-text" }, h("div", { class: "adm-label" }, label), h("div", { class: "adm-note" }, note)), btn);

  const restart = button(C.restart, "adm-btn secondary", () => void doRestart());
  const original = button(C.original, "adm-btn secondary", () => askSwitch());
  setDisabled(original, !available);
  const ret = button(C.return, "adm-btn return", () => leave());

  const el = h(
    "div",
    { class: "staff-panel staff-admin", role: "dialog", "aria-label": C.header },
    h("div", { class: "adm-header" }, h("span", { class: "adm-title" }, C.header), h("span", { class: "spacer" }), exits),
    row("r1", C.restart, C.restartNote, restart),
    row("r2", C.original, available ? C.originalNote : C.notInstalled, original),
    status,
    h("div", { class: "adm-row r3" }, ret),
  );

  const timer = setInterval(() => {
    if (paused || busy) return;
    left--;
    exits.textContent = formatExits(left);
    if (left <= 0) {
      void adminLogout(token);
      app.closeStaff({ name: "start" });
    }
  }, 1000);

  function setBusy(b: boolean): void {
    busy = b;
    for (const x of [restart, ret]) setDisabled(x, b);
    setDisabled(original, b || !available);
  }

  async function doRestart(): Promise<void> {
    if (busy) return;
    setBusy(true);
    status.textContent = "";
    const r = await adminAction(token, "restart-core");
    if (disposed) return;
    if (r.ok) {
      void adminLogout(token);
      app.closeStaff({ name: "start" });
      return;
    }
    setBusy(false);
    if (r.code === "TOKEN") return staff.showPin();
    status.textContent = C.actionFailed;
  }

  /** The one-step confirmation (UX 7.12.2); the Exits timer pauses while it is open. */
  function askSwitch(): void {
    if (busy || !available) return;
    paused = true;
    const close = () => {
      scrim.remove();
      paused = false;
    };
    const scrim = h(
      "div",
      { class: "scrim adm-confirm-scrim" },
      h(
        "div",
        { class: "dialog adm-confirm", role: "dialog" },
        h("h2", {}, C.confirmTitle),
        h("p", {}, C.confirmBody),
        h(
          "div",
          { class: "dialog-actions" },
          button(C.yes, "primary", () => {
            close();
            // The switching page draws first, then posts (UX-03).
            app.closeStaff({ name: "switching", switching: { door: "staff", token } });
          }),
          button(C.no, "primary outline", close),
        ),
      ),
    );
    el.append(scrim);
  }

  function leave(): void {
    void adminLogout(token);
    app.closeStaff();
  }

  return {
    el,
    touched: () => {
      if (paused) return;
      left = ADMIN_EXIT_S;
      exits.textContent = formatExits(left);
    },
    dispose: () => {
      disposed = true;
      clearInterval(timer);
    },
  };
}

