#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VIEWER_DIR="${1:-$ROOT_DIR/output/viewer}"
ASSET="$ROOT_DIR/assets/favicon.ico"
INDEX="$VIEWER_DIR/index.html"
SCRIPT="$VIEWER_DIR/MinedMap.js"
INFO="$VIEWER_DIR/data/info.json"
TITLE="Minecraft with 329"

[[ -f "$INDEX" ]] || { echo "Viewer index not found: $INDEX" >&2; exit 1; }
[[ -f "$SCRIPT" ]] || { echo "Viewer script not found: $SCRIPT" >&2; exit 1; }
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

# Replace the stock credits with the timestamp of the rendered map data.
sed -i '/attribution: .*MinedMap.*,/d' "$SCRIPT"
sed -i '/map\.attributionControl\.setPrefix(false);/d' "$SCRIPT"
sed -i '/map\.attributionControl\.addAttribution(/d' "$SCRIPT"
sed -i ':a;N;$!ba;s/\n\{2,\}\(\t\tconst refocus = function() {\)/\n\n\1/' "$SCRIPT"

if [[ -f "$INFO" ]]; then
  ATTRIBUTION="$(LC_ALL=C TZ=Asia/Kuala_Lumpur date -r "$INFO" '+%B %-d, %Y at %-I:%M %p GMT+8')"
  sed -i "s#\t\tconst refocus = function() {#\t\tmap.attributionControl.setPrefix(false);\n\t\tmap.attributionControl.addAttribution('${ATTRIBUTION}');\n\n\t\tconst refocus = function() {#" "$SCRIPT"
else
  sed -i "s#\t\tconst refocus = function() {#\t\tmap.attributionControl.setPrefix(false);\n\n\t\tconst refocus = function() {#" "$SCRIPT"
fi

echo "Branded viewer at $VIEWER_DIR (title: ${TITLE})"
