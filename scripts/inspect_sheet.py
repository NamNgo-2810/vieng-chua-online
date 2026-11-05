"""
Diagnostic: detect sprite bounding boxes on a Gemini sheet by keying out the
painted grey/white checkerboard, then group them into rows. Prints the grid so
we can map regions -> activities/props precisely before committing to a crop.

Usage: python scripts/inspect_sheet.py assets/monk_senior.png
"""
import sys
import numpy as np
from PIL import Image


CHECKER_MIN_BRIGHT = 180
CHECKER_MAX_SAT = 22
MIN_AREA = 600


def background_mask(arr: np.ndarray) -> np.ndarray:
    """True where pixel is the painted checkerboard (bright + low saturation)."""
    rgb = arr[:, :, :3].astype(np.int32)
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    # If there is a real alpha channel, respect it too.
    bg = (mn >= CHECKER_MIN_BRIGHT) & ((mx - mn) <= CHECKER_MAX_SAT)
    if arr.shape[2] == 4:
        bg = bg | (arr[:, :, 3] < 16)
    return bg


def components(fg: np.ndarray, min_area: int):
    """Simple iterative flood-fill connected components (4-neighbour)."""
    h, w = fg.shape
    seen = np.zeros((h, w), dtype=bool)
    boxes = []
    for y in range(h):
        for x in range(w):
            if seen[y, x] or not fg[y, x]:
                seen[y, x] = True
                continue
            stack = [(y, x)]
            seen[y, x] = True
            x0 = x1 = x
            y0 = y1 = y
            area = 0
            while stack:
                cy, cx = stack.pop()
                area += 1
                if cx < x0:
                    x0 = cx
                if cx > x1:
                    x1 = cx
                if cy < y0:
                    y0 = cy
                if cy > y1:
                    y1 = cy
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx]:
                        seen[ny, nx] = True
                        if fg[ny, nx]:
                            stack.append((ny, nx))
            if area >= min_area:
                boxes.append((x0, y0, x1, y1, area))
    return boxes


def group_rows(boxes, row_tol=70):
    rows = []
    for b in sorted(boxes, key=lambda b: (b[1] + b[3]) / 2):
        cy = (b[1] + b[3]) / 2
        placed = False
        for r in rows:
            if abs(r["cy"] - cy) <= row_tol:
                r["items"].append(b)
                r["cy"] = (r["cy"] * (len(r["items"]) - 1) + cy) / len(r["items"])
                placed = True
                break
        if not placed:
            rows.append({"cy": cy, "items": [b]})
    for r in rows:
        r["items"].sort(key=lambda b: b[0])
    return rows


def main():
    path = sys.argv[1]
    img = Image.open(path).convert("RGBA")
    arr = np.array(img)
    print(f"image: {path}  size={img.width}x{img.height}")
    bg = background_mask(arr)
    fg = ~bg
    boxes = components(fg, MIN_AREA)
    rows = group_rows(boxes)
    print(f"{len(boxes)} components in {len(rows)} rows")
    for ri, r in enumerate(rows):
        print(f"\n-- row {ri}  cy={r['cy']:.0f}  n={len(r['items'])}")
        for ci, (x0, y0, x1, y1, area) in enumerate(r["items"]):
            print(
                f"   [{ri},{ci}] x={x0:4d}-{x1:4d} ({x1-x0+1:3d}w) "
                f"y={y0:4d}-{y1:4d} ({y1-y0+1:3d}h) area={area}"
            )


if __name__ == "__main__":
    main()
