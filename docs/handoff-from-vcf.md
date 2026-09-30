# Handoff from the VCF museum workspace (2026-09-30)

## What Nick asked for

> Can we refactor the code for the simulator such that it's for touch, increase the targets, put some on-screen help to guide someone through the process of programming and running the ENIAC?

The goal is a touch-first version of the ENIAC simulator for a museum kiosk. It needs large touch targets and on-screen guidance that walks a visitor through setting up (programming) the ENIAC and running it.

## The upstream simulator

- Brian L. Stuart's (Drexel) pulse-level ENIAC simulator: https://github.com/blstuart/eniac-simulator. The author's page is https://www.cs.drexel.edu/~bls96/eniac/simulator.html, and the paper is "Simulating the ENIAC" (IEEE, linked from the README).
- **Structure:** `src/` is the simulator core, in Go (`cd src && go build -o eniac`). It reads commands from stdin (`l file.e` loads a configuration, `b i` presses the initiating pulse, `b r` starts the reader, `b c` clears, `s …` sets a switch, `p …` plugs a cable) and streams status to a display child process (`-v "vis/eniactk -D"`).
- **The front end:** `vis/eniactk.go` is the Tk front end. It writes Tcl to a `wish` subprocess and draws neon lamps over photographs in `images/` at sizes chosen from the screen width. Its buttons are tiny: `butparam`, the Clean 10 font, `-pady 0`. `-D` cycles the views every 5 s, and `-K` restarts wish periodically to work around a Tk memory problem on ARM.
- **Programs:** `programs/*.e` holds the configurations. `trajdemo.e` recreates the Feb 15, 1946 unveiling demo (artillery trajectory, Heun's method). Press READ to load the constants card, then INIT for each part of the demo. Others include sieve.e (primes; press `b i` to start), cube.e, sq.e, hellorld.e and turing.e.
- **Licensing:** the repo has **no license file**. Modifying it for the museum's own kiosk is one thing; publishing a fork or redistributing it needs Stuart's permission. Credit him on screen.

## A bug already found and patched locally

`src/mult.go:66` formats the multiplier stage as `"%2d "`, so a single-digit stage gets a leading space. `vis/eniactk.go:643` splits messages with `strings.Split(s, " ")`, so the fields shift. It panics at `eniactk.go:785` (`index out of range [1] with length 1`) the first time the multiplier runs, and wish then shows "error writing stdout: broken pipe". The fix is `Sprintf("%d ", stage)`. It's confirmed working on the kiosk. Report it to Stuart; Nick hasn't sent anything yet.

## Where it runs now (trial)

- The Model 4 kiosk's Pi 5 (8 GB, Pi OS trixie arm64, a 15.6" USB touchscreen with a wch.cn multitouch controller). Museum address 10.130.10.37 on Wi-Fi, 10.130.10.36 wired; user `admin`.
- It's installed at `/opt/eniac-simulator`, owned by the `kiosk` user, with apt `golang-go` + `tk`. `scripts/eniac-try.sh` (install | fix | start | stop | remove) overlays the Tk window on the kiosk's Chromium on :0. It's **temporary**, and that box belongs to the Model 4 kiosk, so remove it before the floor.
- The museum's own ENIAC exhibit is a separate older Pi at 10.130.10.27 running an older copy of the same simulator (trajdemo.e, `-D`). See the wiki page `teams/vcf-museum/eniac-exhibit.md`.

## Open design decisions (for the first session)

1. **Front end:** patch `eniactk` (Tk: bigger buttons, fonts and a help panel) or write a new web front end? A web front end would talk to the Go core over a websocket and render in Chromium like the other museum kiosks. Tk is quickest; web fits the kiosk family and touch better.
2. **Guided flow:** decide what "programming the ENIAC" means for a visitor. Options are a scripted walkthrough of a real .e setup (plugging trays, setting switches, with each step shown), then READ → INIT → watch the lamps and the punched cards; or a set of guided missions (squares, primes, the 1946 trajectory demo).
3. **Hardware:** which box it ends up on. It shouldn't be the Model 4 kiosk long-term.

## Decisions (first session, 2026-09-30)

1. **Front end:** a new web front end. A Go websocket bridge wraps the simulator core, and the UI renders in Chromium like the other museum kiosks. The Tk `eniactk` stays upstream only, for reference.
2. **Guided flow:** guided missions, a progression of squares → primes → the 1946 trajectory demo. Each mission walks through its key plugging and switch steps with explanations, then READ → INIT → watch the lamps and cards.
3. **Hardware:** a new dedicated Pi 5 with a touchscreen. The trial install on the Model 4 kiosk gets removed before the floor.
