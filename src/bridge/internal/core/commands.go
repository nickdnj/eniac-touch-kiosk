package core

import (
	"errors"
	"fmt"
	"strings"
)

// Command is one line the bridge may write to core stdin. The only way to
// make one is through the constructors below, which implement the complete
// allow-list of architecture 5.2. There is no constructor that takes free
// text except StepLine/WithheldLine, and those only accept validated .e
// line shapes that the mission loader has already matched against the
// pinned program.
type Command struct {
	text string
	kind cmdKind
}

type cmdKind uint8

const (
	kindInvalid cmdKind = iota
	kindStep            // p/s line from a validated mission
	kindWithheld        // b/f line from a validated mission (M2)
	kindButton          // b i, b c, b r
	kindSpeed           // s cy.rate N, s cy.op X
	kindPunchFile       // f p <file>
	kindProbe           // d i
	kindDump            // d aN, D: read-only, used by selftest/record/tests only
	kindQuit            // q
)

// String is the exact text written (without the newline).
func (c Command) String() string { return c.text }

// Valid reports whether c came from a constructor.
func (c Command) Valid() bool { return c.kind != kindInvalid && c.text != "" }

// IsSwitch reports whether c is an `s` line. Switch errors are printed by a
// separate core goroutine and can land just after the prompt, so the writer
// waits briefly after acking these.
func (c Command) IsSwitch() bool { return strings.HasPrefix(c.text, "s ") }

// IsRun reports whether c starts a run (INIT or READ).
func (c Command) IsRun() bool { return c.text == "b i" || c.text == "b r" }

var errBadCommand = errors.New("core: command not allowed")

func clean(s string) error {
	if s == "" {
		return errBadCommand
	}
	for _, r := range s {
		if r < 0x20 || r == 0x7f {
			return fmt.Errorf("%w: control character in %q", errBadCommand, s)
		}
	}
	if strings.TrimSpace(s) != s || strings.Contains(s, "#") {
		return fmt.Errorf("%w: %q", errBadCommand, s)
	}
	return nil
}

// StepLine is a visitor step or a preset-completion line: a `p` or `s`
// command from a validated mission (the original .e text, comment removed).
func StepLine(text string) (Command, error) {
	if err := clean(text); err != nil {
		return Command{}, err
	}
	f := strings.Fields(text)
	switch {
	case f[0] == "p" && len(f) == 3, f[0] == "s" && len(f) == 3:
	default:
		return Command{}, fmt.Errorf("%w: step must be `p a b` or `s x v`: %q", errBadCommand, text)
	}
	return Command{text: text, kind: kindStep}, nil
}

// WithheldLine is a `b` or `f r` line withheld from a preset and bound to a
// UI button (M2, e.g. trajdemo's `b r`).
func WithheldLine(text string) (Command, error) {
	if err := clean(text); err != nil {
		return Command{}, err
	}
	f := strings.Fields(text)
	switch {
	case len(f) == 2 && f[0] == "b" && (f[1] == "i" || f[1] == "c" || f[1] == "r"):
	case len(f) == 3 && f[0] == "f" && f[1] == "r":
	default:
		return Command{}, fmt.Errorf("%w: withheld line must be `b i|c|r` or `f r file`: %q", errBadCommand, text)
	}
	return Command{text: text, kind: kindWithheld}, nil
}

// Buttons.
func ButtonInit() Command  { return Command{text: "b i", kind: kindButton} }
func ButtonClear() Command { return Command{text: "b c", kind: kindButton} }
func ButtonRead() Command  { return Command{text: "b r", kind: kindButton} }

// SetRate is `s cy.rate N` (N >= 0; 0 = unthrottled).
func SetRate(n int) (Command, error) {
	if n < 0 || n > 1000000 {
		return Command{}, fmt.Errorf("%w: rate %d", errBadCommand, n)
	}
	return Command{text: fmt.Sprintf("s cy.rate %d", n), kind: kindSpeed}, nil
}

// SetCycleOp is `s cy.op co|1a|1p`.
func SetCycleOp(op string) (Command, error) {
	switch op {
	case "co", "1a", "1p":
		return Command{text: "s cy.op " + op, kind: kindSpeed}, nil
	}
	return Command{}, fmt.Errorf("%w: cycle op %q", errBadCommand, op)
}

// PunchFile is `f p <file>`, sent once per session before any run so cards
// never appear on stdout (architecture 3.3).
func PunchFile(path string) (Command, error) {
	if err := clean(path); err != nil || strings.ContainsAny(path, " \t") || !strings.HasPrefix(path, "/") {
		return Command{}, fmt.Errorf("%w: punch file must be an absolute path without spaces: %q", errBadCommand, path)
	}
	return Command{text: "f p " + path, kind: kindPunchFile}, nil
}

// Probe is the liveness probe `d i` (a pure read).
func Probe() Command { return Command{text: "d i", kind: kindProbe} }

// DumpAcc is `d aN`, a pure read. Only selftest, record and tests use it.
func DumpAcc(n int) (Command, error) {
	if n < 1 || n > 20 {
		return Command{}, fmt.Errorf("%w: accumulator %d", errBadCommand, n)
	}
	return Command{text: fmt.Sprintf("d a%d", n), kind: kindDump}, nil
}

// DumpAll is `D`, a pure read of every unit. Only record and tests use it.
func DumpAll() Command { return Command{text: "D", kind: kindDump} }

func quitCmd() Command { return Command{text: "q", kind: kindQuit} }

// AllowedPattern is a regular expression every byte written to core stdin
// must match (test plan 3.3, whitelist conformance). Tests assert the
// fakecore stdin log against it.
const AllowedPattern = `^(p \S+ \S+|s \S+ \S+|b [icr]|f [pr] /\S+|f r \S+|d i|d a([1-9]|1[0-9]|20)|D|q)$`
