// Remembers only the last successful draw per mode, without the recipient name.
// Storage may be unavailable (private mode, blocked cookies); the tab then keeps it in memory.
import { findHope } from "@/data/hopes";
import type { EventMode, Song, StoredDraw, Ticket } from "./types";

export const lastKey = (mode: EventMode) => `lucky-yang:last:${mode}`;
/** Older builds stored an array of tickets; the first item was the latest. */
export const legacyKey = (mode: EventMode) => `lucky-yang:v1:${mode}`;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const memory = new Map<EventMode, StoredDraw>();

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export interface Catalog {
  tracks: readonly Song[];
  blessingCount: number;
}

/** Accepts only a draw that still matches the current catalog. */
export function validateDraw(value: unknown, catalog: Catalog): StoredDraw | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Partial<Record<keyof StoredDraw, unknown>>;
  const { songIndex, blessingIndex, song, blessing, hope } = v;
  if (hope !== undefined && !findHope(hope)) return null;
  if (!Number.isInteger(songIndex) || !Number.isInteger(blessingIndex)) return null;
  const si = songIndex as number;
  const bi = blessingIndex as number;
  if (si < 0 || si >= catalog.tracks.length || bi < 0 || bi >= catalog.blessingCount) return null;
  const track = catalog.tracks[si]!;
  if (typeof song !== "object" || song === null || (song as Song).videoId !== track.videoId) return null;
  if (typeof blessing !== "string" || !blessing) return null;
  const draw: StoredDraw = { songIndex: si, blessingIndex: bi, song: { title: track.title, artist: track.artist, videoId: track.videoId }, blessing };
  if (typeof hope === "string") draw.hope = hope;
  return draw;
}

function parse(raw: string | null): { present: boolean; value: unknown } {
  if (raw === null) return { present: false, value: null };
  try {
    return { present: true, value: JSON.parse(raw) };
  } catch {
    return { present: true, value: undefined };
  }
}

export function readLastDraw(mode: EventMode, catalog: Catalog, storage: StorageLike | null = defaultStorage()): StoredDraw | null {
  const inMemory = memory.get(mode);
  if (!storage) return inMemory ? validateDraw(inMemory, catalog) : null;
  try {
    const current = parse(storage.getItem(lastKey(mode)));
    if (current.present) {
      const draw = validateDraw(current.value, catalog);
      if (!draw) storage.removeItem(lastKey(mode));
      return draw;
    }
    // Fall back to the old array format only when the current key is empty.
    const legacy = parse(storage.getItem(legacyKey(mode)));
    if (legacy.present) {
      const first = Array.isArray(legacy.value) ? legacy.value[0] : undefined;
      const draw = validateDraw(first, catalog);
      if (!draw) storage.removeItem(legacyKey(mode));
      return draw;
    }
    return inMemory ? validateDraw(inMemory, catalog) : null;
  } catch {
    return inMemory ? validateDraw(inMemory, catalog) : null;
  }
}

export function rememberDraw(mode: EventMode, ticket: Ticket, storage: StorageLike | null = defaultStorage()): void {
  // The name never leaves the screen, the response and the user's own ticket file.
  const { songIndex, blessingIndex, song, blessing, hope } = ticket;
  const draw: StoredDraw = { songIndex, blessingIndex, song: { title: song.title, artist: song.artist, videoId: song.videoId }, blessing };
  if (hope) draw.hope = hope;
  memory.set(mode, draw);
  try {
    storage?.setItem(lastKey(mode), JSON.stringify(draw));
  } catch {
    /* The draw stays available in memory for this tab. */
  }
}

/** Test helper. */
export function clearMemory(): void {
  memory.clear();
}
