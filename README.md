# Local Bedrock MinedMap

This project converts the Bedrock world in `329/` to Java Anvil format with
the open-source `amulet-core` library, then renders it with neocturne's
MinedMap. The original world is never modified.

Amulet Core 1.9.45 is pinned because it contains the world conversion API.
Its RocksDB extension requires a native CMake 4.1+ toolchain on Linux.

## Setup

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
cmake --version  # must be 4.1 or newer
python -m pip install -e .
./scripts/setup-minedmap.sh
```

## Render Locally

```sh
./scripts/render-and-serve.sh
```

Open <http://127.0.0.1:8000/>. Stop the server with `Ctrl-C`.
The combined command reuses `output/java-world/` when it already exists. Run
`./scripts/convert.sh` explicitly when the Bedrock source changes.

The individual stages can also be run separately:

```sh
./scripts/convert.sh
./scripts/render.sh
python3 scripts/serve.py --port 8000
```

Set `MINEDMAP_JOBS` to control renderer parallelism. Set `--java-version`
on `convert.sh` to select another Java translation target, for example:

```sh
./scripts/convert.sh --java-version 1.20.4
```

If conversion completed but Java metadata needs to be regenerated, repair it
without converting chunks again:

```sh
./scripts/convert.sh --metadata-only
```

## Viewer Customization

The stock MinedMap viewer ships with the title `MinedMap`, no favicon, and
Leaflet and renderer credits. This project rebrands it to **Minecraft with 329**
with a custom favicon and replaces the credits with the map render timestamp.
It also adds a default-visible `Regions` overlay with named boundaries that can
be hidden from the Leaflet layer control.

The icon source lives at `assets/favicon.ico`, the Leaflet region definitions
live at `assets/regions.js`, and their label styles live at `assets/regions.css`.
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
MinedMap credits, and shows the modification timestamp of `data/info.json` in
Malaysia time (GMT+8). It is idempotent and safe to run repeatedly. Edit
`assets/regions.js` to change region names, bounds, colors, or player heads, and edit
`assets/regions.css` to change the labels. Add Bedrock gamertags as strings in a
region's `players` list; heads appear below its name and show the gamertag on hover.
The viewer tries Geyser's public skin cache for a Minecraft head, then uses the
standard Steve head if the player or skin is unavailable. Edit `assets/favicon.ico` or the
`TITLE` value in `scripts/brand-viewer.sh` to change the branding. Browsers cache
favicons aggressively; after publishing, use a hard refresh or a private window
to see a changed icon.

## Deploy to Azure

Create an Azure Static Web App with the Free plan and `Other` as its deployment
source. Copy its deployment token from **Overview > Manage deployment token**,
then run:

```sh
./scripts/deploy.sh
```

Paste the token at the hidden prompt. The script validates the rendered viewer,
applies the project branding, creates a temporary deployment package, excludes
the local `data/processed/` rendering cache, and publishes to the production
environment. The temporary package and interactively entered token are removed
when the script exits.

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

### 2. Convert the new world

Activate the project environment, then run a full conversion. Conversion
replaces `output/java-world/`; `--metadata-only` is not sufficient for a world
update.

```sh
. .venv/bin/activate
./scripts/convert.sh
```

The conversion is complete when it reports `Conversion complete` and finishes
updating the Java metadata without an error.

### 3. Render a fresh viewer

Remove the old generated map data so tiles from areas that no longer exist do
not remain in the viewer, then render the replacement world:

```sh
rm -rf output/viewer/data
./scripts/render.sh
```

This preserves the MinedMap viewer application and regenerates its terrain
tiles, metadata, and spawn location.

### 4. Check the map locally

```sh
python3 scripts/serve.py --port 8000
```

Open <http://127.0.0.1:8000/> and check the spawn location, several known
landmarks, and the map boundaries. Stop the server with `Ctrl-C` after
verification.

### 5. Publish the result

Deploy the refreshed viewer to Azure:

```sh
./scripts/deploy.sh
```

The script publishes `output/viewer/` without the local
`output/viewer/data/processed/` rendering cache. It does not publish
`output/java-world/`, `329/`, or a world archive.

Updating the map does not require a Git commit because generated output and
world data are intentionally kept out of the repository. Commit and push only
when the conversion scripts, rendering settings, or documentation change.

For later updates, do not rely on `render-and-serve.sh` alone: it deliberately
reuses an existing `output/java-world/`. Always run `convert.sh` explicitly
after replacing `329/`.

## Important Limitations

Conversion depends on the translation data available in the installed
Amulet Core release. Bedrock-only blocks, behavior packs, and custom resource
pack content may be translated imperfectly or become unknown Java blocks.
This setup renders terrain from Java Anvil data; it is not a Bedrock server.

The server intentionally binds to `127.0.0.1`, so it is not reachable from
other machines. Azure deployment can later replace this server with a cloud
static-file host without changing the conversion or rendering stages.
