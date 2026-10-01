package core

import (
	"regexp"
	"testing"
)

func TestConstructorsMatchAllowList(t *testing.T) {
	re := regexp.MustCompile(AllowedPattern)
	must := func(c Command, err error) Command {
		if err != nil {
			t.Fatal(err)
		}
		return c
	}
	for _, c := range []Command{
		must(StepLine("p c.o 1")), must(StepLine("s a1.rp6 2")), must(StepLine("p 1 a1.α")),
		must(WithheldLine("b r")), must(WithheldLine("f r demo.card")),
		ButtonInit(), ButtonClear(), ButtonRead(), must(SetRate(100)), must(SetRate(0)), must(SetCycleOp("co")),
		must(PunchFile("/run/eniac-kiosk/s/x/punch.txt")), Probe(), must(DumpAcc(20)), DumpAll(), quitCmd(),
	} {
		if !c.Valid() || !re.MatchString(c.String()) {
			t.Errorf("%q does not match the allow-list", c.String())
		}
	}
}

func TestConstructorsReject(t *testing.T) {
	bad := []func() (Command, error){
		func() (Command, error) { return StepLine("l sq.e") },
		func() (Command, error) { return StepLine("p c.o 1\nq") },
		func() (Command, error) { return StepLine("p c.o") },
		func() (Command, error) { return StepLine("R") },
		func() (Command, error) { return StepLine("s a1.rp6 2 # x") },
		func() (Command, error) { return StepLine(" p c.o 1") },
		func() (Command, error) { return StepLine("") },
		func() (Command, error) { return WithheldLine("b p") },
		func() (Command, error) { return WithheldLine("f p x") },
		func() (Command, error) { return SetRate(-1) },
		func() (Command, error) { return SetCycleOp("cy") },
		func() (Command, error) { return PunchFile("rel/punch.txt") },
		func() (Command, error) { return PunchFile("/a b/punch.txt") },
		func() (Command, error) { return DumpAcc(0) },
		func() (Command, error) { return DumpAcc(21) },
	}
	for i, f := range bad {
		if c, err := f(); err == nil || c.Valid() {
			t.Errorf("case %d: accepted %q", i, c.String())
		}
	}
	var zero Command
	if zero.Valid() {
		t.Fatal("zero Command must be invalid")
	}
}

func TestIsErrorLine(t *testing.T) {
	for _, s := range []string{"Invalid jack: zz on accumulator 1", "Unknown command: x", "unknown unit for switch: q",
		"No switch setting", "Card reader open: open x: no such file", "open programs/x.e: no such file or directory",
		"Invalid operation code: Z on unit 1 program 5", "cycle unit op swtch value: one of 1p, 1a, co, cy"} {
		if !IsErrorLine(s) {
			t.Errorf("%q not classified as error", s)
		}
	}
	for _, s := range []string{"P 0000000001 0000000000 0 000000000000", "000000000000000", ""} {
		if IsErrorLine(s) {
			t.Errorf("%q classified as error", s)
		}
	}
}
