#!/usr/bin/env bash
set -euo pipefail

# Render-and-deploy core, shared by the Azure Container Apps Job (automatic, run
# by the backup function after a changed-world copy) and manual runs. It pulls a
# world backup blob from Azure, renders it with MinedMap, and publishes the
# viewer through scripts/deploy.sh.
#
# Usage:
#   scripts/render-deploy.sh [BLOB_NAME]
# The blob name may also come from $BLOB; when neither is given the newest
# map_ blob in the container is used.
#
# Required environment:
#   STORAGE_ACCOUNT          storage account holding the backups
#   BACKUP_CONTAINER         blob container (default: map-backups)
#   SWA_CLI_DEPLOYMENT_TOKEN  Static Web App deployment token (used by deploy.sh)
# Optional:
#   AZURE_CLIENT_ID          user-assigned identity client id for `az login`
#   MINEDMAP_BIN             path to a prebuilt minedmap binary (default: baked
#                            /opt/minedmap, else downloaded from the nightly release)
#   VIEWER_SRC               path to a prebuilt viewer dir (default: /opt/viewer,
#                            else downloaded)
#   POI_API_URL / REGION_API_URL / DONATION_API_URL  overlay endpoints (deploy.sh)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORAGE_ACCOUNT="${STORAGE_ACCOUNT:?Set STORAGE_ACCOUNT}"
BACKUP_CONTAINER="${BACKUP_CONTAINER:-map-backups}"
MINEDMAP_RELEASE="${MINEDMAP_RELEASE:-nightly}"
MINEDMAP_BASE="https://github.com/smol-kitten/MinedMap/releases/download/${MINEDMAP_RELEASE}"

for tool in az tar curl unzip; do
  command -v "$tool" >/dev/null || { echo "$tool is required" >&2; exit 1; }
done

# Authenticate with the environment's managed identity (Container Apps Job /
# VM). A user-assigned identity is selected with AZURE_CLIENT_ID; otherwise the
# system-assigned identity is used. Skipped if an az session already exists
# (e.g. a developer already logged in locally).
if ! az account show >/dev/null 2>&1; then
  if [[ -n "${AZURE_CLIENT_ID:-}" ]]; then
    az login --identity --username "$AZURE_CLIENT_ID" >/dev/null
  else
    az login --identity >/dev/null
  fi
fi

# Resolve the blob: explicit arg/env wins, else the newest map_ blob.
BLOB_NAME="${1:-${BLOB:-}}"
if [[ -z "$BLOB_NAME" ]]; then
  echo "No blob supplied; selecting the newest map_ backup."
  BLOB_NAME="$(az storage blob list \
    --account-name "$STORAGE_ACCOUNT" \
    --container-name "$BACKUP_CONTAINER" \
    --prefix map_ \
    --auth-mode login \
    --query "sort_by([], &properties.lastModified)[-1].name" \
    --output tsv)"
fi
if [[ -z "$BLOB_NAME" || "$BLOB_NAME" == "None" ]]; then
  echo "No backup blob found in $BACKUP_CONTAINER." >&2
  exit 1
fi
echo "Using backup blob: $BLOB_NAME"

# Capture the backup's own creation time so the viewer's "last updated" label
# tracks the world data, not when this render/deploy happened — re-running
# against the same backup keeps the same label. Passed to brand-viewer.sh (via
# deploy.sh) as $BACKUP_TIMESTAMP; best-effort, so a failed lookup just lets
# brand-viewer fall back to the rendered data's mtime.
BACKUP_TIMESTAMP="$(az storage blob show \
  --account-name "$STORAGE_ACCOUNT" \
  --container-name "$BACKUP_CONTAINER" \
  --name "$BLOB_NAME" \
  --auth-mode login \
  --query "properties.lastModified" \
  --output tsv 2>/dev/null || true)"
export BACKUP_TIMESTAMP
echo "Backup timestamp: ${BACKUP_TIMESTAMP:-<unknown>}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
ARCHIVE="$WORK/backup.tar.gz"

az storage blob download \
  --account-name "$STORAGE_ACCOUNT" \
  --container-name "$BACKUP_CONTAINER" \
  --name "$BLOB_NAME" \
  --file "$ARCHIVE" \
  --auth-mode login \
  --output none

# Extract and locate the world. The archive layout varies, so search for the
# directory holding both level.dat and db/ rather than assuming a fixed path.
rm -rf "$ROOT_DIR/329"
mkdir "$WORK/extract"
tar -xzf "$ARCHIVE" -C "$WORK/extract"
LEVEL="$(find "$WORK/extract" -type f -name level.dat -print -quit)"
[[ -n "$LEVEL" ]] || { echo "level.dat not found in backup archive." >&2; exit 1; }
WORLD="$(dirname "$LEVEL")"
[[ -d "$WORLD/db" ]] || { echo "db/ not found alongside level.dat in $WORLD." >&2; exit 1; }
cp -a "$WORLD" "$ROOT_DIR/329"
test -f "$ROOT_DIR/329/level.dat" && test -d "$ROOT_DIR/329/db"
echo "World placed at 329/ (from $WORLD)."

# Resolve the MinedMap binary and viewer: prefer baked paths, else download the
# release (local runs without a prebuilt image).
MINEDMAP="${MINEDMAP_BIN:-/opt/minedmap}"
VIEWER="${VIEWER_SRC:-/opt/viewer}"
mkdir -p "$ROOT_DIR/tools" "$ROOT_DIR/output/viewer"

if [[ ! -x "$MINEDMAP" ]]; then
  echo "Downloading MinedMap (${MINEDMAP_RELEASE}) renderer."
  curl --fail --location --show-error --silent \
    "$MINEDMAP_BASE/MinedMap--x86_64-unknown-linux-gnu.zip" --output "$WORK/minedmap.zip"
  unzip -o "$WORK/minedmap.zip" -d "$WORK/bin" >/dev/null
  MINEDMAP="$(find "$WORK/bin" -type f -name minedmap -print -quit)"
  [[ -n "$MINEDMAP" ]] || { echo "minedmap binary not found in release archive." >&2; exit 1; }
fi
install -m 0755 "$MINEDMAP" "$ROOT_DIR/tools/minedmap"

if [[ ! -f "$VIEWER/index.html" ]]; then
  echo "Downloading MinedMap (${MINEDMAP_RELEASE}) viewer."
  curl --fail --location --show-error --silent \
    "$MINEDMAP_BASE/MinedMap--viewer.zip" --output "$WORK/viewer.zip"
  unzip -q "$WORK/viewer.zip" -d "$WORK/viewer"
  VIEWER="$(find "$WORK/viewer" -type f -name index.html -printf '%h\n' -quit)"
  [[ -n "$VIEWER" ]] || { echo "index.html not found in viewer archive." >&2; exit 1; }
fi
cp -a "$VIEWER"/. "$ROOT_DIR/output/viewer/"

# Render the overworld surface, then hand off to the shared deploy script, which
# applies branding and publishes to Azure Static Web Apps.
mkdir -p "$ROOT_DIR/output/viewer/data"
"$ROOT_DIR/tools/minedmap" "$ROOT_DIR/329" "$ROOT_DIR/output/viewer/data" \
  --edition bedrock \
  --image-format webp \
  -j "$(nproc)"

echo "Render complete; deploying."
exec "$ROOT_DIR/scripts/deploy.sh"
