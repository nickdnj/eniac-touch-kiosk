// Pure machine-state mirror: RFC 7396 merge patch + session/health gating.
// No DOM here; unit-tested with node --test (tests/web/machine.test.ts).

import type {
  HealthInfo,
  MachineState,
  MergePatch,
  RunInfo,
  SessionInfo,
} from "../protocol.ts";

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * RFC 7396 MergePatch(target, patch). Returns a new value; untouched
 * sub-objects are shared with `target` (structural sharing).
 */
export function applyMergePatch(target: unknown, patch: unknown): unknown {
  if (!isObj(patch)) return patch;
  const out: Record<string, unknown> = isObj(target) ? { ...target } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else out[k] = applyMergePatch(out[k], v);
  }
  return out;
}

/** Lamp units touched by a patch, in the unit naming of lamps/derive.ts. */
export function touchedUnits(patch: MergePatch): string[] {
  const units: string[] = [];
  for (const k of Object.keys(patch)) {
    if (k === "acc" && isObj(patch.acc)) {
      for (const n of Object.keys(patch.acc)) units.push(`acc.${n}`);
    } else if (k === "cycle") units.push("cyc");
    else if (k === "init") units.push("init");
    else if (k === "ct") units.push("ct");
    else units.push(k);
  }
  return units;
}

/**
 * Tracks what the UI is allowed to draw. The machine view renders ONLY from
 * state/frame messages of the current session while the core is up and the
 * link is up (architecture 5.8, "no demo fallback"). Anything else -> null.
 */
export class Mirror {
  session: SessionInfo | null = null;
  health: HealthInfo = { core: "starting" };
  linkUp = false;
  run: RunInfo = { state: "idle", inits: 0 };
  seq = 0;
  private machineState: MachineState | null = null;

  /** The drawable machine state, or null if nothing may be drawn. */
  get machine(): MachineState | null {
    if (!this.linkUp || this.health.core !== "up" || !this.session) return null;
    if (this.session.state === "none" || this.session.state === "failed") return null;
    return this.machineState;
  }

  onLink(up: boolean): void {
    this.linkUp = up;
    if (!up) this.machineState = null; // never show stale lamps after a drop
  }

  onHealth(h: HealthInfo): void {
    this.health = h;
    if (h.core !== "up") this.machineState = null;
  }

  onSession(s: SessionInfo | null): void {
    const changed = !s || !this.session || s.id !== this.session.id;
    this.session = s && s.state !== "none" ? s : null;
    if (changed) {
      // A new (or no) session: old machine data belongs to someone else.
      this.machineState = null;
      this.run = { state: "idle", inits: 0 };
      this.seq = 0;
    }
  }

  /** Full snapshot. Ignored unless it belongs to the current session. */
  onState(session: SessionInfo | null, seq: number, machine: MachineState, run: RunInfo): void {
    this.onSession(session);
    if (!this.session) return;
    this.machineState = machine;
    this.seq = seq;
    this.run = run;
  }

  /** Delta. Returns touched units, or null if the frame was dropped. */
  onFrame(seq: number, d: MergePatch): string[] | null {
    if (!this.session || !this.machineState) return null;
    if (seq <= this.seq) return null; // stale or duplicate
    this.seq = seq;
    this.machineState = applyMergePatch(this.machineState, d) as MachineState;
    return touchedUnits(d);
  }

  onRun(run: RunInfo): void {
    if (this.session) this.run = run;
  }

  reset(): void {
    this.session = null;
    this.machineState = null;
    this.run = { state: "idle", inits: 0 };
    this.seq = 0;
  }
}
