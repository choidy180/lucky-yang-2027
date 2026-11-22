// Pure timing and camera math for the opening (unit tested).
// World units are art pixels. The horizon is y = 0; the red sheep hides in a large flock
// until the visitor taps it; then it runs to the knoll at x = 0.
import { HERO_H } from "./sprites";

export const INTRO = {
  /** t = 0 is the tap on the red sheep: bulb + "띠링!" (the camera eases in) */
  found: 0,
  foundZoomed: 600,
  /** it runs out of the flock up to the knoll (the camera follows) */
  runStart: 900,
  runEnd: 2100,
  /** pushes in to the close-up */
  zoomStart: 2200,
  zoomEnd: 3400,
  /** the red sun rises behind the red sheep */
  sunStart: 2300,
  sunEnd: 5200,
  hops: [3500, 3850] as const,
  /** "올해 첫 곡은 뭐양?" */
  titleAt: 4500,
  /** dialog box opens; the intro is over */
  dialogAt: 5800,
} as const;
export const INTRO_TOTAL = INTRO.dialogAt;
/** How long the bulb stays above the red sheep. */
export const BULB_MS = 1500;
/** Waiting this long on the meadow without finding it, the red sheep starts hopping as a hint. */
export const HINT_AFTER_MS = 6000;

const KNOLL_HALF = 150;
const KNOLL_PEAK = 24;
export const HERO_FEET_Y = -KNOLL_PEAK + 2;
export const HERO_TOP_Y = HERO_FEET_Y - HERO_H;
export const HERO_CENTER_Y = HERO_FEET_Y - HERO_H / 2;
export const GROUND_BOTTOM = 300;
/** Final sun centre (as seen from the close-up) and radius. */
// It stops low, partly hidden by the hills, so it reads as a natural sunrise (never a flag-like disc).
export const SUN = { x: 0, fromY: 70, toY: -62, r: 52 } as const;
/** Where the red sheep hides in the flock (feet position) — it is flock-sized there. */
export const HIDE = { x: 96, y: 84 } as const;
/** Where it ends up: on top of the knoll. */
export const STAGE = { x: 0, y: HERO_FEET_Y } as const;
const HIDDEN_H = 34;

export interface HeroPose {
  phase: "hidden" | "run" | "stage";
  /** feet position */
  x: number;
  y: number;
  /** 1 = facing right */
  dir: 1 | -1;
}

/** The red sheep's journey: hidden in the flock → runs (hopping) to the knoll → stands there. */
export function heroPath(t: number): HeroPose {
  if (t < INTRO.runStart) return { phase: "hidden", x: HIDE.x, y: HIDE.y, dir: -1 };
  if (t < INTRO.runEnd) {
    const p = (t - INTRO.runStart) / (INTRO.runEnd - INTRO.runStart);
    const e = easeInOutCubic(p);
    const hop = Math.abs(Math.sin(p * Math.PI * 5)) * 10;
    return { phase: "run", x: Math.round(HIDE.x + (STAGE.x - HIDE.x) * e), y: Math.round(HIDE.y + (STAGE.y - HIDE.y) * e - hop), dir: -1 };
  }
  return { phase: "stage", x: STAGE.x, y: STAGE.y, dir: 1 };
}

/** Centre of the red sheep's sprite right now (for the bulb, rings and spotlight). */
export function heroCenter(pose: HeroPose): { x: number; y: number; top: number } {
  const h = pose.phase === "stage" ? HERO_H : HIDDEN_H;
  return { x: pose.x, y: pose.y - h / 2, top: pose.y - h };
}

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const easeInOutCubic = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};
export const easeOutCubic = (t: number) => 1 - (1 - clamp01(t)) ** 3;
export const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export interface IntroState {
  /** 0 night → 1 sunrise */
  light: number;
  /** 0 below the hills → 1 risen */
  sun: number;
  /** hero hop height in world px */
  hop: number;
  found: boolean;
  title: boolean;
  dialog: boolean;
}

export function introState(t: number): IntroState {
  const hop = Math.max(
    0,
    ...INTRO.hops.map((start) => {
      const p = (t - start) / 260;
      return p > 0 && p < 1 ? Math.sin(Math.PI * p) * 6 : 0;
    }),
  );
  return {
    light: smooth((t - INTRO.sunStart) / (INTRO.sunEnd - INTRO.sunStart)),
    sun: easeOutCubic((t - INTRO.sunStart) / (INTRO.sunEnd - INTRO.sunStart + 400)),
    hop: Math.round(hop),
    found: t >= INTRO.found,
    title: t >= INTRO.titleAt,
    dialog: t >= INTRO.dialogAt,
  };
}

export interface Viewport {
  width: number;
  height: number;
}
export interface Camera {
  /** world point at the centre of the screen */
  x: number;
  y: number;
  /** CSS px per world px */
  k: number;
}

/** Wide shot: about 620×400 world px, never below 1 CSS px per art pixel. */
export function wideScale(vp: Viewport): number {
  return Math.max(1, Math.min(vp.width / 620, vp.height / 400));
}

/** Search zoom: close enough to read faces in the flock. */
export function searchScale(vp: Viewport): number {
  return wideScale(vp) * 1.8;
}

/**
 * Screen space kept free for the title (top) and the dialog box (bottom), in CSS px.
 * The close-up frames the red sheep in the band between them.
 */
export function reservedBands(vp: Viewport, bottomInset = 0, topInset = 0): { top: number; bottom: number } {
  const base = vp.width <= 740 ? { top: vp.height * 0.25, bottom: vp.height * 0.44 } : { top: vp.height <= 720 ? 190 : vp.height <= 960 ? 260 : 290, bottom: 340 };
  // Measured title / dialog edges win over the defaults when they are known (a short dialog,
  // like the name bubble, gives the sheep more room instead of leaving empty meadow below it).
  return { top: topInset > 0 ? topInset + 10 : base.top, bottom: bottomInset > 0 ? bottomInset + 16 : base.bottom };
}

function freeBand(vp: Viewport, bottomInset: number, topInset = 0) {
  const r = reservedBands(vp, bottomInset, topInset);
  return { ...r, band: Math.max(60, vp.height - r.top - r.bottom) };
}

/** Close-up scale in whole pixels: fits the free band, at most half the width and a third of the height. */
export function closeScale(vp: Viewport, bottomInset = 0, topInset = 0): number {
  const { band } = freeBand(vp, bottomInset, topInset);
  let k = Math.round(Math.min(vp.width * 0.5, band * 0.95, vp.height * 0.32) / HERO_H);
  if (k * HERO_H > band) k = Math.floor(band / HERO_H); // never spill out of the band
  return Math.max(2, k);
}

/**
 * Where the hero's centre sits on screen (fraction of the height from the top). The sheep stands
 * just above the dialog, so the speech bubble's tail points right at it; spare room goes to the sky.
 */
export function heroScreenY(vp: Viewport, bottomInset = 0, topInset = 0): number {
  const { top, band } = freeBand(vp, bottomInset, topInset);
  const h = closeScale(vp, bottomInset, topInset) * HERO_H;
  const gap = Math.min(12, Math.max(0, band - h) / 2);
  return (top + band - gap - h / 2) / vp.height;
}

/** Wide shot with the horizon about 30% from the top (a bit of night sky, mostly flock). */
export function wideCamera(vp: Viewport): Camera {
  const k = wideScale(vp);
  return { x: 0, y: (0.2 * vp.height) / k, k };
}

/** Camera that follows the red sheep while it is small (found, then running to the knoll). */
export function followCamera(vp: Viewport, pose: HeroPose): Camera {
  return { x: pose.x, y: pose.y - 30, k: searchScale(vp) * 1.2 };
}

export function foundCamera(vp: Viewport): Camera {
  return followCamera(vp, heroPath(INTRO.found));
}

export function closeCamera(vp: Viewport, bottomInset = 0, topInset = 0): Camera {
  const k = closeScale(vp, bottomInset, topInset);
  return { x: 0, y: HERO_CENTER_Y + ((0.5 - heroScreenY(vp, bottomInset, topInset)) * vp.height) / k, k };
}

function lerpCamera(a: Camera, b: Camera, p: number): Camera {
  if (p <= 0) return a;
  if (p >= 1) return b;
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, k: Math.exp(Math.log(a.k) + (Math.log(b.k) - Math.log(a.k)) * p) };
}

/** The opening camera (t from the tap): wide → onto the red sheep → follow the run → close-up. */
export function cameraAt(vp: Viewport, t: number): Camera {
  const wide = wideCamera(vp);
  if (t > INTRO.runStart && t < INTRO.runEnd) return followCamera(vp, heroPath(t));
  const arrived = followCamera(vp, heroPath(INTRO.runEnd));
  const keys: [number, Camera][] = [
    [0, wide],
    [INTRO.foundZoomed, foundCamera(vp)],
    [INTRO.runStart, foundCamera(vp)],
    [INTRO.runEnd, arrived],
    [INTRO.zoomStart, arrived],
    [INTRO.zoomEnd, closeCamera(vp)],
  ];
  if (t <= 0) return wide;
  for (let i = 1; i < keys.length; i++) {
    const [t1, b] = keys[i]!;
    if (t <= t1) {
      const [t0, a] = keys[i - 1]!;
      return lerpCamera(a, b, easeInOutCubic((t - t0) / Math.max(1, t1 - t0)));
    }
  }
  return closeCamera(vp);
}

/** Eases a camera toward a target (exponential smoothing, log-space zoom); snaps when close. */
export function approachCamera(from: Camera, to: Camera, dt: number, tau = 220): Camera {
  const a = 1 - Math.exp(-dt / tau);
  const k = Math.exp(Math.log(from.k) + (Math.log(to.k) - Math.log(from.k)) * a);
  const next = { x: from.x + (to.x - from.x) * a, y: from.y + (to.y - from.y) * a, k };
  if (Math.abs(next.k - to.k) < 0.01 && Math.abs(next.x - to.x) < 0.05 && Math.abs(next.y - to.y) < 0.05) return { ...to };
  return next;
}

/** Height of the knoll the hero stands on (negative = above the horizon). */
export function knollY(x: number): number {
  if (Math.abs(x) >= KNOLL_HALF) return 0;
  return Math.round((-KNOLL_PEAK * (Math.cos((Math.PI * x) / KNOLL_HALF) + 1)) / 2);
}

/** The space around the red sheep that the flock leaves once it is found. */
export function inClearing(x: number, y: number): boolean {
  return Math.abs(x) < 96 && y < knollY(x) + 44;
}
