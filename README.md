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

The renderer displays every non-empty sign as a map marker.

If conversion completed but Java metadata needs to be regenerated, repair it
without converting chunks again:

```sh
./scripts/convert.sh --metadata-only
```

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
tiles, metadata, spawn location, and sign markers.

### 4. Check the map locally

```sh
python3 scripts/serve.py --port 8000
```

Open <http://127.0.0.1:8000/> and check the spawn location, several known
landmarks, the map boundaries, and some sign markers. Stop the server with
`Ctrl-C` after verification.

### 5. Publish the result

The deployable static site is the complete `output/viewer/` directory. Publish
that directory with the configured hosting process; do not publish
`output/java-world/`, `329/`, or a world archive. The
`output/viewer/data/processed/` directory is a local MinedMap rendering cache
and may be excluded from uploads.

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
