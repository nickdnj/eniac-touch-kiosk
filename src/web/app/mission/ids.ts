// .e terminal / switch names -> SVG element ids (architecture 6.1, panels/README.md).

/** "1" and "1-3" are trunks; everything else is a jack. */
export function termId(term: string): string {
  return /^\d+(-\d+)?$/.test(term) ? `trunk:${term}` : `jack:${term}`;
}

export function switchId(sw: string): string {
  return `sw:${sw}`;
}

/** The workbench unit an element belongs to: "jack:a1.α" -> "a1", "trunk:1-3" -> "trunks". */
export function unitOf(id: string): string {
  if (id.startsWith("trunk:")) return "trunks";
  const rest = id.slice(id.indexOf(":") + 1);
  return rest.slice(0, rest.indexOf("."));
}
