// The ENIAC firing table (Gunnery and Battleship), for the docent. A typed page on cream
// paper, the way a gunner's table looked: for each gun, the angle, how far the shell goes,
// and how long it flies, all worked out on this simulator (the measured numbers in the
// mission file). The line nearest the target is marked and selected, so a docent can say
// "this is how a gunner would read it", tap "Use this shot", and then hand the screen to
// the visitor with the table closed: "now try it without".

import type { Game } from "../../../bridge/internal/mission/mission.gen.ts";
import { h } from "../ui/dom.ts";
import { button } from "../ui/overlays.ts";
import { fillCard, fmt } from "../run/cards.ts";

export interface FiringTableOptions {
  game: Game;
  target: number;
  name: string;
  /** The ship whose guns are shown; null shows every gun. */
  ship: string | null;
  /** This target's hit radius in feet (the nearest entry has to be within it to count as a hit). */
  hit: number;
  onUse(gun: string, elevation: string): void;
  onClose(): void;
}

/** The guns on show: the chosen ship's, or all of them. */
export function gunsShown(game: Game, ship: string | null): string[] {
  const own = ship ? game.ships?.find((s) => s.id === ship)?.guns : undefined;
  return own ?? game.charges.map((c) => c.id);
}

/** The table row nearest the target among the guns on show, with how far off it is. */
export function nearestRow(game: Game, target: number, guns: string[]): { gun: string; elevation: string; feet: number; miss: number } | null {
  let best: { gun: string; elevation: string; feet: number; miss: number } | null = null;
  for (const r of game.table ?? []) {
    if (!guns.includes(r.gun)) continue;
    const miss = Math.abs(r.feet - target);
    if (!best || miss < best.miss) best = { gun: r.gun, elevation: r.elevation, feet: r.feet, miss };
  }
  return best;
}

export function firingTable(o: FiringTableOptions): HTMLElement {
  const f = o.game.firing!;
  const guns = gunsShown(o.game, o.ship);
  const near = nearestRow(o.game, o.target, guns);
  let sel: { gun: string; elevation: string } | null = near ? { gun: near.gun, elevation: near.elevation } : null;
  const rowEls = new Map<string, HTMLElement>();
  const useBtn = button(f.use, "primary main ft-use", () => {
    if (sel) o.onUse(sel.gun, sel.elevation);
  });
  const mark = () => {
    rowEls.forEach((el, k) => {
      el.classList.toggle("sel", sel !== null && k === `${sel.gun}/${sel.elevation}`);
    });
    useBtn.classList.toggle("hidden", !sel);
  };
  const blocks = guns.map((id) => {
    const gun = o.game.charges.find((c) => c.id === id)!;
    const head = h("div", { class: "ft-gun" }, fillCard(f.gun, { label: gun.label, n: fmt(gun.speed) }));
    const cols = h("div", { class: "ft-row ft-cols" }, h("span", {}, f.angle), h("span", { class: "r" }, f.range), h("span", { class: "r" }, f.time));
    const rows = o.game.elevations.map((e) => {
      const r = o.game.table!.find((x) => x.gun === id && x.elevation === e.id);
      if (!r) return h("div", {});
      const el = button("", `ft-row ft-line${near && near.gun === id && near.elevation === e.id ? " near" : ""}`, () => {
        sel = { gun: id, elevation: e.id };
        mark();
      });
      el.append(h("span", {}, `${e.deg}°`), h("span", { class: "r" }, fmt(r.feet)), h("span", { class: "r" }, r.secs.toFixed(1)));
      rowEls.set(`${id}/${e.id}`, el);
      return el;
    });
    return h("div", { class: "ft-block" }, head, cols, ...rows);
  });
  const gunName = near ? o.game.charges.find((c) => c.id === near.gun)?.label ?? near.gun : "";
  const angle = near ? o.game.elevations.find((e) => e.id === near.elevation)?.deg ?? 0 : 0;
  const canHit = !!near && near.miss <= o.hit;
  const nearLine = !near ? "" : canHit || !f.none ? fillCard(f.near, { gun: gunName, angle, miss: fmt(near.miss) }) : `${fillCard(f.near, { gun: gunName, angle, miss: fmt(near.miss) })} ${f.none}`;
  mark();
  return h(
    "div",
    { class: "ftable", role: "dialog", "aria-label": f.title },
    h(
      "div",
      { class: "ft-paper" },
      h("h2", { class: "ft-title" }, f.title),
      h("div", { class: "ft-sub" }, f.sub),
      h("div", { class: "ft-target" }, fillCard(f.target, { name: o.name || "Target", feet: fmt(o.target) })),
      h("div", { class: "ft-blocks" }, ...blocks),
      h("div", { class: "ft-near" }, nearLine),
      h("div", { class: "ft-note" }, f.note),
      h("div", { class: "ft-actions" }, button(f.close, "ft-close", o.onClose), useBtn),
    ),
  );
}
