package scores

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

// A short list of words a family museum does not want on a score board. It is a first line of
// defence, not a promise: staff add more (one word per line, any case) to blocked-names.txt in
// the state directory, read when the bridge starts. A name is refused when, with look-alike
// digits turned back into letters and everything but letters dropped, it IS one of the words,
// or CONTAINS one of the long words (short ones would catch "class" and "pass").
var builtinWhole = []string{"ass", "tit", "tits", "cum", "sex", "gay", "fag", "wtf", "kkk", "nazi", "hell"}
var builtinInside = []string{"fuck", "shit", "cunt", "dick", "cock", "piss", "bitch", "whore", "slut", "penis", "vagina", "rape", "porn", "anal", "dildo", "nigg", "fagg", "twat", "wank", "bastard"}

var lookalike = strings.NewReplacer("0", "o", "1", "i", "3", "e", "4", "a", "5", "s", "7", "t", "8", "b", "@", "a", "$", "s", "!", "i")

// squash turns a name into plain lower-case letters for matching.
func squash(name string) string {
	var b strings.Builder
	for _, r := range lookalike.Replace(strings.ToLower(name)) {
		if r >= 'a' && r <= 'z' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// loadBlocked reads the staff's extra words from dir/blocked-names.txt, if it is there.
func loadBlocked(dir string) []string {
	f, err := os.Open(filepath.Join(dir, "blocked-names.txt"))
	if err != nil {
		return nil
	}
	defer f.Close()
	var out []string
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		if w := squash(sc.Text()); len(w) >= 2 {
			out = append(out, w)
		}
	}
	return out
}

// Blocked reports whether a name may not go on the board.
func (s *Store) Blocked(name string) bool {
	q := squash(name)
	if q == "" {
		return true // nothing but punctuation
	}
	for _, w := range builtinWhole {
		if q == w {
			return true
		}
	}
	for _, w := range builtinInside {
		if strings.Contains(q, w) {
			return true
		}
	}
	for _, w := range s.extra {
		if q == w || (len(w) >= 4 && strings.Contains(q, w)) {
			return true
		}
	}
	return false
}
