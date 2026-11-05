# Manual Testing Guide — Multiplayer & Google Sheets

Status: Living doc · Last updated: 2026-11-05

This guide verifies real-time multiplayer and history logging by hand. Automated
coverage lives in `tests/` (`npm test`, 50 tests); this covers the things only a
human with multiple browser windows can confirm.

---

## 0. Prerequisites

### Offline (no backend) — works immediately
With no `.env.local`, the app runs in **offline mode**: a single local player plus
ambient demo monks. Good for checking rendering/animation, not real multiplayer.

### Online (real multiplayer) — needs Firebase
1. Create a Firebase project; enable **Anonymous Authentication** and **Realtime
   Database**.
2. Copy the web config into `.env.local` (`NEXT_PUBLIC_FIREBASE_*`).
3. Deploy rules: `firebase deploy --only database` (uses `database.rules.json`).
4. (Optional, for history) set `GOOGLE_SHEETS_*` + `HISTORY_API_SECRET` and
   `NEXT_PUBLIC_HISTORY_API_SECRET`.
5. `npm run dev` → open http://localhost:3000.

The header shows a green dot + visitor count when online, an amber "Ngoại tuyến"
when offline.

---

## 1. Two simultaneous visitors (core)

1. Open the app in **two browser windows** (use one normal + one Incognito so
   they get different anonymous sessions).
2. Enter a different name in each; enter the temple.
3. **Expected:** each window's right sidebar lists **both** visitors; the
   top-left online count shows **2**.
4. Move with WASD/arrows in window A.
5. **Expected:** window B shows A's monk gliding smoothly (interpolated) to the
   new position, facing the direction of travel.

## 2. Activity changes sync in real time

1. In window A, click **Tụng kinh** (CHANTING).
2. **Expected in window B (within ~1s):** A's character switches to the chanting
   pose/animation, and A's row in B's sidebar shows "Tụng kinh".
3. Repeat with **Dâng hương** and **Dâng lễ**. Each should reflect in both
   windows, with the small activity "✶" confirmation toast on the acting client.

## 3. Different roles

(Only the Monk role is exposed right now; to test roles, temporarily add others
to `ENABLED_ROLE_IDS` in `src/config/roles.ts`.)
1. Join as each role in separate windows.
2. **Expected:** each character uses its role sprite; the activity picker only
   shows activities permitted for that role (e.g. a Visitor has no Tụng kinh).

## 4. Movement throttling (no flooding)

1. Open the browser **Network** tab / Firebase RTDB usage while moving
   continuously for ~10s.
2. **Expected:** position writes are throttled to ~8/sec (not one per frame), and
   stop when you stop moving.

## 5. Normal departure

1. In window A, click **Rời chùa** (Leave).
2. **Expected:** A disappears from B's sidebar and the scene; count drops to 1
   within a second or two.

## 6. Browser tab closure

1. Simply **close** window A's tab (don't click Leave).
2. **Expected:** `onDisconnect()` removes A; B's list/count updates within a few
   seconds. A LEAVE row is recorded (if Sheets configured) via `sendBeacon`.

## 7. Network interruption + reconnection

1. In window A, open DevTools → Network → set **Offline**.
2. **Expected:** A's own header shows "Mất kết nối, đang thử lại..."
   (reconnecting). After the heartbeat TTL (~60s) other clients drop A from the
   online list even if the socket didn't close cleanly.
3. Set the network back to **Online**.
4. **Expected:** A re-asserts its presence and reappears for everyone; status
   returns to online.

## 8. Duplicate sessions (same browser profile, two tabs)

1. In the **same** browser profile (shared anonymous uid), open the temple in a
   **second tab**.
2. **Expected:** the newest tab takes ownership; the older tab shows "Chùa đang
   mở ở một thẻ khác. Thẻ này chuyển sang chế độ xem." and stops writing — no
   flip-flopping of the player's state.

## 9. Invalid activity request (tamper check)

1. In the console of window A, try to force a disallowed activity, e.g. a Visitor
   calling `RING_BELL`:
   ```js
   // Expected to be rejected by permissions before any RTDB write.
   window.__store?.getState?.().changeActivity?.("RING_BELL");
   ```
   (If `__store` isn't exposed, this is still enforced: `changeActivity` checks
   `canPerform` and the security rules validate `currentActivity`.)
2. **Expected:** no change in either window; RTDB rejects a tampered write.

## 10. Google Sheets logging

(Needs `GOOGLE_SHEETS_*` configured.)
1. Join, change activity a couple of times, then leave.
2. Open the spreadsheet:
   - **Activity Logs**: rows for JOIN, each ACTIVITY_CHANGE, and LEAVE, with
     unique Event IDs and ISO 8601 timestamps.
   - **Visitors**: one row per session; Status flips ACTIVE → LEFT with Left At +
     Total Duration on departure.
3. **No duplicate rows** for the same Event ID.

## 11. Google Sheets failure does not block gameplay

1. Temporarily break Sheets (wrong `GOOGLE_SHEETS_SPREADSHEET_ID`, or revoke
   share access).
2. Play normally: join, move, change activities.
3. **Expected:** gameplay is completely unaffected. `/api/history` returns
   `{ ok: true, written: false }` and logs a non-fatal warning; RTDB sync keeps
   working. (Automated equivalent: `tests/history.test.ts`.)

## 12. Multiple players, same activity

1. Three+ windows, all choose **Dâng hương**.
2. **Expected:** every client shows all of them performing the incense animation
   simultaneously; no desync, correct count.

---

## Rate limiting

`/api/history` limits per session (burst 20, refill 2/sec). Normal play never
trips it; a script spamming the endpoint for one session gets HTTP 429. Verified
in `tests/api-history.test.ts` and `tests/history.test.ts`.

## Where each scenario is also covered automatically

| Scenario | Automated test |
| --- | --- |
| Two visitors / same activity / roles | `tests/presence.test.ts` |
| Disconnection + stale cleanup | `tests/presence.test.ts` |
| Duplicate session takeover | `tests/presence.test.ts` |
| Activity switch + invalid activity | `tests/activity-flow.test.ts`, `tests/validation.test.ts` |
| Leave / rejoin (reconnection) | `tests/activity-flow.test.ts` |
| Idempotency / Sheets failure | `tests/history.test.ts` |
| Name/role/activity validation | `tests/validation.test.ts` |
| API route 400/401/429/200 | `tests/api-history.test.ts` |

Run all: `npm test`.
