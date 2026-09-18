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

## Important Limitations

Conversion depends on the translation data available in the installed
Amulet Core release. Bedrock-only blocks, behavior packs, and custom resource
pack content may be translated imperfectly or become unknown Java blocks.
This setup renders terrain from Java Anvil data; it is not a Bedrock server.

The server intentionally binds to `127.0.0.1`, so it is not reachable from
other machines. Azure deployment can later replace this server with a cloud
static-file host without changing the conversion or rendering stages.
