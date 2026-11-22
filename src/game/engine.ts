// Owns the canvas, the animation loop, the opening timeline and the bag hotspot.
// React drives it through a few imperative calls; it reports back through callbacks.
import { INTRO, INTRO_TOTAL, approachCamera, cameraAt, closeCamera, introState, wideCamera, type Camera, type Viewport } from "./timeline";
import {
  bagRect,
  createFlock,
  createWorld,
  poof,
  drawSky,
  drawSpotlight,
  drawSunGlow,
  drawWorld,
  hitHero,
  hitSheep,
  pokeSheep,
  setBag,
  setOpenedStill,
  updateWorld,
  type BagMode,
  type View,
  type WorldState,
} from "./world";

export interface EngineCallbacks {
  /** The camera has found the red sheep ("띠링!"). */
  onFound: () => void;
  /** The title moment of the opening (also fired right away on skip). */
  onTitle: () => void;
  /** The opening is over: show the dialog. Fired once per run. */
  onIntroEnd: () => void;
}

export interface EngineOptions {
  reducedMotion: boolean;
}

const MAX_DPR = 2;

export class GameEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly low: HTMLCanvasElement;
  private readonly lowCtx: CanvasRenderingContext2D;
  private readonly world: WorldState;
  private readonly callbacks: EngineCallbacks;
  private readonly reduced: boolean;
  private hotspot: HTMLElement | null = null;
  private frame = 0;
  private last = 0;
  /** null until the visitor presses start */
  private introStart: number | null = null;
  private introDone = false;
  private fired = { found: false, poof: false, title: false };
  private running = false;
  private vp: Viewport = { width: 1, height: 1 };
  private dpr = 1;
  private observer: ResizeObserver | null = null;
  private bottomInset = 0;
  private topInset = 0;
  private cam: Camera | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks, options: EngineOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.canvas = canvas;
    this.ctx = ctx;
    this.low = document.createElement("canvas");
    this.lowCtx = this.low.getContext("2d")!;
    this.callbacks = callbacks;
    this.reduced = options.reducedMotion;
    this.world = createWorld(options.reducedMotion);
  }

  /** Starts rendering the wide shot; the opening waits for `begin()`. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.measure();
    this.observer = new ResizeObserver(() => this.measure());
    this.observer.observe(this.canvas);
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.observer = null;
  }

  /** The red sheep was found (tapped, or "못 찾겠어요"): ding → run to the knoll → close-up → sunrise. */
  begin(): void {
    if (this.introStart !== null) return;
    this.restart(performance.now());
  }

  /**
   * A tap/click on the canvas at client coordinates while waiting on the meadow.
   * Returns "hero" when it hit the hidden red sheep, "sheep" when a flock sheep (it hops).
   */
  handleTap(clientX: number, clientY: number): "hero" | "sheep" | "none" {
    if (this.introStart !== null || !this.cam) return "none";
    const rect = this.canvas.getBoundingClientRect();
    const wx = this.cam.x + (clientX - rect.left - this.vp.width / 2) / this.cam.k;
    const wy = this.cam.y + (clientY - rect.top - this.vp.height / 2) / this.cam.k;
    if (hitHero(this.world, wx, wy)) return "hero";
    const i = hitSheep(this.world, wx, wy);
    if (i >= 0) {
      pokeSheep(this.world, i);
      return "sheep";
    }
    return "none";
  }

  get hasBegun(): boolean {
    return this.introStart !== null;
  }

  /** Jump to the end of the opening (camera on the red sheep, sun up). */
  skipIntro(): void {
    if (this.introDone) return;
    if (this.introStart === null) this.restart(performance.now());
    this.introStart = performance.now() - INTRO_TOTAL;
    this.fired.poof = true; // no sparkle puff when jumping straight to the end
    this.fireCallbacks(INTRO_TOTAL);
  }

  /** The visitor starts looking (after the narration): the red sheep's hint hops count from now. */
  startSearch(): void {
    this.world.readySince = this.world.time;
  }

  /** Back to the meadow at night, the red sheep hidden again, waiting for a tap. */
  replayIntro(): void {
    this.world.sheep = createFlock(this.reduced);
    this.world.begun = false;
    this.world.scatter = false;
    this.world.particles = [];
    this.world.readySince = this.world.time;
    this.introStart = null;
    this.introDone = false;
    this.fired = { found: false, poof: false, title: false };
    this.cam = null;
  }

  setBag(mode: BagMode): void {
    setBag(this.world, mode);
  }

  /** Bag already opened earlier (restored ticket): no burst. */
  showOpenedBag(): void {
    setOpenedStill(this.world);
  }

  setMood(mood: "idle" | "happy"): void {
    this.world.mood = mood;
  }

  /** An element (the HTML button) that follows the bag on screen. */
  attachHotspot(el: HTMLElement | null): void {
    this.hotspot = el;
  }

  /** Height (CSS px from the bottom edge) covered by the dialog/result window; the camera reframes. */
  setBottomInset(px: number): void {
    this.bottomInset = Math.max(0, px);
  }

  /** Bottom edge (CSS px from the top) of the title; the close-up keeps the sheep below it. */
  setTopInset(px: number): void {
    this.topInset = Math.max(0, px);
  }

  get isIntroDone(): boolean {
    return this.introDone;
  }

  /** Development aid: render one frame as if the opening were at time t (works in hidden tabs). */
  debugRenderAt(t: number, stepMs = 50): void {
    if (this.introStart === null) this.restart(performance.now());
    const now = performance.now();
    this.introStart = now - t;
    this.last = now - stepMs; // advance the world by one step, like a real frame
    this.tick(now);
  }

  // -------------------------------------------------------------------------

  private restart(now: number) {
    this.introDone = false;
    this.fired = { found: false, poof: false, title: false };
    this.world.scatter = false;
    this.world.particles = [];
    this.world.begun = true;
    this.introStart = this.reduced ? now - INTRO_TOTAL + 300 : now;
  }

  private measure() {
    const rect = this.canvas.getBoundingClientRect();
    this.vp = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = Math.round(this.vp.width * this.dpr);
    const h = Math.round(this.vp.height * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private fireCallbacks(t: number) {
    if (!this.fired.found && t >= INTRO.found) {
      this.fired.found = true;
      this.world.scatter = true;
      this.callbacks.onFound();
    }
    if (!this.fired.poof && t >= INTRO.runEnd) {
      this.fired.poof = true;
      poof(this.world);
    }
    if (!this.fired.title && t >= INTRO.titleAt) {
      this.fired.title = true;
      this.callbacks.onTitle();
    }
    if (!this.introDone && t >= INTRO.dialogAt) {
      this.introDone = true;
      this.callbacks.onIntroEnd();
    }
  }

  private camera(t: number, dt: number): Camera {
    if (this.introStart === null) return (this.cam = wideCamera(this.vp));
    if (!this.introDone || !this.cam) {
      this.cam = this.introDone ? closeCamera(this.vp, this.bottomInset, this.topInset) : cameraAt(this.vp, t);
      return this.cam;
    }
    const target = closeCamera(this.vp, this.bottomInset, this.topInset);
    this.cam = this.reduced ? target : approachCamera(this.cam, target, dt);
    return this.cam;
  }

  private tick = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(100, now - this.last);
    this.last = now;
    const t = this.introStart === null ? 0 : Math.min(INTRO_TOTAL + 100000, now - this.introStart);

    const intro = introState(this.introDone ? INTRO_TOTAL : Math.min(t, INTRO_TOTAL));
    this.world.introT = this.introDone ? Math.max(t, INTRO_TOTAL) : t;
    this.world.light = intro.light;
    this.world.sun = intro.sun;
    this.world.hop = this.reduced ? 0 : intro.hop;
    updateWorld(this.world, dt);
    if (this.introStart !== null) this.fireCallbacks(t);

    this.render(this.camera(Math.min(t, INTRO_TOTAL), dt));
    this.frame = requestAnimationFrame(this.tick);
  };

  private render(cam: Camera) {
    const { width, height } = this.vp;
    const k = cam.k;
    const left = cam.x - width / (2 * k);
    const top = cam.y - height / (2 * k);
    const ox = Math.floor(left);
    const oy = Math.floor(top);
    const lw = Math.ceil(width / k) + 2;
    const lh = Math.ceil(height / k) + 2;
    if (this.low.width !== lw || this.low.height !== lh) {
      this.low.width = lw;
      this.low.height = lh;
    }
    const c = this.lowCtx;
    c.setTransform(1, 0, 0, 1, -ox, -oy);
    c.imageSmoothingEnabled = false;
    const view: View = { left: ox, top: oy, width: lw, height: lh, camX: cam.x, finalX: 0 };
    drawWorld(c, view, this.world, this.introDone);

    const g = this.ctx;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawSky(g, this.vp, cam, this.world);
    drawSunGlow(g, this.vp, cam, this.world);
    g.imageSmoothingEnabled = false;
    g.drawImage(this.low, -(left - ox) * k, -(top - oy) * k, lw * k, lh * k);
    drawSpotlight(g, this.vp, cam, this.world);

    this.placeHotspot(left, top, k);
  }

  private placeHotspot(left: number, top: number, k: number) {
    const el = this.hotspot;
    if (!el) return;
    const r = this.introDone ? bagRect(this.world) : null;
    if (!r || this.world.bag === "open") {
      if (el.style.display !== "none") el.style.display = "none";
      return;
    }
    const pad = 6;
    el.style.display = "block";
    el.style.left = `${(r.x - pad - left) * k}px`;
    el.style.top = `${(r.y - pad - top) * k}px`;
    el.style.width = `${(r.w + pad * 2) * k}px`;
    el.style.height = `${(r.h + pad * 2) * k}px`;
  }
}
