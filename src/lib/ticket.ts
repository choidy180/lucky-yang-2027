// 900×1100 PNG ticket. Layout is computed from measured text widths (pure, testable),
// then painted on a canvas in the browser.
import type { Ticket } from "./types";

export const TICKET_WIDTH = 900;
export const TICKET_HEIGHT = 1100;
const CENTER_X = TICKET_WIDTH / 2;

const SANS = 'Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
const MONO = '"Courier New", Courier, monospace';
const LINE_HEIGHT = 1.38;

/** The image box is fixed; everything below it flows from the measured text. */
export const MASCOT_BOX = { x: 285, y: 140, w: 330, h: 330 } as const;
const HEADER_Y = 115;
const TITLE_Y = 505;
const RULE_Y = 695;
const FOOTER_Y = 1010;
const FOOTER_SIZE = 22;
/** Lowest point any body text may reach, leaving air above the footer. */
const CONTENT_LIMIT = FOOTER_Y - FOOTER_SIZE - 26;

export type Measure = (text: string, font: string) => number;

export interface TicketText {
  role: "header" | "title" | "artist" | "heading" | "blessing" | "footer";
  text: string;
  x: number;
  /** alphabetic baseline */
  y: number;
  size: number;
  font: string;
  color: string;
}

export interface TicketLayout {
  texts: TicketText[];
  rule: { x: number; y: number; w: number; h: number };
  mascot: typeof MASCOT_BOX;
  /** Vertical extent of each flowing block, for overlap checks. */
  blocks: { role: TicketText["role"]; top: number; bottom: number }[];
  scale: number;
}

const fontOf = (size: number, family = SANS) => `700 ${size}px ${family}`;

/** Greedy wrap at spaces (Korean keep-all style); a single word wider than the line breaks by character. */
export function wrapText(text: string, maxWidth: number, font: string, measure: Measure): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  const pushChars = (word: string) => {
    for (const ch of word) {
      if (line && measure(line + ch, font) > maxWidth) {
        lines.push(line);
        line = "";
      }
      line += ch;
    }
  };
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, font) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) {
      lines.push(line);
      line = "";
    }
    if (measure(word, font) <= maxWidth) line = word;
    else pushChars(word);
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** Narrowest width that keeps the same number of lines, so a wrap does not leave a lone word. */
export function balanceLines(text: string, maxWidth: number, font: string, measure: Measure): string[] {
  const greedy = wrapText(text, maxWidth, font, measure);
  if (greedy.length < 2) return greedy;
  let lo = maxWidth / greedy.length;
  let hi = maxWidth;
  let best = greedy;
  for (let i = 0; i < 12 && hi - lo > 2; i++) {
    const mid = (lo + hi) / 2;
    const attempt = wrapText(text, mid, font, measure);
    if (attempt.length === greedy.length) {
      best = attempt;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return best;
}

/** Largest size (down to `min`) at which the text fits in `maxLines`, with balanced lines. */
function fit(text: string, maxWidth: number, size: number, min: number, maxLines: number, measure: Measure) {
  let current = size;
  let lines = wrapText(text, maxWidth, fontOf(current), measure);
  while (lines.length > maxLines && current > min) {
    current -= 1;
    lines = wrapText(text, maxWidth, fontOf(current), measure);
  }
  return { size: current, lines: balanceLines(text, maxWidth, fontOf(current), measure) };
}

function compose(ticket: Ticket, measure: Measure, scale: number): TicketLayout {
  const texts: TicketText[] = [];
  const blocks: TicketLayout["blocks"] = [];
  const s = (n: number) => Math.round(n * scale * 10) / 10;

  const place = (role: TicketText["role"], lines: string[], size: number, firstBaseline: number, color: string) => {
    const step = size * LINE_HEIGHT;
    lines.forEach((text, i) => {
      texts.push({ role, text, x: CENTER_X, y: firstBaseline + i * step, size, font: fontOf(size), color });
    });
    const last = firstBaseline + (lines.length - 1) * step;
    blocks.push({ role, top: firstBaseline - size * 0.82, bottom: last + size * 0.24 });
    return last;
  };

  texts.push({ role: "header", text: "2027   /   NEW YEAR MUSIC TICKET", x: CENTER_X, y: HEADER_Y, size: 26, font: fontOf(26, MONO), color: "#9f392f" });

  const title = fit(ticket.song.title, 740, s(49), s(36), 2, measure);
  const titleLast = place("title", title.lines, title.size, TITLE_Y, "#302c28");

  const artist = fit(ticket.song.artist, 730, s(29), s(23), 2, measure);
  const artistLast = place("artist", artist.lines, artist.size, titleLast + title.size * LINE_HEIGHT + 3, "#68554a");

  const ruleY = Math.max(s(RULE_Y - TITLE_Y) + TITLE_Y, artistLast + artist.size * 0.24 + s(44));
  const rule = { x: 95, y: Math.round(ruleY), w: 710, h: 2 };

  const heading = fit(`${ticket.name}님에게 보내는 덕담`, 720, s(25), s(20), 2, measure);
  const headingLast = place("heading", heading.lines, heading.size, rule.y + s(54), "#a64032");

  const blessing = fit(ticket.blessing, 690, s(35), s(26), 3, measure);
  place("blessing", blessing.lines, blessing.size, headingLast + s(69), "#37322e");

  texts.push({ role: "footer", text: "올해 첫 곡은 뭐양?  ·  복주머니 레코드", x: CENTER_X, y: FOOTER_Y, size: FOOTER_SIZE, font: fontOf(FOOTER_SIZE), color: "#7e6456" });

  return { texts, rule, mascot: MASCOT_BOX, blocks, scale };
}

/** Tightens type and spacing in small steps until the flowing text clears the footer. */
export function layoutTicket(ticket: Ticket, measure: Measure): TicketLayout {
  let layout = compose(ticket, measure, 1);
  for (let step = 1; step <= 14 && bottomOf(layout) > CONTENT_LIMIT; step++) {
    layout = compose(ticket, measure, 1 - step * 0.025);
  }
  return layout;
}

function bottomOf(layout: TicketLayout): number {
  return Math.max(...layout.blocks.map((b) => b.bottom));
}

export function ticketFileName(title: string): string {
  const safe = title
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "");
  return `2027-새해첫곡-${safe || "티켓"}.png`;
}

// ---------------------------------------------------------------------------
// Browser-only painting.

async function ready(image: HTMLImageElement) {
  if (!image.complete || image.naturalWidth === 0) {
    await new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => reject(new Error("mascot image failed")), { once: true });
    });
  }
  await image.decode();
  if (document.fonts?.ready) await document.fonts.ready;
}

export async function renderTicketCanvas(ticket: Ticket, image: HTMLImageElement): Promise<HTMLCanvasElement> {
  await ready(image);
  const canvas = document.createElement("canvas");
  canvas.width = TICKET_WIDTH;
  canvas.height = TICKET_HEIGHT;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas 2D is not available");

  const measure: Measure = (text, font) => {
    c.font = font;
    return c.measureText(text).width;
  };
  const layout = layoutTicket(ticket, measure);

  c.fillStyle = "#fbf6e8";
  c.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT);
  c.strokeStyle = "#a54136";
  c.lineWidth = 4;
  c.strokeRect(30, 30, TICKET_WIDTH - 60, TICKET_HEIGHT - 60);

  const m = layout.mascot;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(image, m.x, m.y, m.w, m.h);

  c.fillStyle = "#d5bda1";
  c.fillRect(layout.rule.x, layout.rule.y, layout.rule.w, layout.rule.h);

  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  for (const t of layout.texts) {
    c.font = t.font;
    c.fillStyle = t.color;
    c.fillText(t.text, t.x, t.y);
  }
  return canvas;
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))), "image/png");
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  // Release only after the browser has picked up the download.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function saveTicket(ticket: Ticket, image: HTMLImageElement): Promise<void> {
  const canvas = await renderTicketCanvas(ticket, image);
  const blob = await canvasToPng(canvas);
  downloadBlob(blob, ticketFileName(ticket.song.title));
}
