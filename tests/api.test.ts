import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as drawRoute from "@/app/api/draw/route";
import * as eventRoute from "@/app/api/event/route";
import { CLOSES_AT, OPENS_AT, handleDraw, handleEvent } from "@/lib/event";
import type { EventState, Ticket } from "@/lib/types";

const post = (body: unknown, query = "") =>
  new Request(`http://localhost/api/draw${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const expectNoStore = (res: Response) => expect(res.headers.get("cache-control")).toBe("private, no-store");

describe("GET /api/event", () => {
  it("returns mode, phase, period, clock, counts and tracks in epoch ms", async () => {
    const res = handleEvent({ mode: "test", now: 1234 });
    expect(res.status).toBe(200);
    expectNoStore(res);
    const body = (await res.json()) as EventState;
    expect(body).toMatchObject({ mode: "test", phase: "open", opensAt: OPENS_AT, closesAt: CLOSES_AT, now: 1234, songCount: 27, blessingCount: 27 });
    expect(body.tracks).toHaveLength(27);
    expect(body.tracks[0]).toEqual({ title: "이루리", artist: "우주소녀", videoId: "2Q9G6R2hKIQ" });
  });

  it("reports waiting/closed in live mode", async () => {
    expect(((await handleEvent({ mode: "live", now: OPENS_AT - 1 }).json()) as EventState).phase).toBe("waiting");
    expect(((await handleEvent({ mode: "live", now: CLOSES_AT }).json()) as EventState).phase).toBe("closed");
  });
});

describe("POST /api/draw", () => {
  it("draws for a trimmed valid name", async () => {
    const res = await handleDraw(post({ name: " 다온 " }), { mode: "test" });
    expect(res.status).toBe(200);
    expectNoStore(res);
    const ticket = (await res.json()) as Ticket;
    expect(ticket.name).toBe("다온");
    expect(Object.keys(ticket).sort()).toEqual(["blessing", "blessingIndex", "name", "song", "songIndex"]);
    expect(ticket.song.videoId).toMatch(/^[\w-]{11}$/);
  });

  it("rejects bad names and bad JSON with 400", async () => {
    for (const body of [{ name: "" }, { name: "   " }, { name: "양".repeat(25) }, { name: null }, { name: 15 }, {}, [], "not json", "", "null"]) {
      const res = await handleDraw(post(body), { mode: "test" });
      expect(res.status, JSON.stringify(body)).toBe(400);
      expectNoStore(res);
    }
    const empty = new Request("http://localhost/api/draw", { method: "POST" });
    expect((await handleDraw(empty, { mode: "test" })).status).toBe(400);
    const huge = post({ name: "다온", pad: "x".repeat(5000) });
    expect((await handleDraw(huge, { mode: "test" })).status).toBe(400);
  });

  it("enforces the Korean-time window in live mode only", async () => {
    const cases: [string, number][] = [
      ["2026-12-31T23:59:59.999+09:00", 403],
      ["2027-01-01T00:00:00.000+09:00", 200],
      ["2027-01-01T23:59:59.999+09:00", 200],
      ["2027-01-02T00:00:00.000+09:00", 403],
    ];
    for (const [time, status] of cases) {
      const res = await handleDraw(post({ name: "다온" }), { mode: "live", now: Date.parse(time) });
      expect(res.status, time).toBe(status);
      if (status === 403) expect(((await res.json()) as { phase: string }).phase).toMatch(/waiting|closed/);
    }
    expect((await handleDraw(post({ name: "다온" }), { mode: "test", now: Date.parse("2026-11-22T12:00:00+09:00") })).status).toBe(200);
  });

  it("excludes the previous indexes passed in the query (test mode)", async () => {
    for (let i = 0; i < 60; i++) {
      const res = await handleDraw(post({ name: "다온" }, "?song=0&wish=16"), { mode: "test" });
      const t = (await res.json()) as Ticket;
      expect(t.songIndex).not.toBe(0);
      expect(t.blessingIndex).not.toBe(16);
    }
  });

  it("ignores redraw hints in live mode", async () => {
    const seen: number[] = [];
    const random = (max: number) => {
      seen.push(max);
      return 0;
    };
    await handleDraw(post({ name: "다온" }, "?song=0&wish=16"), { mode: "live", now: OPENS_AT, random });
    expect(seen).toEqual([27, 27]);
  });

  it("returns a failure (not a ticket) when a pool is empty", async () => {
    const res = await handleDraw(post({ name: "다온" }), { mode: "test", songs: [] });
    expect(res.status).toBe(500);
    expect(await res.json()).not.toHaveProperty("song");
  });

  it("returns the only entry when a pool has one item", async () => {
    const one = [{ title: "곡", artist: "가수", videoId: "AAAAAAAAAAA" }];
    const res = await handleDraw(post({ name: "다온" }, "?song=0&wish=0"), { mode: "test", songs: one, blessings: ["덕담"] });
    const t = (await res.json()) as Ticket;
    expect([t.songIndex, t.blessingIndex, t.blessing]).toEqual([0, 0, "덕담"]);
  });
});

describe("route modules", () => {
  const original = process.env.EVENT_MODE;
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    if (original === undefined) delete process.env.EVENT_MODE;
    else process.env.EVENT_MODE = original;
  });

  it("run in test mode when EVENT_MODE is unset", async () => {
    delete process.env.EVENT_MODE;
    vi.setSystemTime(new Date("2026-11-22T12:00:00+09:00"));
    const info = (await eventRoute.GET().json()) as EventState;
    expect(info.mode).toBe("test");
    expect((await drawRoute.POST(post({ name: "다온" }))).status).toBe(200);
  });

  it("read EVENT_MODE=live and the real clock", async () => {
    process.env.EVENT_MODE = "live";
    vi.setSystemTime(new Date("2026-12-31T23:59:59.999+09:00"));
    expect(((await eventRoute.GET().json()) as EventState).phase).toBe("waiting");
    expect((await drawRoute.POST(post({ name: "다온" }))).status).toBe(403);
    vi.setSystemTime(new Date("2027-01-01T00:00:00+09:00"));
    expect((await drawRoute.POST(post({ name: "다온" }))).status).toBe(200);
  });

  it("answer other methods with 405 and an Allow header", async () => {
    const r1 = drawRoute.GET();
    expect(r1.status).toBe(405);
    expect(r1.headers.get("allow")).toBe("POST");
    expectNoStore(r1);
    const r2 = eventRoute.POST();
    expect(r2.status).toBe(405);
    expect(r2.headers.get("allow")).toBe("GET");
    expect((await handleDraw(new Request("http://localhost/api/draw"), { mode: "test" })).status).toBe(405);
  });
});

describe("POST /api/draw with a wish", () => {
  it("answers with a song and blessing that suit the chosen wish", async () => {
    const { hopes } = await import("@/data/hopes");
    for (const hope of hopes) {
      const res = await handleDraw(post({ name: "다온", hope: hope.key }), { mode: "test" });
      expect(res.status).toBe(200);
      const t = (await res.json()) as Ticket;
      expect(t.hope).toBe(hope.key);
      expect(hope.songs).toContain(t.songIndex);
      expect(hope.blessings).toContain(t.blessingIndex);
    }
  });

  it("rejects an unknown wish, and still works without one", async () => {
    for (const hope of ["money", 3, "", true]) {
      expect((await handleDraw(post({ name: "다온", hope }), { mode: "test" })).status, String(hope)).toBe(400);
    }
    const res = await handleDraw(post({ name: "다온" }), { mode: "test" });
    expect(res.status).toBe(200);
    expect(await res.json()).not.toHaveProperty("hope");
  });
});
