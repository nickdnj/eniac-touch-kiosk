#!/usr/bin/env python3
"""Time one INIT at the core's default speed: poll all 10 accumulators fast, report first and last change after 'b i'."""
import subprocess, time, os, re, threading, queue, sys
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = "/Users/nickd/Workspaces/eniac-touch-kiosk/.claude/worktrees/army-mission/build"
p = subprocess.Popen([BUILD+"/darwin-arm64/eniac-core"], cwd=BUILD+"/upstream", stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
q = queue.Queue(); threading.Thread(target=lambda: [q.put(l) for l in p.stdout], daemon=True).start()
def cmd(c): p.stdin.write(c+"\n"); p.stdin.flush()
def snap():
    for a in range(1,11): cmd(f"d a{a}")
    r=[]
    while len(r)<10:
        m=re.search(r"([PM]) (\d{10})", q.get(timeout=5))
        if m: r.append(m.group(0))
    return r
RATE=os.environ.get("RATE"); cmd(f"l {HERE}/heatrod.e"); time.sleep(0.5)
if RATE: cmd(f"s cy.rate {RATE}")
cmd("b c"); time.sleep(0.4)
for i in range(int(sys.argv[1]) if len(sys.argv)>1 else 4):
    while not q.empty(): q.get()
    base=snap(); t0=time.time(); cmd("b i"); first=last=None; s=base; n=0
    MAXT=float(os.environ.get("MAXT","3")); QUIET=float(os.environ.get("QUIET","0.5"))
    while time.time()-t0 < MAXT and (last is None or time.time()-t0-last < QUIET):
        c=snap(); n+=1
        if c!=s:
            now=time.time()-t0; first=first if first is not None else now; last=now; s=c
    print(f"INIT {i+1}: first change {first and round(first,3)}s, last change {last and round(last,3)}s (polls {n})")
cmd("q"); p.kill()
