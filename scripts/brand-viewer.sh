#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VIEWER_DIR="${1:-$ROOT_DIR/output/viewer}"
ASSET="$ROOT_DIR/assets/favicon.ico"
GUILDS="$ROOT_DIR/assets/guilds.js"
COORDINATES="$ROOT_DIR/assets/coordinates.js"
THEME_STYLE="$ROOT_DIR/assets/regions.css"
POIS="$ROOT_DIR/assets/pois.js"
HOMES="$ROOT_DIR/assets/homes.js"
DONATIONS="$ROOT_DIR/assets/donations.js"
CLOUDS="$ROOT_DIR/assets/clouds.js"
CLOUD_STYLE="$ROOT_DIR/assets/clouds.css"
CLOUD_BASE_TEX="$ROOT_DIR/assets/clouds-base.png"
LOADING="$ROOT_DIR/assets/loading.js"
LOADING_MARKUP="$ROOT_DIR/assets/loading.html"
LOADING_STYLE="$ROOT_DIR/assets/loading.css"
SWA_CONFIG="$ROOT_DIR/assets/staticwebapp.config.json"
INDEX="$VIEWER_DIR/index.html"
SCRIPT="$VIEWER_DIR/MinedMap.js"
INFO="$VIEWER_DIR/data/info.json"
WORLD="$ROOT_DIR/329/level.dat"
PYTHON="$ROOT_DIR/.venv/bin/python"
TITLE="Minecraft with 329"

[[ -f "$INDEX" ]] || { echo "Viewer index not found: $INDEX" >&2; exit 1; }
[[ -f "$SCRIPT" ]] || { echo "Viewer script not found: $SCRIPT" >&2; exit 1; }
[[ -f "$ASSET" ]] || { echo "Favicon asset not found: $ASSET" >&2; exit 1; }
[[ -f "$GUILDS" ]] || { echo "Guild definitions not found: $GUILDS" >&2; exit 1; }
[[ -f "$COORDINATES" ]] || { echo "Coordinate initialization not found: $COORDINATES" >&2; exit 1; }
[[ -f "$THEME_STYLE" ]] || { echo "Theme stylesheet not found: $THEME_STYLE" >&2; exit 1; }
[[ -f "$POIS" ]] || { echo "POI definitions not found: $POIS" >&2; exit 1; }
[[ -f "$HOMES" ]] || { echo "Home definitions not found: $HOMES" >&2; exit 1; }
[[ -f "$DONATIONS" ]] || { echo "Donation panel definitions not found: $DONATIONS" >&2; exit 1; }
[[ -f "$CLOUDS" ]] || { echo "Cloud overlay definitions not found: $CLOUDS" >&2; exit 1; }
[[ -f "$CLOUD_STYLE" ]] || { echo "Cloud stylesheet not found: $CLOUD_STYLE" >&2; exit 1; }
[[ -f "$CLOUD_BASE_TEX" ]] || { echo "Cloud base texture not found: $CLOUD_BASE_TEX" >&2; exit 1; }
[[ -f "$LOADING" ]] || { echo "Loading controller not found: $LOADING" >&2; exit 1; }
[[ -f "$LOADING_MARKUP" ]] || { echo "Loading splash markup not found: $LOADING_MARKUP" >&2; exit 1; }
[[ -f "$LOADING_STYLE" ]] || { echo "Loading stylesheet not found: $LOADING_STYLE" >&2; exit 1; }
[[ -f "$SWA_CONFIG" ]] || { echo "Static Web Apps configuration not found: $SWA_CONFIG" >&2; exit 1; }

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
cp -f "$THEME_STYLE" "$VIEWER_DIR/regions.css"
rm -f "$VIEWER_DIR/anonymous-player.svg"
sed -i '/href="regions.css"/d' "$INDEX"
sed -i '/leaflet-1\.9\.4\/leaflet\.css/a\    <link rel="stylesheet" href="regions.css" />' "$INDEX"

# Install the cloud overlay stylesheet and its seamless textures, then link the
# stylesheet right after regions.css. Replace the link on each run (idempotent).
cp -f "$CLOUD_STYLE" "$VIEWER_DIR/clouds.css"
cp -f "$CLOUD_BASE_TEX" "$VIEWER_DIR/clouds-base.png"
rm -f "$VIEWER_DIR/clouds-wisp.png"
sed -i '/href="clouds.css"/d' "$INDEX"
sed -i '/href="regions.css"/a\    <link rel="stylesheet" href="clouds.css" />' "$INDEX"

# Install the cold-load splash stylesheet last, so its panel rules win, and link
# it from the head: a linked stylesheet is render-blocking, which is what makes
# the splash styled on the very first paint instead of flashing unstyled.
cp -f "$LOADING_STYLE" "$VIEWER_DIR/loading.css"
sed -i '/href="loading.css"/d' "$INDEX"
sed -i '/href="clouds.css"/a\    <link rel="stylesheet" href="loading.css" />' "$INDEX"

# Let the document (and with it the splash) paint without waiting on 200 KB of
# blocking JavaScript. Deferred scripts still run in order, and always before
# DOMContentLoaded, so the stock inline bootstrap moves into that event —
# without the move, the non-deferred call would run before MinedMap.js defines
# createMap. Idempotent: every substitution stops matching once applied.
sed -i 's#<script src="leaflet-1\.9\.4/leaflet\.js"></script>#<script defer src="leaflet-1.9.4/leaflet.js"></script>#' "$INDEX"
sed -i 's#<script src="MinedMap\.js"></script>#<script defer src="MinedMap.js"></script>#' "$INDEX"
sed -i 's#^\( *\)createMap();$#\1window.addEventListener("DOMContentLoaded", function () { createMap(); });#' "$INDEX"

# Start the info.json request while the deferred scripts are still in flight
# rather than after MinedMap.js executes. This works only together with the
# no-store -> no-cache change below: a no-store request bypasses the preload
# cache, so the preloaded response would be fetched a second time.
sed -i '/rel="preload"/d' "$INDEX"
sed -i '/rel="icon"/a\    <link rel="preload" href="data/info.json" as="fetch" />' "$INDEX"

# Add the loading splash itself. It is static markup in the document rather than
# JavaScript-built so it is on screen in the first frame; the controller injected
# into MinedMap.js below takes it from there. Remove a prior injection first so
# rerunning this script does not stack splashes.
sed -i '/<!-- BEGIN 329 LOADING -->/,/<!-- END 329 LOADING -->/d' "$INDEX"
sed -i "/<div id=\"map\"><\/div>/r $LOADING_MARKUP" "$INDEX"

# Publish the Static Web Apps route configuration, which lets a returning
# visitor reuse the rendered tiles instead of downloading them again. The one
# hour window is well inside the roughly daily render cadence; info.json stays
# uncached so a new render is always noticed.
cp -f "$SWA_CONFIG" "$VIEWER_DIR/staticwebapp.config.json"

# Repaint the stock dark-grey void (body + .leaflet-container background) with
# the solid cloud tone, so unexplored areas read as dense cloud cover even when
# the animated Clouds overlay is off (e.g. on unaccelerated devices). Idempotent:
# the freshly downloaded viewer always carries the #333 default. Keep this tone
# in sync with the cloud palette in clouds.css / make-cloud-textures.py.
sed -i 's/background: #333;/background: #e6edfa;/' "$INDEX"

# Add the named guild claims to the stock layer control. Remove a prior
# injection so rerunning this script does not duplicate them; the REGIONS
# markers are the pre-rename name of this same block and are cleared too, so a
# viewer branded by an older revision upgrades cleanly instead of carrying both.
sed -i '/\/\/ BEGIN 329 GUILDS/,/\/\/ END 329 GUILDS/d' "$SCRIPT"
sed -i '/\/\/ BEGIN 329 REGIONS/,/\/\/ END 329 REGIONS/d' "$SCRIPT"
sed -i "/const overlayMaps = {};/r $GUILDS" "$SCRIPT"
sed -i "s|__GUILD_API_URL__|${GUILD_API_URL:-}|g" "$SCRIPT"

# The POI endpoint is supplied at deployment time so an environment-specific URL
# never needs to be committed to the viewer assets.
sed -i '/\/\/ BEGIN 329 POIS/,/\/\/ END 329 POIS/d' "$SCRIPT"
# Remove POI blocks written before they were given idempotency markers. Their
# refresh timer follows the block and is removed separately.
sed -i '/^[[:space:]]*const poiApiUrl = /,/^[[:space:]]*loadPois();/d' "$SCRIPT"
sed -i '/^[[:space:]]*setInterval(loadPois, 60000);/d' "$SCRIPT"
sed -i "/\/\/ END 329 GUILDS/r $POIS" "$SCRIPT"
sed -i "s|__POI_API_URL__|${POI_API_URL:-}|g" "$SCRIPT"

# Add the donation panel as an optional themed map control. Like other public API
# URLs, it is supplied per deployment and omitted from committed viewer assets.
sed -i '/\/\/ BEGIN 329 DONATIONS/,/\/\/ END 329 DONATIONS/d' "$SCRIPT"
sed -i "/\/\/ END 329 POIS/r $DONATIONS" "$SCRIPT"
sed -i "s|__DONATION_API_URL__|${DONATION_API_URL:-}|g" "$SCRIPT"

# Add the player Homes overlay below the donation panel. Like the other public
# API URLs, the endpoint is supplied per deployment and omitted from committed
# viewer assets; an empty value leaves the overlay empty.
sed -i '/\/\/ BEGIN 329 HOMES/,/\/\/ END 329 HOMES/d' "$SCRIPT"
sed -i "/\/\/ END 329 DONATIONS/r $HOMES" "$SCRIPT"
sed -i "s|__HOME_API_URL__|${HOME_API_URL:-}|g" "$SCRIPT"

# Add the default-on Clouds overlay (fog of war over unexplored terrain) below
# the other overlays. Remove any prior injection so reruns do not duplicate it.
sed -i '/\/\/ BEGIN 329 CLOUDS/,/\/\/ END 329 CLOUDS/d' "$SCRIPT"
sed -i "/\/\/ END 329 HOMES/r $CLOUDS" "$SCRIPT"

# Add the loading splash controller and the overlay status pill. It shares the
# `const overlayMaps = {};` anchor with the regions block above and is injected
# after it, which lands it *above* that block — the overlay loaders call into
# `mapLoading`, so it has to be initialized before any of them run.
sed -i '/\/\/ BEGIN 329 LOADING/,/\/\/ END 329 LOADING/d' "$SCRIPT"
sed -i "/const overlayMaps = {};/r $LOADING" "$SCRIPT"

# Let the info.json response be reused from the preload in index.html. no-cache
# still revalidates with the server on every load, so the viewer never shows a
# stale render; no-store would additionally forbid reusing the preloaded copy.
sed -i "s#fetch('data/info.json', {cache: 'no-store'})#fetch('data/info.json', {cache: 'no-cache'})#" "$SCRIPT"

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

# The "last updated" label tracks the backup the render consumed, not this
# deploy: prefer the backup's own timestamp ($BACKUP_TIMESTAMP, an ISO-8601
# time passed by render-deploy.sh) so re-running against the same backup keeps
# the same label, and fall back to the rendered data's mtime for manual or
# local runs that have no backup timestamp.
if [[ -n "${BACKUP_TIMESTAMP:-}" ]]; then
  ATTRIBUTION="$(LC_ALL=C TZ=Asia/Kuala_Lumpur date -d "$BACKUP_TIMESTAMP" '+%B %-d, %Y, %-I:%M %p' 2>/dev/null || true)"
elif [[ -f "$INFO" ]]; then
  ATTRIBUTION="$(LC_ALL=C TZ=Asia/Kuala_Lumpur date -r "$INFO" '+%B %-d, %Y, %-I:%M %p')"
else
  ATTRIBUTION=""
fi

if [[ -n "$ATTRIBUTION" ]]; then
  sed -i "s#\t\tconst refocus = function() {#\t\tmap.attributionControl.setPrefix(false);\n\t\tmap.attributionControl.addAttribution('${ATTRIBUTION}');\n\n\t\tconst refocus = function() {#" "$SCRIPT"
else
  sed -i "s#\t\tconst refocus = function() {#\t\tmap.attributionControl.setPrefix(false);\n\n\t\tconst refocus = function() {#" "$SCRIPT"
fi

if [[ -n "$DAY_ATTRIBUTION" ]]; then
  sed -i "s#\t\tconst refocus = function() {#\t\t// BEGIN 329 WORLD DAY\n\t\tconst worldDayControl = L.control({ position: 'bottomright' });\n\t\tworldDayControl.onAdd = function() {\n\t\t\tconst container = L.DomUtil.create('div', 'leaflet-control world-day-control');\n\t\t\tcontainer.textContent = '${DAY_ATTRIBUTION}';\n\t\t\treturn container;\n\t\t};\n\t\tworldDayControl.addTo(map);\n\t\t// END 329 WORLD DAY\n\n\t\tconst refocus = function() {#" "$SCRIPT"
fi

echo "Branded viewer at $VIEWER_DIR (title: ${TITLE})"
