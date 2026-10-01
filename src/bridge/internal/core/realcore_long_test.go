//go:build realcore

package core

import "testing"

// 30 start/stop cycles: no orphans, no hang (argv load avoids U2). Dev plan #4.
func TestRealCoreStartStop30(t *testing.T) { startStopLoop(t, newHarness(t), 30) }

// Test plan 3.4: 100 back-to-back cold starts with the preset as argv.
func TestRealCoreColdStart100(t *testing.T) { startStopLoop(t, newHarness(t), 100) }
