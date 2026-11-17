import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LocalHub, type Client, type SavedState } from "@/server/local-hub";
import { SPOTS_BY_ID } from "@/config/ritual-spots";
import { MERIT } from "@/config/merit";
import { CHAT } from "@/config/chat";
import { AREAS, landingFor } from "@/config/areas";
import { CLOUD } from "@/config/journey";
import { createHash } from "node:crypto";
import { MILESTONES } from "@/config/milestones";

const GARDEN_AT = MILESTONES.find((m) => m.id === "LOTUS_GARDEN")!.threshold;

const SECRET_A = "secret-aaaaaaaaaaaaaaaa";
const SECRET_B = "secret-bbbbbbbbbbbbbbbb";

/** A hub with a controllable clock and readable ids. */
function makeHub(initial: Partial<SavedState> = {}) {
  let t = Date.UTC(2026, 10, 13, 3, 0, 0);
  let n = 0;
  const saves: SavedState[] = [];
  const hub = new LocalHub({
    now: () => t,
    newId: () => `id${++n}`,
    save: (s) => saves.push(JSON.parse(JSON.stringify(s))),
    initial,
    graceMs: 1000,
  });
  return { hub, saves, advance: (ms: number) => (t += ms) };
}

/** A pretend browser stream that records what it receives. */
function client(sessionId: string) {
  const events: { event: string; data: unknown }[] = [];
  const c: Client = { sessionId, send: (event, data) => events.push({ event, data }) };
  return { c, events, last: (e: string) => [...events].reverse().find((x) => x.event === e)?.data };
}

function enter(hub: LocalHub, secret: string, role = "TRU_TRI", name = "Tâm") {
  const h = hub.hello(secret);
  if (!h.ok) throw new Error(h.error);
  const j = hub.join(h.sessionId, h.token, { displayName: name, role });
  if (!j.ok) throw new Error(j.error);
  // Visitors arrive at the Tam quan; most tests start in the courtyard.
  const into = hub.area(h.sessionId, h.token, { area: "COURTYARD" });
  if (!into.ok) throw new Error(into.error);
  return { sid: h.sessionId, tok: h.token };
}

const at = (spot: keyof typeof SPOTS_BY_ID) => ({ x: SPOTS_BY_ID[spot].standX, y: SPOTS_BY_ID[spot].standY, dir: "up" });

describe("local hub: sessions", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("refuses a missing or short browser secret", () => {
    const { hub } = makeHub();
    expect(hub.hello("short").ok).toBe(false);
    expect(hub.hello(undefined).ok).toBe(false);
  });

  it("refuses an action with the wrong token", () => {
    const { hub } = makeHub();
    const { sid } = enter(hub, SECRET_A);
    expect(hub.move(sid, "not-the-token", { x: 100, y: 500, dir: "up" }).ok).toBe(false);
  });

  it("validates the name and role on join", () => {
    const { hub } = makeHub();
    const h = hub.hello(SECRET_A);
    if (!h.ok) throw new Error();
    expect(hub.join(h.sessionId, h.token, { displayName: "  ", role: "TRU_TRI" }).ok).toBe(false);
    expect(hub.join(h.sessionId, h.token, { displayName: "An", role: "EMPEROR" }).ok).toBe(false);
    const ok = hub.join(h.sessionId, h.token, { displayName: "<b>An</b>", role: "HOA_THUONG" });
    expect(ok.ok && ok.player.displayName).toBe("An");
  });

  it("a second tab of the same browser takes over the first", () => {
    const { hub } = makeHub();
    const first = enter(hub, SECRET_A);
    const old = client(first.sid);
    hub.connect(first.sid, first.tok, old.c);
    enter(hub, SECRET_A);
    expect(old.events.some((e) => e.event === "takenOver")).toBe(true);
    expect(Object.keys(hub.publicPlayers())).not.toContain(first.sid);
  });

  it("sends the current temple when a stream connects", () => {
    const { hub } = makeHub({ templeMerit: 42 });
    const a = enter(hub, SECRET_A);
    const c = client(a.sid);
    expect(hub.connect(a.sid, a.tok, c.c)).toBe(true);
    expect(c.last("temple")).toBe(42);
    expect(Object.keys(c.last("players") as object)).toContain(a.sid);
  });

  it("removes a visitor whose stream closed, after the grace period", () => {
    const { hub } = makeHub();
    const a = enter(hub, SECRET_A);
    const c = client(a.sid);
    hub.connect(a.sid, a.tok, c.c);
    hub.disconnect(c.c);
    vi.advanceTimersByTime(1100);
    expect(hub.publicPlayers()[a.sid]).toBeUndefined();
  });

  it("keeps a visitor who reconnects within the grace period", () => {
    const { hub } = makeHub();
    const a = enter(hub, SECRET_A);
    const c1 = client(a.sid);
    hub.connect(a.sid, a.tok, c1.c);
    hub.disconnect(c1.c);
    vi.advanceTimersByTime(500);
    hub.connect(a.sid, a.tok, client(a.sid).c);
    vi.advanceTimersByTime(2000);
    expect(hub.publicPlayers()[a.sid]).toBeDefined();
  });
});

describe("local hub: rituals and merit (decided by the server)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("refuses a ritual away from its place", () => {
    const { hub } = makeHub();
    const a = enter(hub, SECRET_A);
    expect(hub.activity(a.sid, a.tok, { activity: "OFFER_INCENSE", x: 200, y: 700, dir: "up" }).ok).toBe(false);
  });

  it("refuses a ritual the role may not do (visitor at the bell)", () => {
    const { hub } = makeHub();
    const v = enter(hub, SECRET_B, "KHACH_THAP_PHUONG", "Lan");
    expect(hub.activity(v.sid, v.tok, { activity: "RING_BELL", ...at("BELL") }).ok).toBe(false);
  });

  it("awards merit only after the ritual is held long enough", () => {
    const { hub, advance } = makeHub();
    const a = enter(hub, SECRET_A);
    expect(hub.activity(a.sid, a.tok, { activity: "OFFER_INCENSE", ...at("BURNER") }).ok).toBe(true);
    expect(hub.award(a.sid, a.tok, { activity: "OFFER_INCENSE" }).ok).toBe(false);
    advance(MERIT.ritualMs);
    const r = hub.award(a.sid, a.tok, { activity: "OFFER_INCENSE" });
    expect(r.ok && r.amount).toBe(MERIT.values.OFFER_INCENSE + 1); // + streak bonus
    expect(hub.temple).toBe(MERIT.values.OFFER_INCENSE + 1);
  });

  it("refuses an award for a ritual the player is not doing", () => {
    const { hub, advance } = makeHub();
    const a = enter(hub, SECRET_A);
    hub.activity(a.sid, a.tok, { activity: "OFFER_INCENSE", ...at("BURNER") });
    advance(MERIT.ritualMs);
    expect(hub.award(a.sid, a.tok, { activity: "RING_BELL" }).ok).toBe(false);
  });

  it("refuses an award after the player walked off the spot", () => {
    const { hub, advance } = makeHub();
    const a = enter(hub, SECRET_A);
    hub.activity(a.sid, a.tok, { activity: "OFFER_INCENSE", ...at("BURNER") });
    hub.move(a.sid, a.tok, { x: 200, y: 700, dir: "down" });
    advance(MERIT.ritualMs);
    expect(hub.award(a.sid, a.tok, { activity: "OFFER_INCENSE" }).ok).toBe(false);
  });

  it("applies the cooldown", () => {
    const { hub, advance } = makeHub();
    const a = enter(hub, SECRET_A);
    hub.activity(a.sid, a.tok, { activity: "OFFER_INCENSE", ...at("BURNER") });
    advance(MERIT.ritualMs);
    hub.award(a.sid, a.tok, { activity: "OFFER_INCENSE" });
    hub.activity(a.sid, a.tok, { activity: "OFFER_INCENSE", ...at("BURNER") });
    advance(MERIT.ritualMs);
    const again = hub.award(a.sid, a.tok, { activity: "OFFER_INCENSE" });
    expect(again).toEqual({ ok: false, error: "cooldown" });
  });

  it("sends merit only to its owner, the temple total to everyone, and saves both", () => {
    const { hub, advance, saves } = makeHub();
    const a = enter(hub, SECRET_A);
    const b = enter(hub, SECRET_B, "KHACH_THAP_PHUONG", "Lan");
    const ca = client(a.sid);
    const cb = client(b.sid);
    hub.connect(a.sid, a.tok, ca.c);
    hub.connect(b.sid, b.tok, cb.c);
    hub.activity(a.sid, a.tok, { activity: "OFFER_INCENSE", ...at("BURNER") });
    advance(MERIT.ritualMs);
    hub.award(a.sid, a.tok, { activity: "OFFER_INCENSE" });
    expect((ca.last("merit") as { total: number }).total).toBe(4);
    expect((cb.last("merit") as { total: number }).total).toBe(0); // b's own (initial) record only
    expect(cb.last("temple")).toBe(4);
    expect(saves[saves.length - 1].templeMerit).toBe(4);
  });

  it("keeps a browser's merit across visits (same secret)", () => {
    const { hub, advance, saves } = makeHub();
    const a = enter(hub, SECRET_A);
    hub.activity(a.sid, a.tok, { activity: "OFFER_INCENSE", ...at("BURNER") });
    advance(MERIT.ritualMs);
    hub.award(a.sid, a.tok, { activity: "OFFER_INCENSE" });

    const restarted = makeHub(saves[saves.length - 1]).hub; // server restart from saved file
    const again = enter(restarted, SECRET_A);
    const c = client(again.sid);
    restarted.connect(again.sid, again.tok, c.c);
    expect((c.last("merit") as { total: number }).total).toBe(4);
    expect(c.last("temple")).toBe(4);
  });
});

describe("local hub: areas and chat", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("refuses the lotus garden while locked", () => {
    const { hub } = makeHub({ templeMerit: GARDEN_AT - 1 });
    const a = enter(hub, SECRET_A);
    expect(hub.area(a.sid, a.tok, { area: "LOTUS_GARDEN" })).toEqual({ ok: false, error: "area locked" });
  });

  it("enters the garden once unlocked, at the gate's arrival point", () => {
    const { hub } = makeHub({ templeMerit: GARDEN_AT });
    const a = enter(hub, SECRET_A);
    const r = hub.area(a.sid, a.tok, { area: "LOTUS_GARDEN" });
    const arrive = AREAS.COURTYARD.gates[0].arrive;
    expect(r).toEqual({ ok: true, x: arrive.x, y: arrive.y, dir: arrive.facing });
    expect(hub.publicPlayers()[a.sid].area).toBe("LOTUS_GARDEN");
  });

  it("broadcasts chat, masked, and enforces the gap", () => {
    const { hub, advance } = makeHub();
    const a = enter(hub, SECRET_A);
    const b = enter(hub, SECRET_B, "KHACH_THAP_PHUONG", "Lan");
    const cb = client(b.sid);
    hub.connect(b.sid, b.tok, cb.c);
    expect(hub.sendChat(a.sid, a.tok, { text: "oh shit" }).ok).toBe(true);
    expect((cb.last("chat") as { text: string }).text).toBe("oh ****");
    expect(hub.sendChat(a.sid, a.tok, { text: "again" }).ok).toBe(false);
    advance(CHAT.minGapMs);
    expect(hub.sendChat(a.sid, a.tok, { text: "again" }).ok).toBe(true);
  });

  it("refuses a position outside the world", () => {
    const { hub } = makeHub();
    const a = enter(hub, SECRET_A);
    expect(hub.move(a.sid, a.tok, { x: 99999, y: 10, dir: "up" }).ok).toBe(false);
    expect(hub.move(a.sid, a.tok, { x: "NaN", y: 10, dir: "up" }).ok).toBe(false);
  });
});

describe("local hub: visits that end without a goodbye", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reports a visitor dropped after losing their stream, but not one who left on purpose", () => {
    const ended: { name: string; reason: string }[] = [];
    const hub = new LocalHub({ graceMs: 1000, onVisitEnd: (p, reason) => ended.push({ name: p.displayName, reason }) });
    const a = enter(hub, SECRET_A);
    const b = enter(hub, SECRET_B, "KHACH_THAP_PHUONG", "Lan");
    const ca = client(a.sid);
    hub.connect(a.sid, a.tok, ca.c);
    hub.disconnect(ca.c);
    vi.advanceTimersByTime(1100);
    hub.leave(b.sid, b.tok);
    expect(ended).toEqual([{ name: "Tâm", reason: "lost" }]);
  });

  it("reports the old tab when a new tab takes over", () => {
    const ended: string[] = [];
    const hub = new LocalHub({ onVisitEnd: (_p, reason) => ended.push(reason) });
    enter(hub, SECRET_A);
    enter(hub, SECRET_A);
    expect(ended).toEqual(["takenOver"]);
  });
});

describe("local hub: đồng tu (practising together)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("gives each player +1 when a friend does the same ritual in the same area", () => {
    const { hub, advance } = makeHub();
    const a = enter(hub, SECRET_A);
    const b = enter(hub, SECRET_B, "KHACH_THAP_PHUONG", "Lan");
    hub.activity(a.sid, a.tok, { activity: "MEDITATION", ...at("CUSHION_LEFT") });
    hub.activity(b.sid, b.tok, { activity: "MEDITATION", ...at("CUSHION_RIGHT") });
    advance(MERIT.ritualMs);
    const r = hub.award(a.sid, a.tok, { activity: "MEDITATION" });
    expect(r.ok && r.extras.group).toBe(MERIT.groupBonusPer);
  });

  it("gives nothing extra when the friend does a different ritual", () => {
    const { hub, advance } = makeHub();
    const a = enter(hub, SECRET_A);
    const b = enter(hub, SECRET_B, "KHACH_THAP_PHUONG", "Lan");
    hub.activity(a.sid, a.tok, { activity: "MEDITATION", ...at("CUSHION_LEFT") });
    hub.activity(b.sid, b.tok, { activity: "OFFER_INCENSE", ...at("BURNER") });
    advance(MERIT.ritualMs);
    const r = hub.award(a.sid, a.tok, { activity: "MEDITATION" });
    expect(r.ok && r.extras.group).toBe(0);
  });
});

describe("local hub: guestbook, wishes and greetings", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("adds a note everyone receives, masked, one per kind per gap", () => {
    const { hub, advance } = makeHub();
    const a = enter(hub, SECRET_A);
    const b = enter(hub, SECRET_B, "KHACH_THAP_PHUONG", "Lan");
    const cb = client(b.sid);
    hub.connect(b.sid, b.tok, cb.c);
    expect(hub.note(a.sid, a.tok, { kind: "guestbook", text: "Chùa đẹp, shit!" }).ok).toBe(true);
    expect((cb.last("note") as { text: string }).text).toBe("Chùa đẹp, ****!");
    expect(hub.note(a.sid, a.tok, { kind: "guestbook", text: "again" }).ok).toBe(false);
    expect(hub.note(a.sid, a.tok, { kind: "wish", text: "Bình an" }).ok).toBe(true); // other kind is fine
    advance(60_000);
    expect(hub.note(a.sid, a.tok, { kind: "guestbook", text: "again" }).ok).toBe(true);
  });

  it("keeps notes across a server restart and sends them to newcomers", () => {
    const { hub, saves } = makeHub();
    const a = enter(hub, SECRET_A);
    hub.note(a.sid, a.tok, { kind: "wish", text: "Bình an" });
    const restarted = makeHub(saves[saves.length - 1]).hub;
    const b = enter(restarted, SECRET_B, "KHACH_THAP_PHUONG", "Lan");
    const cb = client(b.sid);
    restarted.connect(b.sid, b.tok, cb.c);
    expect((cb.last("notesHistory") as { text: string }[]).map((n) => n.text)).toEqual(["Bình an"]);
  });

  it("refuses an unknown note kind", () => {
    const { hub } = makeHub();
    const a = enter(hub, SECRET_A);
    expect(hub.note(a.sid, a.tok, { kind: "graffiti", text: "x" }).ok).toBe(false);
  });

  it("shows a greeting on the player and limits how often", () => {
    const { hub, advance } = makeHub();
    const a = enter(hub, SECRET_A);
    expect(hub.emote(a.sid, a.tok, { emote: "VAI" }).ok).toBe(true);
    expect(hub.publicPlayers()[a.sid].emote).toBe("VAI");
    expect(hub.emote(a.sid, a.tok, { emote: "VAY_TAY" }).ok).toBe(false);
    advance(1500);
    expect(hub.emote(a.sid, a.tok, { emote: "VAY_TAY" }).ok).toBe(true);
    expect(hub.emote(a.sid, a.tok, { emote: "DANCE" }).ok).toBe(false);
  });
});

describe("local hub: arriving and purification", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("new visitors arrive at the Tam quan", () => {
    const { hub } = makeHub();
    const h = hub.hello(SECRET_A);
    if (!h.ok) throw new Error();
    const j = hub.join(h.sessionId, h.token, { displayName: "Lan", role: "KHACH_THAP_PHUONG" });
    expect(j.ok && j.player.area).toBe("TAM_QUAN");
  });

  it("keeps the main hall shut until sandals are off and hands/feet washed", () => {
    const { hub } = makeHub({ templeMerit: 100 });
    const h = hub.hello(SECRET_A);
    if (!h.ok) throw new Error();
    hub.join(h.sessionId, h.token, { displayName: "Lan", role: "KHACH_THAP_PHUONG" });
    const at2 = (id: "SHOE_RACK" | "WASH_BASIN") => ({ x: SPOTS_BY_ID[id].standX, y: SPOTS_BY_ID[id].standY, dir: "up" });
    hub.area(h.sessionId, h.token, { area: "COURTYARD" });
    expect(hub.area(h.sessionId, h.token, { area: "MAIN_HALL" })).toEqual({ ok: false, error: "not purified" });

    hub.area(h.sessionId, h.token, { area: "TAM_QUAN" });
    expect(hub.activity(h.sessionId, h.token, { activity: "REMOVE_SHOES", ...at2("SHOE_RACK") }).ok).toBe(true);
    expect(hub.publicPlayers()[h.sessionId].shoesOff).toBe(true);
    hub.area(h.sessionId, h.token, { area: "COURTYARD" });
    expect(hub.area(h.sessionId, h.token, { area: "MAIN_HALL" }).ok).toBe(false); // still not washed

    hub.area(h.sessionId, h.token, { area: "TAM_QUAN" });
    hub.activity(h.sessionId, h.token, { activity: "WASH_HANDS_FEET", ...at2("WASH_BASIN") });
    hub.area(h.sessionId, h.token, { area: "COURTYARD" });
    expect(hub.area(h.sessionId, h.token, { area: "MAIN_HALL" }).ok).toBe(true);
  });

  it("outdoor areas need no purification", () => {
    const { hub } = makeHub({ templeMerit: 100 });
    const a = enter(hub, SECRET_A);
    expect(hub.area(a.sid, a.tok, { area: "LOTUS_GARDEN" }).ok).toBe(true);
  });
});

describe("local hub: cân đẩu vân (flying between areas)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Saved merit for SECRET_A, keyed the way the hub keys it. */
  const meritFor = (secret: string, total: number) => ({
    [createHash("sha256").update(`merit:${secret}`).digest("hex").slice(0, 24)]: {
      total,
      day: { index: 0, earned: 0 },
      streak: { count: 0, lastIndex: -1 },
      lastAward: {},
    },
  });

  it("refuses the cloud below the merit it needs", () => {
    const { hub } = makeHub({ templeMerit: 100, merit: meritFor(SECRET_A, CLOUD.minMerit - 1) } as Partial<SavedState>);
    const a = enter(hub, SECRET_A);
    expect(hub.area(a.sid, a.tok, { area: "HOA_QUA_SON", fly: true })).toEqual({ ok: false, error: "cloud locked" });
  });

  it("flies to a far, open area and lands at its landing point", () => {
    const { hub } = makeHub({ templeMerit: 100, merit: meritFor(SECRET_A, CLOUD.minMerit) } as Partial<SavedState>);
    const a = enter(hub, SECRET_A);
    const r = hub.area(a.sid, a.tok, { area: "HOA_QUA_SON", fly: true });
    const land = landingFor("HOA_QUA_SON");
    expect(r).toEqual({ ok: true, x: land.x, y: land.y, dir: land.facing });
    expect(hub.publicPlayers()[a.sid].area).toBe("HOA_QUA_SON");
  });

  it("still keeps locked areas and the halls (before purification) shut to the cloud", () => {
    const { hub } = makeHub({ templeMerit: 0, merit: meritFor(SECRET_A, 100) } as Partial<SavedState>);
    const a = enter(hub, SECRET_A);
    expect(hub.area(a.sid, a.tok, { area: "HOA_QUA_SON", fly: true })).toEqual({ ok: false, error: "area locked" });
    expect(hub.area(a.sid, a.tok, { area: "TAM_QUAN", fly: true }).ok).toBe(true); // always open
    const { hub: rich } = makeHub({ templeMerit: 100, merit: meritFor(SECRET_A, 100) } as Partial<SavedState>);
    const b = enter(rich, SECRET_A);
    expect(rich.area(b.sid, b.tok, { area: "MAIN_HALL", fly: true })).toEqual({ ok: false, error: "not purified" });
  });
});
