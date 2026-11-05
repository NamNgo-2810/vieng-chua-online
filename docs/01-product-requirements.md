# Chùa Online — Virtual Pagoda · Product Requirements Document (PRD)

Status: Draft for approval · Owner: Engineering · Last updated: 2026-11-05

---

## 1. Summary

Chùa Online is a peaceful, cozy, 2D pixel-art multiplayer virtual Buddhist
temple that runs in a normal web browser with no account registration. Visitors
enter one shared temple, pick a character role, perform temple activities, and
see other visitors' activities update in real time. It is a casual social and
contemplative experience, not a competitive game.

## 2. Goals

- One shared virtual temple that all visitors occupy simultaneously.
- Frictionless entry: anonymous auth, pick a name, pick a role, enter.
- Real-time presence and activity broadcasting between all connected clients.
- Calm ambience: looping Buddhist-inspired music + optional activity SFX.
- Append-only activity history recorded to Google Sheets (secondary store).
- Responsive, mobile-friendly, basically accessible UI.

## 3. Non-goals

- No competitive mechanics, scoring, levels, or combat.
- No full MMO architecture (no authoritative game server, no sharding, no
  server-side physics). Firebase Realtime Database is the source of truth for
  live state.
- No account registration, passwords, or persistent user profiles.
- No self-generated artwork — assets are provided by the user (Gemini).
- No monetization in v1.

## 4. Personas

- Casual visitor — joins briefly, picks "Visitor", walks around, offers incense.
- Returning community member — chooses Senior Monk, meditates or chants.
- Host / Abbot — chooses Abbot, rings the bell, leads activities.

## 5. Roles

| Role ID            | Display name    | Intent                                    |
| ------------------ | --------------- | ----------------------------------------- |
| TRU_TRI            | Trụ trì (Abbot) | Temple host; widest activity permissions  |
| HOA_THUONG         | Hòa thượng (Senior Monk) | Ritual-focused activities        |
| KHACH_THAP_PHUONG  | Khách thập phương (Visitor) | Casual / lay activities       |

Full permission matrix in `05-role-activity-matrix.md`.

## 6. Activities

| Activity ID   | Display name  |
| ------------- | ------------- |
| CHANTING      | Tụng kinh     |
| OFFER_INCENSE | Dâng hương    |
| LISTENING     | Nghe kinh     |
| OFFERING      | Dâng lễ       |
| WOODEN_FISH   | Gõ mõ         |
| MEDITATION    | Thiền định    |
| RING_BELL     | Thỉnh chuông  |
| WALKING       | Đi dạo        |
| PRAYING       | Cầu nguyện    |

Each activity has: an animation, an optional visual prop, a display label, and a
per-role permission flag. Visitors can change activity at any time.

## 7. Functional requirements

### 7.1 Onboarding
- FR-1 Authenticate anonymously via Firebase on first load.
- FR-2 Prompt for a display name (validated, sanitized, length-limited).
- FR-3 Prompt for role selection with a character preview.
- FR-4 "Enter temple" creates the player session and places the player.

### 7.2 Multiplayer presence
- FR-5 On join, add player to active visitors and broadcast presence.
- FR-6 All clients see new players, activity changes, and movement in real time.
- FR-7 Use `.info/connected` + `onDisconnect()` to clean up presence.
- FR-8 Handle tab close, network loss, and reconnection gracefully.
- FR-9 Prevent duplicate active sessions from the same client causing drift.
- FR-10 Maintain an accurate online visitor count.

### 7.3 Activities
- FR-11 Changing an activity updates local state, RTDB, and all clients.
- FR-12 Reject activity changes not permitted for the player's role.

### 7.4 History (Google Sheets)
- FR-13 Record JOIN, ACTIVITY_CHANGE, and LEAVE events.
- FR-14 Record visitor row with joined/left/duration/status.
- FR-15 ISO 8601 timestamps; idempotent writes (no duplicates).
- FR-16 Writes happen server-side only; credentials never reach the browser.
- FR-17 Sheets failures must not break gameplay.

### 7.5 UI
- FR-18 Temple center, name + online count top-left, audio/settings top-right,
  player profile + activity picker bottom, online visitor list right sidebar.
- FR-19 Responsive and mobile-friendly; basic keyboard/ARIA accessibility.

### 7.6 Audio
- FR-20 Seamless looping ambient music; starts only after user interaction.
- FR-21 Mute/unmute + volume; optional SFX for incense, bell, wooden fish, etc.

## 8. Non-functional requirements

- NFR-1 Clean, typed, modular TypeScript; clear layer separation.
- NFR-2 All secrets in environment variables; no hardcoded credentials.
- NFR-3 Firebase security rules enforcing shape and ownership of player data.
- NFR-4 Input validation/sanitization on client and server.
- NFR-5 Explicit loading, connecting, reconnecting, and error states.
- NFR-6 Target < 2s to interactive on a mid-range phone over 4G.
- NFR-7 No fake multiplayer data in production.

## 9. Success metrics

- Players can join, be seen by others, and change activities with < 500 ms
  perceived latency on a normal connection.
- Presence cleanup occurs within a few seconds of disconnect.
- Sheets history matches RTDB join/leave events with no duplicates.

## 10. Assumptions and constraints

- Low concurrency expected (tens, not thousands, of simultaneous visitors).
- Single shared room; no instancing in v1.
- Assets delivered by the user; placeholders used until then.

## 11. Open questions

- Max concurrent visitors to design/throttle for?
- Should the room have a soft cap with a waiting state?
- Is chat in scope later, or purely activity-based presence?
- Any moderation needs for display names (profanity filter)?
