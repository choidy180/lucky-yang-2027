// Link-preview image (1200×630): the game's dawn meadow, the red sheep and the title, drawn in
// the browser from the same sprites and font. The result is saved as public/og.png; open
// /dev-og on the dev server to preview or download it again after changing the art.
import { PIXEL_FALLBACK } from "./ticket";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
/** One art pixel in image pixels. */
const S = 6;
const W = OG_WIDTH / S; // 200
const H = OG_HEIGHT / S; // 105
const HORIZON = 74;
const HERO_X = 50; // art x of the red sheep's centre
const KNOLL = 8;

const INK = "#3a2622";

function pixelFamily(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-pixel").trim();
  return v ? `${v}, ${PIXEL_FALLBACK}` : PIXEL_FALLBACK;
}

/** Bold pixel text with a one-font-pixel outline and a hard drop shadow (like the title banner). */
function outlined(c: CanvasRenderingContext2D, family: string, text: string, x: number, y: number, size: number, fill: string) {
  const p = Math.round(size / 12);
  c.font = `700 ${size}px ${family}`;
  c.fillStyle = INK;
  for (const [dx, dy] of [
    [-p, 0], [p, 0], [0, -p], [0, p], [-p, -p], [p, -p], [-p, p], [p, p],
    [-p, 3 * p], [0, 3 * p], [p, 3 * p], [-p, 2 * p], [p, 2 * p],
  ] as const) {
    c.fillText(text, x + dx, y + dy);
  }
  c.fillStyle = fill;
  c.fillText(text, x, y);
}

export async function renderOgCanvas(): Promise<HTMLCanvasElement> {
  const { spriteCanvas, HERO_HAPPY, HERO_W, HERO_H, FLOCK_SPRITES, BAG_CLOSED, BAG_W, BAG_H, DISC, DISC_W } = await import("@/game/sprites");
  const family = pixelFamily();
  if (document.fonts) {
    await Promise.all([document.fonts.load(`700 132px ${family}`, "올해 첫 곡은 뭐양?"), document.fonts.load(`700 24px ${family}`, "2027 정미년")]);
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = OG_WIDTH;
  canvas.height = OG_HEIGHT;
  const c = canvas.getContext("2d")!;

  // Smooth dawn sky and a soft glow (full resolution)…
  const sky = c.createLinearGradient(0, 0, 0, HORIZON * S);
  ["#8f5a8f", "#c9698a", "#f2867e", "#ffab7a", "#ffd38c"].forEach((color, i, all) => sky.addColorStop(i / (all.length - 1), color));
  c.fillStyle = sky;
  c.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);
  // Sunrise as light only: a warm glow behind the red sheep. No sun disc, no rays — at thumbnail
  // size a red disc behind a figure must never read as a flag.
  const glow = c.createRadialGradient(HERO_X * S, 58 * S, 10 * S, HERO_X * S, 58 * S, 74 * S);
  glow.addColorStop(0, "rgba(255, 226, 150, 0.95)");
  glow.addColorStop(0.45, "rgba(255, 205, 140, 0.45)");
  glow.addColorStop(1, "rgba(255, 186, 120, 0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  // …then the pixel layer, drawn small and scaled up without smoothing.
  const low = document.createElement("canvas");
  low.width = W;
  low.height = H;
  const l = low.getContext("2d")!;

  // a few flat pixel clouds
  l.fillStyle = "#ffd7b5";
  l.fillRect(4, 22, 30, 3);
  l.fillRect(14, 18, 14, 4);
  l.fillRect(70, 12, 26, 3);
  l.fillRect(76, 9, 12, 3);
  l.fillStyle = "#f2a48c";
  l.fillRect(6, 25, 26, 1);
  l.fillRect(72, 15, 22, 1);

  // far hills
  for (let x = 0; x < W; x++) {
    const far = Math.round(HORIZON - 11 - 5 * Math.sin(x * 0.06) - 3 * Math.sin(x * 0.15 + 1));
    l.fillStyle = "#a6809f";
    l.fillRect(x, far, 1, HORIZON - far);
    l.fillStyle = "#c99aa6";
    l.fillRect(x, far, 1, 1);
  }
  // meadow and the knoll under the red sheep
  l.fillStyle = "#78b062";
  l.fillRect(0, HORIZON, W, H - HORIZON);
  for (let x = 0; x < W; x++) {
    const dx = x - HERO_X;
    if (Math.abs(dx) >= 54) continue;
    const top = Math.round(HORIZON - (KNOLL * (Math.cos((Math.PI * dx) / 54) + 1)) / 2);
    l.fillStyle = "#78b062";
    l.fillRect(x, top, 1, HORIZON - top + 1);
    l.fillStyle = "#b7e08a";
    l.fillRect(x, top, 1, 1);
  }
  l.fillStyle = "#6aa156";
  for (const y of [80, 88, 97]) for (let x = (y % 4); x < W; x += 6) l.fillRect(x, y, 4, 1);

  // flock peeking in from the bottom edge
  l.drawImage(spriteCanvas(FLOCK_SPRITES[1]!.a), -8, H - 22);
  l.drawImage(spriteCanvas(FLOCK_SPRITES[0]!.a, { flip: true }), 126, H - 17);
  l.drawImage(spriteCanvas(FLOCK_SPRITES[3]!.a, { flip: true }), W - 28, H - 21);

  // the red sheep on the knoll, the lucky bag and a record beside it
  l.drawImage(spriteCanvas(HERO_HAPPY), Math.round(HERO_X - HERO_W / 2), HORIZON - KNOLL + 2 - HERO_H);
  const bagX = HERO_X + 30;
  const bagY = HORIZON + 16 - BAG_H;
  l.drawImage(spriteCanvas(BAG_CLOSED), bagX, bagY);
  l.drawImage(spriteCanvas(DISC), bagX + Math.round((BAG_W - DISC_W) / 2), bagY - DISC_W + 2);

  c.imageSmoothingEnabled = false;
  c.drawImage(low, 0, 0, OG_WIDTH, OG_HEIGHT);

  // Title block on the right.
  const cx = 900;
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  outlined(c, family, "올해 첫 곡은", cx, 160, 84, "#fff3d6");
  outlined(c, family, "뭐양?", cx, 312, 132, "#ff6b57");
  outlined(c, family, "2027 정미년 · 붉은 양의 해", cx, 384, 36, "#ffd36b");

  // invitation tag
  const tag = "붉은 양을 찾아 새해 첫 곡 받기 ▶";
  c.font = `700 24px ${family}`;
  const tw = Math.ceil(c.measureText(tag).width) + 40;
  const tx = Math.round(cx - tw / 2);
  const ty = 420;
  c.fillStyle = INK;
  c.fillRect(tx + 4, ty, tw - 8, 4);
  c.fillRect(tx + 4, ty + 48, tw - 8, 4);
  c.fillRect(tx, ty + 4, 4, 44);
  c.fillRect(tx + tw - 4, ty + 4, 4, 44);
  c.fillStyle = "#d9473b";
  c.fillRect(tx + 4, ty + 4, tw - 8, 44);
  c.fillStyle = "#a8352b";
  c.fillRect(tx + 4, ty + 42, tw - 8, 6);
  c.fillStyle = "#ffffff";
  c.fillText(tag, cx, ty + 34);

  return canvas;
}

/** Square app icon: the red sheep's head and shoulders on the night-blue backdrop with a warm glow. */
export async function renderIconCanvas(size: number): Promise<HTMLCanvasElement> {
  const { spriteCanvas, HERO_HAPPY, HERO_W, HERO_PORTRAIT_ROWS } = await import("@/game/sprites");
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#2c295b";
  c.fillRect(0, 0, size, size);
  const glow = c.createRadialGradient(size / 2, size * 0.62, size * 0.05, size / 2, size * 0.62, size * 0.62);
  glow.addColorStop(0, "rgba(255, 196, 130, 0.9)");
  glow.addColorStop(1, "rgba(255, 150, 120, 0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, size, size);
  // whole art pixels, as large as fits with a small margin
  const k = Math.max(1, Math.floor((size * 0.9) / HERO_W));
  const w = HERO_W * k;
  const h = HERO_PORTRAIT_ROWS * k;
  c.imageSmoothingEnabled = false;
  c.drawImage(spriteCanvas(HERO_HAPPY), 0, 0, HERO_W, HERO_PORTRAIT_ROWS, Math.round((size - w) / 2), size - h, w, h);
  return canvas;
}
