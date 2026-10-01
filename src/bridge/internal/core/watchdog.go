package core

import "time"

// startWatchdog runs the two liveness checks of architecture 5.8:
//
//   - status silence: no status line for SilenceTimeout while the cycling
//     unit is in continuous mode (cy normally changes every 30 ms tick)
//     -> E-CORE-DOWN / hang-status;
//   - command loop: every ProbeEvery with no command in flight, send the
//     pure-read probe `d i`; a missing ack -> E-CORE-DOWN / hang-cmd (Do
//     raises it). This is how the U2 startup deadlock presents.
func (c *Core) startWatchdog() {
	if c.o.SilenceTimeout > 0 {
		go c.silenceLoop()
	}
	if c.o.ProbeEvery > 0 {
		go c.probeLoop()
	}
}

func (c *Core) silenceLoop() {
	period := c.o.SilenceTimeout / 8
	if period < 10*time.Millisecond {
		period = 10 * time.Millisecond
	}
	t := time.NewTicker(period)
	defer t.Stop()
	for {
		select {
		case <-c.stop:
			return
		case <-c.exited:
			return
		case <-t.C:
			c.mu.Lock()
			silent := time.Since(c.lastStatus)
			mode := c.cycleMode
			c.mu.Unlock()
			if mode == "C" && silent > c.o.SilenceTimeout {
				c.raise(Fault{Code: CodeDown, Detail: DetailHangStatus})
				return
			}
		}
	}
}

func (c *Core) probeLoop() {
	t := time.NewTicker(c.o.ProbeEvery)
	defer t.Stop()
	for {
		select {
		case <-c.stop:
			return
		case <-c.exited:
			return
		case <-t.C:
			c.mu.Lock()
			recent := time.Since(c.lastCmdAt) < c.o.ProbeEvery
			c.mu.Unlock()
			if recent {
				continue
			}
			// Skip if a command is in flight: its own ack timeout covers it.
			if !c.cmdMu.TryLock() {
				continue
			}
			c.cmdMu.Unlock()
			if _, err := c.Do(Probe()); err == ErrClosed {
				return
			}
		}
	}
}
