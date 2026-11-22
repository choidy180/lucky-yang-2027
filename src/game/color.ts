// Tiny colour helpers. Lighting is quantised to 1/16 steps so the scene changes in
// visible pixel-art "palette steps" and the mixes can be cached.

export type RGB = readonly [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? [...h].map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
}

export const STEPS = 16;
export const quantize = (t: number) => Math.round(Math.max(0, Math.min(1, t)) * STEPS) / STEPS;

const cache = new Map<string, string>();

/** a→b by t (0..1), quantised. */
export function mix(a: string, b: string, t: number): string {
  const q = quantize(t);
  if (q === 0) return a;
  if (q === 1) return b;
  const key = `${a}|${b}|${q}`;
  let out = cache.get(key);
  if (!out) {
    const x = hexToRgb(a);
    const y = hexToRgb(b);
    out = rgbToHex([x[0] + (y[0] - x[0]) * q, x[1] + (y[1] - x[1]) * q, x[2] + (y[2] - x[2]) * q]);
    cache.set(key, out);
  }
  return out;
}

/** Interpolates along evenly spaced colour stops. */
export function ramp(stops: readonly string[], t: number): string {
  if (stops.length === 1) return stops[0]!;
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return mix(stops[i]!, stops[i + 1]!, x - i);
}
