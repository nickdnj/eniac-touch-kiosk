# Notice: third-party work

This kiosk is built on the **ENIAC simulator by Brian L. Stuart**
(https://github.com/blstuart/eniac-simulator), and would not exist without it.

- **The simulator is not part of this repository and is not covered by this
  repository's MIT license.** It is fetched at build time from Stuart's
  repository at a pinned commit (`upstream.lock`) and is never committed here.
  As of 2026-10-12 his repository carries no license file, so his work remains
  under his own rights. Anything you build from it is governed by his terms,
  not ours.
- **`patches/`** holds one small bug fix written against his code (the
  accumulator 1P race). It is published here so he and others can review it.
  It is derivative of his code and follows whatever terms he sets for it. Two
  earlier fixes were taken into his repository and retired on 2026-10-19.
- **`missions/programs/difference.e`** is Stuart's configuration for the
  Difference mission, from his tutorial "Polynomial Tables on the ENIAC". It is
  copied into the build next to his own programs, byte for byte, with his
  permission (confirmed by Nick DeMarco, 2026-10-19). If he adds it to his
  repository, the build checks the two are identical and ours can be deleted.
  The tutorial itself is not included here.
- **Photographs and images** in his `images/` directory are used in the
  Original-UI mode of the museum's release with his permission (2026-10-07).
  They are not in this repository. Do not assume the right to redistribute
  them.
- **Historical text** in the kiosk is our own wording, checked against the
  sources listed in `docs/fact-check.md`.

The MIT license in `LICENSE` covers the original work in this repository: the
web kiosk, the Go bridge, the installer and the documentation, by Nick DeMarco.
