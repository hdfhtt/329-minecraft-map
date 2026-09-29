#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VIEWER_DIR="$ROOT_DIR/output/viewer"
ENV_FILE="$ROOT_DIR/.env"
DEPLOY_DIR=""

cleanup() {
  if [[ -n "$DEPLOY_DIR" ]]; then
    rm -rf "$DEPLOY_DIR"
  fi
}
trap cleanup EXIT

command -v npx >/dev/null || { echo "npx is required. Install Node.js first." >&2; exit 1; }
[[ -f "$VIEWER_DIR/index.html" ]] || {
  echo "Viewer not found. Run scripts/setup-minedmap.sh and scripts/render.sh first." >&2
  exit 1
}
[[ -f "$VIEWER_DIR/data/info.json" ]] || {
  echo "Rendered map data not found. Run scripts/render.sh first." >&2
  exit 1
}

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

"$ROOT_DIR/scripts/brand-viewer.sh" "$VIEWER_DIR"

if [[ -z "${SWA_CLI_DEPLOYMENT_TOKEN:-}" ]]; then
  read -rsp "Deployment token: " SWA_CLI_DEPLOYMENT_TOKEN
  printf '\n'
  [[ -n "$SWA_CLI_DEPLOYMENT_TOKEN" ]] || {
    echo "Deployment token cannot be empty." >&2
    exit 1
  }
  export SWA_CLI_DEPLOYMENT_TOKEN
fi

DEPLOY_DIR="$(mktemp -d)"
cp -a "$VIEWER_DIR"/. "$DEPLOY_DIR"/
rm -rf "$DEPLOY_DIR/data/processed"

echo "Deploying viewer to Azure Static Web Apps production..."
npx --yes @azure/static-web-apps-cli@2.0.10 deploy "$DEPLOY_DIR" --env production
