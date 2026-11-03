#!/usr/bin/env python3
"""Drive heatrod.e on the real ENIAC core. usage: drive.py [INITs=7] [HEAT=1]
INIT 1 seeds the hot cell; INITs 2.. are time steps. Prints a1..a5 after each INIT,
the wall time of each INIT, and checks against reference.py. Env: GOMAXPROCS honoured."""
import subprocess, sys, time, os, re, threading, queue
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = "/Users/nickd/Workspaces/eniac-touch-kiosk/.claude/worktrees/army-mission/build"
sys.path.insert(0, HERE)
import reference

def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    heat = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    quiet = '-q' in sys.argv
    p = subprocess.Popen([BUILD + "/darwin-arm64/eniac-core"], cwd=BUILD + "/upstream",
                         stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
    q = queue.Queue()
    threading.Thread(target=lambda: [q.put(l) for l in p.stdout], daemon=True).start()
    def cmd(c): p.stdin.write(c + "\n"); p.stdin.flush()
    def dump(accs):
        while not q.empty(): q.get()
        got = []
        for a in accs:
            cmd(f"d a{a}")
            while True:
                l = q.get(timeout=5)
                m = re.search(r"([PM]) (\d{10})", l)
                if m: got.append(int(m.group(2)) if m.group(1) == 'P' else int(m.group(2)) - 10**10); break
        return got
    cmd(f"l {HERE}/heatrod.e"); time.sleep(0.5)
    cmd(f"s c.j1 {heat}"); time.sleep(0.1)
    cmd("b c"); time.sleep(0.4)
    ref = reference.run(n - 1, heat)
    ok = True; prev = [0]*10
    for i in range(n):
        t0 = time.time(); cmd("b i"); time.sleep(0.3)
        # settled = all 10 accumulators unchanged for 2 consecutive reads 0.5 s apart, and changed from before
        last = None; same = 0
        while True:
            cur = dump(range(1, 11))
            if cur == last: same += 1
            else: same = 0
            last = cur
            if same >= 2 and cur != prev and all(v == 0 for v in cur[5:]): break
            if time.time() - t0 > 14: break
            time.sleep(0.4)
        dt = time.time() - t0 - 0.4*2 - 0.3   # minus the 2 confirming polls and the initial pause
        prev = cur
        row = cur[:5]; good = row == ref[i]; ok &= good
        if not quiet:
            print(f"INIT {i+1}: " + " ".join(f"{v:010d}" for v in row) + f"  new-cells={cur[5:]}  ref={'OK' if good else 'MISMATCH '+str(ref[i])}  ~{dt:.1f}s")
    print("RESULT", "PASS" if ok else "FAIL", " ".join(f"{v:010d}" for v in cur[:5]))
    cmd("q"); p.kill()
main()
