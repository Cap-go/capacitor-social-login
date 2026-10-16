#!/usr/bin/env bash
set -euo pipefail

log="$(mktemp)"
trap 'rm -f "$log"' EXIT

set -o pipefail
xcodebuild -scheme CapgoCapacitorSocialLogin \
  -destination generic/platform=iOS \
  CODE_SIGNING_ALLOWED=NO \
  2>&1 | tee "$log"

if grep -E 'SocialLoginPlugin/.*: warning:' "$log"; then
  echo 'error: Swift warnings in SocialLoginPlugin'
  exit 1
fi
