# Minecraft with 329 Map

This project renders the Bedrock world with
[smol-kitten's MinedMap fork](https://github.com/smol-kitten/MinedMap), which
reads Bedrock LevelDB saves natively, and publishes the viewer to an Azure
Static Web App. No Bedrock-to-Java conversion step is needed, and the source
world is never modified (MinedMap copies the LevelDB to a temporary directory
before opening it).

Rendering runs in GitHub Actions, not on a local machine. The companion
`329-minecraft-api` Azure Function takes a daily world backup, uploads it to
Azure Blob storage, and fires a `repository_dispatch` that triggers the render
workflow here. The renderer is a standalone binary, and `scripts/brand-viewer.sh`
uses only the Python standard library.

## Automated Render and Deploy

`.github/workflows/render-deploy.yml` renders and deploys on an
`ubuntu-latest` runner. It runs when:

- the backup function sends a `repository_dispatch` of type `map-backup` after a
  fresh backup lands in Blob storage, or
- it is started manually from the **Actions** tab (`workflow_dispatch`), with an
  optional `blob` input to pick a specific backup (newest is used when blank).

Each run logs in to Azure with OIDC, downloads the backup blob, extracts the
world into `329/`, installs the MinedMap `nightly` renderer and viewer, renders
the overworld surface into `output/viewer/data/`, and deploys through
`scripts/deploy.sh`.

### One-time setup

The workflow authenticates to Azure Blob storage with OIDC (no stored
credential) and needs a federated app registration with read access to the
backup container.

```sh
RG=minecraft-with-329
STORAGE=minecraftwith3298eeb
SUB="$(az account show --query id -o tsv)"

APP_ID="$(az ad app create --display-name 329-map-render --query appId -o tsv)"
az ad sp create --id "$APP_ID"

az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "gh-329-minecraft-map-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:hdfhtt/329-minecraft-map:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

az role assignment create --assignee "$APP_ID" \
  --role "Storage Blob Data Reader" \
  --scope "/subscriptions/$SUB/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE"
```

`repository_dispatch` always runs on the default branch, so the single
`ref:refs/heads/main` subject covers both the automatic dispatch and a manual
run from `main`.

Then add the GitHub **secrets** on `hdfhtt/329-minecraft-map`:

```text
AZURE_CLIENT_ID=<$APP_ID>
AZURE_TENANT_ID=<az account show --query tenantId -o tsv>
AZURE_SUBSCRIPTION_ID=<$SUB>
SWA_CLI_DEPLOYMENT_TOKEN=<Static Web App deployment token>
```

and the GitHub **variables** (the overlay endpoints are public and read-only, so
they are variables rather than secrets):

```text
POI_API_URL=https://<your-function-app>.azurewebsites.net/api/pois
REGION_API_URL=https://<your-function-app>.azurewebsites.net/api/regions
DONATION_API_URL=https://<your-function-app>.azurewebsites.net/api/donations
```

The storage account and container are workflow `env` constants
(`minecraftwith3298eeb` / `map-backups`); change them there if the backup
location moves.

## Viewer Customization

The stock MinedMap viewer ships with the title `MinedMap`, no favicon, and
Leaflet and renderer credits. This project rebrands it to **Minecraft with 329**
with a custom favicon and replaces the credits with the map render timestamp.
It also adds a default-visible `Regions` overlay with named boundaries loaded
from the companion Discord bot API that can be hidden from the Leaflet layer
control.

The icon source lives at `assets/favicon.ico`, the Leaflet region definitions
live at `assets/regions.js`, the initial coordinate display lives at
`assets/coordinates.js`, the donation panel lives at `assets/donations.js`, and
the label/control styles live at `assets/regions.css`.
All are committed to Git. Each region has a distinct tinted fill and a permanent
pixel-style label.

`scripts/brand-viewer.sh` applies the branding after each render. To reapply it
to an existing `output/viewer/` without re-rendering:

```sh
./scripts/brand-viewer.sh
```

The script sets the page title, copies `assets/favicon.ico` to
`output/viewer/favicon.ico`, injects the regions, removes the stock Leaflet and
MinedMap credits, and shows the complete Minecraft day from `329/level.dat` in
its own map panel alongside the modification timestamp of `data/info.json` in
Malaysia time. It is idempotent and safe to run repeatedly. Edit
`assets/regions.js` to change how live regions are rendered, and edit
`assets/regions.css` to change the labels. Manage region names, coordinates,
colors, and members with the Discord `/region` command. Player avatars are
supplied by the region API, derived from each registered player's Xbox XUID;
players without a resolved avatar use the standard Steve head. Edit
`assets/favicon.ico` or the
`TITLE` value in `scripts/brand-viewer.sh` to change the branding. Browsers cache
favicons aggressively; after publishing, use a hard refresh or a private window
to see a changed icon.

### Discord POIs

The map shows live `Points of Interest`, `Regions`, and `Donations` overlays
supplied by the companion `329-minecraft-api` Azure Function. The endpoints are
intentionally not committed; they are supplied through the GitHub variables
above (or through the environment for a manual deploy). An empty value simply
leaves the matching overlay empty. The API URLs are public and read-only;
Discord command authorization remains in the Azure Function.

## Manual Deploy

`scripts/deploy.sh` is the shared deploy path used by both the workflow and
local operators. Use it to republish an already-rendered `output/viewer/`
without waiting for a backup — for example after editing the viewer assets.

Create an Azure Static Web App with the Free plan and `Other` as its deployment
source, then copy its deployment token from
**Overview > Manage deployment token**. Provide the token and overlay URLs
through a local environment file:

```sh
cp .env.example .env
```

Edit `.env` with the Function App URLs and Static Web App deployment token, then
run:

```sh
./scripts/deploy.sh
```

`scripts/deploy.sh` loads `.env` automatically, and `.env` is ignored by Git. If
`.env` does not define `SWA_CLI_DEPLOYMENT_TOKEN`, paste the token at the hidden
prompt. The script validates the rendered viewer, applies the project branding,
creates a temporary deployment package, excludes the local `data/processed/`
rendering cache, and publishes to the production environment. The temporary
package and interactively entered token are removed when the script exits.

For unattended use, provide the values through the environment:

```sh
SWA_CLI_DEPLOYMENT_TOKEN='your-secret-token' \
POI_API_URL='https://<your-function-app>.azurewebsites.net/api/pois' \
REGION_API_URL='https://<your-function-app>.azurewebsites.net/api/regions' \
DONATION_API_URL='https://<your-function-app>.azurewebsites.net/api/donations' \
./scripts/deploy.sh
```

A manual deploy requires an already-rendered `output/viewer/` with
`data/info.json`; the automated workflow produces this from the latest backup.
Never commit the deployment token.

## Updating the World Map

Updating the map is automatic: a new Bedrock world on the server is captured by
the next daily backup, which dispatches this workflow to render and deploy it.
To force a refresh from the most recent backup without waiting, start the
**Render and deploy map** workflow manually from the Actions tab.

Generated output and world data are intentionally kept out of the repository.
Commit and push only when the workflow, viewer assets, deploy script, or
documentation change.

## Important Limitations

MinedMap renders the Bedrock overworld surface by reusing the Java Edition
color tables: block identifiers are translated on the fly, blocks that cannot be
mapped are drawn in neutral gray, and biome-tinted blocks (grass, foliage,
water) use plains-biome values. Modded or behavior-pack content may therefore
render imperfectly. This setup renders terrain only; it is not a Bedrock server.
