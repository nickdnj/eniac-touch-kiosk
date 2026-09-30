# ENIAC Touch Kiosk. See docs/architecture.md 11.2.
GOTOOLCHAIN := $(shell sed -n 's/^GOTOOLCHAIN=//p' upstream.lock)
export GOTOOLCHAIN

.PHONY: upstream upstream-unpatched

## upstream: fetch + verify + patch the pinned simulator and build both cores
upstream:
	scripts/fetch-upstream.sh

## upstream-unpatched: also build an unpatched host core (golden recording only)
upstream-unpatched:
	scripts/fetch-upstream.sh --unpatched
