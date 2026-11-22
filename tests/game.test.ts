import { describe, expect, it } from "vitest";
import {
  BAG_CLOSED,
  BAG_H,
  BAG_OPEN,
  BAG_W,
  BULB,
  BULB_H,
  BULB_W,
  DISC,
  FLOCK_COLOURS,
  FLOCK_SPRITES,
  HERO,
  HERO_BLINK,
  HERO_H,
  HERO_HAPPY,
  HERO_W,
  RED_MINI,
  SHEEP_H,
  SHEEP_W,
  scale2x,
  type SpriteDef,
} from "@/game/sprites";
import {
  BULB_MS,
  HERO_CENTER_Y,
  HERO_FEET_Y,
  HIDE,
  INTRO,
  INTRO_TOTAL,
  STAGE,
  SUN,
  approachCamera,
  cameraAt,
  closeCamera,
  closeScale,
  followCamera,
  foundCamera,
  heroPath,
  inClearing,
  introState,
  knollY,
  reservedBands,
  wideCamera,
  type Viewport,
} from "@/game/timeline";
import { BAG_X, FLOCK_SIZE, bagRect, createFlock, createWorld, hitHero, hitSheep, pokeSheep, poof, setBag, sheepY, updateWorld } from "@/game/world";

const VIEWPORTS: Viewport[] = [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 1366, height: 650 },
];

const count = (def: SpriteDef, ch: string) => def.rows.join("").split(ch).length - 1;
const size = (def: SpriteDef) => [def.rows[0]!.length, def.rows.length];

describe("sprites", () => {
  const all: [string, SpriteDef][] = [
    ...Object.entries({ HERO, HERO_BLINK, HERO_HAPPY, BAG_CLOSED, BAG_OPEN, DISC, BULB }),
    ...Object.entries(RED_MINI),
    ...FLOCK_SPRITES.flatMap((f, i) => Object.entries(f).map(([k, v]) => [`flock${i}.${k}`, v] as [string, SpriteDef])),
  ];

  it("are rectangular grids that only use their palette keys", () => {
    for (const [name, def] of all) {
      expect(new Set(def.rows.map((r) => r.length)).size, name).toBe(1);
      for (const row of def.rows) for (const ch of row) if (ch !== ".") expect(def.palette[ch], `${name}:${ch}`).toBeDefined();
    }
  });

  it("keeps the declared sizes", () => {
    for (const def of [HERO, HERO_BLINK, HERO_HAPPY]) expect(size(def)).toEqual([HERO_W, HERO_H]);
    for (const def of [BAG_CLOSED, BAG_OPEN]) expect(size(def)).toEqual([BAG_W, BAG_H]);
    expect(size(BULB)).toEqual([BULB_W, BULB_H]);
    for (const f of [...FLOCK_SPRITES, RED_MINI]) for (const def of [f.a, f.b, f.blink]) expect(size(def)).toEqual([SHEEP_W, SHEEP_H]);
  });

  it("gives the red sheep big shiny eyes that close for blinks and ^^ for joy", () => {
    expect(count(HERO, "e")).toBeGreaterThanOrEqual(60);
    expect(count(HERO, "w")).toBeGreaterThanOrEqual(10);
    expect(count(HERO_BLINK, "e")).toBeLessThan(count(HERO, "e") / 3);
    expect(count(HERO_HAPPY, "e")).toBeLessThan(count(HERO, "e") / 3);
  });

  it("draws the flock as the same chibi in other wool colours, without headphones", () => {
    expect(FLOCK_SPRITES).toHaveLength(FLOCK_COLOURS.length);
    const wool = new Set(FLOCK_SPRITES.map((f) => f.a.palette.R));
    expect(wool.size).toBe(FLOCK_COLOURS.length);
    expect(wool.has(RED_MINI.a.palette.R!)).toBe(false);
    for (const f of FLOCK_SPRITES) {
      expect(count(f.a, "N") + count(f.a, "Y")).toBe(0); // no headphones
      expect(count(f.a, "e")).toBe(10); // two 2×3 eyes minus one shine pixel each
      expect(count(f.a, "w")).toBeGreaterThanOrEqual(2);
      expect(count(f.blink, "e")).toBe(4);
    }
    // the red one in the flock wears the headphones — the clue
    expect(count(RED_MINI.a, "N")).toBeGreaterThan(10);
    expect(RED_MINI.a.rows.slice(0, 22)).toEqual(FLOCK_SPRITES[0]!.a.rows.slice(0, 22));
  });

  it("scale2x doubles and rounds diagonals", () => {
    expect(scale2x(["o."])).toEqual(["oo..", "oo.."]);
    expect(scale2x(["x.", ".x"])[1]).toBe("xxx.");
  });
});

describe("opening timeline (from the tap on the red sheep)", () => {
  it("found → run → zoom, then the sun, the title and the dialog", () => {
    expect(INTRO.found).toBe(0);
    expect(INTRO.found).toBeLessThan(INTRO.runStart);
    expect(INTRO.runStart).toBeLessThan(INTRO.runEnd);
    expect(INTRO.runEnd).toBeLessThanOrEqual(INTRO.zoomStart);
    expect(INTRO.zoomEnd).toBeLessThan(INTRO.titleAt);
    expect(INTRO.titleAt).toBeLessThan(INTRO.dialogAt);
    expect(introState(0)).toMatchObject({ light: 0, sun: 0, found: true, title: false, dialog: false });
    expect(introState(INTRO.sunEnd).light).toBe(1);
    expect(introState(INTRO_TOTAL).dialog).toBe(true);
    expect(INTRO_TOTAL).toBeLessThan(6500);
    expect(INTRO.found + BULB_MS).toBeLessThan(INTRO.zoomEnd);
  });

  it("stays night until the red sheep has run to the knoll", () => {
    for (let t = 0; t <= INTRO.sunStart; t += 100) expect(introState(t).light).toBe(0);
    let prev = -1;
    for (let t = 0; t <= INTRO_TOTAL; t += 50) {
      const { sun } = introState(t);
      expect(sun).toBeGreaterThanOrEqual(prev);
      prev = sun;
    }
    expect(SUN.fromY).toBeGreaterThan(0);
    expect(SUN.toY + SUN.r).toBeGreaterThan(HERO_FEET_Y - HERO_H);
  });
});

describe("the red sheep's journey", () => {
  it("hides in the flock, runs to the knoll once found, then stands there", () => {
    expect(heroPath(0)).toMatchObject({ phase: "hidden", x: HIDE.x, y: HIDE.y });
    const mid = heroPath((INTRO.runStart + INTRO.runEnd) / 2);
    expect(mid.phase).toBe("run");
    expect(mid.x).toBeLessThan(HIDE.x);
    expect(mid.x).toBeGreaterThan(STAGE.x);
    expect(heroPath(INTRO.runEnd)).toMatchObject({ phase: "stage", x: STAGE.x, y: STAGE.y });
    let prev: number = HIDE.x;
    for (let t = INTRO.runStart; t < INTRO.runEnd; t += 50) {
      const x = heroPath(t).x;
      expect(x).toBeLessThanOrEqual(prev);
      prev = x;
    }
  });

  it("is visible (above the start card) in the wide shot on every screen", () => {
    for (const vp of VIEWPORTS) {
      const cam = wideCamera(vp);
      const sx = (HIDE.x - cam.x) * cam.k + vp.width / 2;
      const sy = (HIDE.y - cam.y) * cam.k + vp.height / 2;
      expect(sx - (SHEEP_W / 2) * cam.k, JSON.stringify(vp)).toBeGreaterThan(0);
      expect(sx + (SHEEP_W / 2) * cam.k, JSON.stringify(vp)).toBeLessThan(vp.width);
      expect(sy, JSON.stringify(vp)).toBeLessThan(vp.height * 0.68);
      expect(SHEEP_H * cam.k).toBeGreaterThanOrEqual(30); // big enough to tap
    }
  });

  it("has flock all around its hiding spot, someone in front, and the knoll top free", () => {
    const flock = createFlock(false);
    const around = flock.filter((s) => Math.abs(s.x - HIDE.x) < 110 && Math.abs(sheepY(s) - HIDE.y) < 70);
    expect(around.length).toBeGreaterThanOrEqual(10);
    expect(flock.some((s) => sheepY(s) > HIDE.y && sheepY(s) - HIDE.y < 24 && Math.abs(s.x - HIDE.x) < 40)).toBe(true);
    expect(flock.filter((s) => Math.abs(s.x) < 30 && sheepY(s) < knollY(s.x) + 22)).toHaveLength(0);
  });

  it("is found by a tap on it, and a tap on a white sheep makes that one hop", () => {
    const w = createWorld(false);
    expect(hitHero(w, HIDE.x, HIDE.y - 10)).toBe(true);
    expect(hitHero(w, HIDE.x + 200, HIDE.y)).toBe(false);
    const target = w.sheep.find((s) => Math.hypot(s.x - HIDE.x, sheepY(s) - HIDE.y) > 60)!;
    const i = hitSheep(w, target.x, sheepY(target) - 12);
    expect(i).toBeGreaterThanOrEqual(0);
    pokeSheep(w, i);
    expect(w.sheep[i]!.hopAt).toBe(w.time);
    w.begun = true;
    expect(hitHero(w, HIDE.x, HIDE.y - 10)).toBe(false); // only while waiting
  });

  it("bursts a sparkle puff when it arrives", () => {
    const w = createWorld(false);
    poof(w);
    expect(w.particles.length).toBeGreaterThan(20);
    for (let i = 0; i < 40; i++) updateWorld(w, 50);
    expect(w.particles).toHaveLength(0);
  });
});

describe("camera", () => {
  it("goes wide → onto the red sheep → follows the run → close-up", () => {
    for (const vp of VIEWPORTS) {
      expect(cameraAt(vp, 0)).toEqual(wideCamera(vp));
      expect(cameraAt(vp, INTRO.foundZoomed)).toEqual(foundCamera(vp));
      const mid = (INTRO.runStart + INTRO.runEnd) / 2;
      expect(cameraAt(vp, mid)).toEqual(followCamera(vp, heroPath(mid)));
      expect(cameraAt(vp, INTRO.zoomEnd)).toEqual(closeCamera(vp));
      expect(wideCamera(vp).k).toBeGreaterThanOrEqual(1);
    }
  });

  it("frames the sheep in whole pixels between the title band and the dialog band", () => {
    for (const vp of VIEWPORTS) {
      for (const inset of [0, 320, 460]) {
        const cam = closeCamera(vp, inset);
        expect(Number.isInteger(cam.k)).toBe(true);
        const toScreen = (y: number) => (y - cam.y) * cam.k + vp.height / 2;
        const bands = reservedBands(vp, inset);
        if (vp.height - bands.top - bands.bottom >= HERO_H * 2) {
          expect(toScreen(HERO_FEET_Y - HERO_H), JSON.stringify({ vp, inset })).toBeGreaterThanOrEqual(bands.top - 1);
          expect(toScreen(HERO_FEET_Y), JSON.stringify({ vp, inset })).toBeLessThanOrEqual(vp.height - bands.bottom + 1);
        }
        expect(closeScale(vp, inset)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("eases toward a new framing and snaps when it arrives", () => {
    const vp = VIEWPORTS[3]!;
    const b = closeCamera(vp, 460);
    let cam = closeCamera(vp, 0);
    for (let i = 0; i < 200; i++) cam = approachCamera(cam, b, 16);
    expect(cam).toEqual(b);
  });
});

describe("the flock", () => {
  it("is big, deterministic, colourful and stands on the ground", () => {
    const a = createFlock(false);
    expect(a).toHaveLength(FLOCK_SIZE);
    expect(FLOCK_SIZE).toBeGreaterThanOrEqual(100);
    expect(createFlock(false).map((s) => [s.x, s.depth, s.colour])).toEqual(a.map((s) => [s.x, s.depth, s.colour]));
    expect(new Set(a.map((s) => s.colour)).size).toBe(FLOCK_COLOURS.length);
    for (const s of a) expect(sheepY(s)).toBeGreaterThanOrEqual(knollY(s.x) + 4);
    expect(knollY(0)).toBe(-24);
    expect(HERO_CENTER_Y).toBeLessThan(0);
  });

  it("makes way once the red sheep is found, then keeps the clearing free", () => {
    const w = createWorld(false);
    w.scatter = true;
    for (let i = 0; i < 120; i++) updateWorld(w, 50);
    expect(w.sheep.filter((s) => inClearing(s.x, sheepY(s)))).toHaveLength(0);
    for (let i = 0; i < 4000; i++) updateWorld(w, 50);
    expect(w.sheep.filter((s) => inClearing(s.x, sheepY(s)))).toHaveLength(0);
    for (const s of w.sheep) expect(Math.abs(s.x)).toBeLessThanOrEqual(640);
  });

  it("calm (reduced motion) sheep do not wander", () => {
    const w = createWorld(true);
    const start = w.sheep.map((s) => s.x);
    for (let i = 0; i < 2000; i++) updateWorld(w, 50);
    expect(w.sheep.map((s) => s.x)).toEqual(start);
  });
});

describe("lucky bag", () => {
  it("drops, settles, shakes and bursts", () => {
    const w = createWorld(false);
    expect(bagRect(w)).toBeNull();
    setBag(w, "drop");
    const falling = bagRect(w)!.y;
    updateWorld(w, 400);
    updateWorld(w, 400);
    expect(w.bag).toBe("idle");
    expect(bagRect(w)!.y).toBeGreaterThan(falling);
    expect(bagRect(w)!.x + BAG_W / 2).toBe(BAG_X);
    setBag(w, "shake");
    setBag(w, "open");
    expect(w.particles.length).toBeGreaterThan(30);
    expect(w.discSince).not.toBeNull();
    for (let i = 0; i < 100; i++) updateWorld(w, 50);
    expect(w.particles).toHaveLength(0);
  });
});

describe("the sunrise", () => {
  it("stops low, with its lower part behind the hills (a natural sunrise, never a flag-like disc)", () => {
    // the disc's bottom edge ends below the far-hill line (about -36), so the hills cover it
    expect(SUN.toY + SUN.r).toBeGreaterThan(-36);
    expect(SUN.toY).toBeLessThan(0);
  });
});
