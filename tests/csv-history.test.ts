import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { csvField, csvLine, parseCsv } from "@/server/csv";
import { csvHistoryWriter, LOG_HEADER, VISITOR_HEADER } from "@/server/csv-history";
import { makeEvent } from "./helpers";

describe("csv: escaping", () => {
  it("quotes fields with commas, quotes or newlines", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("two\nlines")).toBe('"two\nlines"');
  });

  it("guards text a spreadsheet would run as a formula", () => {
    expect(csvField("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvField("+1")).toBe("'+1");
    expect(csvField("@cmd")).toBe("'@cmd");
  });

  it("leaves Vietnamese text alone", () => {
    expect(csvField("Thích Minh")).toBe("Thích Minh");
  });

  it("round-trips through the parser", () => {
    const row = ["Thích Minh", "a,b", 'q"uote', "multi\nline"];
    expect(parseCsv(csvLine(row) + "\n")).toEqual([row]);
  });
});

describe("csv history: files like the Sheets tables", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "chua-csv-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("writes headers, a log row per event, and a visitor row on JOIN", async () => {
    const write = csvHistoryWriter(dir);
    await write(makeEvent({ eventType: "JOIN", sessionId: "s1", displayName: "Lan", timestamp: "2026-11-13T03:00:00.000Z" }));
    const logs = parseCsv(readFileSync(join(dir, "activity-logs.csv"), "utf8"));
    const visitors = parseCsv(readFileSync(join(dir, "visitors.csv"), "utf8"));
    expect(logs[0]).toEqual(LOG_HEADER);
    expect(logs[1][1]).toBe("s1");
    expect(visitors[0]).toEqual(VISITOR_HEADER);
    expect(visitors[1]).toEqual(["s1", "Lan", "HOA_THUONG", "2026-11-13T03:00:00.000Z", "", "", "ACTIVE"]);
  });

  it("fills Left At, duration and status on LEAVE", async () => {
    const write = csvHistoryWriter(dir);
    await write(makeEvent({ eventType: "JOIN", sessionId: "s1", timestamp: "2026-11-13T03:00:00.000Z" }));
    await write(makeEvent({ eventType: "ACTIVITY_CHANGE", sessionId: "s1", activity: "CHANTING", timestamp: "2026-11-13T03:01:00.000Z" }));
    await write(makeEvent({ eventType: "LEAVE", sessionId: "s1", timestamp: "2026-11-13T03:02:30.000Z" }));
    const visitors = parseCsv(readFileSync(join(dir, "visitors.csv"), "utf8"));
    expect(visitors[1].slice(4)).toEqual(["2026-11-13T03:02:30.000Z", "150", "LEFT"]);
    expect(parseCsv(readFileSync(join(dir, "activity-logs.csv"), "utf8"))).toHaveLength(4);
  });

  it("keeps a formula-looking name guarded after LEAVE rewrites the file", async () => {
    const write = csvHistoryWriter(dir);
    await write(makeEvent({ eventType: "JOIN", sessionId: "s1", displayName: "=1+1", timestamp: "2026-11-13T03:00:00.000Z" }));
    await write(makeEvent({ eventType: "LEAVE", sessionId: "s1", displayName: "=1+1", timestamp: "2026-11-13T03:00:10.000Z" }));
    const text = readFileSync(join(dir, "visitors.csv"), "utf8");
    expect(text).toContain("'=1+1");
    expect(text).not.toContain("''=1+1");
  });
});
