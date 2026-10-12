# Minecraft with 329 Map

This project renders the Bedrock world with
[smol-kitten's MinedMap fork](https://github.com/smol-kitten/MinedMap), which
reads Bedrock LevelDB saves natively, and publishes the viewer to an Azure
Static Web App. No Bedrock-to-Java conversion step is needed, and the source
world is never modified (MinedMap copies the LevelDB to a temporary directory
before opening it).

Rendering runs in an **Azure Container Apps Job**, not on a local machine. The
companion `329-minecraft-api` Azure Function takes a daily world backup, uploads
it to Azure Blob storage, and — only when the world actually changed — starts
this render job, which renders the latest backup and deploys the viewer.

## Automated Render and Deploy

`scripts/render-deploy.sh` is the single render-and-deploy flow, packaged as a
container image (`Dockerfile`) that runs as a Container Apps Job. Each run:

1. logs in to Azure with the job's **managed identity**,
2. resolves the backup blob (the newest `map_` blob, or `$BLOB` / a positional
   argument),
3. downloads it, extracts the world into `329/` (searching for `level.dat`+`db/`
   rather than assuming a fixed path),
4. renders the overworld surface with the baked MinedMap renderer into
   `output/viewer/data/`, and
5. hands off to `scripts/deploy.sh`, which applies the branding and publishes to
   Azure Static Web Apps.

It runs two ways:

- **Automatically** — the backup function starts the job after a changed-world
  backup lands in Blob storage. An unchanged day produces no new backup and no
  job start, so the map is only re-rendered when something changed.
- **Manually** — `az containerapp job start -n map-render-deploy -g minecraft-with-329`
  runs one execution against the newest backup.

### One-time setup

Variables used below:

```sh
RG=minecraft-with-329
STORAGE=minecraftwith3298eeb
LOC=eastasia
JOB=map-render-deploy
ENVNAME=map-render-env
IMAGE=<dockerhub-user>/329-map-render:latest   # a public Docker Hub repo
```

**1. Build and push the image** (glibc base with the MinedMap binary baked in):

```sh
docker build -t "$IMAGE" .
docker push "$IMAGE"
```

**2. Create the Container Apps environment and a manual-trigger job** with a
system-assigned identity, the SWA token as a secret, and the overlay URLs as
environment variables:

```sh
az containerapp env create -g "$RG" -n "$ENVNAME" -l "$LOC"

az containerapp job create -g "$RG" -n "$JOB" --environment "$ENVNAME" \
  --trigger-type Manual \
  --replica-timeout 1800 --replica-retry-limit 1 \
  --image "$IMAGE" \
  --cpu 2 --memory 4Gi \
  --mi-system-assigned \
  --secrets swa-token="<Static Web App deployment token>" \
  --env-vars \
    SWA_CLI_DEPLOYMENT_TOKEN=secretref:swa-token \
    POI_API_URL=https://<your-function-app>.azurewebsites.net/api/pois \
    REGION_API_URL=https://<your-function-app>.azurewebsites.net/api/regions \
    DONATION_API_URL=https://<your-function-app>.azurewebsites.net/api/donations
```

**3. Grant the job's identity read access to the backup container:**

```sh
PRINCIPAL="$(az containerapp job identity show -g "$RG" -n "$JOB" \
  --query principalId -o tsv)"
SUB="$(az account show --query id -o tsv)"

az role assignment create --assignee "$PRINCIPAL" \
  --role "Storage Blob Data Reader" \
  --scope "/subscriptions/$SUB/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STORAGE"
```

The backup function starts this job through its own managed identity; see the
`329-minecraft-api` README ("Render job trigger") for the function-side identity
and role assignment.

The storage account and container are baked into the image as `STORAGE_ACCOUNT`
/ `BACKUP_CONTAINER` env defaults (`minecraftwith3298eeb` / `map-backups`);
override them on the job if the backup location moves.

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

`scripts/brand-viewer.sh` applies the branding after each render (it is the final
step of `scripts/deploy.sh`). The script sets the page title, copies
`assets/favicon.ico` to `output/viewer/favicon.ico`, injects the regions, removes
the stock Leaflet and MinedMap credits, and shows the complete Minecraft day from
`329/level.dat` in its own map panel alongside the modification timestamp of
`data/info.json` in Malaysia time. It is idempotent and safe to run repeatedly.
Edit `assets/regions.js` to change how live regions are rendered, and edit
`assets/regions.css` to change the labels. Manage region names, coordinates,
colors, and members with the Discord `/region` command. Player avatars are
supplied by the region API, derived from each registered player's Xbox XUID;
players without a resolved avatar use the standard Steve head. Edit
`assets/favicon.ico` or the `TITLE` value in `scripts/brand-viewer.sh` to change
the branding. Browsers cache favicons aggressively; after publishing, use a hard
refresh or a private window to see a changed icon.

### Discord POIs

The map shows live `Points of Interest`, `Regions`, and `Donations` overlays
supplied by the companion `329-minecraft-api` Azure Function. The endpoints are
intentionally not committed; they are supplied to the render through the
Container Apps Job's `POI_API_URL`, `REGION_API_URL`, and `DONATION_API_URL`
environment variables. An empty value simply leaves the matching overlay empty.
The API URLs are public and read-only; Discord command authorization remains in
the Azure Function.

## Updating the World Map

Updating the map is automatic: a new Bedrock world on the server is captured by
the next daily backup, which starts the render job to render and deploy it. To
force a refresh from the most recent backup without waiting, start the job
manually:

```sh
az containerapp job start -n map-render-deploy -g minecraft-with-329
```

Generated output and world data are intentionally kept out of the repository.
Commit and push only when the render/deploy scripts, `Dockerfile`, viewer assets,
or documentation change. After changing any of the baked files, rebuild and push
the image so the job picks them up.

## Important Limitations

MinedMap renders the Bedrock overworld surface by reusing the Java Edition
color tables: block identifiers are translated on the fly, blocks that cannot be
mapped are drawn in neutral gray, and biome-tinted blocks (grass, foliage,
water) use plains-biome values. Modded or behavior-pack content may therefore
render imperfectly. This setup renders terrain only; it is not a Bedrock server.
