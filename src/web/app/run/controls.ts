// "Keep pressing for me" and "Skip to the answer" (issue #20, UX 8.1.4 S6).
// Thin UI glue over run/autopress.ts, plugged into the run view's rail.

import type { RunContext } from "../screens/run.ts";
import type { ServerMsg } from "../protocol.ts";
import { AutoPress, type StopReason } from "./autopress.ts";
import { h } from "../ui/dom.ts";
import { onTap } from "../ui/tap.ts";
import { COPY } from "../copy.ts";

/**
 * Pacing between presses, by speed (ms after the machine goes idle).
 * Full: about 2 squares/s. Slow is `cy.rate 13` since spike S4 (decision
 * 2026-10-01): one press already takes about 13 s with every addition
 * visible for about 1 s, so the loop waits only half a second before the
 * next press (about one square every 13-14 s at Slow).
 */
export const GAP_MS: Record<string, number> = { slow: 500, full: 300, skip: 30 };

export function autopressControls(ctx: RunContext): HTMLElement[] {
  const { app } = ctx;
  const mission = app.mission!;
  const watch = mission.run.watch;
  let mode: "keep" | "skip" | null = null;

  const extras = mission.content.run.extras;
  const keepLabel = extras.keepPressing ?? "";
  const keep = h("div", { class: "btn keep-btn", role: "button" }, keepLabel);
  const skip = h("div", { class: "btn skip-answer-btn", role: "button" }, extras.skipToAnswer);

  const auto = new AutoPress({
    clock: { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (t) => clearTimeout(t as number) },
    press: () => ctx.pressInit(),
    gapMs: () => (mode === "skip" ? GAP_MS.skip : (GAP_MS[ctx.getSpeed()] ?? 600)),
    answerCheckpoint: extras.stopAt || mission.result,
    isDone: (settled) => {
      const at = app.answerAt;
      return !!at && typeof settled[watch[0]] === "number" && typeof at[watch[0]] === "number" && settled[watch[0]] >= at[watch[0]];
    },
    onStop: (reason: StopReason) => {
      const was = mode;
      mode = null;
      keep.textContent = keepLabel;
      keep.classList.remove("running");
      if (was === "skip" && reason === "answer") ctx.goResult();
    },
  });
  const stopAt = extras.stopAt || mission.result;
  if (app.checkpoints.has(stopAt)) auto.onCheckpoint(stopAt);
  auto.setBusy(ctx.isBusy());

  onTap(keep, () => {
    if (mode === "keep") return auto.stop("user");
    if (mode) return;
    mode = "keep";
    keep.textContent = COPY.run.stop;
    keep.classList.add("running");
    auto.start();
  });

  onTap(skip, () => {
    if (mode === "skip") return;
    if (mode === "keep") auto.stop("user");
    mode = "skip";
    app.metric({ t: "metric", ev: "skip_to_answer", mission: mission.id });
    if (mission.run.speeds.includes("full")) ctx.setSpeed("full");
    auto.start();
  });

  ctx.onRunMsg((m: ServerMsg) => {
    if (m.t === "run") auto.onRun(m);
    else if (m.t === "checkpoint") auto.onCheckpoint(m.id);
    else if (m.t === "session" && (m.state === "none" || m.state === "failed")) auto.stop("session");
    else if (m.t === "health" && m.core !== "up") auto.stop("fault");
  });
  // After CLEAR the table starts again, so the answer can be reached again.
  ctx.onClear(() => auto.rearm());

  return [keep, skip];
}
