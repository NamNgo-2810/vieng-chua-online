# Character Art Spec — Gemini Prompts

> **Superseded for characters (2026-11-13).** The owner chose the code-drawn
> style (`src/game/sprite-painter.ts`) for every character, including the monk,
> after seeing it in play. These prompts are kept only as a record and in case
> painted characters are wanted again; do not slice new character sheets
> without asking.

> Source of truth for the character sheets the game needs. Generate each sheet in
> Gemini, save it into `assets/` with the file name below, and ask Claude to wire
> it into `scripts/prep_characters.py`. Until a sheet exists, the game draws a
> code-made placeholder for it (`src/game/placeholder-sprites.ts`).
>
> Brief: `design/game-brief.md` (Features: all roles and activities; visitor looks).
> Style anchor: `assets/monk_senior.png` (the existing Hòa thượng sheet).

## Why

Today one sheet (`assets/monk_senior.png`) is recoloured for all three roles, so
the Abbot and the lay Visitor both look like the same monk, and five activities
(Offering, Wooden fish, Ring bell, Listening, Praying) have no pose at all.

## The sheets

| File (in `assets/`) | Character | Role | Status |
|---|---|---|---|
| `monk_senior.png` | Hòa thượng — senior monk, ochre/brown robe | HOA_THUONG | exists (walk, idle, meditation, chanting, incense) |
| `monk_senior_extra.png` | same monk, the 5 missing poses only | HOA_THUONG | **needed** |
| `abbot.png` | Trụ trì — elder abbot | TRU_TRI | **needed** |
| `lay_woman.png` | lay Buddhist woman | KHACH_THAP_PHUONG (look: woman) | **needed** |
| `lay_man.png` | lay Buddhist man | KHACH_THAP_PHUONG (look: man) | **needed** |
| `lay_elder.png` | elderly lay person | KHACH_THAP_PHUONG (look: elder) | **needed** |
| `lay_child.png` | child | KHACH_THAP_PHUONG (look: child) | **needed** |

## Layout every full sheet follows

Gemini does not place sprites on an exact grid, so the layout is described in rows;
the slicing script finds each sprite by its position. Keep **clear empty space
between sprites** and **no sprite touching another**.

- Canvas: wide landscape, about **1408 × 768**.
- Background: **light grey and white checkerboard** (the script keys it out), or real transparency.
- Every figure: same size, full body, feet on a common baseline per row, front-lit, **no text, no labels, no speech bubbles**.

| Row | Content (left → right) |
|---|---|
| 1 | Idle standing: facing down (front), up (back), left, right — 4 sprites |
| 2 | Walk: down step A, down step B, up step A, up step B — 4 sprites |
| 3 | Walk: left step A, left step B, right step A, right step B — 4 sprites |
| 4 | Activities, facing front, one sprite each: **Chanting** (seated, open sutra book) · **Offer incense** (standing, both hands raising three lit incense sticks, thin smoke) · **Offering** (standing, holding a tray of fruit and flowers at chest height) · **Wooden fish** (seated, striking a red wooden fish with a small mallet) · **Meditation** (seated cross-legged, hands in lap, eyes closed) |
| 5 | Activities, facing front: **Ring bell** (standing side-on, swinging a wooden striker forward with both hands) · **Listening** (seated, hands resting on knees, eyes open, calm) · **Praying** (standing, palms pressed together at the chest, head slightly bowed) · **Bow** (standing, palms together, bowing forward ~30°) · **Wave / greet** (standing, one hand raised) |

Rows 4–5 are 10 sprites; *Bow* and *Wave* are greetings for the social features.

## Shared style block

Paste this at the start of every prompt:

> Pixel-art sprite sheet for a cozy 2D top-down game set in a Vietnamese Buddhist
> pagoda. Chunky, clean pixel art with a dark brown outline, soft warm shading,
> limited earthy palette, chibi proportions (big head, small body, about 2.5 heads
> tall), gentle peaceful expressions. Match the style of the attached reference
> sheet exactly. Plain light grey and white checkerboard background. Every sprite
> the same size, separated by generous empty space, none overlapping. No text, no
> labels, no UI, no speech bubbles.

**Always attach `assets/monk_senior.png` as the style reference.**

## Prompts

### `monk_senior_extra.png` — Hòa thượng, missing poses

> [style block] The same senior monk as the reference: shaved head, ochre-brown
> robe exactly as in the reference. One row of 7 sprites, all facing the viewer:
> 1) standing, holding a tray of fruit and flowers at chest height;
> 2) seated cross-legged, striking a red wooden fish (mõ) on the floor with a small mallet;
> 3) standing side-on, swinging a wooden striker forward with both hands as if ringing a large temple bell (do not draw the bell);
> 4) seated cross-legged, hands resting on knees, eyes open, listening calmly;
> 5) standing, palms pressed together at the chest, head slightly bowed, praying;
> 6) standing, palms together, bowing forward;
> 7) standing, one hand raised in a friendly greeting.

### `abbot.png` — Trụ trì (Abbot)

> [style block] An elderly Vietnamese Buddhist abbot: shaved head, kind wrinkled
> face, long white eyebrows, wearing a bright saffron-yellow robe with a deep red
> kasaya draped over the left shoulder, a string of dark wooden prayer beads
> around the neck. Dignified, warm. Use this exact layout: [paste the 5-row layout
> table above as text].

### `lay_woman.png` — Visitor, woman

> [style block] A Vietnamese lay Buddhist woman visiting the pagoda: dark hair in a
> low bun, wearing a plain grey áo tràng (long loose lay Buddhist robe, ankle
> length, wide sleeves) over dark trousers, simple sandals. Gentle, respectful.
> Use this exact layout: [layout].

### `lay_man.png` — Visitor, man

> [style block] A Vietnamese lay Buddhist man visiting the pagoda: short black
> hair, wearing a plain brown áo tràng (long loose lay Buddhist robe, wide sleeves)
> over dark trousers, simple sandals. Calm, respectful. Use this exact layout:
> [layout].

### `lay_elder.png` — Visitor, elder

> [style block] An elderly Vietnamese lay Buddhist visitor: white hair in a small
> bun, slightly stooped, wearing a light grey áo tràng, holding a short wooden
> walking stick in the idle and walk sprites (put the stick down for activity
> poses). Serene, kind. Use this exact layout: [layout].

### `lay_child.png` — Visitor, child

> [style block] A Vietnamese child of about 8 visiting the pagoda with family:
> short black hair, wearing a small light-brown áo tràng, simple sandals. Smaller
> than the adults (about 80% of their height), curious and polite. Use this exact
> layout: [layout].

## Checklist before handing a sheet over

- [ ] All sprites present in the right rows, none touching
- [ ] Same character in every sprite (face, robe, colours)
- [ ] Checkerboard or transparent background, no text anywhere
- [ ] Walk steps A and B visibly differ (legs)
- [ ] Saved as PNG in `assets/` with the exact file name above

## After the art arrives

`scripts/prep_characters.py` currently slices one sheet with hand-measured row
and column centres. Each new sheet needs its own centres measured
(`scripts/inspect_sheet.py`) and an output folder under
`public/assets/characters/<look>/`; then `npm run assets:prep` regenerates the
manifest, and real art replaces the placeholder for that look automatically.
