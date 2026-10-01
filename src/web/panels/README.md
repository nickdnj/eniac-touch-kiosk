# SVG panel kit (M1: Squares units)

Original vector art in the style of the ENIAC panel photos (UX 6.1): charcoal
cabinets, engraved plates, cream jack blocks with dark sockets, black knobs with
a white pointer, amber neon lamps. **Not** the upstream photos (U9, R1).

| File | Unit | Used in |
|---|---|---|
| `initiating.svg` | Initiating Unit (`i`) | Workbench card |
| `constant.svg` | Constant Transmitter (`c`) | Workbench card |
| `accumulator-1.svg`, `accumulator-2.svg` | Accumulators 1 and 2 (`a1`, `a2`) | Workbench cards |
| `accumulator-run-1.svg`, `accumulator-run-2.svg` | Accumulator lamp grids at run size (26 px lamps, 52x38 pitch) | Run view (S6) |
| `cycling.svg` | Cycling unit strip | Run view (S6) |
| `trunks-data.svg`, `trunks-program.svg` | Data trunk rail (1-3) and program trunk rail (1-1 to 1-5) | Workbench |

## These files are generated

The source of truth is `app/panels/art.ts` (pure string builders, no DOM). The
same code renders the panels at runtime and writes these files:

```
cd src/web && npm run gen:panels
```

`tests/web/panels.test.ts` fails if a file here is stale, so art, IDs and the
cable geometry the UI uses can never drift apart. Edit `art.ts`, not the SVGs.

## ID grammar (architecture 6.1): the contract

Positions are art. **IDs are the contract** between the machine state, the
mission data and the drawings.

| Element | `id` | Lit / active when |
|---|---|---|
| Accumulator digit neon | `lamp:acc.N.d.D.V` (D = 1..10 left to right = MSD to LSD, V = 0..9) | `acc[N].digits[D-1] == V` |
| Accumulator sign | `lamp:acc.N.sign.P`, `lamp:acc.N.sign.M` | `acc[N].sign` |
| Carry flip-flop | `lamp:acc.N.carry.D` | `carry[D-1] == '1'` |
| Repeat counter | `lamp:acc.N.rep.V` (V = 0..9) | `rep == V` |
| Program flip-flop | `lamp:acc.N.prog.P` (P = 1..12) | `prog[P-1] == '1'` |
| Cycling pulse position | `lamp:cyc.pulse.K` (K = 0..19) | `floor(pos/2) == K` |
| Cycling CCG / 10P | `lamp:cyc.ccg`, `lamp:cyc.tenp` | `22 <= pos <= 36` / `pos < 20 && pos odd` |
| Cycling mode | `ind:cyc.mode` (text) | `cycle.mode` |
| Initiating unit | `lamp:init.clear.S` (S = 1..6), `lamp:init.rdff`, `.prff`, `.rdfinish`, `.rdilock`, `.rdsync`, `.g66`, `.g69` | `init` bits 0-5, 6, 7, 8, 9, 10, 13, 14 |
| Constant transmitter program | `lamp:ct.P` (P = 1..30) | `ct[P-1] == '1'` |
| Jack | `jack:<term>` in `.e` grammar: `jack:c.o`, `jack:a1.α`, `jack:a1.A`, `jack:a2.6o`, `jack:a1.5i`, `jack:i.io` | mission target or decoy |
| Trunk | `trunk:<n>` for data trunks (`trunk:1`), `trunk:<t>-<l>` for program trunks (`trunk:1-3`) | mission target |
| Switch | `sw:<unit>.<switch>`: `sw:c.j1`, `sw:a1.rp6`, `sw:a2.op6`, `sw:c.s26` | mission target; pointer shows the value |

A lamp element is `<g id="lamp:…" class="lamp">` with an unlit disc and a
`.lamp-lit` group (glow + a 1.4x core). The renderer only toggles the `on`
class; `styles/panels.css` does the 80 ms decay.

A switch element is `<g id="sw:…" class="dial" data-positions="…" data-value="…">`
whose `.dial-pointer` is rotated by `panels/load.ts#setDial`.

### Provisional names

`i.ri`, `i.ro`, `i.pi`, `i.po`, `i.ci1`-`i.ci6`, `i.co1`-`i.co6` on the
Initiating Unit are drawn as realistic neighbours (decoys for step 6). Only
`i.io` (and `i.pi` / `i.po`, used by Primes in M2) are confirmed from `.e`
files so far. Confirm the rest against the econfig jack grammar (#9).

### Hit areas

Hit areas are **not** in these files. The tap windows (L2 close-ups) compute
their own hit rectangles in screen space: jacks 88x88, dials 120x120 (UX 6.6),
independent of the drawn size. Workbench cards are context only and never take
taps.
