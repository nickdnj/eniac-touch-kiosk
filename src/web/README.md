# Kiosk web UI (M1)

Vanilla TypeScript + SVG + CSS, no framework (architecture 9). The bundle is
`app/main.ts` → `app.js`, plus `index.html`, `styles/` and `fonts/`. Node is
dev tooling only: it is never on the Pi and never in a release.

## Run it locally against the dev mock

```sh
cd src/web
npm i
npm run dev          # http://127.0.0.1:8740/
```

Open http://127.0.0.1:8740/ in Chrome at 1920×1080 with DevTools touch
emulation (device toolbar → custom device 1920×1080, DPR 1, type Mobile).
`PORT=8750 npm run dev` picks another port. `MOCK_IDLE=6,9,3 npm run dev`
shortens the idle timeouts (setupS, runS, countdownS).

`npm run dev` serves this folder like the bridge's `--dev` mode does (it
bundles `app/main.ts` on every `/app.js` request) and answers the websocket
and mission API with a **dev-only mock bridge** (`tests/web/mock/`). The mock
speaks the architecture 5.4–5.6 protocol and simulates `sq.e` (one square per
INIT) so every screen is reachable. It is never bundled: the production UI
only talks to the real bridge, and with no bridge it shows the S10 error
screen (no demo fallback).

Dev shortcut: `/?mission=squares` starts a session straight away (dev builds
only; compiled out of `npm run build`).

Against the real bridge (after `m1-bridge` is merged): `make dev` from the
repo root serves this folder the same way at http://localhost:8740/.

## Build

```sh
npm run build        # dist/{index.html, app.js, styles/, fonts/}
```

`ENIAC_BUILD=<hello.build string>` makes the page reload when the bridge's
build changes (architecture 5.3). Without it, builds are not compared.

## Tests

```sh
npm run typecheck    # tsc --noEmit (app, scripts, tests)
npm test             # node --test tests/web/**/*.test.ts
npm run e2e          # Playwright, 1920x1080 with touch, against the mock
npm run screenshots  # writes docs/screenshots/m1-web/*.png
```

`tests/web/contract.test.ts` checks the bridge's protocol fixtures and
`missions/squares.yaml` against this UI; it skips until those files exist in
the tree (or point `ENIAC_FIXTURES` / `ENIAC_MISSIONS` at them).

## Layout

| Path | What |
|---|---|
| `app/main.ts`, `app/app.ts` | Boot, controller, router, error precedence and recovery |
| `app/protocol.ts` | Mirror of the bridge's generated types (to be replaced by imports, #8) |
| `app/net/` | Websocket link (reconnect, ping, E-LINK) and mission API |
| `app/state/machine.ts` | RFC 7396 merge patch; draws only the current session while core and link are up |
| `app/lamps/` | MachineState → lit lamp IDs; rAF renderer toggling `on` |
| `app/panels/art.ts` | The SVG panel kit (generates `panels/*.svg`, see `panels/README.md`) |
| `app/mission/` | Step runner, wrong-tap ladder, hit testing, ID helpers |
| `app/stage/` | Workbench, close-up windows, picker, cables, room plan |
| `app/run/` | Caption beats, autopress |
| `app/screens/` | S0/S1/S2 start, S3–S5 mission, S6 run, S7 result, S9 still there, S10 error |
| `app/ui/` | DOM helpers, touch guards, tap dispatcher, animation helper, overlays |
| `app/idle.ts` | Inactivity timers |

Rules the code keeps: every tap fires on release, first finger only; no
hover; targets ≥ 64 px (jacks 88, dials 120, primary 96); machine state is
drawn only from the bridge; flow never waits on animation frames
(`app/ui/anim.ts`).
