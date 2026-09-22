#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VIEWER_DIR="${1:-$ROOT_DIR/output/viewer}"
ASSET="$ROOT_DIR/assets/favicon.ico"
INDEX="$VIEWER_DIR/index.html"
TITLE="Minecraft with 329"

[[ -f "$INDEX" ]] || { echo "Viewer index not found: $INDEX" >&2; exit 1; }
[[ -f "$ASSET" ]] || { echo "Favicon asset not found: $ASSET" >&2; exit 1; }

# Install the custom favicon alongside the viewer and remove any stale variants.
cp -f "$ASSET" "$VIEWER_DIR/favicon.ico"
rm -f "$VIEWER_DIR/favicon.svg"

# Set the browser title (idempotent: matches whatever title is present).
sed -i "s#<title>[^<]*</title>#<title>${TITLE}</title>#" "$INDEX"

# Point the favicon link at the .ico. Drop any existing icon link first so the
# reference is always correct and appears exactly once (idempotent).
sed -i '/rel="icon"/d' "$INDEX"
sed -i "s#<title>${TITLE}</title>#<title>${TITLE}</title>\n    <link rel=\"icon\" type=\"image/x-icon\" href=\"favicon.ico\" />#" "$INDEX"

echo "Branded viewer at $VIEWER_DIR (title: ${TITLE})"
