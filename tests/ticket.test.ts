import { describe, expect, it } from "vitest";
import { blessings } from "@/data/blessings";
import { songs } from "@/data/songs";
import { MASCOT_BOX, TICKET_HEIGHT, layoutTicket, ticketFileName, wrapText, type Measure } from "@/lib/ticket";
import type { Ticket } from "@/lib/types";

// Approximate bold glyph widths: Hangul ≈ 1em, Latin capitals ≈ .7em, others ≈ .56em, space ≈ .3em.
const measure: Measure = (text, font) => {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16);
  let w = 0;
  for (const ch of text) {
    if (/[ㄱ-힝]/.test(ch)) w += 1;
    else if (ch === " ") w += 0.3;
    else if (/[A-Z]/.test(ch)) w += 0.7;
    else w += 0.56;
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

const longest = <T,>(items: readonly T[], key: (t: T) => string) =>
  items.reduce((best, item, i) => (measure(key(item), "700 10px x") > measure(key(items[best]!), "700 10px x") ? i : best), 0);

function assertNoOverlap(t: Ticket) {
  const layout = layoutTicket(t, measure);
  const order = ["title", "artist", "heading", "blessing"] as const;
  const blocks = order.map((role) => layout.blocks.find((b) => b.role === role)!);
  // The PNG has a transparent margin under the feet; the reference title baseline (505) sits just below the box.
  expect(blocks[0]!.top).toBeGreaterThan(MASCOT_BOX.y + MASCOT_BOX.h - 10);
  for (let i = 1; i < blocks.length; i++) expect(blocks[i]!.top).toBeGreaterThan(blocks[i - 1]!.bottom);
  // The rule sits between the artist and the heading.
  expect(layout.rule.y).toBeGreaterThan(blocks[1]!.bottom);
  expect(layout.rule.y + layout.rule.h).toBeLessThan(blocks[2]!.top);
  // Body text stays above the footer and inside the frame.
  const footer = layout.texts.find((x) => x.role === "footer")!;
  expect(blocks[3]!.bottom).toBeLessThan(footer.y - footer.size);
  expect(footer.y).toBeLessThan(TICKET_HEIGHT - 30);
  for (const text of layout.texts) {
    if (text.role === "header" || text.role === "footer") continue;
    expect(measure(text.text, text.font)).toBeLessThanOrEqual(740);
  }
  return layout;
}

describe("ticket layout", () => {
  it("keeps the reference positions for a typical ticket", () => {
    const layout = assertNoOverlap(make("다온", 0, 16));
    const title = layout.texts.find((t) => t.role === "title")!;
    const heading = layout.texts.find((t) => t.role === "heading")!;
    expect(title.y).toBe(505);
    expect(title.size).toBe(49);
    expect(layout.rule.y).toBe(695);
    expect(heading.y).toBe(749);
    expect(heading.text).toBe("다온님에게 보내는 덕담");
    expect(layout.texts.find((t) => t.role === "blessing")!.y).toBe(818);
    expect(layout.texts.find((t) => t.role === "footer")!.y).toBe(1010);
  });

  it("does not overlap with the longest name, title, artist and blessing", () => {
    const name24 = "가나다라마바사아자차카타파하가나다라마바사아자차";
    expect(name24).toHaveLength(24);
    const mixed24 = "Daon Kim 다온 the Lucky Sh";
    expect(mixed24).toHaveLength(24);
    const titleIdx = longest(songs, (s) => s.title);
    const blessingIdx = longest(blessings, (b) => b);
    for (const name of [name24, mixed24, "다"]) {
      for (let s = 0; s < songs.length; s++) assertNoOverlap(make(name, s, blessingIdx));
      for (let b = 0; b < blessings.length; b++) assertNoOverlap(make(name, titleIdx, b));
    }
  });

  it("wraps at spaces and breaks only words that cannot fit", () => {
    expect(wrapText("Welcome to the Show", 200, "700 30px x", measure)).toEqual(["Welcome to", "the Show"]);
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
