# Local Bedrock MinedMap

This project renders the Bedrock world in `329/` directly with
[smol-kitten's MinedMap fork](https://github.com/smol-kitten/MinedMap), which
reads Bedrock LevelDB saves natively. No Bedrock-to-Java conversion step is
needed, and the original world is never modified (MinedMap copies the LevelDB to
a temporary directory before opening it).

The renderer is a standalone binary, so no Python packages are required; the
helper scripts use only the Python standard library.

## Setup

```sh
./scripts/setup-minedmap.sh
```

This downloads the MinedMap renderer binary and viewer from the fork's rolling
`nightly` release into `tools/` and `output/viewer/`, then applies the project
branding. `curl` and `unzip` are required.

## Render Locally

```sh
./scripts/render-and-serve.sh
```

Open <http://127.0.0.1:8000/>. Stop the server with `Ctrl-C`. This renders
`329/` straight into `output/viewer/data/` and serves the viewer.

The individual stages can also be run separately:

```sh
./scripts/render.sh
python3 scripts/serve.py --port 8000
```

Set `MINEDMAP_JOBS` to control renderer parallelism (defaults to one thread per
core). `render.sh` renders the overworld surface; edit its MinedMap invocation
to add flags such as `--nether`/`--end` or extra map layers.

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

`scripts/setup-minedmap.sh` applies the branding after it installs the viewer,
and `scripts/render.sh` refreshes it after each successful render. To reapply the
branding to an existing `output/viewer/` without reinstalling MinedMap:

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

The map can show live `Points of Interest`, `Regions`, and `Donations` overlays
supplied by the companion `329-minecraft-api` Azure Function. The endpoints are
intentionally not committed. When publishing after the bot API is deployed,
either set them for that deployment:

```sh
POI_API_URL='https://YOUR-FUNCTION.azurewebsites.net/api/pois' \
REGION_API_URL='https://YOUR-FUNCTION.azurewebsites.net/api/regions' \
DONATION_API_URL='https://YOUR-FUNCTION.azurewebsites.net/api/donations' \
./scripts/deploy.sh
```

Use the same variables with `scripts/brand-viewer.sh` when testing locally. An
empty value simply leaves the matching overlay empty. The API URLs are public and
read-only; Discord command authorization remains in the Azure Function.

For repeated deploys, copy `.env.example` to `.env` and fill in the URLs there.
`scripts/deploy.sh` loads `.env` automatically, and `.env` is ignored by Git.

## Deploy to Azure

Create an Azure Static Web App with the Free plan and `Other` as its deployment
source. Copy its deployment token from **Overview > Manage deployment token**,
then create a local environment file:

```sh
cp .env.example .env
```

Edit `.env` with the Function App URLs and Static Web App deployment token. Then
run:

```sh
./scripts/deploy.sh
```

If `.env` does not define `SWA_CLI_DEPLOYMENT_TOKEN`, paste the token at the
hidden prompt. The script validates the rendered viewer, applies the project
branding, creates a temporary deployment package, excludes the local
`data/processed/` rendering cache, and publishes to the production environment.
The temporary package and interactively entered token are removed when the script
exits.

For unattended use, provide the token through the environment:

```sh
SWA_CLI_DEPLOYMENT_TOKEN='your-secret-token' ./scripts/deploy.sh
```

Never commit the deployment token. Pushing source changes to Azure Repos does
not publish the generated viewer; run `deploy.sh` whenever the rendered map or
viewer branding changes.

## Update the World Map

Use this procedure when a newer Bedrock world export is available. The source
world must be a complete, closed export; do not copy it while Minecraft or a
Bedrock server is still writing to it.

### 1. Prepare the replacement world

Extract the new export outside this project first. Its world directory must
contain both `level.dat` and a `db/` directory:

```sh
NEW_WORLD=/absolute/path/to/the/extracted/world
test -f "$NEW_WORLD/level.dat"
test -d "$NEW_WORLD/db"
```

Replace `329/` as a complete directory. Do not merge or copy a new LevelDB
`db/` over the old one because files removed from the new world could otherwise
remain in the source:

```sh
rm -rf 329.new
cp -a "$NEW_WORLD" 329.new
test -f 329.new/level.dat
test -d 329.new/db

BACKUP="329.backup-$(date +%Y%m%d-%H%M%S)"
mv 329 "$BACKUP"
mv 329.new 329
```

Keep the backup until the new map has been checked. The source world, its
archives, and local backups are data rather than project source and must not be
committed to Git.

### 2. Render a fresh viewer

Remove the old generated map data so tiles from areas that no longer exist do
not remain in the viewer, then render the replacement world:

```sh
rm -rf output/viewer/data
./scripts/render.sh
```

This preserves the MinedMap viewer application and regenerates its terrain
tiles, metadata, and spawn location.

### 3. Check the map locally

```sh
python3 scripts/serve.py --port 8000
```

Open <http://127.0.0.1:8000/> and check the spawn location, several known
landmarks, and the map boundaries. Stop the server with `Ctrl-C` after
verification.

### 4. Publish the result

Deploy the refreshed viewer to Azure:

```sh
./scripts/deploy.sh
```

The script publishes `output/viewer/` without the local
`output/viewer/data/processed/` rendering cache. It does not publish `329/` or a
world archive.

Updating the map does not require a Git commit because generated output and
world data are intentionally kept out of the repository. Commit and push only
when the rendering scripts, settings, or documentation change.

## Important Limitations

MinedMap renders the Bedrock overworld surface by reusing the Java Edition
color tables: block identifiers are translated on the fly, blocks that cannot be
mapped are drawn in neutral gray, and biome-tinted blocks (grass, foliage,
water) use plains-biome values. Modded or behavior-pack content may therefore
render imperfectly. This setup renders terrain only; it is not a Bedrock server.

The server intentionally binds to `127.0.0.1`, so it is not reachable from
other machines. Azure deployment can later replace this server with a cloud
static-file host without changing the rendering stage.
