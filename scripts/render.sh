#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORLD="${1:-$ROOT_DIR/329}"
VIEWER_DATA="$ROOT_DIR/output/viewer/data"
MINEDMAP="$ROOT_DIR/tools/minedmap"

if [[ ! -x "$MINEDMAP" ]]; then
  echo "MinedMap is not installed. Run scripts/setup-minedmap.sh first." >&2
  exit 1
fi
if [[ ! -f "$WORLD/level.dat" || ! -d "$WORLD/db" ]]; then
  echo "Bedrock world not found at $WORLD (needs level.dat and db/)." >&2
  exit 1
fi

mkdir -p "$VIEWER_DATA"
# The smol-kitten fork reads the Bedrock LevelDB directly; --edition bedrock is
# explicit here, though "auto" would also detect it from 329/db/CURRENT.
"$MINEDMAP" "$WORLD" "$VIEWER_DATA" \
  --edition bedrock \
  --image-format webp \
  -j "${MINEDMAP_JOBS:-$(nproc)}"
"$ROOT_DIR/scripts/brand-viewer.sh"
echo "Rendered map data into $VIEWER_DATA"
