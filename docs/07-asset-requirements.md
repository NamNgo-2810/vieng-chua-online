# Asset Requirements & Mapping

Status: Draft for approval · Last updated: 2026-11-05

The user supplies all pixel-art via Gemini. Kiro will **not** generate
replacement artwork. Until final PNGs arrive, the game uses placeholders. An
asset-manifest config lets assets be swapped without touching game logic.

---

## 1. Directory layout (planned)

```
public/assets/
  characters/
    tru_tri/           sprite sheet(s) per activity
    hoa_thuong/
    khach_thap_phuong/
  tileset/
    temple-tileset.png
  background/
    temple-bg.png
  props/
    incense.png
    flowers.png
    fruits.png
    altar.png
    wooden-fish.png
    bell.png
  ui/
    icon-music.png icon-sound.png icon-settings.png ...
  audio/
    ambient-loop.(mp3|ogg)
    sfx-incense.* sfx-bell.* sfx-woodfish.* ...
  placeholders/        temporary stand-ins (shipped, clearly marked)
```

## 1b. Actual provided assets (reviewed 2026-11-05)

Files now in `/assets` at the repo root, with their real dimensions and contents:

| File | Size (px) | What it actually is |
| ---- | --------- | ------------------- |
| `background.png` | 1376×768 | **Finished temple scene** — a complete, hand-composed backdrop (roof, pillars, courtyard, altars, pond, trees). Ready to use as the static background; NOT a tileset. |
| `environment.png` | 1408×768 | **Mixed atlas** — ground tiles (top band), building parts (roof/wall/door/pillar/altar), and decoration props (incense, vases, fruit, bell, fish, lanterns, benches, trees, lotus). Irregular layout. |
| `object.png` | 1408×768 | **Ritual-prop atlas** — incense + burners, lotus, flower basket, fruit tray, altar, **wooden-fish frames**, **bell frames**, sutra book, prayer beads, cushion, lanterns, **candle frames**. Irregular layout. |
| `monk_senior.png` | 1408×768 | **Senior Monk character sheet** — walk cycles (4 directions), meditation, chanting/reading, incense-offering poses. Roughly an 8-column grid but NOT pixel-aligned (see §8). |
| `Morning_at_the_Pagoda.mp3` | — | Ambient loop candidate (approved for use for now). |

### Key findings
- There is **one character sheet** (Senior Monk / `HOA_THUONG`). The **Abbot
  (TRU_TRI)** and **Visitor (KHACH_THAP_PHUONG)** sheets are **not yet provided**
  → placeholders needed (R15).
- `background.png` is a **finished scene**, not tiles. v1 can simply render it as
  the backdrop and place players/props on top, which is simpler than building a
  tilemap. `environment.png` tiles are available if we later want a tilemap.
- The sheets are **not on a clean uniform grid** with transparent gutters — an
  alpha-gutter scan found no clean cell boundaries (soft shadows bleed across
  cells, poses vary in width). A normalization/slicing step is required (§8).

## 2. Expected assets

| Category        | Asset                               | Notes                         |
| --------------- | ----------------------------------- | ----------------------------- |
| Characters      | Sprite sheet per role               | frames per activity + walk    |
| Temple tileset  | `temple-tileset.png`                | grid tiles for floor/walls    |
| Background      | `temple-bg.png`                     | static backdrop               |
| Props           | incense, flowers, fruits, altar     | altar objects                 |
| Props           | wooden fish, bell                   | ritual objects                |
| UI icons        | music, sound, settings, activities  | HUD                           |
| Audio           | ambient loop + activity SFX         | seamless loop                 |

## 3. Sprite sheet convention (proposed, adjustable)

- Fixed frame size (e.g. 48×48 or 64×64), power-of-two sheet dimensions.
- Rows = activity/direction; columns = animation frames.
- Each role sheet covers: walk (4 directions) + one loop per permitted activity.
- A JSON atlas (or uniform grid metadata) accompanies each sheet so frames are
  addressed by name, not pixel math scattered through code.

## 4. Asset manifest (planned)

A single source of truth mapping logical keys → files + frame metadata:

```ts
// config/asset-manifest.ts
export const ASSET_MANIFEST = {
  characters: {
    TRU_TRI: {
      sheet: "/assets/characters/tru_tri/sheet.png",
      frameWidth: 64, frameHeight: 64,
      animations: {
        WALKING: { row: 0, frames: 4, fps: 6 },
        CHANTING: { row: 1, frames: 4, fps: 4 },
        // ...
      },
    },
    // HOA_THUONG, KHACH_THAP_PHUONG ...
  },
  props: {
    incense: "/assets/props/incense.png",
    bell: "/assets/props/bell.png",
    // ...
  },
  background: "/assets/background/temple-bg.png",
  tileset: "/assets/tileset/temple-tileset.png",
  ui: { music: "/assets/ui/icon-music.png", /* ... */ },
  audio: {
    ambient: "/assets/audio/ambient-loop.mp3",
    sfx: { incense: "/assets/audio/sfx-incense.mp3", /* ... */ },
  },
} as const;
```

Swapping artwork = edit the manifest paths / frame metadata. Game code reads
only logical keys (`ASSET_MANIFEST.characters[role].animations[activity]`).

## 5. Placeholder policy

- Ship simple, clearly-marked placeholder PNGs (flat-color silhouettes, labeled
  tiles) so the game runs end-to-end before final art lands.
- Placeholders obey the same frame/size convention so the swap is a path change.
- No copyrighted material; placeholders are trivial generated shapes, not art.

## 6. Audio policy

- Ambient track must loop seamlessly and only start after a user gesture.
- Provide `.mp3` plus `.ogg` where feasible for browser coverage.
- SFX short and non-overlapping-harsh; respect the global mute/volume.
- Do not use copyrighted recordings without permission. `Morning_at_the_Pagoda.mp3`
  will be treated as user-provided/licensed by the user.

## 8. Asset slicing & normalization plan (Kiro to execute)

Because the Gemini sheets are not on a clean grid, Kiro will do a one-time
**asset-prep pass** to turn raw sheets into predictable, manifest-addressable
frames. Output goes to `public/assets/...`; originals in `/assets` stay untouched.

Steps:
1. **Characters (`monk_senior.png`):** detect sprite bounding boxes by alpha
   connected-components, normalize each pose into a uniform padded cell
   (target **64×64** display box, upscaled from source as needed), and emit a
   JSON atlas keyed by `direction`/`activity`. Rows observed: walk (down/side/
   up/variants), meditation, chanting/reading, incense-offering.
2. **Props (`object.png` / `environment.png`):** slice individual objects by
   bounding box into named PNGs (incense, bell[frames], woodfish[frames],
   candle[frames], lotus, tray, cushion, book, beads, vases, lanterns, benches,
   trees). Multi-frame items (bell, wooden fish, candles) become small atlases.
3. **Background:** use `background.png` directly as the scene backdrop.
4. **Tiles:** slice the top band of `environment.png` into a tileset only if we
   choose the tilemap path later; v1 uses the finished background.
5. **Missing character art (TRU_TRI, KHACH_THAP_PHUONG):** generate simple,
   clearly-marked **placeholders** at the same 64×64 convention so all three
   roles work end-to-end. These are trivial recolors/silhouettes, not finished
   art — to be replaced by user-provided Gemini sheets via the manifest.
6. **Manifest:** write every produced frame/atlas path + metadata into
   `config/asset-manifest.ts` so game code never hardcodes pixel coordinates.

Standardized convention: **64×64 display cell**, origin bottom-center for
characters, 4-direction walk + one loop per activity.

## 9. Open questions (remaining)

- For the two missing roles (Abbot, Visitor), OK to ship recolored-monk
  placeholders until you generate their sheets? (Assumed yes.)
- Any preferred visual distinction for the Abbot vs Senior Monk (robe color)?
