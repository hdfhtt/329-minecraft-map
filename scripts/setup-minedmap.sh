#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT_DIR/tools"
VIEWER_DIR="$ROOT_DIR/output/viewer"
VERSION="2.8.0"
BASE_URL="https://github.com/neocturne/MinedMap/releases/download/v${VERSION}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
command -v unzip >/dev/null || { echo "unzip is required" >&2; exit 1; }

mkdir -p "$BIN_DIR" "$VIEWER_DIR"

curl --fail --location --show-error --silent \
  "$BASE_URL/MinedMap-${VERSION}-x86_64-unknown-linux-gnu.zip" \
  --output "$WORK_DIR/minedmap.zip"
curl --fail --location --show-error --silent \
  "$BASE_URL/MinedMap-${VERSION}-viewer.zip" \
  --output "$WORK_DIR/viewer.zip"

unzip -o "$WORK_DIR/minedmap.zip" -d "$WORK_DIR/bin" >/dev/null
MINEDMAP_BIN="$(find "$WORK_DIR/bin" -type f -name minedmap -print -quit)"
if [[ -z "$MINEDMAP_BIN" ]]; then
  echo "Could not find the minedmap binary in the release archive" >&2
  exit 1
fi
install -m 0755 "$MINEDMAP_BIN" "$BIN_DIR/minedmap"

rm -rf "$VIEWER_DIR"
mkdir -p "$VIEWER_DIR"
unzip -q "$WORK_DIR/viewer.zip" -d "$WORK_DIR/viewer"
VIEWER_ROOT="$(find "$WORK_DIR/viewer" -type f -name index.html -printf '%h\n' -quit)"
if [[ -z "$VIEWER_ROOT" ]]; then
  echo "Could not find index.html in the viewer archive" >&2
  exit 1
fi
cp -a "$VIEWER_ROOT"/. "$VIEWER_DIR"/

# Restore the custom title and favicon over the stock MinedMap viewer.
"$ROOT_DIR/scripts/brand-viewer.sh" "$VIEWER_DIR"

echo "Installed MinedMap ${VERSION} in $BIN_DIR and $VIEWER_DIR"
