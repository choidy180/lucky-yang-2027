// The opening portrait: the original 1254×1254 artwork with re-painted eyes and mouth,
// one nod and a silent hum. Choreography is in ms, measured from the first decoded frame.
// Plain canvas code; React only owns the lifecycle (see IntroPortrait).

export const PORTRAIT_DURATION = 5650;
export const REDUCED_MOTION_DURATION = 300;
/** Upper bound for waiting on the image before giving up on the intro. */
const DECODE_GUARD_MS = 3200;

const ART_SIZE = 1254;
/** Crop centre in artwork pixels. */
export const CROP_CENTER = { x: 610, y: 597 } as const;
const BACKDROP = "#ffedcd";

interface Patch {
  x: number;
  y: number;
  w: number;
  h: number;
}

const eyePatches: readonly Patch[] = [
  { x: 458, y: 636, w: 46, h: 47 },
  { x: 721, y: 664, w: 46, h: 47 },
];
const lipPatch: Patch = { x: 563, y: 692, w: 87, h: 39 };

const unit = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const t = unit(n);
  return t * t * (3 - 2 * t);
};
function envelope(t: number, start: number, peak: number, release: number, end: number) {
  return ease((t - start) / (peak - start)) * (1 - ease((t - release) / (end - release)));
}

export interface Pose {
  blink: number;
  nod: number;
  phrase: number;
  beat: number;
  mouth: number;
}

/** Blinks start at 430/1000/1360 ms (203 ms each), nod 1750–2590 ms, hum 2700–5320 ms. */
export function poseAt(t: number): Pose {
  const blink = Math.max(
    ...[430, 1000, 1360].map((start) => envelope(t, start, start + 73, start + 104, start + 203)),
  );
  const nod = envelope(t, 1750, 2100, 2160, 2590);
  const phrase = envelope(t, 2700, 2860, 5040, 5320);
  const beat = (t - 2750) / 452;
  const syllable = (1 - Math.cos(beat * Math.PI * 2)) / 2;
  return { blink, nod, phrase, beat, mouth: phrase * (0.1 + 0.9 * syllable) };
}

/** Same crop rule as the canvas so the poster image and the first frame line up. */
export function portraitScale(width: number, height: number): number {
  return Math.max(width / 970, Math.min(width / 550, height / 568));
}

function makeSurface(size: number): HTMLCanvasElement {
  const surface = document.createElement("canvas");
  surface.width = size;
  surface.height = size;
  return surface;
}

function context2d(canvas: HTMLCanvasElement, settings?: CanvasRenderingContext2DSettings) {
  const c = canvas.getContext("2d", settings);
  if (!c) throw new Error("Canvas 2D is not available");
  return c;
}

// Reconstruct the cream skin inside three small ink marks from each row's two
// adjacent skin pixels. The rest of the character, including the nose, is original.
function liftInk(context: CanvasRenderingContext2D, p: Patch) {
  const region = context.getImageData(p.x, p.y, p.w, p.h);
  const pixels = region.data;
  for (let y = 0; y < p.h; y++) {
    const left = y * p.w * 4;
    const right = left + (p.w - 1) * 4;
    for (let x = 1; x < p.w - 1; x++) {
      const offset = left + 4 * x;
      if (pixels[offset]! > 232 && pixels[offset + 1]! > 194) continue;
      const blend = x / (p.w - 1);
      for (let channel = 0; channel < 3; channel++) {
        pixels[offset + channel] = pixels[left + channel]! * (1 - blend) + pixels[right + channel]! * blend;
      }
    }
  }
  context.putImageData(region, p.x, p.y);
}

type FaceAt = (pose: Pose) => HTMLCanvasElement;

function makeFace(image: HTMLImageElement): FaceAt {
  const blank = makeSurface(ART_SIZE);
  const base = context2d(blank, { willReadFrequently: true });
  base.drawImage(image, 0, 0, ART_SIZE, ART_SIZE);
  [...eyePatches, lipPatch].forEach((p) => liftInk(base, p));
  const face = makeSurface(ART_SIZE);
  const ink = context2d(face);
  ink.drawImage(blank, 0, 0);

  function restore(p: Patch) {
    ink.drawImage(blank, p.x, p.y, p.w, p.h, p.x, p.y, p.w, p.h);
  }
  function paintEye(p: Patch, shut: number) {
    restore(p);
    const height = p.h * (1 - 0.92 * shut);
    const middle = p.y + p.h / 2 + shut * 2;
    // Squash the actual painted pupil; fade into a soft curved eyelid.
    const lid = ease((shut - 0.78) / 0.22);
    ink.globalAlpha = 1 - lid;
    ink.drawImage(image, p.x, p.y, p.w, p.h, p.x, middle - height / 2, p.w, height);
    ink.globalAlpha = lid;
    ink.lineWidth = 5;
    ink.lineCap = "round";
    ink.strokeStyle = "#73372e";
    ink.beginPath();
    ink.moveTo(p.x + 5, middle - 1);
    ink.quadraticCurveTo(p.x + p.w / 2, middle + 6, p.x + p.w - 5, middle - 2);
    ink.stroke();
    ink.globalAlpha = 1;
  }
  function paintMouth(open: number) {
    restore(lipPatch);
    if (open < 0.012) {
      ink.drawImage(image, lipPatch.x, lipPatch.y, lipPatch.w, lipPatch.h, lipPatch.x, lipPatch.y, lipPatch.w, lipPatch.h);
      return;
    }
    const amount = ease(open);
    const depth = 8 + 22 * amount;
    const width = 23 - 6 * amount;
    ink.lineJoin = "round";
    ink.lineCap = "round";
    ink.lineWidth = 4;
    ink.strokeStyle = "#783c32";
    ink.fillStyle = "#873f3a";
    ink.beginPath();
    ink.moveTo(607 - width, 705);
    ink.quadraticCurveTo(607, 711 - amount * 9, 607 + width, 706);
    ink.bezierCurveTo(607 + width - 2, 705 + depth, 607 - width + 3, 708 + depth, 607 - width, 705);
    ink.fill();
    ink.stroke();
    if (amount > 0.16) {
      ink.fillStyle = "#f4a4a0";
      ink.beginPath();
      ink.ellipse(607, 707 + depth * 0.55, width * 0.48, 2 + amount * 2.5, 0, 0, Math.PI * 2);
      ink.fill();
    }
    // Keep the original split lip and its contact with the triangular nose.
    ink.lineWidth = 4.5;
    ink.beginPath();
    ink.moveTo(607, 694);
    ink.quadraticCurveTo(607, 704, 598, 707);
    ink.quadraticCurveTo(589, 714 - amount * 9, 578, 705);
    ink.moveTo(607, 697);
    ink.quadraticCurveTo(612, 709, 621, 708);
    ink.quadraticCurveTo(630, 713 - amount * 8, 637, 706);
    ink.stroke();
  }
  return function faceAt(pose) {
    for (const eye of eyePatches) paintEye(eye, pose.blink);
    // Singing can extend below the rest mouth, so clear its full movement area.
    ink.drawImage(blank, 563, 728, 90, 16, 563, 728, 90, 16);
    paintMouth(pose.mouth);
    return face;
  };
}

// During the single bow the forehead and chin move forward while the headphones
// and shoulders stay anchored. This piecewise projection preserves their silhouette.
const headBands: ReadonlyArray<readonly [number, number]> = [
  [0, 20], [158, 44], [415, 64], [660, 61], [850, 38], [980, 3], [1254, 0],
];
function drawHead(c: CanvasRenderingContext2D, face: HTMLCanvasElement, nod: number) {
  if (nod < 0.001) {
    c.drawImage(face, 0, 0);
    return;
  }
  for (let i = 1; i < headBands.length; i++) {
    const [y, offset] = headBands[i - 1]!;
    const [next, nextOffset] = headBands[i]!;
    const overlap = i === headBands.length - 1 ? 0 : 0.6;
    const top = y + offset * nod;
    c.drawImage(face, 0, y, ART_SIZE, next - y + overlap, 0, top, ART_SIZE, next + nextOffset * nod - top + overlap);
  }
}

/** Five notes, 430 ms apart from 2820 ms, alternating sides, each ~900 ms. */
function drawNotes(c: CanvasRenderingContext2D, width: number, height: number, t: number) {
  const small = width < height;
  for (let i = 0; i < 5; i++) {
    const p = (t - 2820 - i * 430) / 900;
    if (p <= 0 || p >= 1) continue;
    const side = i % 2 ? -1 : 1;
    const startX = width * (0.5 + side * (small ? 0.28 : 0.23));
    const startY = height * (small ? 0.45 : 0.43);
    c.save();
    c.translate(startX + side * width * 0.1 * p, startY - height * (0.18 * p + 0.045 * Math.sin(Math.PI * p)));
    c.rotate(side * (0.18 + 0.13 * p));
    const size = Math.min(2.3, Math.max(0.86, width / 630));
    c.scale(size, size);
    c.globalAlpha = Math.sin(p * Math.PI) * 0.96;
    c.strokeStyle = c.fillStyle = i % 2 ? "#744552" : "#b45a3c";
    c.lineWidth = 3;
    c.lineCap = "round";
    c.beginPath();
    c.ellipse(0, 0, 5.1, 3.8, -0.42, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(4, -1);
    c.lineTo(4, -19);
    c.quadraticCurveTo(9, -14, 12, -13);
    c.stroke();
    c.restore();
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export interface PortraitHandlers {
  /** Called once when drawing begins (the choreography clock starts here). */
  onStart?: (duration: number) => void;
  /** Called exactly once: natural end, decode failure, missing canvas support or timeout. */
  onFinish: () => void;
}

/**
 * Plays the portrait on `canvas` using the already-mounted `image`. Returns `stop`, which
 * cancels every timer and animation frame without calling `onFinish`.
 */
export function playPortrait(canvas: HTMLCanvasElement, image: HTMLImageElement, handlers: PortraitHandlers): () => void {
  let done = false;
  let frame = 0;
  let guard: ReturnType<typeof setTimeout> | undefined;

  function stop() {
    done = true;
    cancelAnimationFrame(frame);
    clearTimeout(guard);
  }
  function finish() {
    if (done) return;
    stop();
    handlers.onFinish();
  }

  guard = setTimeout(finish, DECODE_GUARD_MS);

  async function begin() {
    await image.decode();
    if (done) return;
    const c = canvas.getContext("2d");
    if (!c) {
      finish();
      return;
    }
    const faceAt = makeFace(image);
    const reduced = prefersReducedMotion();
    const duration = reduced ? REDUCED_MOTION_DURATION : PORTRAIT_DURATION;
    clearTimeout(guard);
    guard = setTimeout(finish, duration + 600);

    let start = -1;
    function render(now: number) {
      if (done) return;
      if (start < 0) {
        start = now;
        handlers.onStart?.(duration);
      }
      const time = now - start;
      if (time >= duration) {
        finish();
        return;
      }
      const ctx = c!;
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      // Cap the backing store on dense or huge screens.
      const dpr = Math.min(window.devicePixelRatio || 1, 2, 2400 / Math.max(width, height));
      const bw = Math.max(1, Math.round(width * dpr));
      const bh = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      ctx.setTransform(bw / width, 0, 0, bh / height, 0, 0);
      ctx.fillStyle = BACKDROP;
      ctx.fillRect(0, 0, width, height);
      const pose = poseAt(reduced ? 0 : time);
      const scale = portraitScale(width, height);
      ctx.save();
      ctx.translate(width * 0.5, height * 0.5);
      ctx.scale(scale, scale);
      ctx.rotate(pose.nod * 0.029 + pose.phrase * Math.sin(pose.beat * Math.PI) * 0.014);
      ctx.translate(-CROP_CENTER.x, -CROP_CENTER.y);
      drawHead(ctx, faceAt(pose), pose.nod);
      ctx.restore();
      drawNotes(ctx, width, height, reduced ? 0 : time);
      frame = requestAnimationFrame(render);
    }
    frame = requestAnimationFrame(render);
  }

  begin().catch(finish);
  return stop;
}
