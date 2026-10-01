//go:build realcore

package core

import (
	"testing"
	"time"
)

// Test plan 3.2 sieve-canary, full run: all 407 primes from 3 to 2801, in
// order, and then the program stops. About 4 minutes on an M-series Mac.
func TestRealCoreSieveCanaryFull(t *testing.T) { sieveCanary(t, 407, 10*time.Minute) }
