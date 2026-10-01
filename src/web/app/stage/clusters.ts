// What each L2 close-up window shows (UX 7.3): a small cluster of REAL
// neighbouring jacks or dials around the target, so the decoys look like the
// machine. Labels are the engraved names, set at 24 px in the window.

export interface JackCluster {
  key: string;
  title: string;
  jacks: { id: string; label: string }[];
}

export interface DialCluster {
  key: string;
  title: string;
  dials: { id: string; label: string }[];
  /** Family used by the picker prompt and the dial positions. */
  family: "digit" | "repeat" | "printer";
}

const accIn = (a: string, n: string): JackCluster => ({
  key: `${a}-in`,
  title: `ACCUMULATOR ${n}: INPUTS`,
  jacks: [
    { id: `jack:${a}.α`, label: "α" },
    { id: `jack:${a}.β`, label: "β" },
    { id: `jack:${a}.γ`, label: "γ" },
    { id: `jack:${a}.δ`, label: "δ" },
    { id: `jack:${a}.ε`, label: "ε" },
    { id: `jack:${a}.5i`, label: "5 in" },
    { id: `jack:${a}.6i`, label: "6 in" },
  ],
});

export const JACK_CLUSTERS: JackCluster[] = [
  {
    key: "c",
    title: "CONSTANT TRANSMITTER",
    jacks: [
      { id: "jack:c.o", label: "OUT" },
      { id: "jack:c.24i", label: "24 in" },
      { id: "jack:c.25i", label: "25 in" },
      { id: "jack:c.26i", label: "26 in" },
      { id: "jack:c.27i", label: "27 in" },
      { id: "jack:c.28i", label: "28 in" },
    ],
  },
  {
    key: "data-trunks",
    title: "DATA TRUNKS (AT THIS UNIT)",
    jacks: [
      { id: "trunk:1", label: "Trunk 1" },
      { id: "trunk:2", label: "Trunk 2" },
      { id: "trunk:3", label: "Trunk 3" },
    ],
  },
  accIn("a1", "1"),
  {
    key: "a1-out",
    title: "ACCUMULATOR 1",
    jacks: [
      { id: "jack:a1.α", label: "α" },
      { id: "jack:a1.β", label: "β" },
      { id: "jack:a1.γ", label: "γ" },
      { id: "jack:a1.δ", label: "δ" },
      { id: "jack:a1.ε", label: "ε" },
      { id: "jack:a1.A", label: "A" },
      { id: "jack:a1.S", label: "S" },
    ],
  },
  accIn("a2", "2"),
  {
    key: "i",
    title: "INITIATING UNIT",
    jacks: [
      { id: "jack:i.io", label: "I out" },
      { id: "jack:i.ri", label: "R in" },
      { id: "jack:i.ro", label: "R out" },
      { id: "jack:i.pi", label: "P in" },
      { id: "jack:i.po", label: "P out" },
      { id: "jack:i.ci1", label: "Clr 1 in" },
      { id: "jack:i.co1", label: "Clr 1 out" },
    ],
  },
  {
    key: "program-trunks",
    title: "PROGRAM TRUNKS",
    jacks: [
      { id: "trunk:1-1", label: "1-1" },
      { id: "trunk:1-2", label: "1-2" },
      { id: "trunk:1-3", label: "1-3" },
      { id: "trunk:1-4", label: "1-4" },
      { id: "trunk:1-5", label: "1-5" },
    ],
  },
  {
    key: "a2-prog",
    title: "ACCUMULATOR 2: PROGRAM JACKS",
    jacks: [
      { id: "jack:a2.5i", label: "5 in" },
      { id: "jack:a2.6i", label: "6 in" },
      { id: "jack:a2.7i", label: "7 in" },
      { id: "jack:a2.5o", label: "5 out" },
      { id: "jack:a2.6o", label: "6 out" },
      { id: "jack:a2.7o", label: "7 out" },
    ],
  },
];

export const DIAL_CLUSTERS: DialCluster[] = [
  {
    key: "c-j",
    title: "CONSTANT TRANSMITTER: J DIALS",
    family: "digit",
    dials: [6, 5, 4, 3, 2, 1].map((d) => ({ id: `sw:c.j${d}`, label: `digit ${d}` })),
  },
  {
    key: "a1-rp",
    title: "ACCUMULATOR 1: REPEAT SWITCHES",
    family: "repeat",
    dials: [5, 6, 7, 8, 9, 10].map((p) => ({ id: `sw:a1.rp${p}`, label: `prog ${p}` })),
  },
];

const GREEK_NAMES: Record<string, string> = { "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "ε": "epsilon" };
const UNIT_NAMES: Record<string, string> = { a: "Accumulator", c: "Constant Transmitter", i: "Initiating Unit", p: "Master Programmer", pr: "Printer" };

// ------------------------------------------------------------------ generated clusters (M2)
// Real neighbours, generated from the target's own name when no fixed
// cluster above holds it: program trunks on the same tray, an accumulator's
// program jacks, one Master Programmer stepper, a run of printer fields.

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function generatedJackCluster(id: string): JackCluster | null {
  let m = /^trunk:(\d+)-(\d+)$/.exec(id);
  if (m) {
    const tray = Number(m[1]), line = Number(m[2]);
    const first = Math.max(1, Math.min(line - 2, 11 - 4));
    return { key: `prog-${tray}-${first}`, title: "PROGRAM TRUNKS", jacks: range(first, first + 4).map((l) => ({ id: `trunk:${tray}-${l}`, label: `${tray}-${l}` })) };
  }
  m = /^trunk:(\d+)$/.exec(id);
  if (m) {
    const n = Number(m[1]);
    const first = Math.max(1, Math.min(n - 1, 20 - 2));
    return { key: `data-${first}`, title: "DATA TRUNKS (AT THIS UNIT)", jacks: range(first, first + 2).map((t) => ({ id: `trunk:${t}`, label: `Trunk ${t}` })) };
  }
  m = /^jack:a(\d+)\.(\d+)[io]$/.exec(id);
  if (m) {
    const a = `a${m[1]}`, p = Number(m[2]);
    const first = Math.max(5, Math.min(p <= 6 ? 5 : p - 2, 10));
    const ps = range(first, first + 2);
    return {
      key: `${a}-prog-${first}`,
      title: `ACCUMULATOR ${m[1]}: PROGRAM JACKS`,
      jacks: [...ps.map((q) => ({ id: `jack:${a}.${q}i`, label: `${q} in` })), ...ps.map((q) => ({ id: `jack:${a}.${q}o`, label: `${q} out` }))],
    };
  }
  m = /^jack:a(\d+)\.(.+)$/.exec(id);
  if (m && GREEK_NAMES[m[2]]) return accIn(`a${m[1]}`, m[1]);
  m = /^jack:p\.([A-HJK])(i|di|cdi|\do)$/.exec(id);
  if (m) {
    const X = m[1];
    return {
      key: `p-${X}`,
      title: `MASTER PROGRAMMER: STEPPER ${X}`,
      jacks: [
        { id: `jack:p.${X}i`, label: `${X} in` },
        { id: `jack:p.${X}di`, label: `${X} DI` },
        { id: `jack:p.${X}cdi`, label: `${X} CDI` },
        { id: `jack:p.${X}1o`, label: `${X} 1 out` },
        { id: `jack:p.${X}2o`, label: `${X} 2 out` },
        { id: `jack:p.${X}3o`, label: `${X} 3 out` },
      ],
    };
  }
  return null;
}

function generatedDialCluster(id: string): DialCluster | null {
  let m = /^sw:c\.([jk])(\d+)$/.exec(id);
  if (m) {
    const K = m[1].toUpperCase();
    return { key: `c-${m[1]}`, title: `CONSTANT TRANSMITTER: ${K} DIALS`, family: "digit", dials: [6, 5, 4, 3, 2, 1].map((d) => ({ id: `sw:c.${m![1]}${d}`, label: `digit ${d}` })) };
  }
  m = /^sw:pr\.(\d+)$/.exec(id);
  if (m) {
    const f = Number(m[1]);
    const first = Math.max(1, Math.min(f - 2, 16 - 5));
    return { key: `pr-${first}`, title: "PRINTER: FIELD SWITCHES", family: "printer", dials: range(first, first + 5).map((k) => ({ id: `sw:pr.${k}`, label: `field ${k}` })) };
  }
  m = /^sw:a(\d+)\.rp(\d+)$/.exec(id);
  if (m) {
    const p = Number(m[2]);
    const first = Math.max(5, Math.min(p - 1, 12 - 5));
    return { key: `a${m[1]}-rp`, title: `ACCUMULATOR ${m[1]}: REPEAT SWITCHES`, family: "repeat", dials: range(first, first + 5).map((q) => ({ id: `sw:a${m![1]}.rp${q}`, label: `prog ${q}` })) };
  }
  return null;
}

/** Plain names of the Initiating Unit's jacks (UX 8.2.5, 8.3.5 copy uses PI, PO, Ro, Pi). */
const INIT_NAMES: Record<string, string> = {
  "i.io": "GO output (initiating pulse)",
  "i.pi": "Initiating Unit PI (punch start)",
  "i.po": "Initiating Unit PO (punch done)",
  "i.ri": "Initiating Unit Ri (reader start)",
  "i.ro": "Initiating Unit Ro (reader done)",
};

/**
 * Plain-language name for a target's label chip (UX 4.3 step 6), e.g.
 * "Accumulator 1 OUT (A)". Generic machine vocabulary, not mission copy.
 */
export function plainLabel(id: string): string {
  const t = id.slice(id.indexOf(":") + 1);
  if (id.startsWith("trunk:")) return t.includes("-") ? `Program trunk ${t}` : `Trunk ${t}`;
  if (id === "jack:c.o") return "Constant Transmitter OUT";
  if (INIT_NAMES[t] && id.startsWith("jack:")) return INIT_NAMES[t];
  let mp = /^p\.([A-HJK])(i|di|cdi|(\d)o)$/.exec(t);
  if (mp) return `Master Programmer ${mp[1]} ${mp[2] === "i" ? "in" : mp[2] === "di" ? "DI" : mp[2] === "cdi" ? "CDI" : `${mp[3]} out`}`;
  mp = /^pr\.(\d+)$/.exec(t);
  if (mp) return `Printer field ${mp[1]}`;
  let m = /^a(\d+)\.(.+)$/.exec(t);
  if (m) {
    const [, n, j] = m;
    const acc = `Accumulator ${n}`;
    if (id.startsWith("sw:")) {
      const r = /^rp(\d+)$/.exec(j);
      if (r) return `Program ${r[1]} repeat`;
      const o = /^op(\d+)$/.exec(j);
      if (o) return `${acc} program ${o[1]} operation`;
    }
    if (GREEK_NAMES[j]) return `${acc} input ${j} (${GREEK_NAMES[j]})`;
    if (j === "A") return `${acc} OUT (A)`;
    if (j === "S") return `${acc} OUT (S)`;
    const p = /^(\d+)([io])$/.exec(j);
    if (p) return `${acc} program ${p[1]} ${p[2] === "i" ? "in" : "out"}`;
  }
  m = /^c\.([jk])(\d+)$/.exec(t);
  if (m) return `${m[1].toUpperCase()} constant, digit ${m[2]}`;
  const unit = UNIT_NAMES[t.split(".")[0]];
  return unit ? `${unit} ${t.split(".").slice(1).join(".")}` : t;
}

/** Plain labels for picker choices ("2 times" for repeat switches). */
export function choiceLabel(swId: string, family: string | undefined, v: string): string | null {
  if ((family && family.includes("rp")) || /\.rp\d+$/.test(swId)) return `${v} ${v === "1" ? "time" : "times"}`;
  if ((family && family.startsWith("pr.")) || /^sw:pr\./.test(swId)) return v === "P" ? "Punch" : v === "0" ? "Leave blank" : null;
  return null;
}

export function jackClusterFor(id: string): JackCluster | null {
  return JACK_CLUSTERS.find((c) => c.jacks.some((j) => j.id === id)) ?? generatedJackCluster(id);
}

export function dialClusterFor(id: string): DialCluster | null {
  return DIAL_CLUSTERS.find((c) => c.dials.some((d) => d.id === id)) ?? generatedDialCluster(id);
}
