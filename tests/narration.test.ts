import { describe, expect, it } from "vitest";
import { CHEERS, STORY } from "@/components/Narration";

describe("opening narration", () => {
  it("starts with one of several distinct end-of-year encouragements", () => {
    expect(CHEERS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(CHEERS).size).toBe(CHEERS.length);
    for (const line of CHEERS) expect(line.length).toBeLessThanOrEqual(30);
  });

  it("explains the gift and ends by asking to find the red sheep with headphones", () => {
    expect(STORY.length).toBeGreaterThanOrEqual(2);
    expect(STORY.join(" ")).toContain("선물");
    const last = STORY[STORY.length - 1]!;
    expect(last).toContain("헤드폰");
    expect(last).toContain("붉은 양");
    expect(last).toContain("눌러");
  });
});
