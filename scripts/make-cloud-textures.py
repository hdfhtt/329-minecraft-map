#!/usr/bin/env python3
"""Generate a seamless, tiling cloud texture for the viewer's fog-of-war overlay.

Produces one PNG in assets/:
  - clouds-base.png  bright, dense, opaque cloudscape that fills unexplored (void) areas

Pure standard library (no PIL): periodic value-noise fBm guarantees the texture
tiles seamlessly, so adjacent Leaflet grid tiles line up with no visible seam.
"""
import math
import os
import random
import struct
import zlib

# Source grid for the seamless cloud field. The viewer maps this texture across
# a block of tiles (CLOUD_PERIOD in clouds.js) and upscales it with
# image-rendering:pixelated, so each source cell becomes a chunky pixel block.
# At CLOUD_PERIOD=4 the texture spans 4*512 = 2048 screen px at zoom 0, so each
# source cell becomes 2048/SIZE px. SIZE=512 => 4 px blocks — finer than the
# earlier 16 px chunks so the clouds read smoothly rather than as coarse squares,
# while still crisp/blocky under image-rendering:pixelated. The larger grid also
# resolves the higher top octave (~2.7 source px per lattice cell) without grain.
SIZE = 512


def write_png(path, width, height, rgba):
    def chunk(typ, data):
        return (
            struct.pack(">I", len(data))
            + typ
            + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        )

    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0 (None)
        raw.extend(rgba[y * stride:(y + 1) * stride])

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)))
        f.write(chunk(b"IDAT", zlib.compress(bytes(raw), 9)))
        f.write(chunk(b"IEND", b""))


def smoothstep(t):
    return t * t * (3.0 - 2.0 * t)


def octave(size, freq, seed):
    """One octave of periodic value noise (wraps at the lattice period `freq`)."""
    rnd = random.Random(seed)
    grid = [[rnd.random() for _ in range(freq)] for _ in range(freq)]
    out = [[0.0] * size for _ in range(size)]
    scale = size / freq
    for y in range(size):
        gy = y / scale
        iy = int(gy)
        y0, y1, fy = iy % freq, (iy + 1) % freq, smoothstep(gy - iy)
        row = out[y]
        g0, g1 = grid[y0], grid[y1]
        for x in range(size):
            gx = x / scale
            ix = int(gx)
            x0, x1, fx = ix % freq, (ix + 1) % freq, smoothstep(gx - ix)
            top = g0[x0] * (1 - fx) + g0[x1] * fx
            bot = g1[x0] * (1 - fx) + g1[x1] * fx
            row[x] = top * (1 - fy) + bot * fy
    return out


# Start the fractal at a high base frequency so the dominant puffs are small.
# The texture is mapped across CLOUD_PERIOD (4) tiles = 2048 screen px, so a
# base frequency of 48 makes the biggest puff ~43 px on screen — smaller and more
# numerous than the earlier freq-32 (~64 px) clouds. The larger SIZE=512 resolves
# the top octave (192 => ~2.7 source px per lattice cell) so the fine puffs stay
# crisp rather than aliasing into grain. Every freq is an integer so each octave
# wraps seamlessly regardless of the (random) seeds.
FREQS = [48, 96, 192]
AMPS = [1.0, 0.5, 0.25]


def fbm(size, seeds):
    """Fractal sum of periodic octaves at freq 48..192; normalised to [0,1].

    A high base frequency plus finer octaves gives many small, distinct puffs
    rather than one dominant bank. Each octave wraps on its own lattice period,
    so the whole field stays seamless regardless of the (random) seeds."""
    freqs = FREQS
    amps = AMPS
    acc = [[0.0] * size for _ in range(size)]
    for freq, amp, seed in zip(freqs, amps, seeds):
        oct_ = octave(size, freq, seed)
        for y in range(size):
            a, o = acc[y], oct_[y]
            for x in range(size):
                a[x] += o[x] * amp
    total = sum(amps)
    lo = min(min(r) for r in acc)
    hi = max(max(r) for r in acc)
    span = (hi - lo) or 1.0
    for y in range(size):
        r = acc[y]
        for x in range(size):
            r[x] = (r[x] - lo) / span
    return acc


def clamp01(v):
    return 0.0 if v < 0 else 1.0 if v > 1 else v


def build_base(size, seeds):
    noise = fbm(size, seeds)
    # A flat, slightly blueish palette read as blocky Minecraft day clouds:
    # cool-white tops with light-blue steps for shading. Posterizing the noise
    # onto these discrete shades (rather than a smooth gradient) is what gives
    # the chunky, banded pixel look once the texture is upscaled with
    # image-rendering:pixelated. Every shade stays light and opaque so the void
    # reads as dense cloud cover with no dark gaps.
    palette = (
        (240, 245, 253),  # lit cloud top (cool white)
        (220, 230, 246),  # mid (light blue)
        (200, 214, 236),  # soft blue shadow
        (182, 200, 227),  # deepest blue step
    )
    buf = bytearray(size * size * 4)
    i = 0
    steps = len(palette)
    for y in range(size):
        for x in range(size):
            # Bias toward the brighter shades so most of the cover is near-white
            # while still showing visible blue banding for variation. A steeper
            # remap gives the many small puffs crisper edges so the pattern
            # reads clearly at the usual zooms.
            v = clamp01((noise[y][x] - 0.3) / 0.5)
            idx = min(steps - 1, int(v * steps))
            r, g, b = palette[idx]
            buf[i] = r
            buf[i + 1] = g
            buf[i + 2] = b
            buf[i + 3] = 255
            i += 4
    return buf


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    assets = os.path.join(here, "..", "assets")
    # Always random: a fresh system-entropy seed per octave every run, so each
    # regeneration produces a different cloudscape rather than a fixed pattern.
    rng = random.Random()
    seeds = [rng.randrange(1_000_000_000) for _ in FREQS]
    write_png(os.path.join(assets, "clouds-base.png"), SIZE, SIZE, build_base(SIZE, seeds))
    print("Wrote assets/clouds-base.png (seeds: %s)" % ",".join(map(str, seeds)))


if __name__ == "__main__":
    main()
