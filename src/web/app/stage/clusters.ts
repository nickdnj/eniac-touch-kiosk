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
  /** Family used by the picker prompt. */
  family: "digit" | "repeat";
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

export function jackClusterFor(id: string): JackCluster | null {
  return JACK_CLUSTERS.find((c) => c.jacks.some((j) => j.id === id)) ?? null;
}

export function dialClusterFor(id: string): DialCluster | null {
  return DIAL_CLUSTERS.find((c) => c.dials.some((d) => d.id === id)) ?? null;
}
