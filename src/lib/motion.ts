export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
