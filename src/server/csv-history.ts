/**
 * Local replacement for the Google Sheets history (SERVER ONLY): the same two
 * tables, as CSV files under data/ —
 *   activity-logs.csv  one row per JOIN / ACTIVITY_CHANGE / LEAVE event
 *   visitors.csv       one row per visit; LEAVE fills Left At, Duration, Status
 * Columns match the Sheets layout (docs/03-database-schema.md), so the files
 * open as the same sheets. Writes are serialized so rows never interleave.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { HistoryEvent } from "@/lib/validation";
import { csvLine, parseCsv } from "./csv";
import { EventDedup, recordWithDedup } from "@/lib/history-core";

export const LOG_HEADER = ["Event ID", "Session ID", "Display Name", "Role", "Activity", "Timestamp", "Event Type"];
export const VISITOR_HEADER = ["Session ID", "Display Name", "Role", "Joined At", "Left At", "Total Duration (s)", "Status"];

/** Directory for local data files (override with LOCAL_DATA_DIR). */
export function dataDir(): string {
  return process.env.LOCAL_DATA_DIR || path.join(process.cwd(), "data");
}

let queue: Promise<unknown> = Promise.resolve();
/** Run file writes one after another. */
function serialized<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

async function appendRow(file: string, header: string[], row: (string | number)[]) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  let exists = true;
  try {
    await fs.access(file);
  } catch {
    exists = false;
  }
  const text = (exists ? "" : csvLine(header) + "\n") + csvLine(row) + "\n";
  await fs.appendFile(file, text, "utf8");
}

/** Fill Left At / Duration / Status on the latest ACTIVE visit of this session. */
async function finalizeVisitor(file: string, ev: HistoryEvent) {
  let text: string;
  try {
    text = await fs.readFile(file, "utf8");
  } catch {
    return;
  }
  const rows = parseCsv(text);
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === ev.sessionId && rows[i][6] === "ACTIVE") {
      const joinedAt = rows[i][3];
      const secs = joinedAt ? Math.max(0, Math.round((Date.parse(ev.timestamp) - Date.parse(joinedAt)) / 1000)) : "";
      rows[i][4] = ev.timestamp;
      rows[i][5] = String(secs);
      rows[i][6] = "LEFT";
      // parseCsv returns stored text incl. the formula guard ('); drop it so
      // csvLine adds it back exactly once.
      await fs.writeFile(file, rows.map((r) => csvLine(r.map((f) => f.replace(/^'/, "")))).join("\n") + "\n", "utf8");
      return;
    }
  }
}

/** Writer with the same contract as the Sheets one (throws on I/O failure). */
export function csvHistoryWriter(dir: string = dataDir()) {
  const logs = path.join(dir, "activity-logs.csv");
  const visitors = path.join(dir, "visitors.csv");
  return (ev: HistoryEvent) =>
    serialized(async () => {
      await appendRow(logs, LOG_HEADER, [ev.eventId, ev.sessionId, ev.displayName, ev.role, ev.activity ?? "", ev.timestamp, ev.eventType]);
      if (ev.eventType === "JOIN") {
        await appendRow(visitors, VISITOR_HEADER, [ev.sessionId, ev.displayName, ev.role, ev.timestamp, "", "", "ACTIVE"]);
      } else if (ev.eventType === "LEAVE") {
        await finalizeVisitor(visitors, ev);
      }
    });
}

const dedup = new EventDedup(5000);
const writer = csvHistoryWriter();

/** Record one history event to the CSV files (idempotent, never throws). */
export async function recordLocalHistory(ev: HistoryEvent): Promise<boolean> {
  const result = await recordWithDedup(ev, dedup, writer);
  if (result.reason === "writer-failed") console.error("[history] CSV write failed (non-fatal).");
  return result.written;
}
