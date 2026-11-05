# Deployment Guide — Chùa Online

Status: Living doc · Last updated: 2026-11-05

> ⚠️ This guide has NOT been executed against a live project in this repo. The
> app builds, typechecks, and passes its test suite locally, but no production
> deploy has been performed or verified here. Follow the steps below to deploy,
> and verify each checkpoint before considering it done.

Topology (all free-tier friendly):
- **Vercel** — hosts the Next.js app + the `/api/history` serverless route.
- **Firebase (Spark/free)** — Anonymous Auth + Realtime Database.
- **Google Cloud** — a service account + a spreadsheet for history (optional).

No Firebase Cloud Functions are used: the Sheets writer lives in the Vercel
route, so the free Spark plan is sufficient (Functions calling external APIs
would require the paid Blaze plan). See the Cloud Functions note at the end.

---

## 1. Production environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (and in
`.env.local` for local runs). `NEXT_PUBLIC_*` values are exposed to the browser
(safe — they are public Firebase identifiers). Everything else is server-only.

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | public | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | public | |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | public | RTDB URL |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | public | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | public | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | public | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | public | |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | **server** | service account email |
| `GOOGLE_SHEETS_PRIVATE_KEY` | **server** | keep literal `\n`; code converts them |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | **server** | the history spreadsheet id |
| `HISTORY_API_SECRET` | **server** | shared secret the route requires |
| `NEXT_PUBLIC_HISTORY_API_SECRET` | public | same value; client sends it |

`.env.example` in the repo lists all of these. Never commit real values.

Verify: `vercel env ls` shows each variable in the Production environment.

## 2. Firebase configuration

1. Create a project at the Firebase console.
2. **Authentication → Sign-in method → Anonymous → Enable.**
3. **Realtime Database → Create database** (pick a region; start in locked mode).
4. **Project settings → Your apps → Web app** → copy the config into the
   `NEXT_PUBLIC_FIREBASE_*` variables above.

Verify: in the app, entering the temple with the env vars set changes the header
dot from amber ("Ngoại tuyến") to green with a live visitor count.

## 3. Firebase security rules

Rules live in `database.rules.json` and are enforced server-side by RTDB:
- a client may only write `players/{uid}` where `uid === auth.uid`
  (no editing another visitor's identity/role),
- `role`, `currentActivity`, `direction` are validated against allowed values,
- `displayName` is length-checked (1–24),
- unknown fields are rejected.

Install the Firebase CLI and deploy:
```bash
npm i -g firebase-tools
firebase login
firebase use --add            # select your project
firebase deploy --only database
```

Verify: in the RTDB console, the Rules tab shows the deployed rules. A write to
`players/<someone-else-uid>` from the client is rejected (see manual test §9).

## 4. Google Sheets setup (optional — history logging)

1. In Google Cloud Console, create (or reuse) a project and **enable the Google
   Sheets API**.
2. **Create a service account**; create a JSON key. From it take `client_email`
   and `private_key` → the `GOOGLE_SHEETS_*` env vars.
3. Create a Google spreadsheet with two tabs named exactly:
   - **Visitors** — header row: `Session ID | Display Name | Role | Joined At | Left At | Total Duration | Status`
   - **Activity Logs** — header row: `Event ID | Session ID | Display Name | Role | Activity | Timestamp | Event Type`
4. **Share the spreadsheet with the service account email** (Editor).
5. Put the spreadsheet id (from its URL) in `GOOGLE_SHEETS_SPREADSHEET_ID`.
6. Choose a long random `HISTORY_API_SECRET` and set it in both the server var
   and `NEXT_PUBLIC_HISTORY_API_SECRET`.

Security: the service-account key is only read server-side in
`src/lib/sheets.ts` (used by `/api/history`). It is never bundled into client
code — there is no `NEXT_PUBLIC_` prefix on any credential.

Verify: after a session, the two tabs populate as described in
`docs/10-manual-testing-guide.md` §10, with ISO 8601 timestamps, computed
durations, and no duplicate Event IDs.

## 5. Vercel deployment

```bash
npm i -g vercel
vercel link            # link the repo to a Vercel project
# set env vars (section 1) in the dashboard or via `vercel env add`
vercel --prod          # production deploy
```
Or connect the Git repo in the Vercel dashboard for automatic deploys on push.
The `/api/history` route runs on the Node runtime (declared in the route).

Verify:
- the production URL loads the onboarding screen,
- entering the temple connects (green dot) when Firebase env vars are set,
- `POST /api/history` with a valid body returns `{ ok: true }` and a malformed
  one returns 400 (see §6 below).

## 6. Post-deploy verification checklist

Do not consider the deploy "done" until all pass:
- [ ] Production URL serves the app (HTTP 200).
- [ ] Two browsers (one incognito) both show each other — presence syncs.
- [ ] Activity changes appear on the other client within ~1s.
- [ ] Closing a tab removes that visitor within a few seconds.
- [ ] Network-offline then online re-asserts presence.
- [ ] RTDB rules reject a cross-uid write.
- [ ] (If Sheets) JOIN/ACTIVITY_CHANGE/LEAVE rows appear, no duplicates.
- [ ] Breaking Sheets does NOT break gameplay (`/api/history` returns written:false).
- [ ] Mobile: D-pad moves the player, activity buttons are tappable, page does
      not scroll/zoom on drag.

## Cloud Functions (not used — rationale + alternative)

The approved architecture uses a Vercel serverless route for Sheets so the
project stays on Firebase's free Spark plan. If you prefer to run the Sheets
writer as a Firebase Cloud Function instead (requires the **Blaze** pay-as-you-go
plan for outbound network access):

1. `firebase init functions` (TypeScript).
2. Move the logic in `src/lib/sheets.ts` into an `onValueWritten` RTDB trigger on
   `players/{sessionId}` (or an HTTPS callable), reading the service account from
   Functions config/secrets (`firebase functions:secrets:set`).
3. `firebase deploy --only functions`.

This repo does not ship a `functions/` directory; the Vercel route is the
supported, free path.
