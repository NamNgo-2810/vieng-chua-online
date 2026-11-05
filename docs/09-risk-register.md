# Technical Risk Register

Status: Draft for approval · Last updated: 2026-11-05

Risks surfaced before implementation, with proposed mitigations. Items marked
**DECISION** need your input before the related phase starts.

---

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|-----------|------------|
| R1 | Phaser + Next.js SSR conflict (Phaser needs `window`) | Build/runtime crash | High | Client-only dynamic import, `ssr:false`; isolate game in `GameCanvas`. |
| R2 | RTDB write amplification from movement sync | Cost + throttling + jank | High | Throttle position writes (~5–10 Hz), only-on-change, coalesce; interpolate remotes. |
| R3 | Sheets write duplication under Function retries/cold starts | Dirty history | Medium | Idempotency ledger `/events/{eventId}`; check-before-append. |
| R4 | Presence incorrectness on flaky mobile networks | Ghost players / wrong count | Medium | `.info/connected` + `onDisconnect()`; reconnect re-assert; periodic reconcile. |
| R5 | Duplicate sessions from multiple tabs (same uid) | State flip-flop | Medium | Per-tab token, last-writer-owns, older tabs go observer. |
| R6 | Google Sheets API quota/rate limits under join bursts | Lost/delayed history | Medium | Server-side queue + backoff; history is non-blocking; batch where possible. |
| R7 | Two deploy targets (Vercel + Firebase) | CI/ops complexity | Medium | Document deploy steps; separate pipelines; dev vs prod Firebase projects. |
| R8 | Client tampering to perform disallowed activities | Rule bypass | Medium | Mirror permission matrix in security rules / Function; server is final word. |
| R9 | Autoplay blocked by browser | No ambient audio | High | Gesture-gated start; clear unmute affordance; persist preference. |
| R10 | Secret leakage (service account, Firebase admin) | Security breach | High | Secrets only in Functions/server env; `.env.example` only in repo; never in client bundle. |
| R11 | Asset pipeline mismatch (frame size/layout unknown) | Rework of scene code | Medium | Lock frame convention early (DECISION); manifest-driven so swaps are path edits. |
| R12 | Scaling beyond single-room assumption | Perf collapse | Low (v1) | Keep single room; cap concurrency (DECISION); documented path to paginated presence. |

## Decisions — RESOLVED (2026-11-05)
- **D1 (R12):** ✅ Scale target is **dozens** of concurrent visitors (friends only).
  Single shared room, no soft cap needed in v1. Confirms the no-MMO approach.
- **D2 (R11):** ⚠️ Frame size to be **determined from the actual assets by Kiro**
  (crop/slice/assign, generate any missing frames). See asset doc §8 — the
  provided Gemini sheets are NOT on a clean uniform grid, so a slicing/atlas
  step is required. This is now an implementation task, not a user decision.
- **D3 (R6/R7):** ✅ Vercel + Firebase, constrained to **free tiers**. Must stay
  within Firebase Spark (RTDB) and Vercel Hobby limits — see R13.
- **D4:** ✅ Display-name moderation **in scope** (basic profanity/length filter).
- **D5 (R9):** ✅ Use `Morning_at_the_Pagoda.mp3` as the ambient loop for now;
  revisit additional/SFX audio at the audio phase.

## New risks from asset review
| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|-----------|------------|
| R13 | Free-tier limits (Firebase Spark: **no outbound network from Functions**, RTDB caps; Vercel Hobby) | Sheets integration may not run on Spark | High | Cloud Functions calling Google Sheets need the **Blaze** plan (external network). On free-only, fall back to a Vercel serverless route for Sheets, or defer Sheets to a later milestone. Confirm with user. |
| R14 | Gemini sheets lack a uniform grid / transparent gutters | Can't auto-slice cleanly | High | Manual/assisted slicing into a normalized atlas; standardize frame box; pad to uniform cells; store in manifest. |
| R15 | Missing character sheets (only Senior Monk provided) | Abbot & Visitor have no art | High | Use placeholders for TRU_TRI and KHACH_THAP_PHUONG until user provides art; manifest-driven swap. |
