// Shared between the server routes and the browser. Keep this file free of data and Node APIs.

export type EventMode = "test" | "live";
export type EventPhase = "waiting" | "open" | "closed";

export interface Song {
  readonly title: string;
  readonly artist: string;
  readonly videoId: string;
}

export interface EventState {
  mode: EventMode;
  phase: EventPhase;
  /** epoch ms */
  opensAt: number;
  /** epoch ms */
  closesAt: number;
  /** server clock, epoch ms */
  now: number;
  songCount: number;
  blessingCount: number;
  tracks: readonly Song[];
}

/** A draw without the recipient name. This is the only shape that is stored in the browser. */
export interface StoredDraw {
  songIndex: number;
  blessingIndex: number;
  song: Song;
  blessing: string;
}

export interface Ticket extends StoredDraw {
  name: string;
}

/** Same rule as the input's maxLength and the server validation: JS string length after trim. */
export const NAME_MAX_LENGTH = 24;

export function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= NAME_MAX_LENGTH ? name : null;
}
