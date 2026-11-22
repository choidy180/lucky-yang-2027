// Server-side event rules: mode, period, validation and the uniform draw.
// Everything that depends on time, randomness or data can be injected for tests.
import { blessings as BLESSINGS } from "@/data/blessings";
import { findHope } from "@/data/hopes";
import { songs as SONGS } from "@/data/songs";
import { normalizeName, type EventMode, type EventPhase, type EventState, type Song, type Ticket } from "./types";

/** 2027-01-01 00:00 KST (= 2026-12-31T15:00:00Z) */
export const OPENS_AT = Date.parse("2027-01-01T00:00:00+09:00");
/** 2027-01-02 00:00 KST (= 2027-01-01T15:00:00Z) */
export const CLOSES_AT = Date.parse("2027-01-02T00:00:00+09:00");

/** A request body larger than this cannot hold a valid name. */
const MAX_BODY_BYTES = 4096;

export type RandomInt = (maxExclusive: number) => number;

/** Uniform integer in [0, maxExclusive) from Web Crypto, using rejection sampling to avoid modulo bias. */
export const secureRandomInt: RandomInt = (maxExclusive) => {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 0x100000000) {
    throw new RangeError("maxExclusive must be an integer in 1..2^32");
  }
  const limit = 0x100000000 - (0x100000000 % maxExclusive);
  const sample = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(sample);
  } while (sample[0]! >= limit);
  return sample[0]! % maxExclusive;
};

/** Only an explicit `live` enables the date window. Anything else (including unset) is test. */
export function resolveMode(value: string | undefined = process.env.EVENT_MODE): EventMode {
  return value?.trim().toLowerCase() === "live" ? "live" : "test";
}

export function phaseAt(mode: EventMode, now: number): EventPhase {
  if (mode === "test") return "open";
  if (now < OPENS_AT) return "waiting";
  if (now < CLOSES_AT) return "open";
  return "closed";
}

export function eventState(
  mode: EventMode,
  now: number,
  songs: readonly Song[] = SONGS,
  blessings: readonly string[] = BLESSINGS,
): EventState {
  return {
    mode,
    phase: phaseAt(mode, now),
    opensAt: OPENS_AT,
    closesAt: CLOSES_AT,
    now,
    songCount: songs.length,
    blessingCount: blessings.length,
    tracks: songs,
  };
}

export class EmptyPoolError extends Error {
  constructor() {
    super("추첨할 항목이 없어요.");
    this.name = "EmptyPoolError";
  }
}

/**
 * Uniformly picks an index in [0, length), skipping `exclude` when it is a valid index.
 * Draws from 0..n-2 and shifts values at or above the excluded slot up by one.
 */
export function pickIndex(length: number, exclude?: number, random: RandomInt = secureRandomInt): number {
  if (!Number.isInteger(length) || length < 1) throw new EmptyPoolError();
  if (length === 1) return 0;
  const skip = exclude !== undefined && Number.isInteger(exclude) && exclude >= 0 && exclude < length;
  if (!skip) return random(length);
  const index = random(length - 1);
  return index >= exclude ? index + 1 : index;
}

export interface PreviousPick {
  songIndex?: number;
  blessingIndex?: number;
}

export interface DrawResult {
  songIndex: number;
  blessingIndex: number;
  song: Song;
  blessing: string;
}

/** Uniform pick from a list of indices, skipping the excluded one when another choice exists. */
export function pickFrom(indices: readonly number[], length: number, exclude?: number, random: RandomInt = secureRandomInt): number {
  const pool = [...new Set(indices)].filter((i) => Number.isInteger(i) && i >= 0 && i < length);
  if (pool.length === 0) throw new EmptyPoolError();
  const candidates = exclude !== undefined && pool.length > 1 && pool.includes(exclude) ? pool.filter((i) => i !== exclude) : pool;
  return candidates[random(candidates.length)]!;
}

export interface HopePool {
  readonly songs: readonly number[];
  readonly blessings: readonly number[];
}

/**
 * Song and blessing are drawn independently; each excludes only its own previous index.
 * With a wish (hope), both come from the songs/blessings that suit it; otherwise from everything.
 */
export function drawFortune(
  previous: PreviousPick = {},
  random: RandomInt = secureRandomInt,
  songs: readonly Song[] = SONGS,
  blessings: readonly string[] = BLESSINGS,
  hope?: HopePool,
): DrawResult {
  const songIndex = hope ? pickFrom(hope.songs, songs.length, previous.songIndex, random) : pickIndex(songs.length, previous.songIndex, random);
  const blessingIndex = hope
    ? pickFrom(hope.blessings, blessings.length, previous.blessingIndex, random)
    : pickIndex(blessings.length, previous.blessingIndex, random);
  return { songIndex, blessingIndex, song: songs[songIndex]!, blessing: blessings[blessingIndex]! };
}

/** `?song=3` → 3. Anything that is not a plain non-negative integer is ignored. */
export function parseIndexParam(value: string | null): number | undefined {
  if (value === null || !/^\d{1,6}$/.test(value)) return undefined;
  return Number(value);
}

// ---------------------------------------------------------------------------
// HTTP handlers. The route files call these with the real clock and env.

export interface HandlerOptions {
  mode?: EventMode;
  now?: number;
  random?: RandomInt;
  songs?: readonly Song[];
  blessings?: readonly string[];
}

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { ...NO_STORE, ...extra } });
}

export function methodNotAllowed(allow: "GET" | "POST"): Response {
  return json({ error: `${allow} 요청만 받을 수 있어요.` }, 405, { Allow: allow });
}

export function handleEvent(options: HandlerOptions = {}): Response {
  const mode = options.mode ?? resolveMode();
  const now = options.now ?? Date.now();
  return json(eventState(mode, now, options.songs, options.blessings));
}

async function readBody(request: Request): Promise<{ name: unknown; hope: unknown } | null> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (!text || text.length > MAX_BODY_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const { name, hope } = data as { name?: unknown; hope?: unknown };
  return { name, hope };
}

export async function handleDraw(request: Request, options: HandlerOptions = {}): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");
  const mode = options.mode ?? resolveMode();
  const now = options.now ?? Date.now();
  const phase = phaseAt(mode, now);
  if (phase !== "open") {
    return json({ error: "지금은 복주머니를 열 수 없어요.", phase }, 403);
  }
  const body = await readBody(request);
  const name = normalizeName(body?.name);
  if (!name) {
    return json({ error: "이름 또는 별명을 1~24자로 입력해 주세요." }, 400);
  }
  // The #1 wish is optional; when given it must be one of the listed ones.
  const hope = body?.hope === undefined || body.hope === null ? undefined : findHope(body.hope);
  if (body?.hope !== undefined && body.hope !== null && !hope) {
    return json({ error: "소망을 다시 골라 주세요." }, 400);
  }
  // Re-draw exclusions are a test-mode convenience only.
  const url = new URL(request.url);
  const previous: PreviousPick =
    mode === "test"
      ? {
          songIndex: parseIndexParam(url.searchParams.get("song")),
          blessingIndex: parseIndexParam(url.searchParams.get("wish")),
        }
      : {};
  try {
    const result = drawFortune(previous, options.random, options.songs, options.blessings, hope);
    const ticket: Ticket = hope ? { name, ...result, hope: hope.key } : { name, ...result };
    return json(ticket);
  } catch (error) {
    if (error instanceof EmptyPoolError) {
      return json({ error: "복주머니가 비어 있어요. 잠시 후 다시 시도해 주세요." }, 500);
    }
    throw error;
  }
}
