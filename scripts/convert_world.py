from __future__ import annotations

import argparse
import shutil
import struct
from pathlib import Path

import amulet
from amulet_nbt import CompoundTag, IntTag, StringTag, load as load_nbt
from amulet.level.formats.anvil_world import AnvilFormat


def parse_version(value: str) -> tuple[int, int, int]:
    parts = value.split(".")
    if len(parts) != 3 or any(not part.isdigit() for part in parts):
        raise argparse.ArgumentTypeError("Java version must look like 1.21.4")
    return int(parts[0]), int(parts[1]), int(parts[2])


def repair_java_metadata(source: Path, destination: Path) -> None:
    bedrock_path = source / "level.dat"
    java_path = destination / "level.dat"
    if not bedrock_path.is_file() or not java_path.is_file():
        raise ValueError("Both Bedrock and Java level.dat files must exist")

    raw = bedrock_path.read_bytes()
    if len(raw) < 8:
        raise ValueError(f"Invalid Bedrock level.dat: {bedrock_path}")
    _, payload_size = struct.unpack_from("<II", raw)
    payload = raw[8 : 8 + payload_size]
    bedrock = load_nbt(payload, compressed=False, little_endian=True).compound
    java = load_nbt(str(java_path))

    data = java.compound.get("Data")
    if not isinstance(data, CompoundTag):
        data = CompoundTag()
        java.compound["Data"] = data

    spawn_x = bedrock.get_int("SpawnX", IntTag()).py_int
    spawn_y = bedrock.get_int("SpawnY", IntTag(64)).py_int
    spawn_z = bedrock.get_int("SpawnZ", IntTag()).py_int
    level_name = bedrock.get_string("LevelName", StringTag("329")).py_str

    data["SpawnX"] = IntTag(spawn_x)
    data["SpawnY"] = IntTag(spawn_y if -64 <= spawn_y <= 320 else 64)
    data["SpawnZ"] = IntTag(spawn_z)
    data["LevelName"] = StringTag(level_name)

    old_path = destination / "level.dat_old"
    if not old_path.exists():
        shutil.copy2(java_path, old_path)
    java.save_to(str(java_path))
    print(f"Updated Java metadata (spawn: {spawn_x}, {spawn_z}; name: {level_name})")


def convert(source: Path, destination: Path, java_version: tuple[int, int, int]) -> None:
    if not (source / "level.dat").is_file() or not (source / "db").is_dir():
        raise ValueError(f"{source} does not look like a Bedrock world")
    if source.resolve() == destination.resolve():
        raise ValueError("The Java output must be different from the Bedrock source")

    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        shutil.rmtree(destination)

    print(f"Loading Bedrock world: {source}")
    level = amulet.load_level(str(source))
    java = AnvilFormat(str(destination))
    try:
        print(f"Creating Java Anvil world: {destination} ({java_version})")
        java.create_and_open("java", java_version, overwrite=True)

        def progress(done: int, total: int) -> None:
            print(f"\rConverting chunks: {done}/{total}", end="", flush=True)

        level.save(wrapper=java, progress_callback=progress)
        print("\nConversion complete.")
        repair_java_metadata(source, destination)
    finally:
        java.close()
        level.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, nargs="?", default=Path("329"))
    parser.add_argument("destination", type=Path, nargs="?", default=Path("output/java-world"))
    parser.add_argument("--java-version", type=parse_version, default=(1, 21, 4))
    parser.add_argument(
        "--metadata-only",
        action="store_true",
        help="repair an existing Java level.dat without converting chunks",
    )
    args = parser.parse_args()
    if args.metadata_only:
        repair_java_metadata(args.source, args.destination)
    else:
        convert(args.source, args.destination, args.java_version)


if __name__ == "__main__":
    main()
