# Test-only program (not upstream): drives Accumulator 2 negative so the
# golden stream contains the M sign (ad U 0 3) and ten's-complement digits.
# INIT: constant J (=5, constant program 25) goes to Acc 1 on program 1. The
# constant's program-25 output then makes Acc 1 transmit on S (subtract)
# into Acc 2 on program 5. Result: Acc 1 = P 0000000005, Acc 2 = M 9999999995 (-5).
s c.j1 5
s c.s25 Jlr
p c.o 1
p 1 a1.α
p a1.S 2
p 2 a2.α
p i.io 1-1
p 1-1 c.25i
p 1-1 a1.1i
s a1.op1 α
p c.25o 1-2
p 1-2 a1.5i
s a1.op5 S
s a1.rp5 1
p 1-2 a2.5i
s a2.op5 α
s a2.rp5 1
