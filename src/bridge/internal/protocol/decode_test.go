package protocol

import (
	"strings"
	"testing"
)

func TestDecodeValid(t *testing.T) {
	for _, s := range []string{
		`{"t":"start_mission","id":1,"mission":"squares","mode":"visitor"}`,
		`{"t":"start_mission","mission":"squares"}`,
		`{"t":"apply_step","id":7,"step":"const-to-trunk1","assisted":false}`,
		`{"t":"skip_setup","id":2}`,
		`{"t":"button","b":"init"}`,
		`{"t":"set_speed","speed":"full"}`,
		`{"t":"end_session","reason":"menu"}`,
		`{"t":"metric","ev":"wrong_tap","mission":"squares","step":"a1-to-a2"}`,
		`{"t":"metric","ev":"idle_reset","screen":"S4"}`,
		`{"t":"ping","id":99}`,
	} {
		if m, e := Decode([]byte(s)); e != nil || m == nil {
			t.Errorf("%s: %+v", s, e)
		}
	}
	m, _ := Decode([]byte(`{"t":"apply_step","id":7,"step":"j1-one","assisted":true}`))
	if a := m.(ApplyStep); a.Step != "j1-one" || !a.Assisted || *a.ID != 7 {
		t.Fatalf("%+v", a)
	}
}

func TestDecodeRejects(t *testing.T) {
	for _, s := range []string{
		``, `null`, `[]`, `"x"`, `{}`, `{"t":"nope"}`, `{"t":"q"}`,
		`{"t":"apply_step","step":"x\nq"}`,
		`{"t":"apply_step","step":"p c.o 1"}`,
		`{"t":"apply_step","step":"j1-one","line":"p c.o 1"}`,
		`{"t":"apply_step","step":7}`,
		`{"t":"apply_step","step":"j1-one","assisted":"yes"}`,
		`{"t":"button","b":"q"}`, `{"t":"button","b":"init","cmd":"R"}`,
		`{"t":"set_speed","speed":"s cy.rate 1"}`,
		`{"t":"start_mission","mission":"../etc"}`, `{"t":"start_mission","mission":"squares","mode":"god"}`,
		`{"t":"end_session","reason":"because"}`,
		`{"t":"metric","ev":"wrong_tap","ip":"1.2.3.4"}`, `{"t":"metric","ev":"free text here"}`,
		`{"t":"ping","id":"x"}`, `{"t":"ping","id":1.5}`,
		`{"t":"ping"} {"t":"ping"}`,
		`{"t":"ping","pad":"` + strings.Repeat("x", MaxClientFrame) + `"}`,
	} {
		m, e := Decode([]byte(s))
		if e == nil || e.Code != ErrBadMessage || m != nil {
			t.Errorf("%q accepted: %+v %+v", s, m, e)
		}
	}
	_, e := Decode([]byte(`{"t":"button","id":5,"b":"q"}`))
	if e.Re == nil || *e.Re != 5 {
		t.Error("error should echo id as re")
	}
}

func FuzzDecode(f *testing.F) {
	for _, s := range []string{`{"t":"ping","id":1}`, `{"t":"apply_step","step":"a"}`, `{"t":"button","b":"init"}`, `{`, ``} {
		f.Add([]byte(s))
	}
	f.Fuzz(func(t *testing.T, b []byte) {
		m, e := Decode(b)
		if (m == nil) == (e == nil) {
			t.Fatalf("exactly one of message and error must be set: %v %v", m, e)
		}
		if e != nil && e.Code != ErrBadMessage {
			t.Fatal(e.Code)
		}
	})
}
