// Boot: guards, scaling, websocket, router (architecture 9.2).
// There is no fixture or demo data anywhere in this bundle: every lamp,
// value and card comes from the bridge (FR-50, "no demo fallback").

import { App, type ScreenFactory } from "./app.ts";
import { bootScreen } from "./screens/boot.ts";
import { missionScreen } from "./screens/mission.ts";
import { runScreenFactory } from "./screens/run.ts";
import { autopressControls } from "./run/controls.ts";
import { resultScreen } from "./screens/result.ts";
import { yourTurnScreen } from "./screens/yourturn.ts";
import { aimScreen } from "./screens/aim.ts";
import { pickerScreen, startScreen, wakingScreen } from "./screens/start.ts";
import { installStillThere } from "./screens/still.ts";
import { errorScreen } from "./screens/error.ts";
import { honorScreen } from "./screens/honor.ts";
import { injectDefs } from "./panels/load.ts";
import { exploreScreen } from "./screens/explore.ts";
import { glossaryScreen } from "./screens/glossary.ts";
import { tubesScreen } from "./screens/tubes.ts";
import { finaleScreen } from "./screens/finale.ts";
import { switchingScreen } from "./screens/switching.ts";

const screens: Record<string, ScreenFactory> = {
  explore: exploreScreen,
  glossary: glossaryScreen,
  tubes: tubesScreen,
  boot: bootScreen,
  start: startScreen,
  picker: pickerScreen,
  waking: wakingScreen,
  error: errorScreen,
  mission: missionScreen,
  run: runScreenFactory({ extras: autopressControls }),
  result: resultScreen,
  yourturn: yourTurnScreen,
  aim: aimScreen,
  honor: honorScreen,
  finale: finaleScreen,
  switching: switchingScreen,
};

const root = document.getElementById("app");
if (root) {
  injectDefs();
  const app = new App(root, screens);
  installStillThere(app);
  app.start();
  (window as unknown as { __eniac?: App }).__eniac = app;
}
