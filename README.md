# Chùa Online — Virtual Pagoda

A peaceful, cozy 2D pixel-art multiplayer virtual Buddhist temple. Visitors enter
one shared temple, pick a name, and share quiet activities (chanting, offering
incense, offering gifts) in real time — no account registration required.

Built with **Next.js (App Router) + TypeScript + React + Phaser 3 + Tailwind +
Firebase Realtime Database**. Visitor history is logged to **Google Sheets** via
a Vercel serverless route (free-tier friendly). Full planning lives in
[`docs/`](./docs).

---

## Features

- One shared temple; real-time presence, movement, and activity sync.
- Anonymous Firebase auth — just type a name and enter.
- Top-down pixel-art temple (altar, incense burner, bell, wooden fish,
  offerings, bonsai) with ambient incense smoke and pulsing lantern glow.
- Per-direction walk animation; smooth remote-player interpolation.
- Looping ambient music + synthesized activity sound effects, with
  **independent music and SFX volume** controls. Music never restarts when you
  change activity.
- Mobile support: on-screen D-pad, touch-friendly activity buttons, no
  accidental page scroll/zoom over the canvas.
- Graceful **offline mode** when Firebase isn't configured, so the scene is
  always explorable.
- Google Sheets history (JOIN / ACTIVITY_CHANGE / LEAVE) with idempotent writes
  that never block gameplay if Sheets is down.

## Controls

- **Desktop:** WASD or arrow keys to move. Click an activity button to switch.
- **Mobile:** drag the on-screen D-pad (bottom-left) to move; tap activity
  buttons. Audio/settings are top-right.

---

## Run locally

```bash
npm install
npm run build
npm run start:lan            # prints the addresses friends can open
```

Without Firebase settings the app runs in **local mode**: this machine's
server holds the shared temple, and friends on the same Wi-Fi/LAN join by
opening `http://<this machine's IP>:3000` (printed at start). No accounts or
cloud services are needed.

- **Saved data** (in `./data/`, git-ignored):
  - `temple.json` — temple merit, each browser's merit and streak, recent chat
  - `activity-logs.csv` — every JOIN / ACTIVITY_CHANGE / LEAVE (same columns as the Sheets "Activity Logs")
  - `visitors.csv` — one row per visit with joined/left/duration (same as the Sheets "Visitors")
- **Windows firewall:** the first time, allow Node.js on *Private networks*,
  or friends will not be able to connect.
- The server checks every action (ritual places, merit, chat limits, gates),
  so a friend's browser cannot fake merit.
- A browser's merit is tied to that browser (kept in its local storage);
  clearing site data starts it fresh.
- `npm run dev:lan` does the same with the dev server (hot reload).

To use **Firebase** instead (internet multiplayer), copy `.env.example` to
`.env.local` and fill in `NEXT_PUBLIC_FIREBASE_*`. `NEXT_PUBLIC_BACKEND` can
force `local`, `firebase` or `offline` (single-player demo).

## Scripts

| Script | What it does |
| ------ | ------------ |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run start:lan` | Serve the build to your network (local mode); prints LAN addresses |
| `npm run dev:lan` | Dev server reachable from your network |
| `npm run rules:gen` | Regenerate the config-derived parts of `database.rules.json` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run assets:prep` | Slice `/assets/*.png` sheets → `/public/assets` + manifest |

## Testing

```bash
npm test
```

The suite (50 tests, in `tests/`) covers presence reconciliation and stale
cleanup, duplicate-session takeover, activity switching and invalid-activity
rejection, name/role/activity validation, Google Sheets idempotency and
failure-isolation, per-session rate limiting, and the `/api/history` route
(400/401/429/200).

For things only a human can confirm — two browser windows syncing, disconnect,
reconnect, mobile touch — follow
[`docs/10-manual-testing-guide.md`](./docs/10-manual-testing-guide.md).

---

## Configuration

### Firebase (optional — internet multiplayer)
1. Create a Firebase project; enable **Anonymous Authentication** and the
   **Realtime Database**.
2. Copy the web config into `.env.local` (`NEXT_PUBLIC_FIREBASE_*`).
3. Deploy the security rules: `firebase deploy --only database` (uses
   `database.rules.json`).

Firebase **Spark (free)** is enough — anonymous auth + RTDB only.

### Google Sheets history (optional — otherwise CSV files in `./data/`)
See [`docs/11-deployment-guide.md`](./docs/11-deployment-guide.md) §4 for the
service-account + spreadsheet setup. Credentials are server-only and never
reach the browser.

## Security

- RTDB rules (`database.rules.json`) let a client write **only its own**
  `players/{uid}` node, and validate role, activity, direction, and display-name
  length. Visitors cannot change another visitor's identity or role.
- Display names are sanitized (HTML/control chars stripped) and length-limited
  (1–24) on both client and server.
- The `/api/history` route validates every payload, requires a shared secret,
  and rate-limits per session. Visitors cannot write arbitrary rows to Sheets.
- No credentials are hardcoded; all secrets come from environment variables.

## Deploy

Full, checkpointed instructions are in
[`docs/11-deployment-guide.md`](./docs/11-deployment-guide.md), covering:
production env vars, Firebase config + rules, Google Sheets setup, Vercel deploy,
a Cloud Functions alternative, and a post-deploy verification checklist.

> Note: deployment has not been performed from this repo — the project builds,
> typechecks, and passes tests locally, but verify each deploy checkpoint before
> treating it as live.

Summary:
- **Frontend + history API** → Vercel (set all env vars in project settings).
- **Realtime + auth** → Firebase (`firebase deploy --only database`).

## Assets

Source art (provided via Gemini) lives in `/assets`. `scripts/prep-assets.ts`
detects sprites on the painted-checkerboard background, keys it to transparency,
normalizes to 64×64 cells, and writes a typed manifest
(`src/config/asset-manifest.ts`). Swap art by replacing the source PNGs and
re-running `npm run assets:prep` — no game-code changes needed.

Only the **Senior Monk** sheet was provided; the **Abbot** and **Visitor** use
tinted placeholders. Currently only the Monk role and the Chanting / Offer
Incense / Offering activities are exposed in the UI (others are defined and easy
to re-enable in `src/config/roles.ts` and `src/config/activities.ts`).

## Project structure

```
src/
  app/              Next.js routes + /api/history
  components/       React UI (onboarding, HUD, touch controls, audio)
  game/             Phaser scene, Character, decor, input, world
  state/            Zustand store (UI ↔ Firebase ↔ game bridge)
  lib/firebase/     client init + presence manager
  lib/              validation, sheets writer, history/presence/rate-limit cores, sfx
  config/           roles, activities, permissions, asset manifest
scripts/            asset-prep pipeline
tests/              Vitest suite
docs/               planning, manual testing, deployment guides
```
