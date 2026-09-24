#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VIEWER_DIR="${1:-$ROOT_DIR/output/viewer}"
ASSET="$ROOT_DIR/assets/favicon.ico"
REGIONS="$ROOT_DIR/assets/regions.js"
COORDINATES="$ROOT_DIR/assets/coordinates.js"
REGION_STYLE="$ROOT_DIR/assets/regions.css"
POIS="$ROOT_DIR/assets/pois.js"
INDEX="$VIEWER_DIR/index.html"
SCRIPT="$VIEWER_DIR/MinedMap.js"
INFO="$VIEWER_DIR/data/info.json"
WORLD="$ROOT_DIR/329/level.dat"
PYTHON="$ROOT_DIR/.venv/bin/python"
TITLE="Minecraft with 329"

[[ -f "$INDEX" ]] || { echo "Viewer index not found: $INDEX" >&2; exit 1; }
[[ -f "$SCRIPT" ]] || { echo "Viewer script not found: $SCRIPT" >&2; exit 1; }
[[ -f "$ASSET" ]] || { echo "Favicon asset not found: $ASSET" >&2; exit 1; }
[[ -f "$REGIONS" ]] || { echo "Region definitions not found: $REGIONS" >&2; exit 1; }
[[ -f "$COORDINATES" ]] || { echo "Coordinate initialization not found: $COORDINATES" >&2; exit 1; }
[[ -f "$REGION_STYLE" ]] || { echo "Region stylesheet not found: $REGION_STYLE" >&2; exit 1; }
[[ -f "$POIS" ]] || { echo "POI definitions not found: $POIS" >&2; exit 1; }

# Install the custom favicon alongside the viewer and remove any stale variants.
cp -f "$ASSET" "$VIEWER_DIR/favicon.ico"
rm -f "$VIEWER_DIR/favicon.svg"

# Set the browser title (idempotent: matches whatever title is present).
sed -i "s#<title>[^<]*</title>#<title>${TITLE}</title>#" "$INDEX"

# Point the favicon link at the .ico. Drop any existing icon link first so the
# reference is always correct and appears exactly once (idempotent).
sed -i '/rel="icon"/d' "$INDEX"
sed -i "s#<title>${TITLE}</title>#<title>${TITLE}</title>\n    <link rel=\"icon\" type=\"image/x-icon\" href=\"favicon.ico\" />#" "$INDEX"

# Install region label styles after Leaflet's stylesheet so custom tooltip rules
# take precedence. Replace the link on each run to keep the operation idempotent.
cp -f "$REGION_STYLE" "$VIEWER_DIR/regions.css"
rm -f "$VIEWER_DIR/anonymous-player.svg"
sed -i '/href="regions.css"/d' "$INDEX"
sed -i '/leaflet-1\.9\.4\/leaflet\.css/a\    <link rel="stylesheet" href="regions.css" />' "$INDEX"

# Add the named regions to the stock layer control. Remove a prior injection so
# rerunning this script does not duplicate the regions.
sed -i '/\/\/ BEGIN 329 REGIONS/,/\/\/ END 329 REGIONS/d' "$SCRIPT"
sed -i "/const overlayMaps = {};/r $REGIONS" "$SCRIPT"

# The POI endpoint is supplied at deployment time so an environment-specific URL
# never needs to be committed to the viewer assets.
sed -i '/\/\/ BEGIN 329 POIS/,/\/\/ END 329 POIS/d' "$SCRIPT"
# Remove POI blocks written before they were given idempotency markers. Their
# refresh timer follows the block and is removed separately.
sed -i '/^[[:space:]]*const poiApiUrl = /,/^[[:space:]]*loadPois();/d' "$SCRIPT"
sed -i '/^[[:space:]]*setInterval(loadPois, 60000);/d' "$SCRIPT"
sed -i "/const overlayMaps = {};/r $POIS" "$SCRIPT"
sed -i "s|__POI_API_URL__|${POI_API_URL:-}|g" "$SCRIPT"

# Show the initial map center before the visitor moves a mouse or touches the map.
sed -i '/\/\/ BEGIN 329 COORDINATES/,/\/\/ END 329 COORDINATES/d' "$SCRIPT"
sed -i "/coordControl.addTo(map);/r $COORDINATES" "$SCRIPT"

# Replace the stock credits with the timestamp of the rendered map data.
sed -i '/attribution: .*MinedMap.*,/d' "$SCRIPT"
sed -i '/map\.attributionControl\.setPrefix(false);/d' "$SCRIPT"
sed -i '/map\.attributionControl\.addAttribution(/d' "$SCRIPT"
sed -i '/\/\/ BEGIN 329 WORLD DAY/,/\/\/ END 329 WORLD DAY/d' "$SCRIPT"
sed -i ':a;N;$!ba;s/\n\{2,\}\(\t\tconst refocus = function() {\)/\n\n\1/' "$SCRIPT"

if [[ ! -x "$PYTHON" ]]; then
  PYTHON="python3"
fi

if [[ -f "$WORLD" ]] && WORLD_DAY="$("$PYTHON" "$ROOT_DIR/scripts/world_days.py" "$WORLD" 2>/dev/null)"; then
  DAY_ATTRIBUTION="Day ${WORLD_DAY}"
else
  DAY_ATTRIBUTION=""
fi

if [[ -f "$INFO" ]]; then
  ATTRIBUTION="$(LC_ALL=C TZ=Asia/Kuala_Lumpur date -r "$INFO" '+%B %-d, %Y, %-I:%M %p')"
  sed -i "s#\t\tconst refocus = function() {#\t\tmap.attributionControl.setPrefix(false);\n\t\tmap.attributionControl.addAttribution('${ATTRIBUTION}');\n\n\t\tconst refocus = function() {#" "$SCRIPT"
else
  sed -i "s#\t\tconst refocus = function() {#\t\tmap.attributionControl.setPrefix(false);\n\n\t\tconst refocus = function() {#" "$SCRIPT"
fi

if [[ -n "$DAY_ATTRIBUTION" ]]; then
  sed -i "s#\t\tconst refocus = function() {#\t\t// BEGIN 329 WORLD DAY\n\t\tconst worldDayControl = L.control({ position: 'bottomright' });\n\t\tworldDayControl.onAdd = function() {\n\t\t\tconst container = L.DomUtil.create('div', 'leaflet-control world-day-control');\n\t\t\tcontainer.textContent = '${DAY_ATTRIBUTION}';\n\t\t\treturn container;\n\t\t};\n\t\tworldDayControl.addTo(map);\n\t\t// END 329 WORLD DAY\n\n\t\tconst refocus = function() {#" "$SCRIPT"
fi

echo "Branded viewer at $VIEWER_DIR (title: ${TITLE})"
