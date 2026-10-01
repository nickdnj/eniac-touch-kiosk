# Golden status streams

Recorded from the **real core** at the pinned upstream commit (plus `patches/`), with `eniac-bridge record`. Each golden is four files:

| File | Contents |
|---|---|
| `<name>.status` | The raw status stream exactly as vlink relayed it (timed mode, one line per change) |
| `<name>.dump` | The core's own `D` output at the end of the run (the oracle) |
| `<name>.punch` | The session punch file (`f p`), byte for byte |
| `<name>.meta.json` | Program, rate, INITs, upstream commit, patched or not, commands written |

`internal/machine/golden_test.go` replays every `.status` through `status.Parse` and the mirror and requires: no dropped lines, the final MachineState equal to the `.dump` (every unit except the cycling unit and the divider, whose `D` format differs), and the punch payloads equal to the `.punch` file.

| Golden | Run | Covers |
|---|---|---|
| `sq-3inits` | `sq.e`, rate 100 (the Squares `slow` preset), 3 INITs | Main path, including intermediate values (acc 2 steps 4, 6, 8, 9). Final 3 / 9. |
| `sq-12inits` | `sq.e`, rate 0, 12 INITs | Longer drift check. Final 12 / 144. |
| `neg-sign` | `neg-sign.e` (test-only program in this directory), 1 INIT | Sign `M` (`ad 1 0 3`) and ten's complement: acc 2 = M 9999999995 = -5 |
| `traj-patched` | `trajdemo.e` (runs itself on load), 10 s unthrottled, frozen before the dump | mp, ft (signed ring from -3), mult in the patched `%d` format, 7 punched cards |
| `traj-unpatched-m` | Same, with the **unpatched** core | `m` lines with the upstream `%2d` double space; must give the same mult state |

`sieve-canary` (test plan 3.2) is not recorded: `sieve.e` does not run at the pin (U1, spike #32).

## Re-recording (on every upstream bump)

```sh
make upstream-unpatched   # builds the patched cores and build/unpatched/eniac-core
make goldens              # re-records all five goldens into tests/golden/
make test                 # replays them
```

`make goldens` runs:

```sh
B=build/darwin-arm64/eniac-bridge C=deploy/config/config.dev.yaml
$B record --config $C --program sq.e --inits 3 --rate 100 --settle 2.5s --name sq-3inits --out tests/golden
$B record --config $C --program sq.e --inits 12 --rate 0 --settle 300ms --name sq-12inits --out tests/golden
$B record --config $C --program $PWD/tests/golden/neg-sign.e --inits 1 --rate 0 --settle 500ms --name neg-sign --out tests/golden
$B record --config $C --program trajdemo.e --inits 0 --rate 0 --seconds 10s --freeze --name traj-patched --out tests/golden
$B record --config $C --program trajdemo.e --inits 0 --rate 0 --seconds 10s --freeze --unpatched \
   --core build/unpatched/eniac-core --name traj-unpatched-m --out tests/golden
```

`--freeze` switches the cycling unit to single-pulse mode (`s cy.op 1p`) before the dump, so a program that is still running holds still and the dump matches the last status sample. Review the diff of the `.status` files in the bump PR: a changed wire format shows up there first.
