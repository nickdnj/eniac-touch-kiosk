# heatrod.e - heat spreading along a rod, by adding only (spike S7 stand-in).
# Exhibit-team program, not upstream. Runs unmodified on Brian L. Stuart's simulator.
# Rod of 5 cells. Acc 1-5 = temperatures now; Acc 6-10 = the next time step.
# One INIT = one time step: new(i) = old(i-1) + 2*old(i) + old(i+1), i.e. heat
# diffusion with the divide-by-4 left out (numbers grow 4x a step; the SHAPE is
# the point). Rod ends are insulated: a missing neighbour is a copy of the end cell.
# The first INIT (Master Programmer stage 1) puts the heat in cell 3 from dial c.j1;
# the next 99 INITs are time steps; then it re-seeds.
# Data trunks: 1-5 = Acc 1-5 A out (old cells); 6-10 = Acc 6-10 A out (new cells);
#              11 = constant transmitter out.
p a1.A 1
p a2.A 2
p a3.A 3
p a4.A 4
p a5.A 5
p a6.A 6
p a7.A 7
p a8.A 8
p a9.A 9
p a10.A 10
p c.o 11
p 11 a3.α
p 6 a1.δ
p 7 a2.δ
p 8 a3.δ
p 9 a4.δ
p 10 a5.δ
p 1 a6.β
p 2 a6.γ
p 1 a7.α
p 2 a7.β
p 3 a7.γ
p 2 a8.α
p 3 a8.β
p 4 a8.γ
p 3 a9.α
p 4 a9.β
p 5 a9.γ
p 4 a10.α
p 5 a10.β
p i.io 1-1
p 1-1 p.Ai
s p.d20s1 1
s p.d20s2 99
s p.cA 2
p p.A1o 2-1
p p.A2o 1-2
# 2-1 seed: constant J into hot cell (Acc 3)
p 2-1 c.25i
s c.s25 Jlr
p 2-1 a3.7i
s a3.op7 α
s a3.rp7 1
# (The machine must be cleared with CLEAR before the first INIT.)
# 1-2: old cell 1 sends (and clears itself); neighbours receive
p 1-2 a1.5i
s a1.op5 A
s a1.cc5 C
s a1.rp5 3
p a1.5o 1-3
p 1-2 a7.5i
s a7.op5 α
s a7.rp5 1
p 1-2 a6.6i
s a6.op6 β
s a6.rp6 3
# 1-3: old cell 2 sends (and clears itself); neighbours receive
p 1-3 a2.5i
s a2.op5 A
s a2.cc5 C
s a2.rp5 2
p a2.5o 1-4
p 1-3 a8.5i
s a8.op5 α
s a8.rp5 1
p 1-3 a7.6i
s a7.op6 β
s a7.rp6 2
p 1-3 a6.7i
s a6.op7 γ
s a6.rp7 1
# 1-4: old cell 3 sends (and clears itself); neighbours receive
p 1-4 a3.5i
s a3.op5 A
s a3.cc5 C
s a3.rp5 2
p a3.5o 1-5
p 1-4 a9.5i
s a9.op5 α
s a9.rp5 1
p 1-4 a8.6i
s a8.op6 β
s a8.rp6 2
p 1-4 a7.7i
s a7.op7 γ
s a7.rp7 1
# 1-5: old cell 4 sends (and clears itself); neighbours receive
p 1-5 a4.5i
s a4.op5 A
s a4.cc5 C
s a4.rp5 2
p a4.5o 1-6
p 1-5 a10.5i
s a10.op5 α
s a10.rp5 1
p 1-5 a9.6i
s a9.op6 β
s a9.rp6 2
p 1-5 a8.7i
s a8.op7 γ
s a8.rp7 1
# 1-6: old cell 5 sends (and clears itself); neighbours receive
p 1-6 a5.5i
s a5.op5 A
s a5.cc5 C
s a5.rp5 3
p a5.5o 1-7
p 1-6 a10.6i
s a10.op6 β
s a10.rp6 3
p 1-6 a9.7i
s a9.op7 γ
s a9.rp7 1
# 1-7: new cells send themselves back into the old cells (and clear), ready for the next step
p 1-7 a6.8i
s a6.op8 A
s a6.cc8 C
s a6.rp8 1
p 1-7 a1.6i
s a1.op6 δ
s a1.rp6 1
p 1-7 a7.8i
s a7.op8 A
s a7.cc8 C
s a7.rp8 1
p 1-7 a2.6i
s a2.op6 δ
s a2.rp6 1
p 1-7 a8.8i
s a8.op8 A
s a8.cc8 C
s a8.rp8 1
p 1-7 a3.6i
s a3.op6 δ
s a3.rp6 1
p 1-7 a9.8i
s a9.op8 A
s a9.cc8 C
s a9.rp8 1
p 1-7 a4.6i
s a4.op6 δ
s a4.rp6 1
p 1-7 a10.8i
s a10.op8 A
s a10.cc8 C
s a10.rp8 1
p 1-7 a5.6i
s a5.op6 δ
s a5.rp6 1
# The heat dial: how hot the starting cell is (first INIT only)
s c.j1 1
