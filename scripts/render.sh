#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAVA_WORLD="${1:-$ROOT_DIR/output/java-world}"
VIEWER_DATA="$ROOT_DIR/output/viewer/data"
MINEDMAP="$ROOT_DIR/tools/minedmap"

if [[ ! -x "$MINEDMAP" ]]; then
  echo "MinedMap is not installed. Run scripts/setup-minedmap.sh first." >&2
  exit 1
fi
if [[ ! -f "$JAVA_WORLD/level.dat" ]]; then
  echo "Java world not found. Run scripts/convert.sh first." >&2
  exit 1
fi

mkdir -p "$VIEWER_DATA"
"$MINEDMAP" "$JAVA_WORLD" "$VIEWER_DATA" \
  --image-format webp \
  -j "${MINEDMAP_JOBS:-$(nproc)}"
"$ROOT_DIR/scripts/brand-viewer.sh"
echo "Rendered map data into $VIEWER_DATA"
