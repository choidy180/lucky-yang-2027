import { describe, expect, it } from "vitest";
import { kakaoFeed } from "@/lib/kakao";

describe("KakaoTalk share card", () => {
  const base = { url: "https://example.com/s?s=1&b=2#n=abc", homeUrl: "https://example.com/", imageUrl: "https://example.com/og.png", songTitle: "봄날" };

  it("names the sender and the song, carries the message and links every part to the share URL", () => {
    const feed = kakaoFeed({ ...base, from: "양띠 친구", message: "새해 복 많이 받아!" });
    expect(feed.objectType).toBe("feed");
    expect(feed.content.title).toBe("양띠 친구님의 2027 새해 첫 곡은 「봄날」");
    expect(feed.content.description).toBe("새해 복 많이 받아!");
    expect(feed.content.imageUrl).toBe(base.imageUrl);
    expect(feed.content.link).toEqual({ mobileWebUrl: base.url, webUrl: base.url });
    expect(feed.buttons?.map((b) => [b.title, b.link.mobileWebUrl])).toEqual([
      ["첫 곡 확인하기", base.url],
      ["나도 첫 곡 받기", base.homeUrl],
    ]);
  });

  it("falls back to a friendly title and invitation without a sender or message", () => {
    const feed = kakaoFeed({ ...base, from: "", message: "" });
    expect(feed.content.title).toBe("친구의 2027 새해 첫 곡은 「봄날」");
    expect(feed.content.description).toContain("복주머니");
  });
});
