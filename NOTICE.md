# Notice: third-party work

This kiosk is built on the **ENIAC simulator by Brian L. Stuart**
(https://github.com/blstuart/eniac-simulator), and would not exist without it.

- **The simulator is not part of this repository and is not covered by this
  repository's MIT license.** It is fetched at build time from Stuart's
  repository at a pinned commit (`upstream.lock`) and is never committed here.
  As of 2026-10-12 his repository carries no license file, so his work remains
  under his own rights. Anything you build from it is governed by his terms,
  not ours.
- **`patches/`** holds three small bug fixes written against his code. They
  are published here so he and others can review them, and are offered to him
  for inclusion upstream. They are derivative of his code and follow whatever
  terms he sets for it.
- **Photographs and images** in his `images/` directory are used in the
  Original-UI mode of the museum's release with his permission (2026-10-07).
  They are not in this repository. Do not assume the right to redistribute
  them.
- **Historical text** in the kiosk is our own wording, checked against the
  sources listed in `docs/fact-check.md`.

The MIT license in `LICENSE` covers the original work in this repository: the
web kiosk, the Go bridge, the installer and the documentation, by Nick DeMarco.
