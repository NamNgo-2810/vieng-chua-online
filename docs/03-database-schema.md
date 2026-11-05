# Database Schema (Firebase Realtime Database + Google Sheets)

Status: Draft for approval · Last updated: 2026-11-05

RTDB is the live source of truth. Google Sheets is append-only history.

---

## 1. RTDB tree

```
/players/{sessionId}
    sessionId:        string   // == auth uid for v1 (one session per client)
    displayName:      string   // sanitized, 1–24 chars
    role:             string   // TRU_TRI | HOA_THUONG | KHACH_THAP_PHUONG
    currentActivity:  string   // one of the Activity IDs
    positionX:        number
    positionY:        number
    direction:        string   // "up" | "down" | "left" | "right"
    joinedAt:         number    // epoch ms (server timestamp)
    lastActiveAt:     number    // epoch ms (server timestamp)
    isOnline:         boolean

/presence/{sessionId}
    connectedAt:      number
    // onDisconnect() removes this node and flips players/{id}/isOnline

/meta
    onlineCount:      number    // maintained by Cloud Function or transaction

/events/{eventId}          // idempotency ledger (server-written, short TTL)
    type:             string   // JOIN | ACTIVITY_CHANGE | LEAVE
    sessionId:        string
    writtenToSheet:   boolean
    createdAt:        number
```

### Notes
- `sessionId` equals the anonymous auth `uid` in v1. This gives a single owned
  node per browser and makes rules simple. Duplicate-session prevention: a
  second tab reuses the same `uid`, so it adopts/takes over the existing node
  rather than creating a second one (see game-state doc for takeover logic).
- Server timestamps use RTDB `ServerValue.TIMESTAMP`.
- Movement writes are throttled (see game-state doc) to limit write volume.

## 2. Validation constraints (enforced by security rules)

- `displayName`: string, 1–24 chars after trim; HTML/script stripped client-side
  and length re-checked in rules.
- `role`: must equal one of the three role IDs.
- `currentActivity`: must equal one of the nine activity IDs.
- `direction`: one of the four cardinal strings.
- `positionX` / `positionY`: numbers within the temple bounds.
- A client may only write `/players/{uid}` where `{uid} === auth.uid`.

## 3. Google Sheets schema

### Sheet 1 — Visitors
| Column         | Type / format          |
| -------------- | ---------------------- |
| Session ID     | string                 |
| Display Name   | string                 |
| Role           | role ID                |
| Joined At      | ISO 8601               |
| Left At        | ISO 8601 (blank until left) |
| Total Duration | seconds or HH:MM:SS     |
| Status         | ACTIVE \| LEFT          |

One row per session. Created on JOIN, updated on LEAVE.

### Sheet 2 — Activity Logs
| Column        | Type / format                     |
| ------------- | --------------------------------- |
| Event ID      | string (uuid, used for idempotency) |
| Session ID    | string                            |
| Display Name  | string                            |
| Role          | role ID                           |
| Activity      | activity ID (blank for JOIN/LEAVE)|
| Timestamp     | ISO 8601                          |
| Event Type    | JOIN \| ACTIVITY_CHANGE \| LEAVE   |

Append-only. `Event ID` de-duplicates retried writes.

## 4. Idempotency strategy

- Each loggable event gets a deterministic/unique `eventId`.
- Cloud Function checks `/events/{eventId}/writtenToSheet` before appending; sets
  it `true` after a successful Sheets write. Retried function invocations with the
  same `eventId` are no-ops.

## 5. Indexing / performance

- The whole `/players` collection is small (single room) and fully subscribed by
  each client. No secondary indexes needed in v1.
- If the room grows, introduce a capped/paginated presence list and position
  interpolation instead of raw subscription.
