# System Architecture

Status: Draft for approval · Last updated: 2026-11-05

---

## 1. High-level overview

A Next.js (App Router) web app hosts a React UI and an embedded Phaser 3 game
canvas. Firebase provides anonymous auth, the Realtime Database (RTDB) as the
live source of truth for presence and player state, and Cloud Functions as the
only component allowed to touch Google Sheets credentials. Google Sheets is an
append-only history/audit store, never read on the hot path.

```
            ┌─────────────────────────────────────────────┐
            │                 Browser (client)             │
            │                                              │
            │  Next.js / React UI  ◄──────►  Phaser 3 game │
            │        │                          │          │
            │        │  shared state store      │          │
            │        └──────────┬───────────────┘          │
            └───────────────────┼──────────────────────────┘
                                │ Firebase SDK (auth + RTDB)
                 ┌──────────────┼───────────────────────────┐
                 │              ▼                            │
                 │   Firebase Anonymous Auth                 │
                 │   Firebase Realtime Database  ◄── truth   │
                 │        │  (RTDB trigger)                  │
                 │        ▼                                  │
                 │   Firebase Cloud Functions                │
                 │        │  (service account, server-only)  │
                 └────────┼──────────────────────────────────┘
                          ▼
                 Google Sheets API  (history only)
```

## 2. Components

### 2.1 Frontend (Next.js + React + Tailwind)
- App Router pages, client components for interactive UI.
- Onboarding flow (name, role, preview, enter).
- HUD overlay: temple name + online count, audio/settings, activity picker,
  online visitor sidebar. The HUD is React DOM layered over the Phaser canvas.
- Shared client state store (e.g. Zustand) bridging React UI ↔ Phaser scene.

### 2.2 Game engine (Phaser 3)
- One main `TempleScene` renders the tileset, background, props, and player
  sprites. Subscribes to the RTDB player collection and renders remote players.
- Local player input (movement + activity) writes to the state store, which
  syncs to RTDB. Remote player updates flow RTDB → store → scene.
- Asset loading driven by the asset-manifest config (see asset docs).

### 2.3 Firebase Auth (anonymous)
- Issues a stable `uid` per browser. The session uses `uid` to own its player
  node and to authorize RTDB writes via security rules.

### 2.4 Firebase Realtime Database (source of truth)
- Holds `players/{sessionId}`, `presence`, and `meta/onlineCount`.
- `.info/connected` + `onDisconnect()` for presence cleanup.
- Security rules validate schema and enforce that a client only writes its own
  player node.

### 2.5 Firebase Cloud Functions (backend)
- RTDB-triggered functions translate join/leave/activity-change events into
  Google Sheets writes. This keeps the service-account key server-side.
- An idempotency guard (event IDs stored in RTDB) prevents duplicate writes.
- Optional callable function for name validation/moderation.

### 2.6 Google Sheets (history)
- Two sheets: Visitors and Activity Logs. Written by Cloud Functions only.
- Failures are logged and retried with backoff; they never block gameplay.

### 2.7 Hosting
- Frontend on Vercel. Firebase project for auth/RTDB/Functions. Google Cloud
  service account for Sheets.

## 3. Data flow scenarios

### 3.1 Join
1. Client authenticates anonymously → `uid`.
2. User submits name + role (validated/sanitized).
3. Client writes `players/{sessionId}` and registers `onDisconnect()` cleanup.
4. RTDB `onCreate` trigger → Cloud Function → append JOIN to Activity Logs and
   create a Visitors row.
5. All clients receive the new player via their RTDB subscription.

### 3.2 Activity change
1. Client validates the activity against role permissions locally.
2. Client updates `players/{sessionId}/currentActivity` + `lastActiveAt`.
3. RTDB rules re-validate ownership/shape.
4. RTDB `onUpdate` trigger → Cloud Function → append ACTIVITY_CHANGE.
5. All clients re-render that player's animation/prop.

### 3.3 Disconnect
1. `onDisconnect()` removes/flags the player node; online count decrements.
2. RTDB trigger → Cloud Function → append LEAVE, update Visitors row with
   leftAt + total duration + status.

## 4. Technical risks (for discussion — see risk register)

- RTDB write amplification if movement is synced too frequently.
- Cloud Functions ↔ Sheets idempotency under retries and cold starts.
- Vercel (Next.js) + Firebase Functions split: two deploy targets, two CI paths.
- Phaser + Next.js SSR: Phaser must load client-side only (dynamic import,
  `ssr: false`).
- Presence correctness on flaky mobile networks.
- Google Sheets API quotas/rate limits under bursty joins.

## 5. Layering / module boundaries

```
src/
  app/                 Next.js routes + layout
  components/          React UI (HUD, onboarding, controls)
  game/                Phaser scenes, sprites, asset manifest
  state/               shared store (store ↔ game ↔ UI bridge)
  lib/firebase/        auth, rtdb, presence helpers (client)
  lib/validation/      schemas + sanitizers (shared)
  config/              roles, activities, permissions, asset map
functions/             Firebase Cloud Functions (server-only)
docs/                  planning documents
```

Rule: UI never talks to RTDB directly for game state — it goes through the
store. Sheets logic lives only in `functions/`.
