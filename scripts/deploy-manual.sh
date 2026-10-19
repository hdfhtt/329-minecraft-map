#!/usr/bin/env bash
set -euo pipefail

# Manual "publish my local changes" path. The world render itself always happens
# in the Azure Container Apps Job (managed identity, blob pulled in-cloud, exactly
# as production does it). This script rebuilds the image from the current working
# tree — baking in the committed assets/ branding (markers, styles, favicon) — so
# the job picks up local edits, pushes it, triggers one job execution against the
# newest map_ backup, and streams the execution status until it finishes or the
# 10-minute watch window elapses.
#
# Usage:
#   scripts/deploy-manual.sh
#
# Configuration (read from the environment, or .env alongside the other scripts):
#   IMAGE  required  the image to build and push, e.g.
#                    <dockerhub-user>/329-map-render:latest. The target registry
#                    must already be authenticated (docker login).
#   JOB    optional  Container Apps Job name  (default: map-render-deploy)
#   RG     optional  resource group           (default: minecraft-with-329)
#
# The job renders the newest map_ backup; it is not parameterized here.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

# Load IMAGE/JOB/RG (and anything else) from .env, matching deploy.sh. Values
# already set in the environment win because the file only fills unset names via
# the shell's own assignment — explicit exports before the script still override.
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

JOB="${JOB:-map-render-deploy}"
RG="${RG:-minecraft-with-329}"
WATCH_SECONDS=600
POLL_SECONDS=10

command -v docker >/dev/null || { echo "docker is required." >&2; exit 1; }
command -v az >/dev/null || { echo "az (Azure CLI) is required." >&2; exit 1; }

if [[ -z "${IMAGE:-}" ]]; then
  echo "IMAGE is not set. Add it to .env or export it, e.g." >&2
  echo "  IMAGE='<dockerhub-user>/329-minecraft-map:latest'" >&2
  exit 1
fi

# A manual run may be the first thing a developer does in a session, so an
# interactive login here is acceptable (unlike the job's managed-identity path).
if ! az account show >/dev/null 2>&1; then
  echo "No Azure session; launching 'az login'..."
  az login >/dev/null
fi

echo "==> Building image: $IMAGE"
docker build -t "$IMAGE" "$ROOT_DIR"

echo "==> Pushing image: $IMAGE"
docker push "$IMAGE"

echo "==> Starting job execution: $JOB (resource group: $RG)"
EXEC="$(az containerapp job start -n "$JOB" -g "$RG" --query name -o tsv)"
[[ -n "$EXEC" ]] || { echo "Failed to start job execution." >&2; exit 1; }
echo "Execution: $EXEC"

echo "==> Watching status (up to $((WATCH_SECONDS / 60)) min, polling every ${POLL_SECONDS}s)"
elapsed=0
last_status=""
while true; do
  status="$(az containerapp job execution show \
    -n "$JOB" -g "$RG" --job-execution-name "$EXEC" \
    --query properties.status -o tsv 2>/dev/null || true)"

  if [[ -n "$status" && "$status" != "$last_status" ]]; then
    printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$status"
    last_status="$status"
  fi

  case "$status" in
    Succeeded)
      echo "==> Deploy succeeded (execution: $EXEC)."
      exit 0
      ;;
    Failed|Degraded|Canceled)
      echo "==> Deploy ended with status '$status' (execution: $EXEC)." >&2
      echo "Inspect logs in the Azure portal / Log Analytics for this execution." >&2
      exit 1
      ;;
  esac

  if (( elapsed >= WATCH_SECONDS )); then
    echo "==> Still '${status:-unknown}' after $((WATCH_SECONDS / 60)) min; stopping watch." >&2
    echo "The job's own replica timeout is longer, so it may still finish in Azure." >&2
    echo "Check: az containerapp job execution show -n $JOB -g $RG --job-execution-name $EXEC --query properties.status -o tsv" >&2
    exit 1
  fi

  sleep "$POLL_SECONDS"
  elapsed=$((elapsed + POLL_SECONDS))
done
