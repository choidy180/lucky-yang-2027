import { beforeEach, describe, expect, it } from "vitest";
import { blessings } from "@/data/blessings";
import { songs } from "@/data/songs";
import { clearMemory, lastKey, legacyKey, readLastDraw, rememberDraw } from "@/lib/storage";
import type { Ticket } from "@/lib/types";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const blocked = {
  getItem(): string | null {
    throw new Error("SecurityError");
  },
  setItem(): void {
    throw new Error("SecurityError");
  },
  removeItem(): void {
    throw new Error("SecurityError");
  },
};

const catalog = { tracks: songs, blessingCount: blessings.length };
const ticket = (songIndex: number, blessingIndex: number, name = "다온"): Ticket => ({
  name,
  songIndex,
  blessingIndex,
  song: songs[songIndex]!,
  blessing: blessings[blessingIndex]!,
});

beforeEach(() => clearMemory());

describe("browser memory", () => {
  it("stores the last draw per mode without the name", () => {
    const s = new MemoryStorage();
    rememberDraw("test", ticket(0, 16), s);
    rememberDraw("live", ticket(3, 4), s);
    const raw = s.getItem(lastKey("test"))!;
    expect(raw).not.toContain("다온");
    expect(JSON.parse(raw)).not.toHaveProperty("name");
    expect(readLastDraw("test", catalog, s)).toMatchObject({ songIndex: 0, blessingIndex: 16 });
    expect(readLastDraw("live", catalog, s)).toMatchObject({ songIndex: 3, blessingIndex: 4 });
  });

  it("keeps only one entry: a newer draw replaces the older one", () => {
    const s = new MemoryStorage();
    rememberDraw("test", ticket(0, 16), s);
    rememberDraw("test", ticket(5, 2), s);
    expect([...s.data.keys()]).toEqual([lastKey("test")]);
    expect(readLastDraw("test", catalog, s)).toMatchObject({ songIndex: 5, blessingIndex: 2 });
  });

  it("reads the legacy v1 array only when the current key is empty", () => {
    const s = new MemoryStorage();
    const { name: _name, ...old } = ticket(7, 9);
    s.setItem(legacyKey("live"), JSON.stringify([old, { ...old, songIndex: 1 }]));
    expect(readLastDraw("live", catalog, s)).toMatchObject({ songIndex: 7, blessingIndex: 9 });

    rememberDraw("live", ticket(2, 3), s);
    expect(readLastDraw("live", catalog, s)).toMatchObject({ songIndex: 2, blessingIndex: 3 });
  });

  it("discards corrupt JSON, out-of-range indexes and changed video IDs", () => {
    const s = new MemoryStorage();
    const { name: _name, ...good } = ticket(1, 1);
    const bad = [
      "{not json",
      JSON.stringify({ ...good, songIndex: 27 }),
      JSON.stringify({ ...good, blessingIndex: -1 }),
      JSON.stringify({ ...good, songIndex: 1.5 }),
      JSON.stringify({ ...good, song: { ...good.song, videoId: "XXXXXXXXXXX" } }),
      JSON.stringify({ ...good, blessing: 3 }),
      JSON.stringify(null),
    ];
    for (const raw of bad) {
      s.setItem(lastKey("test"), raw);
      expect(readLastDraw("test", catalog, s), raw).toBeNull();
      expect(s.getItem(lastKey("test"))).toBeNull();
    }
    s.setItem(legacyKey("test"), "[{\"songIndex\":99}]");
    expect(readLastDraw("test", catalog, s)).toBeNull();
    expect(s.getItem(legacyKey("test"))).toBeNull();
  });

  it("falls back to tab memory when storage is blocked", () => {
    expect(() => rememberDraw("test", ticket(4, 6), blocked)).not.toThrow();
    expect(readLastDraw("test", catalog, blocked)).toMatchObject({ songIndex: 4, blessingIndex: 6 });
    expect(readLastDraw("live", catalog, blocked)).toBeNull();
    expect(readLastDraw("test", catalog, null)).toMatchObject({ songIndex: 4 });
  });
});

describe("the chosen wish", () => {
  it("is kept with the last draw and an unknown one is discarded", () => {
    const s = new MemoryStorage();
    rememberDraw("test", { ...ticket(9, 7), hope: "love" }, s);
    expect(readLastDraw("test", catalog, s)).toMatchObject({ songIndex: 9, hope: "love" });
    const { name: _n, ...draw } = ticket(9, 7);
    s.setItem(lastKey("test"), JSON.stringify({ ...draw, hope: "lottery" }));
    expect(readLastDraw("test", catalog, s)).toBeNull();
  });
});
