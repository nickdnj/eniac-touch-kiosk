package core

import (
	"io"
	"testing"
	"time"
)

// The stdout splitter must find prompts however the pipe chunks them.
func TestStdoutSplitter(t *testing.T) {
	pr, pw := io.Pipe()
	c := &Core{outc: make(chan outEvent, 64)}
	go c.readStdout(pr)
	chunks := []string{"load note\n", ">", " ", "> P 0000000001 0000000000 0 000000000000\n", "> ", "Invalid x\n> ", "> "}
	go func() {
		for _, s := range chunks {
			pw.Write([]byte(s))
			time.Sleep(2 * time.Millisecond)
		}
		pw.Close()
	}()
	var got []string
	for ev := range c.outc {
		if ev.eof {
			break
		}
		if ev.prompt {
			got = append(got, "<P>")
		} else {
			got = append(got, ev.line)
		}
	}
	want := []string{"load note", "<P>", "<P>", "P 0000000001 0000000000 0 000000000000", "<P>", "Invalid x", "<P>", "<P>"}
	if len(got) != len(want) {
		t.Fatalf("got %q want %q", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %q want %q", got, want)
		}
	}
}
