// 900×1100 pixel-art PNG ticket. The text layout is computed from measured widths
// (pure, testable); painting happens on a canvas in the browser.
import { findHope } from "@/data/hopes";
import type { Ticket } from "./types";

export const TICKET_WIDTH = 900;
export const TICKET_HEIGHT = 1100;
const CENTER_X = TICKET_WIDTH / 2;
const LINE_HEIGHT = 1.4;

/** Pixel scene at the top: 194×110 art pixels drawn at ×4. */
export const SCENE_BOX = { x: 62, y: 104, w: 776, h: 440 } as const;
export const SCENE_SCALE = 4;
const HEADER_Y = 82;
const HOPE_Y = 588;
const TITLE_Y = 642;
const RULE_MIN_Y = 744;
const FOOTER_Y = 1040;
const FOOTER_SIZE = 24;
/** Lowest point the flowing text may reach, leaving air above the footer. */
export const CONTENT_LIMIT = FOOTER_Y - FOOTER_SIZE - 24;

export const PIXEL_FALLBACK = '"Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

export type Measure = (text: string, font: string) => number;

export interface TicketText {
  role: "header" | "hope" | "title" | "artist" | "heading" | "blessing" | "footer";
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
  scene: typeof SCENE_BOX;
  /** Vertical extent of each flowing block, for overlap checks. */
  blocks: { role: TicketText["role"]; top: number; bottom: number }[];
  level: number;
}

const fontOf = (size: number, family: string, weight = 700) => `${weight} ${size}px ${family}`;

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

/** First size (pixel-font multiples, largest first) at which the text fits in `maxLines`. */
function fit(text: string, maxWidth: number, sizes: readonly number[], maxLines: number, family: string, weight: number, measure: Measure) {
  for (const size of sizes) {
    const lines = wrapText(text, maxWidth, fontOf(size, family, weight), measure);
    if (lines.length <= maxLines) return { size, lines: balanceLines(text, maxWidth, fontOf(size, family, weight), measure) };
  }
  const size = sizes[sizes.length - 1]!;
  return { size, lines: balanceLines(text, maxWidth, fontOf(size, family, weight), measure) };
}

const LEVELS = [
  { title: [48, 42, 36], artist: [24, 18], heading: [24, 18], blessing: [36, 30, 24], gap: 1 },
  { title: [42, 36], artist: [24, 18], heading: [24, 18], blessing: [30, 24], gap: 0.85 },
  { title: [36, 30], artist: [18], heading: [18], blessing: [24, 18], gap: 0.7 },
] as const;

function compose(ticket: Ticket, measure: Measure, family: string, level: number): TicketLayout {
  const L = LEVELS[level]!;
  const texts: TicketText[] = [];
  const blocks: TicketLayout["blocks"] = [];
  const g = (n: number) => Math.round(n * L.gap);

  const place = (role: TicketText["role"], lines: string[], size: number, firstBaseline: number, color: string, weight = 700) => {
    const step = Math.round(size * LINE_HEIGHT);
    lines.forEach((text, i) => {
      texts.push({ role, text, x: CENTER_X, y: firstBaseline + i * step, size, font: fontOf(size, family, weight), color });
    });
    const last = firstBaseline + (lines.length - 1) * step;
    blocks.push({ role, top: firstBaseline - Math.round(size * 0.9), bottom: last + Math.round(size * 0.2) });
    return last;
  };

  texts.push({ role: "header", text: "2027  NEW YEAR MUSIC TICKET", x: CENTER_X, y: HEADER_Y, size: 24, font: fontOf(24, family), color: "#d9473b" });
  const hope = findHope(ticket.hope);
  if (hope) texts.push({ role: "hope", text: `내년 1순위 소망 · ${hope.label}`, x: CENTER_X, y: HOPE_Y, size: 18, font: fontOf(18, family), color: "#b33e35" });

  const title = fit(ticket.song.title, 740, L.title, 2, family, 700, measure);
  const titleLast = place("title", title.lines, title.size, TITLE_Y, "#3a2622");

  const artist = fit(ticket.song.artist, 720, L.artist, 2, family, 400, measure);
  const artistLast = place("artist", artist.lines, artist.size, titleLast + g(Math.round(title.size * 0.5) + artist.size + 6), "#7a5f55", 400);

  const ruleY = Math.max(RULE_MIN_Y, artistLast + g(40));
  const rule = { x: 110, y: ruleY, w: 680, h: 4 };

  const heading = fit(`${ticket.name}님에게 보내는 덕담`, 720, L.heading, 2, family, 700, measure);
  const headingLast = place("heading", heading.lines, heading.size, rule.y + g(52), "#b33e35");

  const blessing = fit(ticket.blessing, 700, L.blessing, 3, family, 400, measure);
  place("blessing", blessing.lines, blessing.size, headingLast + g(Math.round(blessing.size * 1.6)), "#3a2622", 400);

  texts.push({ role: "footer", text: "올해 첫 곡은 뭐양? · 복주머니 레코드", x: CENTER_X, y: FOOTER_Y, size: FOOTER_SIZE, font: fontOf(FOOTER_SIZE, family, 400), color: "#7a5f55" });

  return { texts, rule, scene: SCENE_BOX, blocks, level };
}

const bottomOf = (layout: TicketLayout) => Math.max(...layout.blocks.map((b) => b.bottom));

/** Steps down type sizes and spacing until the flowing text clears the footer. */
export function layoutTicket(ticket: Ticket, measure: Measure, family = PIXEL_FALLBACK): TicketLayout {
  let layout = compose(ticket, measure, family, 0);
  for (let level = 1; level < LEVELS.length && bottomOf(layout) > CONTENT_LIMIT; level++) {
    layout = compose(ticket, measure, family, level);
  }
  return layout;
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

function pixelFamily(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-pixel").trim();
  return v ? `${v}, ${PIXEL_FALLBACK}` : PIXEL_FALLBACK;
}

/** Notched 4px frame like the in-game windows. */
function frame(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, t = 4) {
  c.fillStyle = color;
  c.fillRect(x + t, y, w - 2 * t, t);
  c.fillRect(x + t, y + h - t, w - 2 * t, t);
  c.fillRect(x, y + t, t, h - 2 * t);
  c.fillRect(x + w - t, y + t, t, h - 2 * t);
}

async function drawScene(c: CanvasRenderingContext2D) {
  const { spriteCanvas, HERO_HAPPY, HERO_W, HERO_H, FLOCK_SPRITES, SHEEP_H } = await import("@/game/sprites");
  const S = SCENE_SCALE;
  const W = SCENE_BOX.w / S;
  const H = SCENE_BOX.h / S;
  const horizon = 78;
  const cx = W / 2;
  // Low, half behind the hills, warm gradient, no rays or stripes (never flag-like).
  const sun = { x: cx, y: 62, r: 34 };

  // Smooth sky and glow at full resolution…
  c.save();
  c.beginPath();
  c.rect(SCENE_BOX.x, SCENE_BOX.y, SCENE_BOX.w, SCENE_BOX.h);
  c.clip();
  const sky = c.createLinearGradient(0, SCENE_BOX.y, 0, SCENE_BOX.y + horizon * S);
  ['#a7638f', '#d97186', '#f78a7c', '#ffae7a', '#ffd48c'].forEach((color, i, all) => sky.addColorStop(i / (all.length - 1), color));
  c.fillStyle = sky;
  c.fillRect(SCENE_BOX.x, SCENE_BOX.y, SCENE_BOX.w, SCENE_BOX.h);
  const gx = SCENE_BOX.x + sun.x * S;
  const gy = SCENE_BOX.y + sun.y * S;
  const glow = c.createRadialGradient(gx, gy, sun.r * S * 0.8, gx, gy, sun.r * S * 2.4);
  glow.addColorStop(0, 'rgba(255, 214, 140, 0.55)');
  glow.addColorStop(1, 'rgba(255, 186, 120, 0)');
  c.fillStyle = glow;
  c.fillRect(SCENE_BOX.x, SCENE_BOX.y, SCENE_BOX.w, SCENE_BOX.h);
  c.restore();

  // …and the pixel layer on top.
  const low = document.createElement('canvas');
  low.width = W;
  low.height = H;
  const l = low.getContext('2d')!;
  for (let y = -sun.r; y <= sun.r; y++) {
    for (let x = -sun.r; x <= sun.r; x++) {
      const d = Math.hypot(x, y) / sun.r;
      if (d > 1) continue;
      l.fillStyle = d < 0.42 ? '#ffd27a' : d < 0.66 ? '#ffb25e' : d < 0.86 ? '#ff8a4c' : '#f4643f';
      l.fillRect(sun.x + x, sun.y + y, 1, 1);
    }
  }
  l.fillStyle = '#ffd7b5';
  l.fillRect(sun.x - 46, sun.y + 2, 60, 3);
  l.fillRect(sun.x - 6, sun.y - 14, 56, 3);
  l.fillStyle = '#f2a48c';
  l.fillRect(sun.x - 40, sun.y + 5, 48, 1);
  l.fillRect(sun.x, sun.y - 11, 44, 1);
  for (let x = 0; x < W; x++) {
    const far = Math.round(horizon - 12 - 5 * Math.sin(x * 0.06) - 3 * Math.sin(x * 0.15 + 1));
    l.fillStyle = '#a6809f';
    l.fillRect(x, far, 1, horizon - far);
    l.fillStyle = '#c99aa6';
    l.fillRect(x, far, 1, 1);
  }
  l.fillStyle = '#78b062';
  l.fillRect(0, horizon, W, H - horizon);
  const knoll = 8;
  for (let x = 0; x < W; x++) {
    const dx = x - cx;
    if (Math.abs(dx) >= 60) continue;
    const top = Math.round(horizon - (knoll * (Math.cos((Math.PI * dx) / 60) + 1)) / 2);
    l.fillStyle = '#78b062';
    l.fillRect(x, top, 1, horizon - top + 1);
    l.fillStyle = '#b7e08a';
    l.fillRect(x, top, 1, 1);
  }
  l.fillStyle = '#6aa156';
  for (const y of [84, 92, 102]) for (let x = 0; x < W; x += 6) l.fillRect(x, y, 4, 1);
  l.drawImage(spriteCanvas(FLOCK_SPRITES[0]!.a), 6, H - SHEEP_H);
  l.drawImage(spriteCanvas(FLOCK_SPRITES[1]!.a), 38, H - SHEEP_H - 6);
  l.drawImage(spriteCanvas(FLOCK_SPRITES[2]!.a, { flip: true }), W - 40, H - SHEEP_H - 2);
  l.drawImage(spriteCanvas(HERO_HAPPY), Math.round(cx - HERO_W / 2), horizon - knoll + 2 - HERO_H);

  c.imageSmoothingEnabled = false;
  c.drawImage(low, SCENE_BOX.x, SCENE_BOX.y, SCENE_BOX.w, SCENE_BOX.h);
}

export async function renderTicketCanvas(ticket: Ticket): Promise<HTMLCanvasElement> {
  const family = pixelFamily();
  if (document.fonts) {
    await Promise.all([document.fonts.load(`700 48px ${family}`, ticket.song.title), document.fonts.load(`400 24px ${family}`, ticket.blessing)]);
    await document.fonts.ready;
  }
  const canvas = document.createElement("canvas");
  canvas.width = TICKET_WIDTH;
  canvas.height = TICKET_HEIGHT;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas 2D is not available");

  const measure: Measure = (text, font) => {
    c.font = font;
    return c.measureText(text).width;
  };
  const layout = layoutTicket(ticket, measure, family);

  c.fillStyle = "#fff7e6";
  c.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT);
  frame(c, 20, 20, TICKET_WIDTH - 40, TICKET_HEIGHT - 40, "#3a2622", 8);
  frame(c, 36, 36, TICKET_WIDTH - 72, TICKET_HEIGHT - 72, "#d9473b", 4);

  await drawScene(c);
  frame(c, SCENE_BOX.x - 6, SCENE_BOX.y - 6, SCENE_BOX.w + 12, SCENE_BOX.h + 12, "#3a2622", 6);

  c.fillStyle = "#d8bfa0";
  for (let x = layout.rule.x; x < layout.rule.x + layout.rule.w; x += 16) c.fillRect(x, layout.rule.y, 8, layout.rule.h);

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

export async function saveTicket(ticket: Ticket): Promise<void> {
  const canvas = await renderTicketCanvas(ticket);
  const blob = await canvasToPng(canvas);
  downloadBlob(blob, ticketFileName(ticket.song.title));
}
