// The meadow at dawn. Terrain, sprites and effects are drawn in art pixels on a small
// transparent canvas (scaled up with nearest-neighbour); the sky, the sun's glow and the
// spotlight are painted smoothly at full resolution underneath/on top.
import { mix, ramp } from "./color";
import {
  BAG_CLOSED,
  BAG_H,
  BAG_OPEN,
  BAG_W,
  BULB,
  BULB_H,
  BULB_W,
  DISC,
  DISC_W,
  HERO,
  HERO_BLINK,
  HERO_H,
  HERO_HAPPY,
  HERO_W,
  FLOCK_COLOURS,
  FLOCK_SPRITES,
  RED_MINI,
  SHEEP_H,
  SHEEP_W,
  rimCanvas,
  spriteCanvas,
  type SpriteDef,
} from "./sprites";
import {
  BULB_MS,
  HERO_CENTER_Y,
  HERO_FEET_Y,
  HERO_TOP_Y,
  HIDE,
  HINT_AFTER_MS,
  INTRO,
  SUN,
  heroCenter,
  heroPath,
  inClearing,
  knollY,
  type Camera,
  type HeroPose,
  type Viewport,
} from "./timeline";

type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------------------
// Deterministic randomness so the meadow looks the same on every visit.

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Palette (night → sunrise)

export const SKY_NIGHT = ["#4b3f72", "#3a3368", "#2c295b", "#221f4c", "#191a3f", "#131532"];
export const SKY_DAWN = ["#ffd48c", "#ffae7a", "#f78a7c", "#d97186", "#a7638f", "#6f5591"];

const C = {
  meadow: ["#21403d", "#78b062"],
  stripe: ["#1c3735", "#6aa156"],
  rim: ["#2c5148", "#b7e08a"],
  far: ["#2a2f55", "#a6809f"],
  farRidge: ["#343a63", "#c99aa6"],
  mid: ["#223845", "#5f8f6e"],
  midRidge: ["#2b4553", "#86b07c"],
  tuft: ["#2d5249", "#5c9a4f"],
  tuftHi: ["#3a6255", "#9ccf6c"],
  cloud: ["#4a4675", "#ffd7b5"],
  cloudShade: ["#3a3766", "#f2a48c"],
} as const;
type Pair = readonly [string, string];
const tone = (pair: Pair, light: number) => mix(pair[0], pair[1], light);

// ---------------------------------------------------------------------------
// State

export type SheepMode = "walk" | "graze" | "idle";
export interface Sheep {
  x: number;
  /** distance below the ground surface: feet y = knollY(x) + 4 + depth */
  depth: number;
  dir: 1 | -1;
  mode: SheepMode;
  timer: number;
  speed: number;
  phase: number;
  /** wool colour (index into FLOCK_COLOURS) */
  colour: number;
  /** world time of the last tap on it (it hops) */
  hopAt: number;
}
export const sheepY = (s: Pick<Sheep, "x" | "depth">) => knollY(s.x) + 4 + s.depth;

export type BagMode = "hidden" | "drop" | "idle" | "shake" | "open";
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: string;
  kind: "square" | "note" | "spark" | "puff";
}

export interface WorldState {
  time: number;
  /** opening clock in ms (INTRO_TOTAL or more once it is over) */
  introT: number;
  light: number;
  sun: number;
  hop: number;
  mood: "idle" | "happy";
  bag: BagMode;
  bagSince: number;
  discSince: number | null;
  sheep: Sheep[];
  /** false while waiting for the visitor to tap the red sheep */
  begun: boolean;
  /** world time when the meadow started waiting (for the hint) */
  readySince: number;
  /** once found, the flock walks out of the clearing around the red sheep */
  scatter: boolean;
  particles: Particle[];
  calm: boolean;
}

export const FLOCK_SIZE = 110;
const BOUNDS = 600;
export const BAG_X = 48;
export const BAG_REST_Y = knollY(BAG_X) + 2;

/** Keep the disguised red sheep's own spot free (its neighbours may overlap it a little). */
const onHide = (x: number, y: number) => Math.abs(x - HIDE.x) < 20 && Math.abs(y - HIDE.y) < 8;
/** The top of the knoll is where the red sheep will stand; nobody walks onto it later. */
const onStage = (x: number, y: number) => Math.abs(x) < 30 && y < knollY(x) + 22;

export function createFlock(calm: boolean, seed = 2027): Sheep[] {
  const rand = mulberry32(seed);
  const sheep: Sheep[] = [];
  for (let tries = 0; sheep.length < FLOCK_SIZE && tries < 20000; tries++) {
    // The first ones crowd around the hiding spot so the red sheep is lost in the flock;
    // the rest spread over the meadow, denser toward the horizon.
    const crowd = sheep.length < 20;
    const x = Math.round(crowd ? HIDE.x + (rand() * 2 - 1) * 110 : (rand() * 2 - 1) * 560);
    const depth = Math.round(crowd ? Math.max(0, HIDE.y - 4 - knollY(x) + (rand() * 2 - 1) * 70) : 286 * rand() ** 1.4);
    const y = knollY(x) + 4 + depth;
    if (onHide(x, y) || onStage(x, y)) continue;
    if (sheep.some((s) => Math.abs(s.x - x) < (crowd ? 22 : 26) && Math.abs(sheepY(s) - y) < (crowd ? 10 : 12))) continue;
    const c = rand();
    sheep.push({
      x,
      depth,
      dir: rand() < 0.5 ? 1 : -1,
      mode: calm || rand() < 0.6 ? "graze" : "walk",
      timer: 800 + rand() * 3000,
      speed: 8 + rand() * 9,
      phase: Math.floor(rand() * 4),
      colour: c < 0.55 ? 0 : c < 0.75 ? 1 : c < 0.88 ? 2 : 3,
      hopAt: -1e9,
    });
  }
  return sheep;
}

export function createWorld(calm: boolean): WorldState {
  return {
    time: 0,
    introT: 0,
    light: 0,
    sun: 0,
    hop: 0,
    mood: "idle",
    bag: "hidden",
    bagSince: 0,
    discSince: null,
    sheep: createFlock(calm),
    begun: false,
    readySince: 0,
    scatter: false,
    particles: [],
    calm,
  };
}

const flockRand = mulberry32(77);

export function updateWorld(s: WorldState, dt: number): void {
  s.time += dt;
  if (s.bag === "drop" && (s.calm || s.time - s.bagSince > 700)) {
    s.bag = "idle";
    s.bagSince = s.time;
  }
  for (const sheep of s.sheep) {
    const y = sheepY(sheep);
    if (s.scatter && inClearing(sheep.x, y)) {
      // Make way: walk straight out of the clearing.
      sheep.dir = sheep.x < 0 ? -1 : 1;
      sheep.mode = "walk";
      sheep.timer = 1200;
      const step = (sheep.dir * (s.calm ? 400 : 64) * dt) / 1000;
      sheep.x += step;
      continue;
    }
    sheep.timer -= dt;
    if (sheep.timer <= 0) {
      const r = flockRand();
      if (s.calm) sheep.mode = r < 0.8 ? "graze" : "idle";
      else {
        sheep.mode = r < 0.5 ? "graze" : r < 0.88 ? "walk" : "idle";
        if (sheep.mode === "walk" && flockRand() < 0.4) sheep.dir = sheep.dir === 1 ? -1 : 1;
      }
      sheep.timer = 1500 + flockRand() * 3500;
    }
    if (sheep.mode === "walk" && !s.calm) {
      const nx = sheep.x + (sheep.dir * sheep.speed * dt) / 1000;
      const ny = knollY(nx) + 4 + sheep.depth;
      if (Math.abs(nx) > BOUNDS || (s.scatter && inClearing(nx, ny)) || onStage(nx, ny)) sheep.dir = sheep.dir === 1 ? -1 : 1;
      else sheep.x = nx;
    }
  }
  for (const p of s.particles) {
    p.age += dt;
    const t = dt / 1000;
    if (p.kind === "square") p.vy += 340 * t;
    if (p.kind === "puff") {
      p.vx *= 0.9;
      p.vy *= 0.9;
    }
    p.x += p.vx * t;
    p.y += p.vy * t;
  }
  s.particles = s.particles.filter((p) => p.age < p.life);
}

export function setBag(s: WorldState, mode: BagMode): void {
  if (mode === s.bag && mode !== "shake") return;
  s.bag = mode;
  s.bagSince = s.time;
  if (mode === "open") {
    s.discSince = s.time;
    if (!s.calm) burst(s);
  } else {
    s.discSince = null;
  }
}

/** Show an already opened bag and its record without the burst (restored ticket). */
export function setOpenedStill(s: WorldState): void {
  s.bag = "open";
  s.bagSince = s.time - 5000;
  s.discSince = s.time - 5000;
}

/** A puff of sparkles that covers the red sheep turning to face us on the knoll. */
export function poof(s: WorldState): void {
  if (s.calm) return;
  const rand = mulberry32(31 + Math.floor(s.time));
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const speed = 50 + rand() * 60;
    s.particles.push({
      x: Math.cos(a) * 20,
      y: HERO_CENTER_Y + Math.sin(a) * 22,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      age: 0,
      life: 420 + rand() * 260,
      color: i % 3 === 0 ? "#ffe9a8" : "#fff8ee",
      kind: i % 5 === 0 ? "spark" : "puff",
    });
  }
}

function burst(s: WorldState) {
  const rand = mulberry32(Math.floor(s.time));
  const colors = ["#ffe08a", "#f6c25a", "#ff7a5c", "#fff6ee", "#e2473b"];
  const mouthY = BAG_REST_Y - BAG_H + 4;
  for (let i = 0; i < 46; i++) {
    s.particles.push({
      x: BAG_X + (rand() - 0.5) * 12,
      y: mouthY,
      vx: (rand() - 0.5) * 180,
      vy: -80 - rand() * 160,
      age: 0,
      life: 700 + rand() * 700,
      color: colors[i % colors.length]!,
      kind: i % 7 === 0 ? "spark" : "square",
    });
  }
  for (let i = 0; i < 7; i++) {
    s.particles.push({
      x: BAG_X + (rand() - 0.5) * 40,
      y: mouthY,
      vx: (rand() - 0.5) * 32,
      vy: -28 - rand() * 24,
      age: 0,
      life: 1600 + rand() * 600,
      color: i % 2 ? "#fff3c4" : "#ffd36b",
      kind: "note",
    });
  }
}

// ---------------------------------------------------------------------------
// Static scenery

const sceneryRand = mulberry32(11);
const STARS = Array.from({ length: 170 }, () => ({
  x: Math.round((sceneryRand() * 2 - 1) * 760),
  y: -Math.round(24 + sceneryRand() * 900),
  big: sceneryRand() < 0.12,
  phase: sceneryRand() * Math.PI * 2,
}));
const CLOUDS = Array.from({ length: 7 }, (_, i) => ({
  x: -620 + i * 190 + Math.round(sceneryRand() * 60),
  y: -Math.round(70 + sceneryRand() * 230),
  size: sceneryRand() < 0.5 ? 2 : 3,
}));
const STRIPES = [6, 14, 24, 36, 50, 66, 84, 104, 126, 150, 176, 204, 234, 266, 300, 336];

function heights(seed: number, amp: number, base: number, freq: number) {
  const r = mulberry32(seed);
  const a = [r(), r(), r()].map((v) => v * Math.PI * 2);
  return (x: number) =>
    Math.round(
      -(base + amp * (0.55 * Math.sin(x * freq + a[0]!) + 0.3 * Math.sin(x * freq * 2.3 + a[1]!) + 0.15 * Math.sin(x * freq * 5.1 + a[2]!))),
    );
}
const farHill = heights(3, 18, 36, 0.009);
const midHill = heights(8, 10, 16, 0.015);

// Cached terrain layers (one night and one sunrise version each), drawn once.
interface Layer {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
}
const layers = new Map<string, Layer>();

function makeLayer(key: string, x: number, y: number, w: number, h: number, paint: (c: Ctx, day: boolean) => void, day: boolean): Layer {
  const id = `${key}:${day ? 1 : 0}`;
  const hit = layers.get(id);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;
  c.translate(-x, -y);
  paint(c, day);
  const layer = { canvas, x, y };
  layers.set(id, layer);
  return layer;
}

const px = (c: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};

function hillLayer(key: string, fn: (x: number) => number, fill: Pair, ridge: Pair, day: boolean): Layer {
  return makeLayer(
    key,
    -1300,
    -90,
    2600,
    90,
    (c, d) => {
      const f = d ? fill[1] : fill[0];
      const r = d ? ridge[1] : ridge[0];
      for (let x = -1300; x < 1300; x++) {
        const top = fn(x);
        if (top >= 0) continue;
        px(c, x, top, 1, -top, f);
        px(c, x, top, 1, 1, r);
      }
    },
    day,
  );
}

function groundLayer(day: boolean): Layer {
  return makeLayer(
    "ground",
    -760,
    -32,
    1520,
    460,
    (c, d) => {
      const pick = (p: Pair) => (d ? p[1] : p[0]);
      const base = pick(C.meadow);
      px(c, -760, 0, 1520, 430, base);
      for (const y of STRIPES) for (let x = -760; x < 760; x += 6) px(c, x, y, 4, 1, pick(C.stripe));
      for (let x = -150; x <= 150; x++) {
        const top = knollY(x);
        if (top >= 0) continue;
        px(c, x, top, 1, -top + 1, base);
        px(c, x, top, 1, 1, pick(C.rim));
      }
      const r = mulberry32(19);
      for (let i = 0; i < 620; i++) {
        const x = Math.round((r() * 2 - 1) * 740);
        const y = knollY(x) + 3 + Math.round(r() * 400);
        const v = Math.floor(r() * 3);
        if (Math.abs(x) < 34 && y < knollY(x) + 10) continue;
        px(c, x, y, 1, 3, pick(C.tuft));
        if (v > 0) px(c, x - 1, y + 1, 1, 2, pick(C.tuft));
        if (v > 1) px(c, x + 1, y, 1, 1, pick(C.tuftHi));
      }
      for (let i = 0; i < 110; i++) {
        const x = Math.round((r() * 2 - 1) * 740);
        const y = knollY(x) + 6 + Math.round(r() * 400);
        if (Math.abs(x) < 34 && y < knollY(x) + 10) continue;
        const color = ["#fff1b9", "#ffb0c0", "#ffffff", "#ffd36b"][Math.floor(r() * 4)]!;
        const fc = d ? color : mix(color, "#3a4670", 0.55);
        px(c, x, y, 2, 2, fc);
        px(c, x, y + 2, 1, 2, pick(C.tuft));
      }
    },
    day,
  );
}

const SUN_STEPS = ["#ffdd8c", "#ffd07a", "#ffc06c", "#ffad60", "#ff9a55", "#ff874c", "#f97445", "#f2623f"];
let sunCanvas: HTMLCanvasElement | null = null;
function sunSprite(): HTMLCanvasElement {
  if (sunCanvas) return sunCanvas;
  const r = SUN.r;
  const size = r * 2 + 1;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d")!;
  // A glowing sunrise: golden centre warming to orange and red at the rim, in soft
  // concentric steps. No stripes, no rays.
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y) / r;
      if (d > 1) continue;
      const color = SUN_STEPS[Math.min(SUN_STEPS.length - 1, Math.floor(d ** 1.6 * SUN_STEPS.length))]!;
      c.fillStyle = color;
      c.fillRect(x + r, y + r, 1, 1);
    }
  }
  sunCanvas = canvas;
  return canvas;
}

// ---------------------------------------------------------------------------
// Drawing in art pixels (low-res canvas)

export interface View {
  /** world rect covered by the low-res canvas (integers) */
  left: number;
  top: number;
  width: number;
  height: number;
  /** current camera x and the final close-up camera x (for parallax) */
  camX: number;
  finalX: number;
}

/** x offset for a layer with parallax p (1 = moves with the ground). */
export const shift = (camX: number, finalX: number, p: number) => Math.round((camX - finalX) * (1 - p));

export function sunCenter(s: WorldState, camX: number, finalX: number): { x: number; y: number } {
  return { x: SUN.x + shift(camX, finalX, 0.1), y: Math.round(SUN.fromY + (SUN.toY - SUN.fromY) * s.sun) };
}

function drawLayer(c: Ctx, night: Layer, day: Layer, dx: number, light: number) {
  if (light < 1) c.drawImage(night.canvas, night.x + dx, night.y);
  if (light > 0) {
    c.globalAlpha = light;
    c.drawImage(day.canvas, day.x + dx, day.y);
    c.globalAlpha = 1;
  }
}

function drawStars(c: Ctx, v: View, s: WorldState) {
  const fade = 1 - s.light;
  if (fade <= 0.02) return;
  const dx = shift(v.camX, v.finalX, 0.1);
  for (const star of STARS) {
    const x = star.x + dx;
    if (x < v.left - 3 || x > v.left + v.width + 3 || star.y < v.top - 3 || star.y > v.top + v.height) continue;
    c.globalAlpha = Math.max(0, fade * (0.55 + 0.45 * Math.sin(s.time / 520 + star.phase)));
    if (star.big) {
      px(c, x - 1, star.y, 3, 1, "#fff6d8");
      px(c, x, star.y - 1, 1, 3, "#fff6d8");
    } else px(c, x, star.y, 1, 1, "#fff6d8");
  }
  c.globalAlpha = 1;
}

function drawClouds(c: Ctx, v: View, s: WorldState) {
  const dx = shift(v.camX, v.finalX, 0.25);
  const body = tone(C.cloud, s.light);
  const shade = tone(C.cloudShade, s.light);
  const drift = s.calm ? 0 : s.time / 450;
  for (const cloud of CLOUDS) {
    const span = 1400;
    const x = Math.round(((((cloud.x + drift + 700) % span) + span) % span) - 700) + dx;
    const y = cloud.y;
    const k = cloud.size;
    px(c, x, y + 6 * k, 30 * k, 4 * k, body);
    px(c, x + 5 * k, y + 3 * k, 14 * k, 3 * k, body);
    px(c, x + 9 * k, y, 8 * k, 3 * k, body);
    px(c, x + 18 * k, y + 4 * k, 8 * k, 2 * k, body);
    px(c, x + 2 * k, y + 10 * k, 26 * k, k, shade);
  }
}

function drawLit(c: Ctx, def: SpriteDef, x: number, y: number, light: number, flip = false) {
  if (light < 1) c.drawImage(spriteCanvas(def, { flip, night: true }), x, y);
  if (light > 0) {
    c.globalAlpha = light;
    c.drawImage(spriteCanvas(def, { flip }), x, y);
    c.globalAlpha = 1;
  }
}

function heroSprite(s: WorldState): SpriteDef {
  if (s.mood === "happy") return HERO_HAPPY;
  return s.time % 3400 < 150 ? HERO_BLINK : HERO;
}

function drawHero(c: Ctx, s: WorldState, pose: HeroPose) {
  // A warm rim once it is found (and against the sunrise), so it stands out from the flock.
  const rim = s.begun ? Math.max(Math.min(1, (s.introT - INTRO.found) / 300) * 0.9, s.light) : 0;
  let def: SpriteDef;
  let x: number;
  let y: number;
  let flip = false;
  if (pose.phase === "stage") {
    const bob = s.calm ? 0 : s.time % 1600 < 420 ? 1 : 0;
    def = heroSprite(s);
    x = pose.x - HERO_W / 2;
    y = pose.y - HERO_H + bob - s.hop;
  } else {
    // In disguise: flock-sized with headphones; hops now and then as a hint if it stays unfound.
    let hop = 0;
    if (pose.phase === "run") def = Math.floor(s.introT / 90) % 2 ? RED_MINI.b : RED_MINI.a;
    else {
      def = s.time % 3900 < 140 ? RED_MINI.blink : RED_MINI.a;
      const waited = s.time - s.readySince;
      if (!s.begun && !s.calm && waited > HINT_AFTER_MS) hop = hopOffset((waited - HINT_AFTER_MS) % 1800);
    }
    x = Math.round(pose.x - SHEEP_W / 2);
    y = Math.round(pose.y - SHEEP_H) - hop;
    flip = pose.dir === -1;
  }
  if (rim > 0) {
    const halo = rimCanvas(def, "#fff0c8");
    c.save();
    c.globalAlpha = rim;
    if (flip) {
      // mirror the halo along with the sprite
      c.translate(x + halo.width - 1, y - 1);
      c.scale(-1, 1);
      c.drawImage(halo, 0, 0);
    } else {
      c.drawImage(halo, x - 1, y - 1);
    }
    c.restore();
  }
  drawLit(c, def, x, y, Math.max(s.light, rim * 0.6), flip);
}

/** A little hop (tap feedback or a hint). */
const hopOffset = (since: number) => (since >= 0 && since < 380 ? Math.round(Math.sin((Math.PI * since) / 380) * 10) : 0);

function drawSheep(c: Ctx, sheep: Sheep, s: WorldState) {
  const frames = FLOCK_SPRITES[sheep.colour % FLOCK_COLOURS.length]!;
  const blink = (s.time + sheep.phase * 977) % 4200 < 140;
  let def: SpriteDef = blink ? frames.blink : frames.a;
  let bob = 0;
  if (sheep.mode === "walk") {
    const step = Math.floor(s.time / 180 + sheep.phase) % 2;
    def = step ? frames.b : def;
    bob = step;
  }
  const y = Math.round(sheepY(sheep) - SHEEP_H + bob - hopOffset(s.time - sheep.hopAt));
  drawLit(c, def, Math.round(sheep.x - SHEEP_W / 2), y, s.light, sheep.dir === -1);
}

/** Where the bag is drawn right now (top-left, world px), or null. */
export function bagRect(s: WorldState): { x: number; y: number; w: number; h: number } | null {
  if (s.bag === "hidden") return null;
  const t = s.time - s.bagSince;
  let dx = 0;
  let dy = 0;
  if (s.bag === "drop" && !s.calm) {
    const p = Math.min(1, t / 700);
    dy = p < 0.72 ? -150 * (1 - (p / 0.72) ** 2) : -Math.round(8 * Math.sin((Math.PI * (p - 0.72)) / 0.28));
  } else if (s.bag === "shake" && !s.calm) {
    const step = Math.floor(t / 45) % 8;
    dx = [0, 2, 0, -2, 0, 3, 0, -3][step]!;
    dy = step % 2 ? -2 : 0;
  } else if (s.bag === "idle" && !s.calm) {
    dy = s.time % 1400 < 350 ? -2 : 0;
  }
  return { x: BAG_X - BAG_W / 2 + dx, y: Math.round(BAG_REST_Y - BAG_H + dy), w: BAG_W, h: BAG_H };
}

function drawBag(c: Ctx, s: WorldState) {
  const r = bagRect(s);
  if (!r) return;
  drawLit(c, s.bag === "open" ? BAG_OPEN : BAG_CLOSED, r.x, r.y, s.light);
  if (s.bag === "idle" && s.time % 2200 < 220) {
    px(c, r.x + 6, r.y + 18, 2, 2, "#fff6ee");
  }
}

function drawDisc(c: Ctx, s: WorldState) {
  if (s.discSince === null) return;
  const t = s.time - s.discSince;
  const p = s.calm ? 1 : Math.min(1, t / 700);
  const ease = 1 - (1 - p) ** 3;
  const fromX = BAG_X - DISC_W / 2;
  const fromY = BAG_REST_Y - BAG_H - 8;
  const toX = BAG_X - DISC_W / 2 + 10;
  const toY = HERO_TOP_Y - 6;
  const bob = p >= 1 && !s.calm ? (s.time % 1200 < 600 ? 0 : -2) : 0;
  const x = Math.round(fromX + (toX - fromX) * ease);
  const y = Math.round(fromY + (toY - fromY) * ease) + bob;
  c.drawImage(spriteCanvas(DISC), x, y);
  if (p >= 1 && Math.floor(s.time / 260) % 4 === 0) {
    px(c, x - 4, y + 2, 2, 6, "#fff6ee");
    px(c, x - 6, y + 4, 6, 2, "#fff6ee");
  }
}

/** The "found it" moment: two expanding rings and the bulb with blinking rays. */
function drawFound(c: Ctx, s: WorldState) {
  const p = s.introT - INTRO.found;
  if (!s.begun || p < 0 || p > BULB_MS) return;
  const hc = heroCenter(heroPath(s.introT));
  // rings
  for (const delay of [0, 180]) {
    const q = (p - delay) / 520;
    if (q <= 0 || q >= 1) continue;
    const r = Math.round(18 + q * 52);
    c.globalAlpha = 1 - q;
    c.fillStyle = "#fff7d6";
    const steps = Math.ceil(r * 2.2);
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      c.fillRect(Math.round(hc.x + Math.cos(a) * r) - 1, Math.round(hc.y + Math.sin(a) * r) - 1, 2, 2);
    }
  }
  c.globalAlpha = 1;
  // bulb
  const fade = p > BULB_MS - 400 ? (BULB_MS - p) / 400 : 1;
  let dy = 0;
  if (!s.calm) {
    if (p < 140) dy = Math.round(16 * (1 - p / 140));
    else if (p < 320) dy = -Math.round(6 * Math.sin((Math.PI * (p - 140)) / 180));
    else dy = Math.floor(s.time / 400) % 2 ? -1 : 0;
  }
  const bx = Math.round(hc.x - BULB_W / 2);
  const by = Math.round(hc.top - BULB_H - 10 + dy);
  c.globalAlpha = fade;
  // rays
  const on = Math.floor(p / 140) % 2 === 0;
  c.fillStyle = "#fff3a8";
  const cx = hc.x;
  const cy = by + 12;
  for (let i = 0; i < 8; i++) {
    if ((i % 2 === 0) !== on && p > 300) continue;
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    for (let d = 20; d < 28; d += 2) c.fillRect(Math.round(cx + Math.cos(a) * d) - 1, Math.round(cy + Math.sin(a) * d) - 1, 2, 2);
  }
  c.drawImage(spriteCanvas(BULB), bx, by);
  c.globalAlpha = 1;
}

function drawNote(c: Ctx, x: number, y: number, color: string) {
  px(c, x + 6, y, 2, 10, color);
  px(c, x + 8, y + 2, 2, 2, color);
  px(c, x + 10, y + 4, 2, 2, color);
  px(c, x + 1, y + 8, 6, 4, color);
}

function drawParticles(c: Ctx, s: WorldState) {
  for (const p of s.particles) {
    c.globalAlpha = Math.min(1, (1 - p.age / p.life) * 1.6);
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    if (p.kind === "note") drawNote(c, x, y, p.color);
    else if (p.kind === "puff") px(c, x - 3, y - 3, 7, 7, p.color);
    else if (p.kind === "spark") {
      px(c, x, y - 2, 2, 6, p.color);
      px(c, x - 2, y, 6, 2, p.color);
    } else px(c, x, y, 2, 2, p.color);
  }
  c.globalAlpha = 1;
}

export function drawWorld(c: Ctx, v: View, s: WorldState, showBag: boolean): void {
  c.clearRect(v.left, v.top, v.width, v.height);
  drawStars(c, v, s);
  if (s.sun > 0) {
    const sun = sunCenter(s, v.camX, v.finalX);
    const sprite = sunSprite();
    c.drawImage(sprite, sun.x - SUN.r, sun.y - SUN.r);
    // thin warm clouds drifting across its face
    const drift = s.calm ? 0 : Math.round(Math.sin(s.time / 2600) * 6);
    const band = tone(C.cloud, s.light);
    const shade = tone(C.cloudShade, s.light);
    c.globalAlpha = 0.92;
    px(c, sun.x - 70 + drift, sun.y + 6, 92, 5, band);
    px(c, sun.x - 62 + drift, sun.y + 11, 76, 2, shade);
    px(c, sun.x - 8 - drift, sun.y - 18, 84, 4, band);
    px(c, sun.x + 2 - drift, sun.y - 14, 66, 2, shade);
    c.globalAlpha = 1;
  }
  drawClouds(c, v, s);
  drawLayer(c, hillLayer("far", farHill, C.far, C.farRidge, false), hillLayer("far", farHill, C.far, C.farRidge, true), shift(v.camX, v.finalX, 0.35), s.light);
  drawLayer(c, hillLayer("mid", midHill, C.mid, C.midRidge, false), hillLayer("mid", midHill, C.mid, C.midRidge, true), shift(v.camX, v.finalX, 0.6), s.light);
  drawLayer(c, groundLayer(false), groundLayer(true), 0, s.light);
  const bottom = v.top + v.height;
  if (bottom > 428) px(c, v.left, 428, v.width, bottom - 428, tone(C.meadow, s.light));

  // Painter's order by feet position.
  type Item = { y: number; draw: () => void };
  const pose = heroPath(s.introT);
  const items: Item[] = [{ y: pose.y + 0.25, draw: () => drawHero(c, s, pose) }];
  if (showBag && s.bag !== "hidden") items.push({ y: BAG_REST_Y + 0.5, draw: () => drawBag(c, s) });
  for (const sheep of s.sheep) {
    if (sheep.x < v.left - SHEEP_W || sheep.x > v.left + v.width + SHEEP_W) continue;
    const y = sheepY(sheep);
    if (y < v.top || y - SHEEP_H > bottom) continue;
    items.push({ y, draw: () => drawSheep(c, sheep, s) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const item of items) item.draw();

  if (showBag) drawDisc(c, s);
  drawFound(c, s);
  drawParticles(c, s);
}

// ---------------------------------------------------------------------------
// Smooth layers at full resolution (screen canvas)

/** Screen position of a world point. */
export function toScreen(vp: Viewport, cam: Camera, x: number, y: number) {
  return { x: (x - cam.x) * cam.k + vp.width / 2, y: (y - cam.y) * cam.k + vp.height / 2 };
}

export function drawSky(g: Ctx, vp: Viewport, cam: Camera, s: WorldState): void {
  const horizon = toScreen(vp, cam, 0, 0).y;
  const top = horizon - 900 * cam.k;
  const grad = g.createLinearGradient(0, top, 0, horizon);
  const n = SKY_NIGHT.length;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    grad.addColorStop(1 - t, mix(ramp(SKY_NIGHT, t), ramp(SKY_DAWN, t), s.light));
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, vp.width, vp.height);
}

/**
 * A soft, round warm glow around the rising sun. Deliberately NO rays or stripes radiating
 * from the sun: a red disc with rays reads as the Rising Sun Flag and must never appear.
 */
export function drawSunGlow(g: Ctx, vp: Viewport, cam: Camera, s: WorldState): void {
  if (s.sun <= 0) return;
  const sun = sunCenter(s, cam.x, 0);
  const p = toScreen(vp, cam, sun.x, sun.y);
  const r = SUN.r * cam.k;
  const glow = g.createRadialGradient(p.x, p.y, r * 0.8, p.x, p.y, r * 2.4);
  glow.addColorStop(0, `rgba(255, 214, 140, ${0.55 * s.sun})`);
  glow.addColorStop(0.5, `rgba(255, 186, 120, ${0.2 * s.sun})`);
  glow.addColorStop(1, "rgba(255, 186, 120, 0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, vp.width, vp.height);
}

/** Darkens everything but the red sheep for a moment after it is found. */
export function drawSpotlight(g: Ctx, vp: Viewport, cam: Camera, s: WorldState): void {
  const p = s.introT - INTRO.found;
  if (!s.begun || p < 0 || p > 1800) return;
  const a = p < 200 ? p / 200 : p > 1300 ? (1800 - p) / 500 : 1;
  const hc = heroCenter(heroPath(s.introT));
  const c = toScreen(vp, cam, hc.x, hc.y);
  const r = 34 * cam.k;
  const grad = g.createRadialGradient(c.x, c.y, r * 0.75, c.x, c.y, r * 2.4);
  grad.addColorStop(0, "rgba(10, 10, 30, 0)");
  grad.addColorStop(1, `rgba(10, 10, 30, ${0.55 * a})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, vp.width, vp.height);
}

// ---------------------------------------------------------------------------
// Taps on the meadow

const PAD = 4;
const inRect = (wx: number, wy: number, x: number, feetY: number, w: number, h: number) =>
  wx >= x - w / 2 - PAD && wx <= x + w / 2 + PAD && wy >= feetY - h - PAD && wy <= feetY + PAD;

/** Is this world point on the hidden red sheep (generous margin for fingers)? */
export function hitHero(s: WorldState, wx: number, wy: number): boolean {
  const pose = heroPath(s.introT);
  if (s.begun || pose.phase !== "hidden") return false;
  return inRect(wx, wy, pose.x, pose.y, SHEEP_W + 12, SHEEP_H + 12);
}

/** Index of the front-most flock sheep under this world point, or -1. */
export function hitSheep(s: WorldState, wx: number, wy: number): number {
  let best = -1;
  let bestY = -Infinity;
  s.sheep.forEach((sheep, i) => {
    const y = sheepY(sheep);
    if (y > bestY && inRect(wx, wy, sheep.x, y, SHEEP_W, SHEEP_H)) {
      best = i;
      bestY = y;
    }
  });
  return best;
}

export function pokeSheep(s: WorldState, index: number): void {
  const sheep = s.sheep[index];
  if (sheep) sheep.hopAt = s.time;
}
