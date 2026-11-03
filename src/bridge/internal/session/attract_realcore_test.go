//go:build realcore

package session

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/coder/websocket"

	"eniac-kiosk/bridge/internal/config"
	"eniac-kiosk/bridge/internal/testenv"
)

// Two attract flights on the real core (test-realcore, about 2 min): each
// flight is a fresh session and core, punches the 34 cards of trajdemo.e's
// first flight (hop 1 = along 14128681, up 5693175, spike S2), lands on
// hop 34 with "up" below zero, freezes, and recycles. Then a hand-off in
// mid-flight kills the core at once.
func TestAttractRealCoreTwoFlights(t *testing.T) {
	r := newRig(t, func(o *Options) { o.Config.Attract.Hold = config.Duration(2 * time.Second) })
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	cl.send(`{"t":"attract_start"}`)
	var lastReading time.Time
	for flight := 1; flight <= 2; flight++ {
		rd := cl.wait(20*time.Second, "reading", phase("reading"))
		if !lastReading.IsZero() {
			t.Logf("loop time %s", time.Since(lastReading).Round(time.Millisecond))
		}
		lastReading = time.Now()
		sess := rd["session"].(string)
		cl.wait(20*time.Second, "flying", phase("flying"))
		var cards []map[string]any
		var landed map[string]any
		deadline := time.After(150 * time.Second)
		for landed == nil {
			select {
			case m := <-cl.msgs:
				switch {
				case m["t"] == "punch":
					cards = append(cards, m)
				case m["t"] == "attract" && m["phase"] == "landed":
					landed = m
				case m["t"] == "health" && m["core"] != "up":
					t.Fatalf("flight %d: %v", flight, m)
				}
			case <-deadline:
				t.Fatalf("flight %d did not land (%d cards)", flight, len(cards))
			}
		}
		land := landed["landing"].(map[string]any)
		t.Logf("flight %d (session %s): %d cards, landing %v, flight %v ms", flight, sess, len(cards), land["text"], land["flightMs"])
		if len(cards) != 34 || land["card"] != 34.0 || land["hop"] != 34.0 || land["up"].(float64) >= 0 {
			t.Fatalf("flight %d: %d cards, landing %v", flight, len(cards), land)
		}
		if flight == 1 && os.Getenv("ENIAC_WRITE_FIXTURES") == "1" {
			// The web side's contract example of `attract` (tests/fixtures/protocol).
			root, _ := testenv.RepoRoot()
			b, _ := json.MarshalIndent(landed, "", "  ")
			os.WriteFile(filepath.Join(root, "tests", "fixtures", "protocol", "attract.json"), append(b, '\n'), 0o644)
		}
		f := cards[0]["fields"].([]any)
		if f[5] != "00001" || f[10] != "00141" || f[11] != "28681" || f[14] != "00056" || f[15] != "93175" {
			t.Fatalf("flight %d first card %v", flight, cards[0]["text"])
		}
		cl.wait(5*time.Second, "recycling", phase("recycling"))
	}
	cl.wait(20*time.Second, "flying 3", phase("flying"))
	for i := 0; i < 3; i++ {
		cl.wait(10*time.Second, "card", is("punch"))
	}
	t0 := time.Now()
	id := cl.send(`{"t":"attract_stop","reason":"touch"}`)
	cl.wait(5*time.Second, "off", func(m map[string]any) bool { return m["t"] == "attract" && m["re"] == float64(id) })
	t.Logf("hand-off mid-flight: %s", time.Since(t0).Round(time.Millisecond))
	if n := r.procs(); n != 0 {
		t.Fatalf("%d processes after the hand-off", n)
	}
}

// TestAttractSoak is the NFR-05 attract soak (docs/spikes/S5-attract-soak.md).
// It runs only with ENIAC_ATTRACT_SOAK=<duration>, for example
//
//	ENIAC_ATTRACT_SOAK=35m ENIAC_SOAK_OUT=/tmp/soak.json \
//	  go test -tags realcore -run TestAttractSoak -timeout 45m -v ./internal/session/
//
// The bridge (manager, hub, websocket server) runs in this process against
// the real core with the shipped attract config (8 s hold). A lean client
// keeps no history. Every 5 landed flights it hands off (attract_stop at a
// rotating phase), runs a Squares visitor session (skip setup, INIT at
// Full, end_session idle) and returns to attract: attract and mission
// cycling. It samples heap, goroutines, processes, fds and the core's RSS
// every minute.
func TestAttractSoak(t *testing.T) {
	dur, err := time.ParseDuration(os.Getenv("ENIAC_ATTRACT_SOAK"))
	if err != nil || dur <= 0 {
		t.Skip("set ENIAC_ATTRACT_SOAK=<duration> to run the attract soak")
	}
	r := newRig(t, nil)
	sc := dialSoak(t, r)
	type sample struct {
		AtS        int     `json:"atS"`
		Flights    int     `json:"flights"`
		HandOffs   int     `json:"handOffs"`
		HeapInuseK uint64  `json:"heapInuseK"`
		SysK       uint64  `json:"sysK"`
		RSSK       int     `json:"rssK"`
		Goroutines int     `json:"goroutines"`
		Procs      int     `json:"procs"`
		FDs        int     `json:"fds"`
		CoreRSSK   int     `json:"coreRssK"`
		CPUPct     float64 `json:"bridgeCpuPct"`
	}
	type result struct {
		Duration   string    `json:"duration"`
		Flights    int       `json:"flights"`
		Faults     int       `json:"faults"`
		LoopsS     []float64 `json:"loopsS"`
		FlightsS   []float64 `json:"flightsS"`
		HandOffsMs []float64 `json:"handOffsMs"`
		HandOffAt  []string  `json:"handOffAt"`
		MaxProcs   int       `json:"maxProcs"`
		Samples    []sample  `json:"samples"`
		Errors     []string  `json:"errors"`
	}
	var res result
	var maxProcs atomic.Int64
	stopMon := make(chan struct{})
	go func() {
		for {
			select {
			case <-stopMon:
				return
			case <-time.After(250 * time.Millisecond):
			}
			if n := int64(r.procs()); n > maxProcs.Load() {
				maxProcs.Store(n)
			}
		}
	}()
	defer close(stopMon)
	pid := os.Getpid()
	start := time.Now()
	takeSample := func() sample {
		runtime.GC()
		var ms runtime.MemStats
		runtime.ReadMemStats(&ms)
		s := sample{AtS: int(time.Since(start).Seconds()), Flights: sc.landed, HandOffs: len(res.HandOffsMs),
			HeapInuseK: ms.HeapInuse / 1024, SysK: ms.Sys / 1024, Goroutines: runtime.NumGoroutine(), Procs: r.procs(),
			RSSK: psInt(pid, "rss"), FDs: countFDs(), CPUPct: psFloat(pid, "%cpu")}
		if h := r.mgr.Healthz(); h.Core.Pid != 0 {
			s.CoreRSSK = psInt(h.Core.Pid, "rss")
		}
		t.Logf("sample %+v", s)
		return s
	}
	res.Samples = append(res.Samples, takeSample())
	nextSample := time.Now().Add(time.Minute)

	sc.send(`{"t":"attract_start"}`)
	phases := []string{"flying", "landed", "reading", "recycling"}
	lastReading, flightStart := time.Time{}, time.Time{}
	sinceHandOff := 0
	for time.Since(start) < dur {
		if time.Now().After(nextSample) {
			res.Samples = append(res.Samples, takeSample())
			nextSample = nextSample.Add(time.Minute)
		}
		m, ok := sc.next(2 * time.Second)
		if !ok {
			continue
		}
		switch m["t"] {
		case "health":
			if m["core"] == "down" {
				res.Faults++
				res.Errors = append(res.Errors, fmt.Sprintf("%s health %v", time.Since(start).Round(time.Second), m))
			}
		case "attract":
			switch m["phase"] {
			case "reading":
				if !lastReading.IsZero() {
					res.LoopsS = append(res.LoopsS, time.Since(lastReading).Seconds())
				}
				lastReading = time.Now()
			case "flying":
				flightStart = time.Now()
			case "landed":
				sc.landed++
				res.FlightsS = append(res.FlightsS, time.Since(flightStart).Seconds())
				land, _ := m["landing"].(map[string]any)
				if land == nil || land["hop"] != 34.0 || m["cards"] != 34.0 {
					res.Errors = append(res.Errors, fmt.Sprintf("flight %d landed with %v cards, landing %v", sc.landed, m["cards"], land))
				}
				sinceHandOff++
			}
			if sinceHandOff >= 5 && m["phase"] == phases[len(res.HandOffsMs)%len(phases)] {
				at := m["phase"].(string)
				if at == "flying" {
					time.Sleep(10 * time.Second) // well into the flight
				}
				ms, err := sc.handOffAndMission(r)
				if err != nil {
					res.Errors = append(res.Errors, err.Error())
				}
				res.HandOffsMs = append(res.HandOffsMs, ms)
				res.HandOffAt = append(res.HandOffAt, at)
				sinceHandOff = 0
				lastReading = time.Time{}
				sc.send(`{"t":"attract_start"}`)
			}
		}
	}
	sc.send(`{"t":"attract_stop","reason":"menu"}`)
	time.Sleep(2 * time.Second)
	res.Samples = append(res.Samples, takeSample())
	res.Duration, res.Flights, res.MaxProcs = time.Since(start).Round(time.Second).String(), sc.landed, int(maxProcs.Load())
	b, _ := json.MarshalIndent(res, "", "  ")
	if p := os.Getenv("ENIAC_SOAK_OUT"); p != "" {
		os.WriteFile(p, b, 0o644)
	}
	t.Logf("%s", b)
	sort.Float64s(res.HandOffsMs)
	if res.MaxProcs > 2 || len(res.Errors) > 0 || r.procs() != 0 {
		t.Fatalf("soak: max procs %d, %d errors, %d processes left", res.MaxProcs, len(res.Errors), r.procs())
	}
}

// soakClient is a websocket client that keeps no history.
type soakClient struct {
	t      *testing.T
	c      *websocket.Conn
	msgs   chan map[string]any
	nextID int64
	landed int
}

func dialSoak(t *testing.T, r *rig) *soakClient {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, "ws://"+r.addr+"/ws", &websocket.DialOptions{HTTPHeader: http.Header{"Origin": []string{"http://" + r.addr}}})
	if err != nil {
		t.Fatal(err)
	}
	c.SetReadLimit(1 << 20)
	sc := &soakClient{t: t, c: c, msgs: make(chan map[string]any, 1000)}
	go func() {
		for {
			_, b, err := c.Read(context.Background())
			if err != nil {
				close(sc.msgs)
				return
			}
			var head struct{ T string }
			json.Unmarshal(b, &head)
			switch head.T {
			case "frame", "punch", "checkpoint", "state", "hello", "pong", "step_applied":
				continue // not needed; never stored
			}
			var m map[string]any
			json.Unmarshal(b, &m)
			sc.msgs <- m
		}
	}()
	t.Cleanup(func() { c.CloseNow() })
	return sc
}

func (sc *soakClient) send(format string, a ...any) int64 {
	sc.nextID++
	s := strings.Replace(fmt.Sprintf(format, a...), "{", fmt.Sprintf(`{"id":%d,`, sc.nextID), 1)
	if err := sc.c.Write(context.Background(), websocket.MessageText, []byte(s)); err != nil {
		sc.t.Fatal(err)
	}
	return sc.nextID
}

func (sc *soakClient) next(d time.Duration) (map[string]any, bool) {
	select {
	case m, ok := <-sc.msgs:
		if !ok {
			sc.t.Fatal("connection closed")
		}
		return m, true
	case <-time.After(d):
		return nil, false
	}
}

func (sc *soakClient) waitFor(d time.Duration, pred func(map[string]any) bool) (map[string]any, error) {
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		if m, ok := sc.next(time.Until(deadline)); ok && pred(m) {
			return m, nil
		}
	}
	return nil, fmt.Errorf("timed out")
}

// handOffAndMission: attract_stop (timed to the reply), no processes left,
// then one Squares visitor session at Full, ended by idle.
func (sc *soakClient) handOffAndMission(r *rig) (float64, error) {
	t0 := time.Now()
	id := sc.send(`{"t":"attract_stop","reason":"touch"}`)
	if _, err := sc.waitFor(5*time.Second, func(m map[string]any) bool { return m["t"] == "attract" && m["re"] == float64(id) }); err != nil {
		return 0, fmt.Errorf("hand-off: no reply")
	}
	ms := float64(time.Since(t0).Microseconds()) / 1000
	if n := r.procs(); n != 0 {
		return ms, fmt.Errorf("hand-off: %d processes after the reply", n)
	}
	sc.send(`{"t":"start_mission","mission":"squares","mode":"visitor"}`)
	if _, err := sc.waitFor(10*time.Second, func(m map[string]any) bool { return m["t"] == "session" && m["state"] == "setup" }); err != nil {
		return ms, fmt.Errorf("squares: no setup")
	}
	sc.send(`{"t":"skip_setup"}`)
	if _, err := sc.waitFor(10*time.Second, func(m map[string]any) bool { return m["t"] == "session" && m["state"] == "armed" }); err != nil {
		return ms, fmt.Errorf("squares: not armed")
	}
	sc.send(`{"t":"set_speed","speed":"full"}`)
	sc.send(`{"t":"button","b":"init"}`)
	if _, err := sc.waitFor(10*time.Second, func(m map[string]any) bool { return m["t"] == "run" && m["state"] == "idle" }); err != nil {
		return ms, fmt.Errorf("squares: INIT never idle")
	}
	sc.send(`{"t":"end_session","reason":"idle"}`)
	if _, err := sc.waitFor(5*time.Second, func(m map[string]any) bool { return m["t"] == "session" && m["state"] == "none" }); err != nil {
		return ms, fmt.Errorf("squares: no end")
	}
	return ms, nil
}

func psInt(pid int, field string) int {
	out, err := exec.Command("ps", "-o", field+"=", "-p", strconv.Itoa(pid)).Output()
	if err != nil {
		return -1
	}
	n, _ := strconv.Atoi(strings.TrimSpace(string(out)))
	return n
}

func psFloat(pid int, field string) float64 {
	out, err := exec.Command("ps", "-o", field+"=", "-p", strconv.Itoa(pid)).Output()
	if err != nil {
		return -1
	}
	f, _ := strconv.ParseFloat(strings.TrimSpace(string(out)), 64)
	return f
}

// countFDs counts this process's open files (Linux /proc, else lsof: on
// macOS /dev/fd cannot be listed with ReadDir).
func countFDs() int {
	if ents, err := os.ReadDir("/proc/self/fd"); err == nil {
		return len(ents)
	}
	out, err := exec.Command("lsof", "-p", strconv.Itoa(os.Getpid())).Output()
	if err != nil {
		return -1
	}
	return strings.Count(string(out), "\n") - 1 // minus the header
}

