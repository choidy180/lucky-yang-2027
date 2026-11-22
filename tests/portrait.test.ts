import { describe, expect, it } from "vitest";
import { PORTRAIT_DURATION, REDUCED_MOTION_DURATION, poseAt, portraitScale } from "@/lib/portrait";

const sample = (from: number, to: number, step = 1) => {
  const out: { t: number; pose: ReturnType<typeof poseAt> }[] = [];
  for (let t = from; t <= to; t += step) out.push({ t, pose: poseAt(t) });
  return out;
};

describe("intro choreography", () => {
  it("lasts 5,650 ms (300 ms still frame with reduced motion)", () => {
    expect(PORTRAIT_DURATION).toBe(5650);
    expect(REDUCED_MOTION_DURATION).toBe(300);
  });

  it("starts with open eyes, a resting head and a closed mouth", () => {
    for (const t of [0, 200, 429]) expect(poseAt(t)).toMatchObject({ blink: 0, nod: 0, mouth: 0 });
  });

  it("blinks exactly three times: closed at +73 ms, held to +104 ms, open at +203 ms", () => {
    for (const start of [430, 1000, 1360]) {
      expect(poseAt(start).blink).toBe(0);
      expect(poseAt(start + 73).blink).toBe(1);
      expect(poseAt(start + 104).blink).toBe(1);
      expect(poseAt(start + 203).blink).toBe(0);
    }
    let closures = 0;
    let shut = false;
    for (const { pose } of sample(0, PORTRAIT_DURATION)) {
      if (!shut && pose.blink > 0.9) closures++;
      shut = pose.blink > 0.9 ? true : pose.blink < 0.1 ? false : shut;
    }
    expect(closures).toBe(3);
  });

  it("nods once after the blinks, lowest at 2,100–2,160 ms", () => {
    const nod = sample(0, PORTRAIT_DURATION).filter((s) => s.pose.nod > 0);
    expect(nod[0]!.t).toBeGreaterThanOrEqual(1750);
    expect(nod.at(-1)!.t).toBeLessThanOrEqual(2590);
    expect(poseAt(2100).nod).toBe(1);
    expect(poseAt(2160).nod).toBe(1);
    expect(poseAt(2400).nod).toBeLessThan(1);
    // Blinks are over before the nod starts.
    expect(Math.max(...nod.map((s) => s.pose.blink))).toBe(0);
  });

  it("hums silently between 2,700 and 5,320 ms with a ~452 ms mouth cycle", () => {
    const singing = sample(0, PORTRAIT_DURATION).filter((s) => s.pose.mouth > 0);
    expect(singing[0]!.t).toBeGreaterThan(2700);
    expect(singing.at(-1)!.t).toBeLessThan(5320);
    // Mouth peaks inside the phrase come one beat apart.
    const peaks = sample(3000, 5000).filter(
      ({ t, pose }) => pose.mouth > poseAt(t - 1).mouth && pose.mouth >= poseAt(t + 1).mouth && pose.phrase === 1,
    );
    for (let i = 1; i < peaks.length; i++) expect(Math.abs(peaks[i]!.t - peaks[i - 1]!.t - 452)).toBeLessThanOrEqual(1);
    expect(poseAt(5400)).toMatchObject({ mouth: 0, nod: 0, blink: 0 });
  });

  it("crops so that eyes and mouth fill the screen on phones and desktops", () => {
    // 1254px artwork; the face spans roughly x 440–790. It must fit inside the viewport width.
    for (const [w, h] of [[390, 844], [768, 1024], [1440, 900], [2560, 1440]] as const) {
      const s = portraitScale(w, h);
      expect((790 - 440) * s).toBeLessThan(w);
      expect(1254 * s).toBeGreaterThanOrEqual(w);
    }
  });
});
