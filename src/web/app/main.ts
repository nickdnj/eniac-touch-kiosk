// Boot: guards, scaling, websocket, router (architecture 9.2).
// There is no fixture or demo data anywhere in this bundle: every lamp,
// value and card comes from the bridge (FR-50, "no demo fallback").

import { App, type ScreenFactory } from "./app.ts";
import { bootScreen } from "./screens/boot.ts";

const screens: Record<string, ScreenFactory> = {
  boot: bootScreen,
};

const root = document.getElementById("app");
if (root) {
  const app = new App(root, screens);
  app.start();
  (window as unknown as { __eniac?: App }).__eniac = app;
}
