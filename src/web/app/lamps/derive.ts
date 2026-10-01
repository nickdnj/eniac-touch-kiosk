// MachineState -> lit lamp IDs, per unit (architecture 6.1). Pure.
// Units: "acc.N", "cyc", "init", "ct".

import type { MachineState } from "../protocol.ts";
import { INIT_LAMPS } from "../panels/art.ts";

export function accLamps(n: string, m: MachineState): Set<string> {
  const out = new Set<string>();
  const a = m.acc?.[n];
  if (!a) return out;
  out.add(`lamp:acc.${n}.sign.${a.sign === "M" ? "M" : "P"}`);
  for (let d = 1; d <= 10; d++) {
    const ch = a.digits?.[d - 1];
    if (ch !== undefined && ch >= "0" && ch <= "9") out.add(`lamp:acc.${n}.d.${d}.${ch}`);
  }
  for (let d = 1; d <= 10; d++) if (a.carry?.[d - 1] === "1") out.add(`lamp:acc.${n}.carry.${d}`);
  if (Number.isInteger(a.rep) && a.rep >= 0 && a.rep <= 9) out.add(`lamp:acc.${n}.rep.${a.rep}`);
  for (let p = 1; p <= 12; p++) if (a.prog?.[p - 1] === "1") out.add(`lamp:acc.${n}.prog.${p}`);
  return out;
}

export function cycLamps(m: MachineState): Set<string> {
  const out = new Set<string>();
  const pos = m.cycle?.pos;
  if (!Number.isInteger(pos) || pos < 0 || pos > 39) return out;
  out.add(`lamp:cyc.pulse.${Math.floor(pos / 2)}`);
  if (pos >= 22 && pos <= 36) out.add("lamp:cyc.ccg");
  if (pos < 20 && pos % 2 === 1) out.add("lamp:cyc.tenp");
  return out;
}

export function initLamps(m: MachineState): Set<string> {
  const out = new Set<string>();
  const s = m.init ?? "";
  for (const [name, bit] of INIT_LAMPS) if (s[bit] === "1") out.add(`lamp:init.${name}`);
  return out;
}

export function ctLamps(m: MachineState): Set<string> {
  const out = new Set<string>();
  const s = m.ct ?? "";
  for (let p = 1; p <= 30; p++) if (s[p - 1] === "1") out.add(`lamp:ct.${p}`);
  return out;
}

export function unitLamps(unit: string, m: MachineState): Set<string> {
  if (unit.startsWith("acc.")) return accLamps(unit.slice(4), m);
  if (unit === "cyc") return cycLamps(m);
  if (unit === "init") return initLamps(m);
  if (unit === "ct") return ctLamps(m);
  return new Set();
}

/** The unit a lamp ID belongs to ("lamp:acc.2.d.3.4" -> "acc.2"). */
export function lampUnit(id: string): string {
  const rest = id.slice(5);
  const parts = rest.split(".");
  if (parts[0] === "acc") return `acc.${parts[1]}`;
  return parts[0];
}

/** Mode indicator text for `ind:cyc.mode`. */
export function cycModeText(m: MachineState | null): string {
  return m?.cycle?.mode || "-";
}
