import { describe, it, expect, beforeEach, vi } from "vitest";
import { LocalPresence } from "@/lib/local-presence";
import type { Player, ConnectionStatus } from "@/lib/types";

/**
 * These exercise the presence backend's activity + lifecycle behaviour through
 * the same IPresence interface the real Firebase manager implements. The
 * offline LocalPresence is deterministic and needs no network, so it is ideal
 * for verifying the contract: activity validation, state broadcast, and
 * join/leave lifecycle.
 */

function collect() {
  const statuses: ConnectionStatus[] = [];
  let latest: Record<string, Player> = {};
  const presence = new LocalPresence({
    onConnection: (s) => statuses.push(s),
    onPlayers: (p) => (latest = p),
    onTakenOver: () => {},
  });
  return { presence, statuses, players: () => latest };
}

describe("activity switching via the presence backend", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("starts the local player on WALKING and broadcasts state on join", async () => {
    const { presence, players } = collect();
    await presence.authenticate();
    await presence.join({ displayName: "An", role: "HOA_THUONG", spawnX: 100, spawnY: 100 });
    const local = presence.getLocal()!;
    expect(local.currentActivity).toBe("WALKING");
    // Local player is present in the broadcast collection.
    expect(Object.values(players()).some((p) => p.displayName === "An")).toBe(true);
    presence.dispose();
  });

  it("applies a permitted activity change", async () => {
    const { presence } = collect();
    await presence.join({ displayName: "An", role: "HOA_THUONG", spawnX: 0, spawnY: 0 });
    const ok = await presence.changeActivity("CHANTING");
    expect(ok).toBe(true);
    expect(presence.getLocal()!.currentActivity).toBe("CHANTING");
    presence.dispose();
  });

  it("rejects an activity the role is not permitted to perform", async () => {
    const { presence } = collect();
    // Visitor may not ring the bell.
    await presence.join({ displayName: "Khách", role: "KHACH_THAP_PHUONG", spawnX: 0, spawnY: 0 });
    const ok = await presence.changeActivity("RING_BELL");
    expect(ok).toBe(false);
    expect(presence.getLocal()!.currentActivity).toBe("WALKING"); // unchanged
    presence.dispose();
  });

  it("reports an online connection status after joining", async () => {
    const { presence, statuses } = collect();
    await presence.authenticate();
    await presence.join({ displayName: "An", role: "HOA_THUONG", spawnX: 0, spawnY: 0 });
    expect(statuses).toContain("online");
    presence.dispose();
  });
});

describe("lifecycle: leave + rejoin (reconnection analogue)", () => {
  it("clears local state on leave and can rejoin cleanly", async () => {
    const { presence } = collect();
    await presence.join({ displayName: "An", role: "HOA_THUONG", spawnX: 0, spawnY: 0 });
    expect(presence.getLocal()).not.toBeNull();

    await presence.leave();
    expect(presence.getLocal()).toBeNull();

    // Rejoin produces a fresh, valid local player.
    await presence.join({ displayName: "An2", role: "HOA_THUONG", spawnX: 0, spawnY: 0 });
    expect(presence.getLocal()!.displayName).toBe("An2");
    expect(presence.getLocal()!.currentActivity).toBe("WALKING");
    presence.dispose();
  });
});
