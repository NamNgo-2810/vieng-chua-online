import { describe, it, expect, vi, afterEach } from "vitest";
import { LocalServerPresence } from "@/lib/local-server/backends";
import type { LocalLink } from "@/lib/local-server/link";

/**
 * Regression: walking through a gate while still holding a direction key kept
 * sending the old area's position during the area change; once the change
 * finished, that stale position was flushed to the server and the player
 * appeared at the old coordinates inside the new area (seen arriving at the top
 * edge of Quan Âm hill instead of the path entrance).
 */
function fakeLink() {
  const posts: { type: string; fields: Record<string, unknown> }[] = [];
  let finishArea: (() => void) | null = null;
  const link = {
    sessionId: "me",
    post: vi.fn(async (type: string, fields: Record<string, unknown> = {}) => {
      posts.push({ type, fields });
      if (type === "join") return { player: { sessionId: "me", displayName: "Tâm", role: "TRU_TRI", currentActivity: "WALKING", positionX: 150, positionY: 165, direction: "up", joinedAt: 1, lastActiveAt: 1, isOnline: true, area: "BELL_TOWER" } };
      if (type === "area") {
        await new Promise<void>((resolve) => (finishArea = resolve)); // a slow server
        return { x: 200, y: 690, dir: "up" };
      }
      return {};
    }),
    tryPost: vi.fn(async (type: string, fields: Record<string, unknown> = {}) => {
      posts.push({ type, fields });
      return true;
    }),
    on: () => () => {},
    onStatus: () => () => {},
    open: () => {},
    close: () => {},
    beaconLeave: () => {},
  };
  return { link: link as unknown as LocalLink, posts, finish: () => finishArea?.() };
}

describe("regression: no stale position after walking through a gate", () => {
  afterEach(() => vi.useRealTimers());

  it("drops moves made while the area change is in flight", async () => {
    vi.useFakeTimers();
    const { link, posts, finish } = fakeLink();
    const p = new LocalServerPresence(link, { onConnection: () => {}, onPlayers: () => {}, onTakenOver: () => {} });
    await p.join({ displayName: "Tâm", role: "TRU_TRI", spawnX: 0, spawnY: 0 });

    const change = p.changeArea("QUAN_AM_HILL", 0, 0, "up");
    p.move(150, 160, "up"); // the old scene still moving during the change
    p.move(150, 155, "up");
    finish();
    await change;
    await vi.advanceTimersByTimeAsync(500); // position flush timer

    expect(p.getLocal()).toMatchObject({ area: "QUAN_AM_HILL", positionX: 200, positionY: 690 });
    const movesAfter = posts.filter((x) => x.type === "move");
    expect(movesAfter.some((m) => m.fields.y === 160 || m.fields.y === 155)).toBe(false);
    p.dispose();
  });
});
