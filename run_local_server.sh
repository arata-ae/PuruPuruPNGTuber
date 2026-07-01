#!/usr/bin/env sh
# SPDX-License-Identifier: Apache-2.0
set -eu
cd "$(dirname "$0")"

if command -v python3 >/dev/null 2>&1; then
  exec python3 scripts/run_local_server.py
fi

exec python scripts/run_local_server.py
