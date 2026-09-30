//go:build realcore

package machine_test

import "testing"

// Dev plan #6 / test plan 3.4: 50 INITs at each speed preset, each idle
// with the right settled values.
func TestIdleRealCoreFull50(t *testing.T) { idleKnownAnswer(t, "full", 50) }
func TestIdleRealCoreSlow50(t *testing.T) { idleKnownAnswer(t, "slow", 50) }
