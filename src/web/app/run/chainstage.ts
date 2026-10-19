// S6 run stage for a card mission that works on a few named accumulators
// (Difference): one row per accumulator in the mission's `content.run.chain`,
// top to bottom, each with its name, its live value and its lamps, and the
// punched cards on the right (newest large, older ones below), as in the
// Primes stage. Every number and lamp is real (state/frame/punch), never a timer.

import type { App } from "../app.ts";
import type { AccState } from "../protocol.ts";
import { accumulatorCompact } from "../panels/art.ts";
import { h, svgFromString } from "../ui/dom.ts";
import { LampRenderer } from "../lamps/render.ts";
import { StackPane } from "./cardpane.ts";
import { fmt } from "./cards.ts";
import type { RunStage } from "./stackstage.ts";

/**
 * An accumulator's value for a readout, or null while it is mid-addition. The
 * real machine adds digit by digit, so between pulses its digits are not a
 * number (they pass through states like 4444444411); a program lamp or a carry
 * lamp lit means that is happening. The lamps always show the truth; the big
 * number waits for the settled value, as a person reading it would.
 */
export function settledValue(a: Pick<AccState, "value" | "prog" | "carry"> | undefined): number | null {
  if (!a || typeof a.value !== "number") return null;
  return a.prog.includes("1") || a.carry.includes("1") ? null : a.value;
}

export function chainStage(app: App, reduceMotion: boolean): RunStage {
  const chain = app.mission!.content.run.chain!;
  const readouts = new Map<string, HTMLElement>();
  const rows = chain.rows.flatMap((r, i) => {
    const value = h("span", { class: "chain-value", "data-acc": r.acc }, "–");
    readouts.set(r.acc, value);
    const row = h(
      "div",
      { class: "chain-row", "data-acc": r.acc },
      h("div", { class: "chain-name" }, h("div", { class: "chain-title" }, r.name), h("div", { class: "chain-sub" }, r.sub ?? `Accumulator ${r.acc}`)),
      value,
      svgFromString(accumulatorCompact(Number(r.acc), false, 9).markup) as unknown as HTMLElement,
    );
    return i < chain.rows.length - 1 ? [row, h("div", { class: "chain-plus", "aria-hidden": "true" }, "+")] : [row];
  });
  const left = h("div", { class: "stack-left chain-left" }, h("div", { class: "pane-title" }, chain.title), ...rows);
  const pane = new StackPane(app, { rows: 19, bigW: 480, bigH: 150, reduceMotion });
  const el = h("div", { class: "stack-stage" }, left, pane.el);
  const renderer = new LampRenderer(el, () => app.mirror.machine);

  function refresh(): void {
    for (const [n, ro] of readouts) {
      const v = settledValue(app.mirror.machine?.acc?.[n]);
      if (v !== null) ro.textContent = fmt(v); // mid-addition: keep the last settled number
      else if (!ro.textContent) ro.textContent = "–";
    }
  }

  return {
    el,
    mount: () => {
      refresh();
      pane.update(true);
      renderer.invalidate(null);
    },
    onMachine: (units) => {
      renderer.invalidate(units);
      if (units === null || units.some((u) => u.startsWith("acc."))) refresh();
    },
    onCards: () => pane.update(),
    dispose: () => renderer.dispose(),
  };
}
