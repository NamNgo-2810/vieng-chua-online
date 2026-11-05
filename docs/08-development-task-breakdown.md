# Development Task Breakdown & Phased Plan

Status: Draft for approval · Last updated: 2026-11-05

A phased plan. Progress is marked below. The approved vertical slice (scaffold,
asset prep, Firebase multiplayer, Phaser scene, HUD, audio, history API) is
implemented and builds cleanly. Remaining work is live-environment config,
multi-client testing, and polish.

**Implemented so far:** Phase 0.5, Phase 1, Phase 2 (client + rules), Phase 3,
Phase 4, Phase 5 (ambient audio), Phase 6 (Vercel route). Not yet done: live
Firebase/Sheets config, two-client manual test, mobile/a11y polish, deploy.

---

## Phase 0 — Approval & foundations (gate)
- [ ] You approve the eight planning docs (or request edits).
- [ ] Confirm open questions (concurrency cap, name moderation, asset labeling,
      audio licensing, sprite frame size).
- [ ] Decide deploy topology: Vercel (frontend) + Firebase (auth/RTDB/Functions).

## Phase 0.5 — Asset prep pass (NEW, from asset review)
- [ ] Slice `monk_senior.png` into a normalized 64×64 atlas (walk×4, meditation,
      chanting, incense) with a JSON atlas.
- [ ] Slice `object.png` / `environment.png` props into named PNGs/mini-atlases
      (bell, wooden fish, candle frames; incense, lotus, tray, cushion, book,
      beads, vases, lanterns, benches, trees).
- [ ] Use `background.png` as the scene backdrop as-is.
- [ ] Generate clearly-marked placeholders for TRU_TRI and KHACH_THAP_PHUONG.
- [ ] Populate `config/asset-manifest.ts` from the produced frames.

## Phase 1 — Project scaffold
- [ ] Next.js (App Router) + TypeScript + Tailwind.
- [ ] Lint/format config, path aliases, folder structure from arch doc.
- [ ] `config/` files: roles, activities, permissions, asset-manifest (stubs).
- [ ] Shared validation module (name/role/activity schemas).
- [ ] `.env.example` with all required keys; no real secrets committed.

## Phase 2 — Firebase core (auth + RTDB)
- [ ] Firebase client init (client-only).
- [ ] Anonymous auth flow + `connection` state in store.
- [ ] RTDB read/write helpers for `/players`, `/presence`, `/meta`.
- [ ] Presence via `.info/connected` + `onDisconnect()`.
- [ ] Security rules: ownership + shape validation; deploy to a dev project.
- [ ] Duplicate-session (tab takeover) handling.

## Phase 3 — Phaser scene + state bridge
- [ ] `GameCanvas` with dynamic import (`ssr:false`).
- [ ] `TempleScene`: load manifest, render background/tileset, local player.
- [ ] Store ↔ scene bridge; spawn/despawn remote players from `/players`.
- [ ] Movement input + throttled position sync + remote interpolation.
- [ ] Activity animation + prop switching driven by `currentActivity`.

## Phase 4 — UI / HUD
- [ ] Onboarding flow (name → role → preview → enter).
- [ ] TempleHeader (name + online count), AudioControls, SettingsDialog.
- [ ] PlayerDock + ActivityPicker (role-filtered), VisitorList sidebar.
- [ ] ConnectionBanner; loading/reconnecting/error states.
- [ ] Responsive + baseline accessibility pass.

## Phase 5 — Audio
- [ ] Ambient loop with gesture-gated autoplay; mute/volume persistence.
- [ ] Optional activity SFX wired to the audio system + global controls.

## Phase 6 — Google Sheets history (backend)
> ⚠️ Free-tier note (R13): Firebase **Spark** (free) does NOT allow outbound
> network calls from Cloud Functions, so calling the Google Sheets API from a
> Function requires the **Blaze** (pay-as-you-go) plan. To stay fully free, this
> phase instead uses a **Vercel serverless route** (already in the free Hobby
> frontend deploy) with the service account in Vercel server env, triggered by
> the client on join/activity/leave with server-side validation + idempotency.
- [ ] Sheets writer as a **Vercel serverless API route** (free-tier path),
      service account key in Vercel server env only (never in client bundle).
- [ ] RTDB triggers: JOIN / ACTIVITY_CHANGE / LEAVE → Sheets append/update.
- [ ] Idempotency ledger (`/events/{eventId}`) to prevent duplicate writes.
- [ ] Visitors row lifecycle (create on join, finalize on leave + duration).
- [ ] Failure handling + retry/backoff; never block gameplay.

## Phase 7 — Hardening & deploy
- [ ] Security rules review; input sanitization audit; no secrets in client.
- [ ] Manual multiplayer test (two+ clients): presence, activity, disconnect.
- [ ] Mobile pass; reduced-motion; contrast check.
- [ ] Deploy frontend to Vercel; functions + rules to Firebase.
- [ ] Swap placeholder assets for final Gemini art via manifest.

## Suggested milestones
1. **M1 "I can see myself"** — scaffold + auth + local player in temple (P1–P3 local).
2. **M2 "I can see you"** — real-time multiplayer presence + activities (P2–P4).
3. **M3 "It remembers"** — Sheets history + hardening + deploy (P5–P7).

## Dependencies
- P3 depends on P1 (manifest/config) and P2 (player data).
- P6 depends on P2 (RTDB shape) and a working events ledger.
- P7 depends on everything + final assets from you.
