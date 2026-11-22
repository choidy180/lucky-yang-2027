// Tiny synthesized sound effects (Web Audio, no files). Browsers only allow audio after a
// user gesture, so `unlockAudio()` is called from the start button.

type Ctor = typeof AudioContext;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function unlockAudio(): void {
  try {
    if (!ctx) {
      const AC: Ctor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function audioReady(): boolean {
  return ctx !== null && ctx.state === "running";
}

function voice(freq: number, start: number, dur: number, type: OscillatorType, peak: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** A small bell: fundamental plus a quickly fading inharmonic partial. */
function bell(freq: number, start: number, dur: number, peak = 0.32) {
  voice(freq, start, dur, "sine", peak);
  voice(freq * 2.76, start, dur * 0.35, "sine", peak * 0.28);
  voice(freq * 4.1, start, dur * 0.18, "sine", peak * 0.12);
}

/** "띠링!" — two rising bell notes. */
export function playDing(): void {
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  bell(1318.5, t, 0.45); // E6
  bell(1975.5, t + 0.12, 0.9); // B6
}

/** A soft "뿅" when a white sheep is tapped. */
export function playBlip(): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime + 0.01;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + 0.16);
}

/** The lucky bag pops open: a quick sparkly arpeggio. */
export function playOpen(): void {
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  [1046.5, 1318.5, 1568, 2093].forEach((f, i) => voice(f, t + i * 0.07, 0.32, "triangle", 0.18));
  bell(2637, t + 0.3, 0.7, 0.18);
}
