from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the generated MinedMap viewer locally")
    parser.add_argument("--directory", type=Path, default=Path("output/viewer"))
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    directory = args.directory.resolve()
    if not (directory / "index.html").is_file():
        raise SystemExit(f"Viewer not found at {directory}. Run scripts/setup-minedmap.sh first.")

    handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"MinedMap available at http://127.0.0.1:{args.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
