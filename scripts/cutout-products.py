"""Cut the studio backdrop out of the bundled sample product photos.

The samples ship as JPEGs shot on a smooth grey backdrop. On a white flyer card
that backdrop reads as a grey box around the product, so the flyer looks worse
than the artwork around it. This script walks in from the border and keeps any
pixel that is a smooth continuation of the backdrop, then writes an alpha PNG
the flyer can drop straight onto a card.

Run from the project root:

    python scripts/cutout-products.py
"""

from __future__ import annotations

import heapq
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public" / "products"
# Local tolerance between neighbouring pixels. The backdrop is a gradient, so
# this stays small: it crosses the backdrop but stops at the product edge.
LOCAL_TOLERANCE = 45.0
# A pixel this far from the border average never becomes backdrop.
GLOBAL_TOLERANCE = 150.0
WORK_SIZE = 420


def backdrop_mask(rgb: np.ndarray) -> np.ndarray:
    """Flood the backdrop inwards from the border, following the gradient."""
    height, width = rgb.shape[:2]
    filled = np.zeros((height, width), dtype=bool)
    cost = np.full((height, width), np.inf, dtype=np.float32)
    heap: list[tuple[float, int, int]] = []

    border = np.zeros((height, width), dtype=bool)
    border[0, :] = border[-1, :] = True
    border[:, 0] = border[:, -1] = True
    border_colors = rgb[border]
    average = border_colors.mean(axis=0)

    keep = np.linalg.norm(rgb - average, axis=2) <= GLOBAL_TOLERANCE
    ys, xs = np.nonzero(border & keep)
    for y, x in zip(ys.tolist(), xs.tolist()):
        cost[y, x] = 0.0
        heapq.heappush(heap, (0.0, y, x))

    while heap:
        spread, y, x = heapq.heappop(heap)
        if filled[y, x] or spread > cost[y, x]:
            continue
        filled[y, x] = True
        colour = rgb[y, x]
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if ny < 0 or nx < 0 or ny >= height or nx >= width or filled[ny, nx]:
                continue
            if not keep[ny, nx]:
                continue
            step = float(np.linalg.norm(rgb[ny, nx].astype(np.float32) - colour))
            if step > LOCAL_TOLERANCE:
                continue
            spread_step = spread + step
            if spread_step < cost[ny, nx]:
                cost[ny, nx] = spread_step
                heapq.heappush(heap, (spread_step, ny, nx))
    return filled


NEUTRAL_SPREAD = 16.0
SHADOW_DROP = 200.0
SHADOW_MIN_DROP = 10.0
SHADOW_STEP = 40.0
# A cast shadow is grey but still fairly light. Anything darker than this is
# product material, however neutral its colour happens to be.
SHADOW_MIN_LUMINANCE = 115.0
SHADOW_ROUNDS = 400
NEIGHBOURS = (
    (1, 0),
    (-1, 0),
    (0, 1),
    (0, -1),
    (1, 1),
    (1, -1),
    (-1, 1),
    (-1, -1),
)


def grow_shadows(rgb: np.ndarray, filled: np.ndarray) -> np.ndarray:
    """Absorb the studio shadow that sits between the backdrop and the product.

    A cast shadow is grey and darker than the backdrop it touches, while the
    product itself carries colour. Growing one ring at a time keeps the fill
    from jumping across a coloured edge.
    """
    luminance = rgb.mean(axis=2)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    backdrop = float(luminance[filled].mean()) if filled.any() else 255.0
    drop = backdrop - luminance
    for _ in range(SHADOW_ROUNDS):
        nearest = np.full(luminance.shape, np.inf, dtype=np.float32)
        for dy, dx in NEIGHBOURS:
            known = np.roll(filled, (dy, dx), axis=(0, 1))
            shifted = np.roll(rgb, (dy, dx), axis=(0, 1))
            step = np.linalg.norm(shifted - rgb, axis=2)
            nearest = np.where(known, np.minimum(nearest, step), nearest)
        candidate = np.isfinite(nearest) & ~filled
        absorb = (
            candidate
            & (spread < NEUTRAL_SPREAD)
            & (drop > SHADOW_MIN_DROP)
            & (drop < SHADOW_DROP)
            & (nearest < SHADOW_STEP)
            & (luminance > SHADOW_MIN_LUMINANCE)
        )
        if not absorb.any():
            break
        filled = filled | absorb
    return filled


def cut_out(path: Path, target: Path) -> str:
    image = Image.open(path).convert("RGB")
    scale = WORK_SIZE / max(image.size)
    work = (
        image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.LANCZOS,
        )
        if scale < 1
        else image
    )
    small = np.asarray(work, dtype=np.float32)
    mask = grow_shadows(small, backdrop_mask(small))
    coverage = mask.mean()
    if coverage < 0.05 or coverage > 0.965:
        return f"{path.name}: skipped (backdrop coverage {coverage:.0%})"

    alpha_small = Image.fromarray(np.where(mask, 0, 255).astype(np.uint8), "L")
    alpha = (
        alpha_small.resize(image.size, Image.LANCZOS)
        .filter(ImageFilter.MedianFilter(5))
        .filter(ImageFilter.GaussianBlur(0.9))
    )
    out = image.convert("RGBA")
    out.putalpha(alpha)
    out = trim_transparent(out)
    out.save(target, optimize=True)
    return f"{path.name}: {image.width}x{image.height} -> {out.width}x{out.height} ({coverage:.0%} backdrop)"


def trim_transparent(image: Image.Image) -> Image.Image:
    box = image.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not box:
        return image
    pad = 6
    left = max(0, box[0] - pad)
    top = max(0, box[1] - pad)
    right = min(image.width, box[2] + pad)
    bottom = min(image.height, box[3] + pad)
    return image.crop((left, top, right, bottom))


def main() -> int:
    sources = sorted(SOURCE.glob("*.jpg"))
    if not sources:
        print("No sample photos found.", file=sys.stderr)
        return 1
    for path in sources:
        print(cut_out(path, path.with_suffix(".png")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
