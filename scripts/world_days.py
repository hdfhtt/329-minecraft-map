"""Print the number of complete Minecraft days recorded in a Bedrock world."""

from __future__ import annotations

import struct
import sys
from pathlib import Path

from amulet_nbt import load as load_nbt


def main() -> None:
    path = Path(sys.argv[1])
    raw = path.read_bytes()
    if len(raw) < 8:
        raise ValueError(f"Invalid Bedrock level.dat: {path}")

    _, payload_size = struct.unpack_from("<II", raw)
    payload = raw[8 : 8 + payload_size]
    if len(payload) != payload_size:
        raise ValueError(f"Truncated Bedrock level.dat: {path}")

    time = load_nbt(payload, compressed=False, little_endian=True).compound["Time"].py_int
    print(time // 24_000)


if __name__ == "__main__":
    main()
