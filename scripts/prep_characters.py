"""
Character sheet prep (Python).

Replaces the fragile "one detected row == one activity" heuristic that
mis-assigned seated poses. The Gemini sheet `assets/monk_senior.png`
(1408x768) is laid out as two halves:

  LEFT HALF  (movement, 4-col grid)  -- each facing has a 2-frame step, NOT a
                                        single 4-frame same-facing cycle.
    row0: idle      down | up(back) | left | right
    row1: walk      down0 | down1 | up0 | up1
    row2: walk      left0 | left1 | right0 | right1
    row3: walk      mixed (unused)

  RIGHT HALF (seated activities, 5-col grid)
    row0: MEDITATION (eyes open)
    row1: MEDITATION (eyes closed)
    row2: CHANTING   (reading sutra, cols 0-1 have book) | seated variants
    row3: OFFER_INCENSE (holding incense stick w/ smoke)

We detect sprite components by keying out the painted grey/white checkerboard,
assign each component to a (row, col) grid cell by its center, then pull the
exact cell each activity needs. Cells are cropped tight, keyed to real
transparency, and normalized into a 64x64 cell (bottom-center anchored).

Outputs:
  public/assets/characters/hoa_thuong/walk.png          (4-frame strip)
  public/assets/characters/hoa_thuong/meditation.png
  public/assets/characters/hoa_thuong/chanting.png
  public/assets/characters/hoa_thuong/offer_incense.png

Returns a JSON atlas on stdout for the manifest builder (prep_assets.py).
"""
import json
import os
import numpy as np
from PIL import Image

CELL = 64
CHECKER_MIN_BRIGHT = 180
CHECKER_MAX_SAT = 22
MIN_AREA = 800

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "monk_senior.png")
OUT_DIR = os.path.join(ROOT, "public", "assets", "characters", "hoa_thuong")

# Row center Y and column center X for each half (from inspect_sheet.py).
ROWS_Y = [88, 273, 489, 693]
LEFT_X = [73, 223, 370, 519]
RIGHT_X = [770, 912, 1046, 1190, 1330]


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
                boxes.append((x0, y0, x1, y1))
    return boxes


def nearest_index(value, centers, tol):
    best, bi = tol, -1
    for i, c in enumerate(centers):
        d = abs(value - c)
        if d < best:
            best, bi = d, i
    return bi


def assign_grid(boxes):
    """Map each box to ('L'|'R', row, col). Returns dict[(side,row,col)] = box,
    merging multiple boxes that land on the same cell (e.g. prop + body)."""
    grid = {}
    for (x0, y0, x1, y1) in boxes:
        cx = (x0 + x1) / 2
        cy = (y0 + y1) / 2
        ri = nearest_index(cy, ROWS_Y, 110)
        if ri < 0:
            continue
        if cx < 620:
            side, ci = "L", nearest_index(cx, LEFT_X, 90)
        elif cx > 680:
            side, ci = "R", nearest_index(cx, RIGHT_X, 90)
        else:
            continue
        if ci < 0:
            continue
        key = (side, ri, ci)
        if key in grid:
            a = grid[key]
            grid[key] = (min(a[0], x0), min(a[1], y0), max(a[2], x1), max(a[3], y1))
        else:
            grid[key] = (x0, y0, x1, y1)
    return grid


def crop(arr, bg, box, pad=2):
    x0, y0, x1, y1 = box
    w = x1 - x0 + 1 + pad * 2
    h = y1 - y0 + 1 + pad * 2
    out = np.zeros((h, w, 4), dtype=np.uint8)
    sub = arr[y0:y1+1, x0:x1+1, :3]
    subbg = bg[y0:y1+1, x0:x1+1]
    out[pad:pad+(y1-y0+1), pad:pad+(x1-x0+1), :3] = sub
    out[pad:pad+(y1-y0+1), pad:pad+(x1-x0+1), 3] = np.where(subbg, 0, 255)
    return Image.fromarray(out, "RGBA")


def normalize_cell(sprite, cell=CELL):
    """Scale to fit cell x cell, nearest-neighbour, bottom-center anchored."""
    sw, sh = sprite.width, sprite.height
    scale = min(cell / sw, cell / sh)
    dw = max(1, round(sw * scale))
    dh = max(1, round(sh * scale))
    resized = sprite.resize((dw, dh), Image.NEAREST)
    canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    off_x = (cell - dw) // 2
    off_y = cell - dh
    canvas.paste(resized, (off_x, off_y), resized)
    return canvas


def main():
    img = Image.open(SRC).convert("RGBA")
    arr = np.array(img)
    bg = background_mask(arr)
    boxes = components(~bg, MIN_AREA)
    grid = assign_grid(boxes)

    os.makedirs(OUT_DIR, exist_ok=True)

    def cell_img(side, row, col):
        box = grid.get((side, row, col))
        if box is None:
            raise SystemExit(f"[chars] missing grid cell {side}{row},{col}")
        return normalize_cell(crop(arr, bg, box))

    atlas = {}

    # WALKING: this sheet has no single same-facing 4-frame cycle. Instead each
    # direction has a 2-frame step. Build an 8-frame strip in a FIXED order so
    # the scene can play a per-direction 2-frame animation (no runtime flipping,
    # which previously made the monk appear to turn left/right mid-stride).
    #
    #   frames:  0,1 = down   2,3 = up   4,5 = left   6,7 = right
    #
    # Source cells (left half): down = L1,0/L1,1 ; up = L1,2/L1,3 ;
    #                           left = L2,0/L2,1 ; right = L2,2/L2,3.
    walk_order = [
        ("L", 1, 0), ("L", 1, 1),  # down
        ("L", 1, 2), ("L", 1, 3),  # up
        ("L", 2, 0), ("L", 2, 1),  # left
        ("L", 2, 2), ("L", 2, 3),  # right
    ]
    walk_cells = [cell_img(*k) for k in walk_order]
    strip = Image.new("RGBA", (CELL * len(walk_cells), CELL), (0, 0, 0, 0))
    for i, c in enumerate(walk_cells):
        strip.paste(c, (i * CELL, 0), c)
    strip.save(os.path.join(OUT_DIR, "walk.png"))
    atlas["WALKING"] = {
        "file": "characters/hoa_thuong/walk.png",
        "frameWidth": CELL, "frameHeight": CELL, "frames": len(walk_cells),
    }
    # Per-direction frame ranges [start, end] into the strip above.
    walk_dirs = "down:0-1,up:2-3,left:4-5,right:6-7"

    # MEDITATION: seated, hands in lap (right half, row 0, center column).
    cell_img("R", 0, 0).save(os.path.join(OUT_DIR, "meditation.png"))
    atlas["MEDITATION"] = {
        "file": "characters/hoa_thuong/meditation.png",
        "frameWidth": CELL, "frameHeight": CELL, "frames": 1,
    }

    # CHANTING: reading the sutra (right half, row 2, col 0 has the open book).
    cell_img("R", 2, 0).save(os.path.join(OUT_DIR, "chanting.png"))
    atlas["CHANTING"] = {
        "file": "characters/hoa_thuong/chanting.png",
        "frameWidth": CELL, "frameHeight": CELL, "frames": 1,
    }

    # OFFER_INCENSE: holding incense stick with smoke (right half, row 3).
    cell_img("R", 3, 0).save(os.path.join(OUT_DIR, "offer_incense.png"))
    atlas["OFFER_INCENSE"] = {
        "file": "characters/hoa_thuong/offer_incense.png",
        "frameWidth": CELL, "frameHeight": CELL, "frames": 1,
    }

    print(json.dumps({"atlas": atlas, "walkDirs": walk_dirs}))


if __name__ == "__main__":
    main()
