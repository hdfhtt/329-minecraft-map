"""Print the number of complete Minecraft days recorded in a Bedrock world."""

from __future__ import annotations

import struct
import sys
from pathlib import Path


# Minimal reader for Bedrock Edition's uncompressed little-endian NBT, just
# enough to pull the world "Time" tag out of level.dat without any third-party
# dependency.
class _Reader:
    def __init__(self, data: bytes) -> None:
        self.data = data
        self.pos = 0

    def _take(self, n: int) -> bytes:
        chunk = self.data[self.pos : self.pos + n]
        if len(chunk) != n:
            raise ValueError("Unexpected end of NBT data")
        self.pos += n
        return chunk

    def num(self, fmt: str, size: int):
        return struct.unpack_from(fmt, self._take(size))[0]

    def string(self) -> str:
        length = self.num("<H", 2)
        return self._take(length).decode("utf-8", "replace")

    def value(self, tag_type: int):
        if tag_type == 1:  # Byte
            return self.num("<b", 1)
        if tag_type == 2:  # Short
            return self.num("<h", 2)
        if tag_type == 3:  # Int
            return self.num("<i", 4)
        if tag_type == 4:  # Long
            return self.num("<q", 8)
        if tag_type == 5:  # Float
            return self.num("<f", 4)
        if tag_type == 6:  # Double
            return self.num("<d", 8)
        if tag_type == 7:  # Byte array
            return self._take(self.num("<i", 4))
        if tag_type == 8:  # String
            return self.string()
        if tag_type == 9:  # List
            item_type = self.num("<b", 1)
            length = self.num("<i", 4)
            return [self.value(item_type) for _ in range(length)]
        if tag_type == 10:  # Compound
            return self.compound()
        if tag_type == 11:  # Int array
            length = self.num("<i", 4)
            return [self.num("<i", 4) for _ in range(length)]
        if tag_type == 12:  # Long array
            length = self.num("<i", 4)
            return [self.num("<q", 8) for _ in range(length)]
        raise ValueError(f"Unsupported NBT tag type: {tag_type}")

    def compound(self) -> dict:
        result: dict = {}
        while True:
            tag_type = self.num("<b", 1)
            if tag_type == 0:  # TAG_End
                break
            name = self.string()
            result[name] = self.value(tag_type)
        return result


def main() -> None:
    path = Path(sys.argv[1])
    raw = path.read_bytes()
    if len(raw) < 8:
        raise ValueError(f"Invalid Bedrock level.dat: {path}")

    _, payload_size = struct.unpack_from("<II", raw)
    payload = raw[8 : 8 + payload_size]
    if len(payload) != payload_size:
        raise ValueError(f"Truncated Bedrock level.dat: {path}")

    reader = _Reader(payload)
    if reader.num("<b", 1) != 10:  # root must be a compound tag
        raise ValueError("Bedrock level.dat root tag is not a compound")
    reader.string()  # root name (usually empty)
    root = reader.compound()
    print(int(root["Time"]) // 24_000)


if __name__ == "__main__":
    main()
