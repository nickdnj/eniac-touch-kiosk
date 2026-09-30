// Lamp renderer (architecture 6.2 step 3). Once per animation frame, diff
// each dirty unit's lit set against the previous one and toggle `on` only on
// the changed nodes. The 80 ms neon decay is a CSS opacity transition.
//
// It never invents state: given no machine (no session, core down, link
// down) every lamp goes dark.

import type { MachineState } from "../protocol.ts";
import { cycModeText, lampUnit, unitLamps } from "./derive.ts";

export class LampRenderer {
  private index = new Map<string, Element[]>();
  private lit = new Map<string, Set<string>>();
  private dirty = new Set<string>();
  private units = new Set<string>();
  private modeEls: Element[] = [];
  private raf = 0;
  private fallback: ReturnType<typeof setTimeout> | null = null;
  private getMachine: () => MachineState | null;

  constructor(root: Element, getMachine: () => MachineState | null) {
    this.getMachine = getMachine;
    root.querySelectorAll('[id^="lamp:"]').forEach((el) => {
      const id = el.id;
      const list = this.index.get(id);
      if (list) list.push(el);
      else this.index.set(id, [el]);
      this.units.add(lampUnit(id));
    });
    this.modeEls = Array.from(root.querySelectorAll('[id="ind:cyc.mode"]'));
    this.invalidate(null);
  }

  /**
   * Mark units dirty (null = all) and schedule a render on the next frame,
   * with a timer fallback so throttled frames never leave lamps stale.
   */
  invalidate(units: string[] | null): void {
    if (units === null) for (const u of this.units) this.dirty.add(u);
    else for (const u of units) if (this.units.has(u)) this.dirty.add(u);
    if (!this.raf && this.dirty.size) {
      this.raf = requestAnimationFrame(() => this.flush());
      this.fallback = setTimeout(() => this.flush(), 100);
    }
  }

  /** Synchronous render (used by tests and on mount). */
  flush(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.fallback) clearTimeout(this.fallback);
    this.raf = 0;
    this.fallback = null;
    const m = this.getMachine();
    for (const u of this.dirty) {
      const next = m ? unitLamps(u, m) : new Set<string>();
      const prev = this.lit.get(u) ?? new Set<string>();
      for (const id of prev) if (!next.has(id)) this.set(id, false);
      for (const id of next) if (!prev.has(id)) this.set(id, true);
      this.lit.set(u, next);
    }
    this.dirty.clear();
    const mode = cycModeText(m);
    for (const el of this.modeEls) if (el.textContent !== mode) el.textContent = mode;
  }

  dispose(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.fallback) clearTimeout(this.fallback);
    this.raf = 0;
    this.fallback = null;
  }

  private set(id: string, on: boolean): void {
    const els = this.index.get(id);
    if (!els) return;
    for (const el of els) el.classList.toggle("on", on);
  }
}
