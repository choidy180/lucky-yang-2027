import { describe, expect, it } from "vitest";
import {
  SHARE_FROM_MAX,
  SHARE_MESSAGE_MAX,
  decodeNote,
  encodeNote,
  normalizeNote,
  parsePick,
  sharePath,
  shareText,
  shareUrl,
} from "@/lib/share";

const pick = { songIndex: 3, blessingIndex: 12, hope: "love" };

describe("share links", () => {
  it("puts only catalog indices in the query and the note in the fragment", () => {
    const url = new URL(shareUrl("https://example.com/", pick, { from: "양띠 친구", message: "새해 복 많이 받아!\n이 노래 꼭 들어 봐" }));
    expect(url.pathname).toBe("/s");
    expect(Object.fromEntries(url.searchParams)).toEqual({ s: "3", b: "12", h: "love" });
    expect(url.search).not.toContain("양띠");
    expect(url.hash.startsWith("#n=")).toBe(true);
    expect(decodeNote(url.hash)).toEqual({ from: "양띠 친구", message: "새해 복 많이 받아!\n이 노래 꼭 들어 봐" });
  });

  it("has no fragment when there is no note, and drops unknown hopes", () => {
    expect(shareUrl("https://example.com", pick)).toBe("https://example.com/s?s=3&b=12&h=love");
    expect(sharePath({ songIndex: 0, blessingIndex: 1, hope: "nope" })).toBe("/s?s=0&b=1");
    expect(encodeNote({ from: "  ", message: "\n\n" })).toBe("");
  });

  it("round-trips emoji and clamps lengths by character", () => {
    const long = "🐑".repeat(SHARE_MESSAGE_MAX + 20);
    const note = decodeNote(`#${encodeNote({ from: "가".repeat(40), message: long })}`);
    expect(Array.from(note.from)).toHaveLength(SHARE_FROM_MAX);
    expect(Array.from(note.message)).toHaveLength(SHARE_MESSAGE_MAX);
    expect(note.message.startsWith("🐑")).toBe(true);
  });

  it("normalizes whitespace", () => {
    expect(normalizeNote({ from: " 김\n양 ", message: "a\r\n\n\n\nb  " })).toEqual({ from: "김 양", message: "a\n\nb" });
  });

  it("treats a damaged fragment as an empty note", () => {
    for (const hash of ["", "#", "#n=", "#n=%%%", "#n=bm90IGpzb24", "#n=WzEsMl0", "#x=1"]) {
      expect(decodeNote(hash)).toEqual({ from: "", message: "" });
    }
  });

  it("validates the query against the catalog", () => {
    expect(parsePick({ s: "3", b: "12", h: "love" }, 27, 27)).toEqual(pick);
    expect(parsePick({ s: "26", b: "0", h: "unknown" }, 27, 27)).toEqual({ songIndex: 26, blessingIndex: 0 });
    for (const bad of [{ s: "27", b: "0" }, { s: "-1", b: "0" }, { s: "1.5", b: "0" }, { s: "1" }, { s: ["1", "2"], b: "0" }, { s: "abc", b: "1" }]) {
      expect(parsePick(bad, 27, 27)).toBeNull();
    }
  });

  it("writes a share text with the song and the optional message", () => {
    const song = { title: "봄날", artist: "방탄소년단" };
    expect(shareText(song, {})).toBe("나의 2027 새해 첫 곡은 「봄날」 - 방탄소년단!");
    expect(shareText(song, { from: "민", message: "고마워" })).toBe("민의 2027 새해 첫 곡은 「봄날」 - 방탄소년단!\n고마워");
  });
});
