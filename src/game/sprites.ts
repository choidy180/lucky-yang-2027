// Pixel sprites. Each sprite is a grid of palette keys ('.' = transparent).
// The red sheep was traced from the original 1254px mascot at 54×56 and given big, shiny eyes.
// The flock sheep are small versions of the same chibi, in other wool colours.
import { mix } from "./color";

export type Palette = Readonly<Record<string, string>>;
export interface SpriteDef {
  readonly rows: readonly string[];
  readonly palette: Palette;
}

// ---------------------------------------------------------------------------
// Helpers (pure)

function patch(rows: readonly string[], edits: ReadonlyArray<readonly [number, number, string]>): string[] {
  const out = rows.map((r) => [...r]);
  for (const [x, y, ch] of edits) if (out[y] && x >= 0 && x < out[y]!.length) out[y]![x] = ch;
  return out.map((r) => r.join(""));
}

function stamp(rows: readonly string[], art: readonly string[], x0: number, y0: number, clearTo?: string): string[] {
  const edits: [number, number, string][] = [];
  art.forEach((line, dy) =>
    [...line].forEach((ch, dx) => {
      if (ch !== ".") edits.push([x0 + dx, y0 + dy, ch]);
      else if (clearTo) edits.push([x0 + dx, y0 + dy, clearTo]);
    }),
  );
  return patch(rows, edits);
}

/** Scale2x (EPX): doubles a sprite while rounding its diagonals, so it stays crisp but less blocky. */
export function scale2x(rows: readonly string[]): string[] {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const at = (x: number, y: number) => (y >= 0 && y < h && x >= 0 && x < w ? (rows[y]![x] ?? ".") : ".");
  const out: string[][] = Array.from({ length: h * 2 }, () => Array<string>(w * 2).fill("."));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = at(x, y);
      const a = at(x, y - 1);
      const b = at(x + 1, y);
      const c = at(x - 1, y);
      const d = at(x, y + 1);
      out[y * 2]![x * 2] = c === a && c !== d && a !== b ? a : p;
      out[y * 2]![x * 2 + 1] = a === b && a !== c && b !== d ? b : p;
      out[y * 2 + 1]![x * 2] = d === c && d !== b && c !== a ? c : p;
      out[y * 2 + 1]![x * 2 + 1] = b === d && b !== a && d !== c ? d : p;
    }
  }
  return out.map((r) => r.join(""));
}

// ---------------------------------------------------------------------------
// The red sheep

export const HERO_PALETTE: Palette = {
  o: "#772f28", // outline
  R: "#f24e46", // wool
  w: "#ffffff", // sparkle / eye highlight
  C: "#fceade", // face / ears
  p: "#fbb5a0", // blush
  e: "#3d1f1b", // eyes
  n: "#f58e7d", // nose
  G: "#f9bd7a", // horns
  N: "#55548a", // headphones
  Y: "#fcc059", // headphone rings
  B: "#845656", // hooves
};

const HERO_ROWS = [
  "........................oooRoooo......................",
  "......................oRRRRRRRRRo.....................",
  ".....................oRRRRRRRRRRRo....................",
  "....................oRwwRRRRRRRRRRo...................",
  "...................oRRwRRRRRRRRRRRoooo................",
  "..................oRRRRRRRRRRRRRRRRoRRoo..............",
  ".............ooGoooRRRRRRRRRRRRooooRRRooooo...........",
  "............oGGGGGoRRRRRRRRRRRooRRRRRooGGGGo..........",
  "...........oGGooGGooRRRRRRRRRRoRRRRRRoGGGGGGo.........",
  "...........oGGoGoooRRRRRRRRRRRRRRRRRRoGoooGGo.........",
  "...........oGGGGoRRRRRRRRRRRRRRRRRRRRRooGGoGo.........",
  ".........ooooGGGoRRRRRRRRRRRRRRRRRRRRRRoGGGGooo.......",
  "........oRRRooooRRRRRRRRRRRRRRRRRRRRRRRooGGooRRo......",
  ".......oRRRRRRRRRRRRRRRRoRRRRRRRRRRRRRRRRooRRRRRo.....",
  "......oRRRRRRRRRRRRRRRRRoRRRRRRRRRRRRRRRRRRRRRRRo.....",
  "......oRRRRRRRRRRRRRRRRoooRRRRRRRRRRRRRRRRRRRRRRRo....",
  ".....oRRRRRRoRRRRRRRRooCCooRRRRRRooRRRRRRRRRRRRRRo....",
  ".....oRRRRRRoRRRRRRRooCCCCCooooooooRRRRRRRRRRRRRRo....",
  ".....oRRRRRRooRRRoooCCCCCCCCCCCCCCCoRRRRRRRRRRRRRo....",
  ".....oRRoRRRRRoooCCCCCCCCCCCCCCCCCCCooRRRRRoRRRRRo....",
  "......oooRRRRRoCCCCCCCCCCCCCCCCCCCCCCCoooooRRRoRRo....",
  "......ooCCRRRoCCCCCCCCCCCCCCCCCCCCCCCCCCoRRRRRooo.....",
  ".....ooCCCRRooCCCCCCCCCCCCCCCCCCCCCCCCCCCoRRRCCoo.....",
  "....ooCCCCRRoCCCCCCCCCCCCCCCCCCCCCCCCCCCCoRRRCCCoo....",
  "....oCCCCCoooCCCCCCCCCCCCCCCCCCCCCCCCCCCCoRRCCCCoo....",
  "...oCCCCCCooCCCCCCeeeeCCCCCCCCCCeeeeCCCCCCooCCCCCo....",
  "..oCCCCCCCooCCCCCeewweeCCCCCCCCeewweeCCCCCooCCCCCCo...",
  ".oCCCCCCCoooCCCCCeewweeCCCCCCCCeewweeCCCCCooCCCCCCCo..",
  ".oCCCCCCCoRoCCCCCeeeeeeCCCCCCCCeeeeeeCCCCCooCCCCCCCCo.",
  ".CCCCCCCCoRoCCCCCeeeeweCCCCCCCCeeeeweCCCCCoooCCCCCCCo.",
  "oCCCCCCCooRooCCCCeeeeeeCCCnnCCCeeeeeeCCCCCoRoCCCCCCCo.",
  "oCCCCCCCoRRRoppppCeeeeCCCoCCoCCCeeeeCppppooRoCCCCCCCCo",
  ".CCCCCCoRRRRRppppCCCCCCCCCooCCCCCCCCCppppoRRooCCCCCCCo",
  ".oCCCCooRRRRoooCCCCCCCCCCCCCCCCCCCCCCCCCooRRRoCCCCCCo.",
  "..oooo.oRRRRoRRooooooCCCCCCCCCCCCCCCCCCooRRRRRoCCCCCo.",
  "........oRRRoRooooooRooCCCCCCCCCCCCoooooRRRRRo.ooCoo..",
  ".........ooRRoNNNNNoRRoCCCCCCCCCCCoNNNNNoRRRo.........",
  ".........oRRoNYYYYYNooRoCCCCCCCoooNYYYYYNoRo..........",
  "........oRRRoNYNNNYNoRoooooooooRooNYNNNYNoo...........",
  "........oRRooNYNwNYNoRRRRRRRRRRRRoNYNwNYNoRo..........",
  ".......oRRoCCoYNNNYNoRRRRRRRRRRRRoNYNNNYNoRRo.........",
  ".......oRRoCBoYYYYYNoRRRRRRRRRRRRoNYYYYYNoRRo.........",
  "........oRRoooNNNNNoRRRRRRRRRRRRRRoNNNNNoRRRo.........",
  ".......ooRRRRRoooooRRRRRRRRRRRRRRRRoooooRRRRo.........",
  "......oRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRoRoo........",
  "......oRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRoRRRo.......",
  "......oRRRRooRRRRRRRRRRRRRRRRRRRRRRRRRRRRRoRRRo.......",
  "......oRRRRoRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRo.......",
  "......oRRRRRRRRRRRooooRRRRRRRooooRRRRRRRRRRRRRo.......",
  "......oRRRRRRRRRRooCCCoRRRRRoCCCCoRRRRRRRRRRRRo.......",
  ".......oRRRRRRRRRoCCCCCoRRRoCCCCCoRRRRRRRRRRRRo.......",
  ".......ooRRRRRRRRoCCCCCooRRoCCCCCCoRRRRRRRRRRo........",
  ".........ooRRRRRRoCCBoBBoRooBoBBCooRRRRRRoRoo.........",
  "...........oRRRRRoCBBoBBoRoBBoBBCoRRRRRRo.............",
  "............oooooooBBBooooooooBBooooRooo..............",
  "....................oo........o.......................",
] as const;

const EYE_X = [17, 31] as const;
const EYE_Y = 25;
const EYE_BLINK = ["CCCCCC", "CCCCCC", "CCCCCC", "CCCCCC", "eCCCCe", "CeeeeC", "CCCCCC"];
const EYE_HAPPY = ["CCCCCC", "CCCCCC", "CeeeeC", "eCCCCe", "CCCCCC", "CCCCCC", "CCCCCC"];
const withEyes = (eye: readonly string[]) => EYE_X.reduce<string[]>((rows, x) => stamp(rows, eye, x, EYE_Y), [...HERO_ROWS]);

export const HERO: SpriteDef = { rows: HERO_ROWS, palette: HERO_PALETTE };
export const HERO_BLINK: SpriteDef = { rows: withEyes(EYE_BLINK), palette: HERO_PALETTE };
export const HERO_HAPPY: SpriteDef = { rows: withEyes(EYE_HAPPY), palette: HERO_PALETTE };
export const HERO_W = 54;
export const HERO_H = 56;
/** Rows of the sprite used for the dialog portrait (head and shoulders). */
export const HERO_PORTRAIT_ROWS = 42;

// ---------------------------------------------------------------------------
// The flock: small versions of the red sheep (same face, big eyes), in other wool colours
// and without headphones. The red one hiding among them is the same mini with headphones on.

const MINI_ROWS = [
  "...........oooooooooo...........",
  ".........ooRRRRRRRRRRoo.........",
  "........oRRRRRRRRRwRRRRo........",
  ".......oRRRRRRRRRwRRRRRRo.......",
  "....oooRRRRrRRRRRRRRrRRRRooo....",
  "...oGGGoRRRRrRRRRRRrRRRRoGGGo...",
  "...oGgGoRRRRRRRRRRRRRRRRoGgGo...",
  "...oGGoRRRRRRRRRRRRRRRRRRoGGo...",
  "..ooooRRRRRRRRRRRRRRRRRRRRoooo..",
  "..oRRRRRRRrRRRRRRRRRRrRRRRRRRo..",
  "..oRRrRRRRRrRRRRRRRRrRRRRRrRRo..",
  "...oRRRRRoooRRRRRRRRoooRRRRRo...",
  "...oRRRRoCCCoRRRRRRoCCCoRRRRo...",
  "...ooRRoCCCCCooooooCCCCCoRRoo...",
  "..oCCCoCCCCCCCCCCCCCCCCCCoCCCo..",
  ".oCCCCoCCCweCCCCCCCCweCCCoCCCCo.",
  "oCCCCCoCCCeeCCCCCCCCeeCCCoCCCCCo",
  "oCcCCCoCCCeeCCCnnCCCeeCCCoCCCcCo",
  "oCCCCcoCppCCCCoCCoCCCCppCocCCCCo",
  "oCCCoRoCCCCCCCCooCCCCCCCCoRoCCCo",
  ".oooRRRoCCCCCCCCCCCCCCCCoRRRooo.",
  "...oRRRRooCCCCCCCCCCCCooRRRRo...",
  "...oRRRRRRRooooooooooRRRRRRRo...",
  "...oRRRRRRRRRRRRRRRRRRRRRRRRo...",
  "..oRRRRRRRRRRRRRRRRRRRRRRRRRRo..",
  "..oRRRRRRRRRRRRRRRRRRRRRRRRRRo..",
  "..oRRRRRRRRRRRRRRRRRRRRRRRRRRo..",
  "..oRRRRRRRRRRrRRRRrRRRRRRRRRRo..",
  "..oRRrRRRRRRRRRRRRRRRRRRwRrRRo..",
  "..oRRRRRRRRRRRRRRRRRRRRwRRRRRo..",
  "...oRRRRoCCCoRRRRRRoCCCoRRRRo...",
  "....ooRoCCCCoRRRRRRoCCCCoRoo....",
  "......ooBBBBooooooooBBBBoo......",
  "........oooo........oooo........",
] as const;

/** Headphones for the red one (rows 22–26). */
const MINI_HEADPHONES: ReadonlyArray<readonly [number, string]> = [
  [22, "...oRRRRNNNooooooooooNNNRRRRo..."],
  [23, "...oRRRNYYYNRRRRRRRRNYYYNRRRo..."],
  [24, "..oRRRRNYNYNRRRRRRRRNYNYNRRRRo.."],
  [25, "..oRRRRNYYYNRRRRRRRRNYYYNRRRRo.."],
  [26, "..oRRRRRNNNRRRRRRRRRRNNNRRRRRo.."],
];

const MINI_EYES_SHUT: ReadonlyArray<readonly [number, number, string]> = [
  [10, 15, "C"], [11, 15, "C"], [20, 15, "C"], [21, 15, "C"],
  [10, 16, "C"], [11, 16, "C"], [20, 16, "C"], [21, 16, "C"],
];

/** One foot lifted (the left half of the bottom rows moves up a row). */
function liftFoot(rows: readonly string[]): string[] {
  const out = rows.map((r) => [...r]);
  for (let y = 29; y < rows.length; y++) {
    for (let x = 4; x < 16; x++) out[y]![x] = y + 1 < rows.length ? rows[y + 1]![x]! : ".";
  }
  return out.map((r) => r.join(""));
}

function miniFrames(base: readonly string[]) {
  return { a: [...base], b: liftFoot(base), blink: patch(base, MINI_EYES_SHUT) };
}

const MINI_FACE = { C: "#fde8d6", c: "#f1cdb9", p: "#fbb5a0", e: "#3a2924", n: "#f58e7d", w: "#ffffff", G: "#f2c78a", g: "#d9a35c", B: "#8a6a60" };

/** Wool colours for the flock: white (most), cream, lavender grey and oat. */
export const FLOCK_COLOURS = [
  { R: "#fffaf1", r: "#ebe2d2", o: "#6b5a52" },
  { R: "#fff0d4", r: "#efd9b3", o: "#6b5a4a" },
  { R: "#e9e6f0", r: "#d2cedb", o: "#5d5868" },
  { R: "#f2dcc6", r: "#e0c2a6", o: "#6b5446" },
] as const;

const miniBase = miniFrames(MINI_ROWS);
export const SHEEP_W = 32;
export const SHEEP_H = 34;
export const FLOCK_SPRITES: ReadonlyArray<{ a: SpriteDef; b: SpriteDef; blink: SpriteDef }> = FLOCK_COLOURS.map((wool) => {
  const palette: Palette = { ...MINI_FACE, ...wool };
  return { a: { rows: miniBase.a, palette }, b: { rows: miniBase.b, palette }, blink: { rows: miniBase.blink, palette } };
});

const redRows = MINI_HEADPHONES.reduce<string[]>((rows, [y, line]) => {
  rows[y] = line;
  return rows;
}, [...MINI_ROWS]);
const redMini = miniFrames(redRows);
const RED_MINI_PALETTE: Palette = { ...HERO_PALETTE, r: "#d33a35", c: "#f1cdb9", e: "#3d1f1b", g: "#d98f45" };
export const RED_MINI = {
  a: { rows: redMini.a, palette: RED_MINI_PALETTE } as SpriteDef,
  b: { rows: redMini.b, palette: RED_MINI_PALETTE } as SpriteDef,
  blink: { rows: redMini.blink, palette: RED_MINI_PALETTE } as SpriteDef,
};

// ---------------------------------------------------------------------------
// Lucky bag, record and the "found it" bulb (drawn small, then Scale2x).

const BAG_PALETTE: Palette = { o: "#6b2a26", R: "#e2473b", r: "#b8352e", h: "#f47a5f", G: "#f6c25a", g: "#d1913a", Y: "#ffe08a", K: "#3a1d1f" };
const BAG_BODY = [
  "...oRoGGGGoRo...",
  "..oRRRoooooRRRo.",
  ".oRhRRRRRRRRRRo.",
  "oRhRRRRGGRRRRRro",
  "oRhRRRGYYGRRRRro",
  "oRRRRGYGGYGRRrro",
  "oRRRRRGYYGRRRrro",
  "oRRRRRRGGRRRRrro",
  ".oRRRRRRRRRRrro.",
  ".orRRRRRRRRrrro.",
  "..oorrrrrrrroo..",
  "....oooooooo....",
];
export const BAG_CLOSED: SpriteDef = {
  rows: scale2x(["....oo....oo....", "...oRRo..oRRo...", "...oRhRooRRRo...", "....oRRRRRRo....", ".....oGGGGo.....", "....oGgYYgGo....", ...BAG_BODY]),
  palette: BAG_PALETTE,
};
export const BAG_OPEN: SpriteDef = {
  rows: scale2x(["..Y..Y....Y..Y..", "...oooooooooo...", "..oKKKKKKKKKKo..", "..oRKKKKKKKKRo..", "...oRRRRRRRRo...", "....oGgYYgGo....", ...BAG_BODY]),
  palette: BAG_PALETTE,
};
export const BAG_W = 32;
export const BAG_H = 36;

export const DISC: SpriteDef = {
  rows: scale2x([
    "....oooo....",
    "..ooKKKKoo..",
    ".oKKkKKKKKo.",
    ".oKkKKKKKKo.",
    "oKKKKRRKKKKo",
    "oKKKRwRRKKKo",
    "oKKKRRRRKKKo",
    "oKKKKRRKKKKo",
    ".oKKKKKKkKo.",
    ".oKKKKKKKKo.",
    "..ooKKKKoo..",
    "....oooo....",
  ]),
  palette: { o: "#1a1420", K: "#2e2734", k: "#655a74", R: "#e2473b", w: "#fff1d6" },
};
export const DISC_W = 24;

export const BULB: SpriteDef = {
  rows: scale2x([
    "....oooooo....",
    "...oYYYYYYo...",
    "..oYwwYYYYYo..",
    ".oYwYYYYYYYYo.",
    ".oYwYYYYYYYYo.",
    ".oYYYYYYYYYyo.",
    ".oYYYYYYYYYyo.",
    "..oYYYYYYYyo..",
    "...oYYYYYyo...",
    "....oyYYyo....",
    "....oGGGGo....",
    "....oggggo....",
    "....oGGGGo....",
    ".....oggo.....",
    "......oo......",
  ]),
  palette: { o: "#4a3a2e", Y: "#ffe066", y: "#f2b632", w: "#fffbe6", G: "#c9c2b6", g: "#8f877c" },
};
export const BULB_W = 28;
export const BULB_H = 30;

// ---------------------------------------------------------------------------
// Rendering to canvases (browser only), cached per sprite/variant.

const NIGHT = "#28305c";
const cache = new Map<string, HTMLCanvasElement>();
let seq = 0;
const ids = new WeakMap<SpriteDef, number>();
const idOf = (def: SpriteDef) => {
  let id = ids.get(def);
  if (id === undefined) {
    id = ++seq;
    ids.set(def, id);
  }
  return id;
};

export function spriteCanvas(def: SpriteDef, opts: { flip?: boolean; night?: boolean } = {}): HTMLCanvasElement {
  const key = `${idOf(def)}:${opts.flip ? 1 : 0}:${opts.night ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const h = def.rows.length;
  const w = Math.max(...def.rows.map((r) => r.length));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;
  def.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const k = row[x]!;
      if (k === ".") continue;
      const base = def.palette[k];
      if (!base) continue;
      c.fillStyle = opts.night ? mix(base, NIGHT, 0.5) : base;
      c.fillRect(opts.flip ? w - 1 - x : x, y, 1, 1);
    }
  });
  cache.set(key, canvas);
  return canvas;
}

/** A 1px halo around the opaque pixels, used as rim light against the sunrise. */
export function rimCanvas(def: SpriteDef, color: string): HTMLCanvasElement {
  const key = `rim:${idOf(def)}:${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const h = def.rows.length;
  const w = Math.max(...def.rows.map((r) => r.length));
  const solid = (x: number, y: number) => (def.rows[y]?.[x] ?? ".") !== ".";
  const canvas = document.createElement("canvas");
  canvas.width = w + 2;
  canvas.height = h + 2;
  const c = canvas.getContext("2d")!;
  c.fillStyle = color;
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) c.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  cache.set(key, canvas);
  return canvas;
}
