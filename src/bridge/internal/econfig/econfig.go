// Package econfig parses upstream .e configuration files: a tokenizer that
// mirrors the core's own proccmd rules, the jack grammar, and the M1 switch
// catalog derived from upstream's *ctl functions (architecture 3.2, 5.9.5).
//
// Greek and ASCII spellings: the core accepts α|a|alpha, β|b|beta, γ|g|gamma,
// δ|d|delta, ε|e|epsilon for accumulator inputs and operation switches. At
// the pinned commit sq.e uses the Greek letters (`p 1 a1.α`, `s a1.op5 α`),
// as architecture 5.9.4 shows; UX 8.1.1 wrote them as `alpha`. Matching uses
// a canonical form (Greek), and the bridge always sends the original text.
package econfig

import (
	"bufio"
	"fmt"
	"io"
	"strings"
)

// Line is one command line of a .e file.
type Line struct {
	Num   int      // 1-based line number in its file
	Raw   string   // the line as written
	Text  string   // comment stripped, whitespace collapsed: what gets sent
	Canon string   // Text with Greek/ASCII aliases canonicalized: what matches
	Cmd   string   // "p", "s", "b", "f", "l", "d", ...
	Args  []string // fields after Cmd (from Text)
	Plug  *Plug    // for p lines
	Sw    *Switch  // for s lines
}

// Parse tokenizes a .e file. Blank and comment-only lines are skipped. Like
// the core's proccmd, a comment starts at the first whitespace-separated
// field that begins with '#'.
func Parse(r io.Reader) ([]Line, error) {
	var out []Line
	sc := bufio.NewScanner(r)
	sc.Buffer(make([]byte, 64*1024), 1<<20)
	n := 0
	for sc.Scan() {
		n++
		raw := sc.Text()
		l, ok := ParseLine(raw)
		if !ok {
			continue
		}
		l.Num = n
		out = append(out, l)
	}
	return out, sc.Err()
}

// ParseLine tokenizes one line. ok is false for blank or comment-only lines.
func ParseLine(raw string) (Line, bool) {
	f := strings.Fields(raw)
	for i, s := range f {
		if s[0] == '#' {
			f = f[:i]
			break
		}
	}
	if len(f) == 0 {
		return Line{}, false
	}
	l := Line{Raw: raw, Text: strings.Join(f, " "), Cmd: f[0], Args: f[1:]}
	switch l.Cmd {
	case "p":
		if len(l.Args) == 2 {
			p := ParsePlug(l.Args[0], l.Args[1])
			l.Plug = &p
		}
	case "s":
		if len(l.Args) == 2 {
			s := ParseSwitch(l.Args[0], l.Args[1])
			l.Sw = &s
		}
	}
	l.Canon = canonText(l)
	return l, true
}

func canonText(l Line) string {
	switch {
	case l.Plug != nil:
		return "p " + l.Plug.From.Canon + " " + l.Plug.To.Canon
	case l.Sw != nil:
		return "s " + l.Sw.Name + " " + l.Sw.Canon
	}
	return l.Text
}

// Canonicalize returns the canonical matching form of a command text.
func Canonicalize(text string) string {
	l, ok := ParseLine(text)
	if !ok {
		return ""
	}
	return l.Canon
}

// Includes returns the files named by `l` lines.
func Includes(lines []Line) []string {
	var out []string
	for _, l := range lines {
		if l.Cmd == "l" && len(l.Args) == 1 {
			out = append(out, l.Args[0])
		}
	}
	return out
}

// Summary counts cables and switches.
func Summary(lines []Line) (plugs, switches int) {
	for _, l := range lines {
		switch l.Cmd {
		case "p":
			plugs++
		case "s":
			switches++
		}
	}
	return
}

// Validate checks every p and s line against the M1 grammar and catalog
// and returns one error per problem (with line numbers).
func Validate(lines []Line) []error {
	var errs []error
	for _, l := range lines {
		switch l.Cmd {
		case "p":
			if l.Plug == nil {
				errs = append(errs, fmt.Errorf("line %d: plug needs two terminals: %q", l.Num, l.Text))
				continue
			}
			for _, t := range []Terminal{l.Plug.From, l.Plug.To} {
				if t.Err != "" {
					errs = append(errs, fmt.Errorf("line %d: %s: %s", l.Num, t.Raw, t.Err))
				} else if !t.M1 {
					errs = append(errs, fmt.Errorf("line %d: %s is not in the M1 jack grammar (i, c, a1..a20, trunks)", l.Num, t.Raw))
				}
			}
		case "s":
			if l.Sw == nil {
				errs = append(errs, fmt.Errorf("line %d: switch needs a name and a value: %q", l.Num, l.Text))
				continue
			}
			if l.Sw.Err != "" {
				errs = append(errs, fmt.Errorf("line %d: %s", l.Num, l.Sw.Err))
			}
		}
	}
	return errs
}
