package session

import (
	"strings"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/metrics"
)

// Complete a Squares run through the websocket with the real JSONL writer
// and check the event sequence (dev plan #12).
func TestSquaresMetricsSequence(t *testing.T) {
	var w *metrics.Writer
	var stateDir string
	r := newRig(t, func(o *Options) {
		stateDir = t.TempDir()
		var err error
		w, err = metrics.Open(stateDir, 400, nil)
		if err != nil {
			t.Fatal(err)
		}
		o.Metrics = w
	})
	defer w.Close()
	cl := r.connect()
	cl.startSquares()
	cl.send(`{"t":"apply_step","step":"j1-one"}`)
	cl.wait(3*time.Second, "step", is("step_applied"))
	cl.send(`{"t":"metric","ev":"step_done","mission":"squares","step":"j1-one","assisted":false}`)
	cl.send(`{"t":"metric","ev":"wrong_tap","mission":"squares","step":"const-to-trunk1"}`)
	cl.send(`{"t":"metric","ev":"setup_skipped","mission":"squares","step":"const-to-trunk1"}`)
	cl.send(`{"t":"skip_setup"}`)
	cl.wait(10*time.Second, "setup_complete", is("setup_complete"))
	cl.send(`{"t":"set_speed","speed":"full"}`)
	cl.send(`{"t":"metric","ev":"speed","mission":"squares","speed":"full"}`)
	cl.send(`{"t":"metric","ev":"skip_to_answer","mission":"squares"}`)
	for x := 1; x <= 12; x++ {
		cl.initAndWait()
	}
	cl.seen(2*time.Second, "result", is("session", "state", "result"))
	id := cl.send(`{"t":"metric","ev":"mission_complete","mission":"squares"}`) // forged: rejected
	e := cl.wait(3*time.Second, "error", func(m map[string]any) bool { return m["t"] == "error" && m["re"] == float64(id) })
	if e["code"] != "NOT_ALLOWED" {
		t.Fatalf("%v", e)
	}
	cl.send(`{"t":"end_session","reason":"done"}`)
	cl.wait(3*time.Second, "none", is("session", "state", "none"))
	recs, err := metrics.Read(stateDir)
	if err != nil {
		t.Fatal(err)
	}
	var evs []string
	sids := map[any]bool{}
	for _, r := range recs {
		evs = append(evs, r["ev"].(string))
		sids[r["sid"]] = true
	}
	want := "session_start,mission_start,step_done,wrong_tap,setup_skipped,speed,skip_to_answer,mission_complete,session_end"
	if strings.Join(evs, ",") != want {
		t.Fatalf("events\n got %s\nwant %s", strings.Join(evs, ","), want)
	}
	if len(sids) != 1 {
		t.Fatalf("one visitor session should have one sid, got %v", sids)
	}
}
