#!/usr/bin/env python3 -I
# -v child for eniac-core: drives a .e and timestamps the status stream.
# env: PROG (abs .e), RATE, MOVES (comma list of j1 values), OUT (result file),
#      SWITCH (default c.j1), WAIT (s after each INIT), EXTRA (; separated cmds before play)
import os, sys, threading, time, json
prog=os.environ["PROG"]; rate=os.environ.get("RATE","0")
moves=os.environ.get("MOVES","1,3,2,2,1").split(",")
sw=os.environ.get("SWITCH","c.j1"); wait=float(os.environ.get("WAIT","1.0"))
extra=[c for c in os.environ.get("EXTRA","").split(";") if c]
out=open(os.environ["OUT"],"w")
ev=[]; lock=threading.Lock()
def rd():
    for line in sys.stdin:
        t=time.monotonic()
        with lock: ev.append((t,line.rstrip("\n")))
threading.Thread(target=rd,daemon=True).start()
def send(c):
    pass
    sys.stdout.write(c+"\n"); sys.stdout.flush()
send("ready"); time.sleep(0.3)
send("l "+prog); time.sleep(0.5)
send("s cy.rate "+rate)
for c in extra: send(c)
time.sleep(0.3)
acc={}
def apply(line):
    p=line.split()
    if p[0]=="ad":
        u,d,v=int(p[1]),int(p[2]),int(p[3])
        a=acc.setdefault(u,["P"]+[0]*10)
        if d==0: a[0]="P" if v==0 else "M"
        else: a[d]=v
for i,m in enumerate(moves):
    with lock: n0=len(ev)
    if m!="-": send(f"s {sw} {m}")
    time.sleep(0.05)
    t0=time.monotonic(); send("b i")
    time.sleep(wait)
    with lock: seg=ev[n0:]
    last=None; first=None
    for t,l in seg:
        if t<t0: 
            if not l.startswith("cy"): apply(l)
            continue
        if l.startswith(("ad","af","ac","ar","ct","mps","mpd","mpi")):
            first=first or t; last=t
        if l.startswith("ad"): apply(l)
    vals={f"a{u+1}":a[0]+"".join(map(str,a[1:])) for u,a in sorted(acc.items())}
    out.write(json.dumps({"turn":i+1,"move":m,"busy_ms":round((last-t0)*1000) if last else None,
       "first_ms":round((first-t0)*1000) if first else None,"acc":vals})+"\n"); out.flush()
open(os.environ["OUT"]+".raw","w").write("\n".join(f"{t:.4f} {l}" for t,l in ev))
send("q")
time.sleep(0.2)
