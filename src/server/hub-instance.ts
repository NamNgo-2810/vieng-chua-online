/**
 * The one LocalHub for this server process (SERVER ONLY), with its state kept
 * in data/temple.json (temple merit, each browser's merit, recent chat).
 * Kept on globalThis so Next.js dev reloads and separate route modules share it.
 */

import { readFileSync, promises as fs } from "node:fs";
import path from "node:path";
import { LocalHub, type SavedState } from "./local-hub";
import { dataDir, recordLocalHistory } from "./csv-history";
import { randomUUID } from "node:crypto";
import type { Player } from "@/lib/types";

const SAVE_DELAY_MS = 500;

function stateFile(): string {
  return path.join(dataDir(), "temple.json");
}

function load(): Partial<SavedState> {
  try {
    return JSON.parse(readFileSync(stateFile(), "utf8")) as Partial<SavedState>;
  } catch {
    return {}; // first run, or unreadable: start fresh
  }
}

let pending: SavedState | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Debounced, atomic save (write a temp file, then rename over the old one). */
function save(state: SavedState) {
  pending = state;
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    const snapshot = pending;
    pending = null;
    if (!snapshot) return;
    try {
      await fs.mkdir(dataDir(), { recursive: true });
      const tmp = `${stateFile()}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(snapshot, null, 2), "utf8");
      await fs.rename(tmp, stateFile());
    } catch (err) {
      console.error("[local] could not save data/temple.json:", err);
    }
  }, SAVE_DELAY_MS);
}

/** Close the visit in the CSV history when a browser vanished without a LEAVE. */
function recordLostVisit(p: Player) {
  void recordLocalHistory({
    eventId: randomUUID(),
    eventType: "LEAVE",
    sessionId: p.sessionId,
    displayName: p.displayName,
    role: p.role,
    activity: p.currentActivity,
    timestamp: new Date().toISOString(),
  });
}

const g = globalThis as unknown as { __chuaLocalHub?: LocalHub };

export function getHub(): LocalHub {
  if (!g.__chuaLocalHub) g.__chuaLocalHub = new LocalHub({ initial: load(), save, onVisitEnd: recordLostVisit });
  return g.__chuaLocalHub;
}

/** Local mode is on unless Firebase is configured or another backend is forced. */
export function localModeEnabled(): boolean {
  const forced = process.env.NEXT_PUBLIC_BACKEND;
  if (forced) return forced === "local";
  return !(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);
}
