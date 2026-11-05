/**
 * Google Sheets history writer (SERVER ONLY). Appends to the Visitors and
 * Activity Logs sheets. Never imported by client code — the service-account
 * credentials come from server env vars.
 *
 * Idempotency: the caller passes a unique eventId; we keep an in-memory set of
 * recently-seen IDs to drop obvious duplicates within a single serverless
 * instance. (Full cross-instance dedupe would use a store; for a friends-scale
 * app this plus client-side UUIDs is sufficient. See docs/03-database-schema.)
 */

import { google } from "googleapis";
import type { HistoryEvent } from "@/lib/validation";
import { EventDedup, recordWithDedup } from "@/lib/history-core";

const VISITORS_SHEET = "Visitors";
const LOGS_SHEET = "Activity Logs";

const dedup = new EventDedup(5000);

function getClient() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Google Sheets env vars are not configured.");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId };
}

export function isSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY &&
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  );
}

async function append(sheet: string, row: (string | number)[]) {
  const { sheets, spreadsheetId } = getClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheet}!A:Z`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

/** Find the Visitors row for a session and update Left At / Duration / Status. */
async function finalizeVisitor(ev: HistoryEvent) {
  const { sheets, spreadsheetId } = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${VISITORS_SHEET}!A:G`,
  });
  const rows = res.data.values ?? [];
  // Column A = Session ID, D = Joined At.
  let rowIndex = -1;
  let joinedAt = "";
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i]?.[0] === ev.sessionId && (rows[i]?.[6] ?? "") === "ACTIVE") {
      rowIndex = i;
      joinedAt = rows[i]?.[3] ?? "";
      break;
    }
  }
  if (rowIndex < 0) return;

  const leftAt = ev.timestamp;
  let duration = "";
  if (joinedAt) {
    const secs = Math.max(0, Math.round((Date.parse(leftAt) - Date.parse(joinedAt)) / 1000));
    duration = String(secs);
  }
  const sheetRow = rowIndex + 1; // 1-based
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${VISITORS_SHEET}!E${sheetRow}:G${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: { values: [[leftAt, duration, "LEFT"]] },
  });
}

/** The Google-Sheets-specific writer: appends rows for one event. */
async function sheetsWriter(ev: HistoryEvent): Promise<void> {
  // Activity Logs row for every event type.
  await append(LOGS_SHEET, [
    ev.eventId,
    ev.sessionId,
    ev.displayName,
    ev.role,
    ev.activity ?? "",
    ev.timestamp,
    ev.eventType,
  ]);

  if (ev.eventType === "JOIN") {
    await append(VISITORS_SHEET, [
      ev.sessionId,
      ev.displayName,
      ev.role,
      ev.timestamp, // Joined At
      "", // Left At
      "", // Total Duration
      "ACTIVE", // Status
    ]);
  } else if (ev.eventType === "LEAVE") {
    await finalizeVisitor(ev);
  }
}

/**
 * Record a history event. Returns true if written, false if skipped (duplicate
 * or not configured) or if the Sheets write failed. Never throws to the
 * caller — idempotency + failure isolation are handled by recordWithDedup.
 */
export async function recordHistory(ev: HistoryEvent): Promise<boolean> {
  if (!isSheetsConfigured()) {
    console.warn("[sheets] not configured; skipping history write.");
    return false;
  }
  const result = await recordWithDedup(ev, dedup, sheetsWriter);
  if (result.reason === "writer-failed") {
    console.error("[sheets] write failed (non-fatal); event will retry later.");
  }
  return result.written;
}
