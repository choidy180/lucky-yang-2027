// Share links: "/s?s=<song>&b=<blessing>&h=<hope>#n=<note>".
// Only catalog indices go in the query (they say nothing about the person). The optional sender
// line and message go in the URL fragment, which browsers never send to the server, so they do
// not end up in request logs. The visitor's entered name is never added automatically.
import { findHope } from "@/data/hopes";

export const SHARE_PATH = "/s";
export const SHARE_FROM_MAX = 12;
export const SHARE_MESSAGE_MAX = 100;

export interface SharedPick {
  songIndex: number;
  blessingIndex: number;
  hope?: string;
}

export interface ShareNote {
  from: string;
  message: string;
}

const EMPTY_NOTE: ShareNote = { from: "", message: "" };

/** Trims, collapses runs of blank lines and clamps lengths (by code point, so emoji stay whole). */
export function normalizeNote(note: Partial<ShareNote>): ShareNote {
  const clamp = (value: unknown, max: number, multiline: boolean) => {
    if (typeof value !== "string") return "";
    let text = value.replace(/\r\n?/g, "\n");
    text = multiline ? text.replace(/\n{3,}/g, "\n\n") : text.replace(/\s+/g, " ");
    return Array.from(text.trim()).slice(0, max).join("").trim();
  };
  return { from: clamp(note.from, SHARE_FROM_MAX, false), message: clamp(note.message, SHARE_MESSAGE_MAX, true) };
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string | null {
  if (!/^[A-Za-z0-9_-]{1,2000}$/.test(value)) return null;
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Fragment payload ("n=..."), or "" when there is nothing to carry. */
export function encodeNote(note: Partial<ShareNote>): string {
  const { from, message } = normalizeNote(note);
  if (!from && !message) return "";
  const payload: { f?: string; m?: string } = {};
  if (from) payload.f = from;
  if (message) payload.m = message;
  return `n=${toBase64Url(JSON.stringify(payload))}`;
}

/** Reads `location.hash` (with or without "#"); anything malformed becomes an empty note. */
export function decodeNote(hash: string): ShareNote {
  const raw = new URLSearchParams(hash.replace(/^#/, "")).get("n");
  if (!raw) return EMPTY_NOTE;
  const json = fromBase64Url(raw);
  if (json === null) return EMPTY_NOTE;
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value !== "object" || value === null) return EMPTY_NOTE;
    const { f, m } = value as { f?: unknown; m?: unknown };
    return normalizeNote({ from: typeof f === "string" ? f : "", message: typeof m === "string" ? m : "" });
  } catch {
    return EMPTY_NOTE;
  }
}

export function sharePath(pick: SharedPick): string {
  const query = new URLSearchParams({ s: String(pick.songIndex), b: String(pick.blessingIndex) });
  if (pick.hope && findHope(pick.hope)) query.set("h", pick.hope);
  return `${SHARE_PATH}?${query}`;
}

export function shareUrl(origin: string, pick: SharedPick, note: Partial<ShareNote> = EMPTY_NOTE): string {
  const fragment = encodeNote(note);
  return `${origin.replace(/\/+$/, "")}${sharePath(pick)}${fragment ? `#${fragment}` : ""}`;
}

type Param = string | string[] | undefined;

const index = (value: Param, length: number): number | null => {
  if (typeof value !== "string" || !/^\d{1,4}$/.test(value)) return null;
  const n = Number(value);
  return n < length ? n : null;
};

/** Validates the query of a share link against the catalog sizes. */
export function parsePick(params: { s?: Param; b?: Param; h?: Param }, songCount: number, blessingCount: number): SharedPick | null {
  const songIndex = index(params.s, songCount);
  const blessingIndex = index(params.b, blessingCount);
  if (songIndex === null || blessingIndex === null) return null;
  const pick: SharedPick = { songIndex, blessingIndex };
  if (typeof params.h === "string" && findHope(params.h)) pick.hope = params.h;
  return pick;
}

/** Text for the share sheet / clipboard. */
export function shareText(song: { title: string; artist: string }, note: Partial<ShareNote>): string {
  const { from, message } = normalizeNote(note);
  const head = `${from ? `${from}의` : "나의"} 2027 새해 첫 곡은 「${song.title}」 - ${song.artist}!`;
  return message ? `${head}\n${message}` : head;
}
