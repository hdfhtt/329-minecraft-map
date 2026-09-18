#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ ! -f "$ROOT_DIR/output/java-world/level.dat" ]]; then
  "$ROOT_DIR/scripts/convert.sh"
fi
"$ROOT_DIR/scripts/render.sh"
exec python3 "$ROOT_DIR/scripts/serve.py"
