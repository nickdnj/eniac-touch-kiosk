// The "switching" page (UX 7.12.2; docs/original-ui-switch.md 6.7), for
// both doors to the original UI. It is drawn BEFORE the request is sent,
// shows no buttons, and expects the kiosk session to close this page
// within a second or two. If the page is still alive after 15 s the switch
// failed (the request has expired by then, so nothing will switch later):
// it says so and offers one way back. A refusal (NOT_ALLOWED, an HTTP
// error) shows the failure at once. No retry, no demo fallback.

import type { App, Screen, View } from "../app.ts";
import type { ServerMsg } from "../protocol.ts";
import { h } from "../ui/dom.ts";
import { button } from "../ui/overlays.ts";
import { adminAction } from "../net/api.ts";
import { COPY } from "../copy.ts";

/** The page shows the failure state if it is still alive this long after the request. */
export const SWITCH_FAIL_MS = 15_000;

/** How the switching page was opened. */
export interface SwitchingOpen {
  /** visitor: the Explore tile (the room tour, over the websocket); staff: S13 (interactive, admin API). */
  door: "visitor" | "staff";
  /** staff: the admin token for POST /api/admin/original-ui and for "Back to admin". */
  token?: string;
  /** visitor: where "Back to Explore" returns. */
  back?: View;
}

export function switchingScreen(app: App, view: View): Screen {
  const open: SwitchingOpen = view.switching ?? { door: "visitor" };
  const staff = open.door === "staff";
  const T = staff
    ? { title: COPY.originalUi.staff.switching, sub: COPY.originalUi.staff.switchingSub, failed: COPY.originalUi.staff.failed, back: COPY.originalUi.staff.failedBack }
    : { title: COPY.originalUi.tour.switching, sub: COPY.originalUi.tour.switchingSub, failed: COPY.originalUi.tour.failed, back: COPY.originalUi.tour.failedBack };
  const title = h("div", { class: "sw-title" }, T.title);
  const sub = h("div", { class: "sw-sub" }, T.sub);
  const spin = h("div", { class: "sw-spin", "aria-hidden": "true" }, h("span", { class: "spinner" }), h("span", { class: "dots" }, "• • •"));
  const el = h("div", { class: "screen switching", role: "status" }, spin, title, sub);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let reqId: number | null = null;
  let failed = false;
  let gone = false;

  function fail(): void {
    if (failed || gone) return;
    failed = true;
    if (timer) clearTimeout(timer);
    spin.remove();
    title.textContent = T.failed;
    sub.textContent = COPY.originalUi.staff.failedSub;
    el.append(
      button(T.back, "primary light sw-back", () => {
        if (staff && open.token) {
          app.show({ name: "start" });
          app.openStaff(open.token);
        } else app.show(open.back ?? { name: "explore", explore: { from: "picker" } });
      }),
    );
    // A failure page left alone goes back to S1 like any other screen.
    app.idle.setMode("setup");
    app.idle.touch();
  }

  return {
    el,
    idle: "none",
    coreOptional: true,
    mount: () => {
      app.root.classList.add("no-footer");
      app.root.querySelector("#admin-zone")?.classList.add("hide-mark");
      timer = setTimeout(fail, SWITCH_FAIL_MS);
      if (staff) {
        if (!open.token) return fail();
        void adminAction(open.token, "original-ui").then((r) => {
          if (!r.ok) fail();
        });
      } else {
        reqId = app.send({ t: "original_ui", mode: "tour" });
        if (reqId === null) fail();
      }
    },
    unmount: () => {
      gone = true;
      if (timer) clearTimeout(timer);
      app.root.classList.remove("no-footer");
      app.root.querySelector("#admin-zone")?.classList.remove("hide-mark");
    },
    onMessage: (m: ServerMsg) => {
      if (m.t === "error" && reqId !== null && m.re === reqId) fail();
    },
  };
}
