// Feature clip: S1 attract, live (docs/video/attract.mp4). Recorded on the
// REAL bridge and core; a slow flight is trimmed in the mux (trimWait), never
// sped up. Not part of CI. From src/web:
//   NARRATE=1 npx playwright test -c ../../tests/web/video/playwright.config.ts clip-attract

import { test, expect } from "@playwright/test";
import { tap, view } from "../e2e/helpers.ts";
import { card, cap, overlays, pause } from "./overlay.ts";
import { cutFrom, cutTo, finishNarration, narration, trimWait } from "./narrate.ts";
import { attractCards, scene } from "./flows.ts";

test("clip: attract", async ({ page }) => {
  test.setTimeout(900_000);
  await overlays(page);
  await narration(page, "attract");
  await cutFrom(page, "loading");
  await page.goto("/");
  await expect(view(page)).toHaveAttribute("data-view", "start");
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 60_000 });
  await cutTo(page);
  await card(page, "<h1>Attract mode</h1><p>When nobody is at the kiosk, ENIAC flies a cannon shell, live on Brian L. Stuart's simulator.</p><small>ENIAC Touch Kiosk · recorded live on the real simulator</small>", 4000);

  await cap(page, "The ENIAC room, lit by the live simulator");
  await expect.poll(() => attractCards(page), { timeout: 60_000 }).toBeGreaterThanOrEqual(4);
  await cap(page, "Each dot is a punched card: one second of the shell's flight");
  await cap(page, null);
  await trimWait(page, "the rest of the flight", () => expect(scene(page)).toHaveAttribute("data-scene", "landed", { timeout: 300_000 }), 8000, 8000);
  await cap(page, "Landed: the hop and the card count, held for a moment");
  await expect(scene(page)).toHaveAttribute("data-scene", "between", { timeout: 30_000 });
  await cap(page, "Then a fresh flight, on a fresh run of the simulator");
  await expect(scene(page)).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
  await pause(page, 2500);
  await cap(page, "One touch, and the visitor is in");
  await tap(page, page.locator(".screen.start"));
  await expect(page.locator(".mission-card")).toHaveCount(3);
  await pause(page, 3000);
  await cap(page, null);
  await card(page, "<h1>Thank you</h1><p>Simulator: Brian L. Stuart, Drexel University — github.com/blstuart/eniac-simulator</p><small>ENIAC Touch Kiosk · Vintage Computer Federation museum</small>", 5000);
  await finishNarration(page);
});
