import { describe, expect, it } from "vitest";
import { blessings } from "@/data/blessings";
import { songs } from "@/data/songs";
import {
  CLOSES_AT,
  EmptyPoolError,
  OPENS_AT,
  drawFortune,
  parseIndexParam,
  phaseAt,
  pickIndex,
  resolveMode,
  secureRandomInt,
} from "@/lib/event";
import { NAME_MAX_LENGTH, normalizeName } from "@/lib/types";

describe("data", () => {
  it("has 27 songs and 27 blessings → 729 first-draw combinations", () => {
    expect(songs).toHaveLength(27);
    expect(blessings).toHaveLength(27);
    expect(songs.length * blessings.length).toBe(729);
  });

  it("uses unique 11-character YouTube IDs", () => {
    const ids = songs.map((s) => s.videoId);
    expect(new Set(ids).size).toBe(27);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{11}$/);
  });

  it("keeps the original order at both ends", () => {
    expect(songs[0]).toEqual({ title: "이루리", artist: "우주소녀", videoId: "2Q9G6R2hKIQ" });
    expect(songs[26]).toEqual({ title: "Welcome to the Show", artist: "DAY6", videoId: "RowlrvmyFEk" });
    expect(blessings[16]).toBe("당신이 오래 품은 꿈에 올해는 첫 장면이 생기길.");
  });
});

describe("mode and period", () => {
  it("defaults to test and only an explicit live enables the window", () => {
    expect(resolveMode(undefined)).toBe("test");
    expect(resolveMode("")).toBe("test");
    expect(resolveMode("production")).toBe("test");
    expect(resolveMode("live")).toBe("live");
    expect(resolveMode(" LIVE ")).toBe("live");
  });

  it("matches both Korean midnights independent of the machine time zone", () => {
    expect(OPENS_AT).toBe(Date.parse("2026-12-31T15:00:00Z"));
    expect(CLOSES_AT).toBe(Date.parse("2027-01-01T15:00:00Z"));
    expect(phaseAt("live", Date.parse("2026-12-31T23:59:59.999+09:00"))).toBe("waiting");
    expect(phaseAt("live", Date.parse("2027-01-01T00:00:00+09:00"))).toBe("open");
    expect(phaseAt("live", Date.parse("2027-01-01T23:59:59.999+09:00"))).toBe("open");
    expect(phaseAt("live", Date.parse("2027-01-02T00:00:00+09:00"))).toBe("closed");
  });

  it("is always open in test mode", () => {
    for (const now of [0, OPENS_AT - 1, OPENS_AT, CLOSES_AT, Date.parse("2030-01-01T00:00:00Z")]) {
      expect(phaseAt("test", now)).toBe("open");
    }
  });
});

describe("name rule", () => {
  it("trims and accepts 1–24 characters (JS string length)", () => {
    expect(normalizeName(" 다온 ")).toBe("다온");
    expect(normalizeName("양".repeat(NAME_MAX_LENGTH))).toBe("양".repeat(24));
    expect(normalizeName(`  ${"양".repeat(24)}  `)).toBe("양".repeat(24));
  });

  it("rejects empty, blank, too long and non-string values", () => {
    for (const value of ["", "   ", "\t\n", "양".repeat(25), null, undefined, 15, ["다온"], { name: "다온" }]) {
      expect(normalizeName(value)).toBeNull();
    }
  });
});

describe("pickIndex", () => {
  it("draws from 0..n-2 and shifts at or above the excluded slot", () => {
    const fixed = (v: number) => () => v;
    expect(pickIndex(5, 2, fixed(0))).toBe(0);
    expect(pickIndex(5, 2, fixed(1))).toBe(1);
    expect(pickIndex(5, 2, fixed(2))).toBe(3);
    expect(pickIndex(5, 2, fixed(3))).toBe(4);
  });

  it("asks the generator for n-1 values when excluding, n otherwise", () => {
    const seen: number[] = [];
    const spy = (max: number) => {
      seen.push(max);
      return 0;
    };
    pickIndex(27, 3, spy);
    pickIndex(27, undefined, spy);
    expect(seen).toEqual([26, 27]);
  });

  it("ignores invalid exclusions", () => {
    const seen: number[] = [];
    const spy = (max: number) => {
      seen.push(max);
      return max - 1;
    };
    for (const bad of [-1, 27, 1.5, Number.NaN]) pickIndex(27, bad, spy);
    expect(seen).toEqual([27, 27, 27, 27]);
  });

  it("returns the only item and fails on an empty pool", () => {
    expect(pickIndex(1, 0)).toBe(0);
    expect(() => pickIndex(0)).toThrow(EmptyPoolError);
  });

  it("is roughly uniform with the real generator and never repeats the excluded value", () => {
    const counts = new Array(27).fill(0);
    const runs = 27_000;
    for (let i = 0; i < runs; i++) {
      const v = pickIndex(27, 5, secureRandomInt);
      expect(v).not.toBe(5);
      counts[v]++;
    }
    expect(counts[5]).toBe(0);
    const expected = runs / 26;
    for (const [i, c] of counts.entries()) if (i !== 5) expect(Math.abs(c - expected)).toBeLessThan(expected * 0.2);
  });
});

describe("drawFortune", () => {
  it("excludes the previous song and blessing independently on every redraw", () => {
    let prev = drawFortune();
    for (let i = 0; i < 300; i++) {
      const next = drawFortune(prev);
      expect(next.songIndex).not.toBe(prev.songIndex);
      expect(next.blessingIndex).not.toBe(prev.blessingIndex);
      expect(next.song).toEqual(songs[next.songIndex]);
      expect(next.blessing).toBe(blessings[next.blessingIndex]);
      prev = next;
    }
  });

  it("does not exhaust the list: a value can come back after one other draw", () => {
    // With a generator that always returns 0, picks alternate 0,1,0,1…
    const zero = () => 0;
    const a = drawFortune({}, zero);
    const b = drawFortune(a, zero);
    const c = drawFortune(b, zero);
    expect([a.songIndex, b.songIndex, c.songIndex]).toEqual([0, 1, 0]);
  });
});

describe("parseIndexParam", () => {
  it("accepts plain integers only", () => {
    expect(parseIndexParam("0")).toBe(0);
    expect(parseIndexParam("16")).toBe(16);
    for (const bad of [null, "", "-1", "1.5", "abc", "1e3", " 3"]) expect(parseIndexParam(bad)).toBeUndefined();
  });
});

describe("wishes (내년 1순위 소망)", () => {
  it("offers several wishes that together cover every song and blessing", async () => {
    const { hopes } = await import("@/data/hopes");
    expect(hopes.length).toBeGreaterThanOrEqual(6);
    expect(new Set(hopes.map((h) => h.key)).size).toBe(hopes.length);
    const songIdx = new Set(hopes.flatMap((h) => [...h.songs]));
    const blessIdx = new Set(hopes.flatMap((h) => [...h.blessings]));
    expect(songIdx.size).toBe(songs.length);
    expect(blessIdx.size).toBe(blessings.length);
    for (const h of hopes) {
      expect(h.songs.length).toBeGreaterThanOrEqual(4);
      expect(h.blessings.length).toBeGreaterThanOrEqual(4);
      for (const i of h.songs) expect(i).toBeLessThan(songs.length);
      for (const i of h.blessings) expect(i).toBeLessThan(blessings.length);
    }
  });

  it("draws only from the wish's songs and blessings and skips the previous pick", async () => {
    const { hopes } = await import("@/data/hopes");
    for (const hope of hopes) {
      let prev = drawFortune({}, undefined, undefined, undefined, hope);
      for (let i = 0; i < 40; i++) {
        const next = drawFortune(prev, undefined, undefined, undefined, hope);
        expect(hope.songs).toContain(next.songIndex);
        expect(hope.blessings).toContain(next.blessingIndex);
        expect(next.songIndex).not.toBe(prev.songIndex);
        expect(next.blessingIndex).not.toBe(prev.blessingIndex);
        prev = next;
      }
    }
  });

  it("pickFrom ignores invalid indices, keeps a lone choice and fails when nothing is left", async () => {
    const { pickFrom } = await import("@/lib/event");
    expect(pickFrom([3, 99, -1], 10, 3)).toBe(3);
    expect(() => pickFrom([50], 10)).toThrow(EmptyPoolError);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(pickFrom([1, 2, 3], 10, 2));
    expect([...seen].sort()).toEqual([1, 3]);
  });
});
