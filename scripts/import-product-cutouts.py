"""Import AI-generated product cutouts into ``public/products``.

The bundled sample library ships transparent PNGs so a product photo does not
show a grey box on a flyer card. Generating a new batch produces square images
with a real alpha channel but a lot of empty margin, which wastes bytes and
makes the product look small on the card.

This script trims the transparent border, scales the artwork down to a
flyer-friendly size and writes ``public/products/<id>.png``.

Run from the project root after dropping a batch of generated PNGs into a
folder:

    python scripts/import-product-cutouts.py --source <folder-with-pngs>

``--source`` is expected to hold the batch in generation order, matching the
product ids listed in ``BATCH`` below. Pass ``--dry-run`` to see what would be
written.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "public" / "products"

# Longest edge of the finished cutout. Big enough for a large flyer card,
# small enough that the whole sample library stays light.
TARGET_EDGE = 620
# Transparent breathing room kept around the product in the final image.
PADDING = 14

# Product id -> filename stem inside the source folder, in generation order.
# The generated files carry opaque call ids, so the mapping lives here.
BATCH: list[tuple[str, str]] = [
    ("milk", "call_00_GNU1OgLWnfExX5ce6YMP4633"),
    ("yogurt", "call_00_GCt75wLAFMsQt4pKXD8p9145"),
    ("cheese", "call_01_qvTYYfXWJG16Hx9iSyox9183"),
    ("orange-juice", "call_02_YJz56XKKmGHo6avdvBET1047"),
    ("soft-drinks", "call_00_GByDd6JLcd9rZiSqJpjy9123"),
    ("water", "call_01_lsYgUXaiQiLSgg0jwzU66368"),
    ("chips", "call_02_RZMTygebAOL7aIlIU6Gd6923"),
    ("cookies", "call_03_M2H6SGA1v7mjZ3E4gELN4319"),
    ("chocolate", "call_00_gNpTqe9a1RXyh2PfHQgZ8210"),
    ("coffee", "call_01_2Rqw9xrtyBUJM44vWuQr4214"),
    ("cooking-oil", "call_02_IdMfr2GzE2aLZpy75dDP4200"),
    ("rice", "call_03_t5QefGopZ2Yd8Cw4go6H7422"),
    ("sugar", "call_00_vY4UatizZ5zINTyTFe308003"),
    ("pasta", "call_01_mQ7f3AT5wKVc2bHUVkN37201"),
    ("detergent", "call_02_LZN16C89EoJBVyQGqFKs7057"),
    ("dish-soap", "call_03_5kGI1uApet7j6p00ns057741"),
    ("tissues", "call_00_3koPuJEVq5SJF0gUGULD1513"),
    ("shampoo", "call_01_kTomk37p86yXvPD4TKin9937"),
    ("toothpaste", "call_02_QK1ZaJdwsFhzToEFHnQ22146"),
    ("soap", "call_03_dWwSvL0w4cyP350Pz08x6548"),
]


def trim_alpha(image: Image.Image, threshold: int = 8) -> Image.Image:
    box = image.getchannel("A").point(lambda v: 255 if v > threshold else 0).getbbox()
    return image.crop(box) if box else image


def fit(image: Image.Image, edge: int) -> Image.Image:
    scale = edge / max(image.size)
    if scale >= 1:
        return image
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.LANCZOS)


def process(source: Path, target: Path, dry_run: bool) -> str:
    image = Image.open(source).convert("RGBA")
    trimmed = fit(trim_alpha(image), TARGET_EDGE)
    canvas = Image.new(
        "RGBA", (trimmed.width + PADDING * 2, trimmed.height + PADDING * 2), (0, 0, 0, 0)
    )
    canvas.paste(trimmed, (PADDING, PADDING))
    if not dry_run:
        canvas.save(target, optimize=True)
    return f"{target.name}: {image.size} -> {canvas.size}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not BATCH:
        print("BATCH is empty; add the generated batch to the script first.", file=sys.stderr)
        return 1

    OUTPUT.mkdir(parents=True, exist_ok=True)
    missing = 0
    for product_id, stem in BATCH:
        source = args.source / f"{stem}.png"
        if not source.exists():
            print(f"{stem}.png: missing in {args.source}", file=sys.stderr)
            missing += 1
            continue
        print(process(source, OUTPUT / f"{product_id}.png", args.dry_run))
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
