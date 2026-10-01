// Package core spawns and supervises one simulator core per session
// (architecture 3.3, 3.4, 5.2, 5.8, ADR-001, ADR-002).
//
// The bridge starts `eniac-core -v "<bridge> vlink --sock S --session T"
// <preset.e>` in its own process group. vlink is the core's display child:
// it relays the status stream to the bridge over a token-authenticated Unix
// socket and only ever writes "ready" back to the core. Commands go only to
// core stdin, one at a time, each acknowledged by the next "> " prompt.
package core
