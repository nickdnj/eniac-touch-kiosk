// MachineState -> lit lamp IDs, per unit (architecture 6.1). Pure.
// Units: "acc.N", "cyc", "init", "ct", "mp", "ft", "mult".

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

const isDigit = (c: string | undefined): c is string => c !== undefined && c.length === 1 && c >= "0" && c <= "9";

/** Master programmer: stepper stages 0..5 (S = 0..9, A..K without I), inputs, decades. */
export function mpLamps(m: MachineState): Set<string> {
  const out = new Set<string>();
  const mp = m.mp;
  if (!mp) return out;
  for (let S = 0; S < 10; S++) {
    const st = mp.stage?.[S];
    if (isDigit(st) && Number(st) <= 5) out.add(`lamp:mp.s.${S}.${st}`);
    const inf = mp.inff?.[S];
    if (inf !== undefined && inf !== "0" && (isDigit(inf) || inf === "*")) out.add(`lamp:mp.s.${S}.in`);
  }
  for (let D = 0; D < 20; D++) {
    const v = mp.dec?.[D];
    if (isDigit(v)) out.add(`lamp:mp.dec.${D}.${v}`);
  }
  return out;
}

/** Function tables 1..3: ring K = ring + 3 (0..12), add/sub/argset, argument digits. */
export function ftLamps(m: MachineState): Set<string> {
  const out = new Set<string>();
  for (let u = 1; u <= 3; u++) {
    const f = m.ft?.[String(u)];
    if (!f) continue;
    const k = f.ring + 3;
    if (Number.isInteger(k) && k >= 0 && k <= 12) out.add(`lamp:ft.${u}.ring.${k}`);
    if (f.add === 1) out.add(`lamp:ft.${u}.add`);
    if (f.sub === 1) out.add(`lamp:ft.${u}.sub`);
    if (f.argff === 1) out.add(`lamp:ft.${u}.argset`);
    const a = f.arg ?? "";
    if (a.length === 2 && isDigit(a[0]) && isDigit(a[1])) {
      out.add(`lamp:ft.${u}.arg10.${a[0]}`);
      out.add(`lamp:ft.${u}.arg1.${a[1]}`);
    }
  }
  return out;
}

/** Multiplier: stage 0..13, program flip-flops 1..24, reset FFs. */
export function multLamps(m: MachineState): Set<string> {
  const out = new Set<string>();
  const x = m.mult;
  if (!x) return out;
  if (Number.isInteger(x.stage) && x.stage >= 0 && x.stage <= 13) out.add(`lamp:mult.stage.${x.stage}`);
  const ff = x.ff ?? "";
  if (ff.length === 24) for (let p = 1; p <= 24; p++) if (ff[p - 1] === "1") out.add(`lamp:mult.prog.${p}`);
  if (x.r1 === 1) out.add("lamp:mult.r1");
  if (x.r3 === 1) out.add("lamp:mult.r3");
  return out;
}

export function unitLamps(unit: string, m: MachineState): Set<string> {
  if (unit.startsWith("acc.")) return accLamps(unit.slice(4), m);
  if (unit === "cyc") return cycLamps(m);
  if (unit === "init") return initLamps(m);
  if (unit === "ct") return ctLamps(m);
  if (unit === "mp") return mpLamps(m);
  if (unit === "ft") return ftLamps(m);
  if (unit === "mult") return multLamps(m);
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
