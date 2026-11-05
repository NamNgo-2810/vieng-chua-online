"""
Props sheet prep (Python).

Cleans each asset's painted grey/white checkerboard background to real
transparency and crops every item out of `assets/object.png` (1408x768). Each
item is saved as its own trimmed PNG. Names are assigned by a stable
(row, col) map derived from the sheet layout, so re-running is deterministic
and does not drift like the old flat-index heuristic.

Sheet layout (row, col):
  row0: incense(0) | censer x4 (1-4) | lotus_pink(5) | lotus_white(6) | lotus_yellow(7)
  row1: basket(0)  | tray(1) | altar(2) | woodfish x5 (3-7)
  row2: bell(0,+mallet) | standbell x3 (3-5) | sutra(6) | beads(7) | cushion(8,9)
  row3: lantern x4 (0-3) | candle x4 (4-7)

The game needs: sutra, incense, tray, woodfish, cushion, bell. We also keep the
decorative extras (lotus, altar, basket, beads, lantern, candle) under clear
names for later use.

Outputs:
  public/assets/props/<name>.png

Prints a JSON name->relative-path map on stdout for the manifest builder.
"""
import json
import os
import numpy as np
from PIL import Image

CHECKER_MIN_BRIGHT = 180
CHECKER_MAX_SAT = 22
MIN_AREA = 700
ROW_TOL = 80

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "object.png")
OUT_DIR = os.path.join(ROOT, "public", "assets", "props")

# Stable (row, col) -> name. Cols that merge (bell + its mallet) are handled by
# gap-merging before indexing, so columns count whole items left-to-right.
NAME_MAP = {
    (0, 0): "incense",
    (0, 1): "censer",
    (0, 5): "lotus_pink",
    (0, 6): "lotus_white",
    (0, 7): "lotus_yellow",
    (1, 0): "basket",
    (1, 1): "tray",
    (1, 2): "altar",
    (1, 3): "woodfish",
    (2, 0): "bell",
    (2, 1): "standing_bell",
    (2, 5): "sutra",
    (2, 6): "beads",
    (2, 7): "cushion",
    (3, 0): "lantern",
    (3, 4): "candle",
}
# Keys the game actually references (config/activities.ts PropKey).
GAME_KEYS = {"sutra", "incense", "tray", "woodfish", "cushion", "bell"}


def background_mask(arr):
    rgb = arr[:, :, :3].astype(np.int32)
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    bg = (mn >= CHECKER_MIN_BRIGHT) & ((mx - mn) <= CHECKER_MAX_SAT)
    if arr.shape[2] == 4:
        bg = bg | (arr[:, :, 3] < 16)
    return bg


def components(fg, min_area):
    h, w = fg.shape
    seen = np.zeros((h, w), dtype=bool)
    boxes = []
    for y in range(h):
        row_fg = fg[y]
        for x in range(w):
            if seen[y, x] or not row_fg[x]:
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
                x0 = min(x0, cx); x1 = max(x1, cx)
                y0 = min(y0, cy); y1 = max(y1, cy)
                for ny, nx in ((cy-1, cx), (cy+1, cx), (cy, cx-1), (cy, cx+1)):
                    if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx]:
                        seen[ny, nx] = True
                        if fg[ny, nx]:
                            stack.append((ny, nx))
            if area >= min_area:
                boxes.append([x0, y0, x1, y1])
    return boxes


def merge_nearby(boxes, max_gap=14):
    """Merge boxes with strong vertical overlap and a small horizontal gap
    (reconnects a tool to its handle, e.g. the hanging bell + mallet)."""
    out = [b[:] for b in boxes]
    changed = True
    while changed:
        changed = False
        for i in range(len(out)):
            for j in range(i + 1, len(out)):
                a, b = out[i], out[j]
                overlap = min(a[3], b[3]) - max(a[1], b[1])
                min_h = min(a[3] - a[1], b[3] - b[1]) + 1
                v_ok = overlap > min_h * 0.5
                h_gap = max(0, max(a[0], b[0]) - min(a[2], b[2]))
                if v_ok and h_gap <= max_gap:
                    out[i] = [min(a[0], b[0]), min(a[1], b[1]),
                              max(a[2], b[2]), max(a[3], b[3])]
                    out.pop(j)
                    changed = True
                    break
            if changed:
                break
    return out


def group_rows(boxes, tol=ROW_TOL):
    rows = []
    for b in sorted(boxes, key=lambda b: (b[1] + b[3]) / 2):
        cy = (b[1] + b[3]) / 2
        placed = False
        for r in rows:
            if abs(r["cy"] - cy) <= tol:
                r["items"].append(b)
                r["cy"] = (r["cy"] * (len(r["items"]) - 1) + cy) / len(r["items"])
                placed = True
                break
        if not placed:
            rows.append({"cy": cy, "items": [b]})
    for r in rows:
        r["items"].sort(key=lambda b: b[0])
    return [r["items"] for r in rows]


def crop_clean(arr, bg, box, pad=2):
    x0, y0, x1, y1 = box
    w = x1 - x0 + 1 + pad * 2
    h = y1 - y0 + 1 + pad * 2
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[pad:pad+(y1-y0+1), pad:pad+(x1-x0+1), :3] = arr[y0:y1+1, x0:x1+1, :3]
    out[pad:pad+(y1-y0+1), pad:pad+(x1-x0+1), 3] = np.where(bg[y0:y1+1, x0:x1+1], 0, 255)
    return Image.fromarray(out, "RGBA")


def main():
    img = Image.open(SRC).convert("RGBA")
    arr = np.array(img)
    bg = background_mask(arr)
    boxes = merge_nearby(components(~bg, MIN_AREA))
    rows = group_rows(boxes)

    os.makedirs(OUT_DIR, exist_ok=True)
    # Clean stale PNGs so output stays tidy and deterministic.
    for f in os.listdir(OUT_DIR):
        if f.endswith(".png"):
            os.remove(os.path.join(OUT_DIR, f))

    name_map = {}
    used = {}
    for ri, row in enumerate(rows):
        for ci, box in enumerate(row):
            base = NAME_MAP.get((ri, ci))
            if base is None:
                name = f"extra_r{ri}c{ci}"
            else:
                # Allow repeated columns (censer x4 etc.) to number themselves.
                n = used.get(base, 0)
                used[base] = n + 1
                name = base if n == 0 else f"{base}_{n+1}"
            sprite = crop_clean(arr, bg, box)
            rel = f"props/{name}.png"
            sprite.save(os.path.join(OUT_DIR, f"{name}.png"))
            # Only the first instance of a game key goes in the manifest map.
            if base in GAME_KEYS and base not in name_map:
                name_map[base] = rel

    print(json.dumps(name_map))


if __name__ == "__main__":
    main()
