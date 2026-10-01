// .e terminal / switch names -> SVG element ids (architecture 6.1, panels/README.md).

/** "1" and "1-3" are trunks; everything else is a jack. */
export function termId(term: string): string {
  return /^\d+(-\d+)?$/.test(term) ? `trunk:${term}` : `jack:${term}`;
}

export function switchId(sw: string): string {
  return `sw:${sw}`;
}

/** Element id -> canonical .e term ("jack:a1.S" -> "a1.S", "trunk:1-2" -> "1-2", "sw:c.j2" -> "c.j2"). */
export function termOf(id: string): string {
  return id.slice(id.indexOf(":") + 1);
}

/**
 * Data or program? Data: bare data trunks, α-ε, A, S, c.o. Program: t-l
 * program trunks, Ni / No program jacks, and the initiating unit's pulse
 * jacks (architecture 5.9.3 `cable`).
 */
export function kindOf(id: string): "data" | "program" {
  if (id.startsWith("trunk:")) return id.includes("-") ? "program" : "data";
  const t = termOf(id);
  if (t.startsWith("i.")) return "program";
  if (/\.\d+[io]$/.test(t)) return "program";
  return "data";
}

/** The workbench unit an element belongs to: "jack:a1.α" -> "a1", "trunk:1-3" -> "trunks". */
export function unitOf(id: string): string {
  if (id.startsWith("trunk:")) return "trunks";
  const rest = id.slice(id.indexOf(":") + 1);
  return rest.slice(0, rest.indexOf("."));
}
