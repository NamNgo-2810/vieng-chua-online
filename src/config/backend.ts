/**
 * Which backend the game talks to.
 *
 *  - "firebase": Firebase RTDB + Google Sheets (when NEXT_PUBLIC_FIREBASE_* is set).
 *  - "local":    this machine's Next.js server holds the shared temple and saves
 *                to JSON/CSV files under data/ — for playing with friends on the
 *                same network via this machine's IP (npm run start:lan).
 *  - "offline":  single-player demo in the browser only (used by unit tests).
 *
 * NEXT_PUBLIC_BACKEND forces one; otherwise Firebase when configured, else local.
 */

export type BackendMode = "firebase" | "local" | "offline";

export function backendMode(firebaseConfigured: boolean): BackendMode {
  const forced = process.env.NEXT_PUBLIC_BACKEND;
  if (forced === "firebase" || forced === "local" || forced === "offline") return forced;
  return firebaseConfigured ? "firebase" : "local";
}
