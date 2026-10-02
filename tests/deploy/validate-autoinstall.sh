#!/usr/bin/env bash
# Validate deploy/autoinstall/autoinstall.yaml.in (rendered with dummy
# values, the same way scripts/make-install-stick.sh renders it) against
# subiquity's own JSON schema from its ubuntu/noble branch (the 24.04
# installer). Needs python3 with PyYAML + jsonschema, and network the first
# time (the schema is cached in build/stick/). Also checks the shell scripts
# the stick carries with `bash -n`, and shellcheck if installed.
#
#   tests/deploy/validate-autoinstall.sh [render-only-output.yaml]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCHEMA="$ROOT/build/stick/autoinstall-schema.noble.json"
SCHEMA_URL=https://raw.githubusercontent.com/canonical/subiquity/ubuntu/noble/autoinstall-schema.json
OUT="${1:-$ROOT/build/stick/autoinstall.rendered-test.yaml}"
mkdir -p "$(dirname "$SCHEMA")" "$(dirname "$OUT")"
fail=0

[ -f "$SCHEMA" ] || curl -fsSL -o "$SCHEMA" "$SCHEMA_URL"

# Render exactly like make-install-stick.sh (dummy secrets).
# shellcheck disable=SC2016  # a literal crypt hash
HASH='$6$testsalt$0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ./0123456789abcdefghijk'
KEYS='["ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDummyDummyDummyDummyDummyDummyDummyDummy test@example"]'
sed -e "s|@HOSTNAME@|eniac-kiosk|" -e "s|@TIMEZONE@|America/New_York|" -e "s|@ADMIN_USER@|admin|" \
    -e "s|@SSH_ALLOW_PW@|false|" "$ROOT/deploy/autoinstall/autoinstall.yaml.in" \
  | awk -v h="$HASH" -v k="$KEYS" '{
      i = index($0, "@PASSWORD_HASH@"); if (i) $0 = substr($0, 1, i-1) h substr($0, i+15)
      i = index($0, "@SSH_KEYS@");      if (i) $0 = substr($0, 1, i-1) k substr($0, i+10)
      print }' > "$OUT"
if grep -q '@[A-Z_]*@' "$OUT"; then echo "FAIL: unfilled template field"; fail=1; fi

python3 - "$SCHEMA" "$OUT" <<'EOF' || fail=1
import json, sys, yaml, jsonschema
schema = json.load(open(sys.argv[1]))
cfg = yaml.safe_load(open(sys.argv[2]))
assert cfg["version"] == 1, "version must be 1"
assert "autoinstall" not in cfg, "autoinstall.yaml on the media must not be wrapped"
errs = sorted(jsonschema.Draft7Validator(schema).iter_errors(cfg), key=lambda e: list(e.path))
for e in errs:
    print("FAIL: schema:", "/".join(map(str, e.path)) or "(top)", "-", e.message)
assert cfg["identity"]["password"].startswith("$6$"), "password hash lost in rendering"
assert cfg["storage"]["layout"]["match"]["path"] == "__ENIAC_TARGET_DISK__", "placeholder lost"
assert cfg["ssh"]["authorized-keys"][0].startswith("ssh-ed25519 "), "ssh key lost"
assert cfg["early-commands"] and cfg["late-commands"], "commands missing"
if errs:
    sys.exit(1)
print(f"PASS: rendered autoinstall.yaml is valid against subiquity's noble schema ({len(cfg)} top-level keys)")
EOF

for f in "$ROOT"/deploy/autoinstall/*.sh "$ROOT"/scripts/make-install-stick.sh "$ROOT"/scripts/stick/*.sh; do
  bash -n "$f" || { echo "FAIL: bash -n $f"; fail=1; }
done
if command -v shellcheck >/dev/null; then
  if shellcheck -x "$ROOT"/deploy/autoinstall/*.sh "$ROOT"/scripts/make-install-stick.sh "$ROOT"/scripts/stick/*.sh "$ROOT"/deploy/kiosk/install.sh \
       "$ROOT"/tests/deploy/*.sh; then
    echo "PASS: shellcheck"
  else
    echo "FAIL: shellcheck"; fail=1
  fi
fi
exit $fail
