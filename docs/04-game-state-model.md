# Game State Model

Status: Draft for approval · Last updated: 2026-11-05

Describes the in-memory client state, how it maps to RTDB, and the sync rules
between React UI, the shared store, and the Phaser scene.

---

## 1. State layers

```
RTDB (truth)  ⇄  lib/firebase (sync)  ⇄  store (Zustand)  ⇄  React UI
                                              ⇅
                                        Phaser TempleScene
```

- The **store** is the single client-side bridge. UI and Phaser both read/write
  the store; only `lib/firebase` reads/writes RTDB.

## 2. Types (planned)

```ts
type RoleId = "TRU_TRI" | "HOA_THUONG" | "KHACH_THAP_PHUONG";

type ActivityId =
  | "CHANTING" | "OFFER_INCENSE" | "LISTENING" | "OFFERING"
  | "WOODEN_FISH" | "MEDITATION" | "RING_BELL" | "WALKING" | "PRAYING";

type Direction = "up" | "down" | "left" | "right";

interface Player {
  sessionId: string;
  displayName: string;
  role: RoleId;
  currentActivity: ActivityId;
  positionX: number;
  positionY: number;
  direction: Direction;
  joinedAt: number;
  lastActiveAt: number;
  isOnline: boolean;
}

interface ConnectionState {
  status: "idle" | "authenticating" | "connecting" | "online"
        | "reconnecting" | "error";
  error?: string;
}

interface GameStore {
  localSessionId?: string;
  localPlayer?: Player;
  players: Record<string, Player>;   // all active players incl. local
  connection: ConnectionState;
  audio: { muted: boolean; volume: number; started: boolean };
  // actions
  setRoleAndName(name: string, role: RoleId): void;
  changeActivity(a: ActivityId): void;
  move(x: number, y: number, dir: Direction): void;
}
```

## 3. Sync rules

### Local → RTDB (writes)
- `joinedAt`, `lastActiveAt` use server timestamps.
- `currentActivity`: written immediately on change (low frequency, high value).
- Movement: throttled to ~5–10 Hz max, and only when position actually changes.
  Coalesce rapid moves; always flush the final position.
- `lastActiveAt` bumped on any meaningful action.

### RTDB → Local (reads)
- Subscribe to `/players`. On child add/change/remove, update `store.players`.
- The local player's node is authoritative for others but the local client keeps
  an optimistic copy to avoid input lag; reconcile on echo.

### Store → Phaser
- Phaser subscribes to store changes: spawn/despawn sprites on player add/remove,
  switch animation + prop on activity change, tween position on movement.

### Store → React
- HUD reads `players` for the sidebar and online count, `connection` for
  loading/reconnect banners, `audio` for controls.

## 4. Presence & lifecycle

- `.info/connected` listener drives `connection.status`.
- On connect: write player node, register `onDisconnect()` to remove presence and
  set `isOnline=false`.
- On reconnect: re-assert the player node (re-run join-lite), re-register
  `onDisconnect()`.
- On explicit leave (button / `beforeunload`): best-effort immediate cleanup plus
  the `onDisconnect()` safety net.

## 5. Duplicate session handling

- `sessionId === auth.uid`. A second tab shares the uid and therefore the same
  player node. Strategy for v1: **last-writer-owns** — the newest tab takes over
  the node and older tabs go read-only/observer, detected via a `sessionToken`
  (random per tab) stored on the node; a tab that sees a token other than its own
  stops writing and shows a "this temple is open in another tab" notice.

## 6. Optimistic updates & reconciliation

- Activity change and movement apply locally first for responsiveness, then sync.
- If RTDB rejects a write (rule failure), roll back to the last confirmed value
  and surface a non-blocking error.

## 7. Error / connection states (UI-visible)

- `authenticating` → spinner on onboarding.
- `connecting` / `reconnecting` → banner; input disabled for writes that require
  connectivity.
- `error` → retry affordance; gameplay (local view) remains visible.
