import { describe, expect, it } from "vitest";
import { blessings } from "@/data/blessings";
import { songs } from "@/data/songs";
import { CONTENT_LIMIT, SCENE_BOX, SCENE_SCALE, TICKET_HEIGHT, TICKET_WIDTH, layoutTicket, ticketFileName, wrapText, type Measure } from "@/lib/ticket";
import type { Ticket } from "@/lib/types";

// Galmuri-like widths: Hangul 1em, Latin ≈ .5em (capitals .6em), space .4em.
const measure: Measure = (text, font) => {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 12);
  let w = 0;
  for (const ch of text) {
    if (/[ㄱ-힝]/.test(ch)) w += 1;
    else if (ch === " ") w += 0.4;
    else if (/[A-Z]/.test(ch)) w += 0.6;
    else w += 0.5;
  }
  return w * size;
};

const make = (name: string, songIndex: number, blessingIndex: number): Ticket => ({
  name,
  songIndex,
  blessingIndex,
  song: songs[songIndex]!,
  blessing: blessings[blessingIndex]!,
});

function assertNoOverlap(t: Ticket) {
  const layout = layoutTicket(t, measure);
  const order = ["title", "artist", "heading", "blessing"] as const;
  const blocks = order.map((role) => layout.blocks.find((b) => b.role === role)!);
  expect(blocks[0]!.top).toBeGreaterThan(SCENE_BOX.y + SCENE_BOX.h + 6);
  for (let i = 1; i < blocks.length; i++) expect(blocks[i]!.top).toBeGreaterThan(blocks[i - 1]!.bottom);
  // The dashed rule sits between the artist and the heading.
  expect(layout.rule.y).toBeGreaterThan(blocks[1]!.bottom);
  expect(layout.rule.y + layout.rule.h).toBeLessThan(blocks[2]!.top);
  // Body text stays above the footer and inside the frame.
  const footer = layout.texts.find((x) => x.role === "footer")!;
  expect(blocks[3]!.bottom).toBeLessThanOrEqual(CONTENT_LIMIT);
  expect(footer.y).toBeLessThan(TICKET_HEIGHT - 40);
  for (const text of layout.texts) expect(measure(text.text, text.font)).toBeLessThanOrEqual(740);
  return layout;
}

describe("ticket layout", () => {
  it("is a 900×1100 ticket with the pixel scene at ×8", () => {
    expect([TICKET_WIDTH, TICKET_HEIGHT]).toEqual([900, 1100]);
    expect(SCENE_BOX.w % SCENE_SCALE).toBe(0);
    expect(SCENE_BOX.h % SCENE_SCALE).toBe(0);
  });

  it("uses pixel-font sizes (multiples of 6) and the base positions for a typical ticket", () => {
    const layout = assertNoOverlap(make("다온", 0, 16));
    const title = layout.texts.find((t) => t.role === "title")!;
    const heading = layout.texts.find((t) => t.role === "heading")!;
    expect(layout.level).toBe(0);
    expect(title.y).toBe(642);
    expect(title.size).toBe(48);
    expect(layout.rule.y).toBe(744);
    expect(heading.text).toBe("다온님에게 보내는 덕담");
    expect(heading.y).toBe(796);
    expect(layout.texts.find((t) => t.role === "footer")!.y).toBe(1040);
    for (const t of layout.texts) expect(t.size % 6).toBe(0);
  });

  it("does not overlap with the longest names, titles and blessings", () => {
    const name24 = "가나다라마바사아자차카타파하가나다라마바사아자차";
    const mixed24 = "Daon Kim 다온 the Lucky Sh";
    expect([name24.length, mixed24.length]).toEqual([24, 24]);
    for (const name of [name24, mixed24, "다"]) {
      for (let s = 0; s < songs.length; s++) {
        for (let b = 0; b < blessings.length; b += 3) assertNoOverlap(make(name, s, b));
      }
    }
  });

  it("wraps at spaces and breaks only words that cannot fit", () => {
    expect(wrapText("Welcome to the Show", 160, "700 30px x", measure)).toEqual(["Welcome to", "the Show"]);
    const parts = wrapText("가나다라마바사아자차카타파하", 100, "700 25px x", measure);
    expect(parts.join("")).toBe("가나다라마바사아자차카타파하");
    for (const p of parts) expect(measure(p, "700 25px x")).toBeLessThanOrEqual(100);
  });
});

describe("ticket file name", () => {
  it("is 2027-새해첫곡-{곡명}.png without characters a file system rejects", () => {
    expect(ticketFileName("이루리")).toBe("2027-새해첫곡-이루리.png");
    expect(ticketFileName("수고했어, 오늘도")).toBe("2027-새해첫곡-수고했어, 오늘도.png");
    expect(ticketFileName('a/b\\c:d*e?"f<g>h|i')).toBe("2027-새해첫곡-abcdefghi.png");
    expect(ticketFileName("  ...  ")).toBe("2027-새해첫곡-티켓.png");
  });
});

describe("ticket wish line", () => {
  it("shows 내년 1순위 소망 above the title when a wish was chosen", () => {
    const layout = layoutTicket({ ...make("다온", 9, 7), hope: "love" }, measure);
    const line = layout.texts.find((t) => t.role === "hope")!;
    expect(line.text).toBe("내년 1순위 소망 · 사랑");
    expect(line.y).toBeGreaterThan(SCENE_BOX.y + SCENE_BOX.h);
    expect(line.y).toBeLessThan(layout.blocks.find((b) => b.role === "title")!.top);
    expect(layoutTicket(make("다온", 9, 7), measure).texts.some((t) => t.role === "hope")).toBe(false);
  });
});
