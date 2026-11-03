#!/usr/bin/env python3
"""Hand-computable reference for heatrod.e (no ENIAC involved).
new[i] = old[i-1] + 2*old[i] + old[i+1]; insulated ends (a missing neighbour is a copy of the end cell)."""
import sys
def step(r):
    n = len(r); out = []
    for i in range(n):
        l = r[i-1] if i > 0 else r[i]
        rt = r[i+1] if i < n-1 else r[i]
        out.append(l + 2*r[i] + rt)
    return out
def run(steps, heat=1, cells=5):
    r = [0]*cells; r[cells//2] = heat
    rows = [r]
    for _ in range(steps):
        r = step(r); rows.append(r)
    return rows        # rows[0] = after the first (seed) INIT
if __name__ == "__main__":
    steps = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    heat = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    for i, r in enumerate(run(steps, heat)):
        print(f"INIT {i+1}:", " ".join(f"{v:010d}" for v in r), "(total %d)" % sum(r))
