import type { Metadata } from "next";
import SharedSong from "@/components/SharedSong";
import { blessings } from "@/data/blessings";
import { findHope } from "@/data/hopes";
import { songs } from "@/data/songs";
import { parsePick } from "@/lib/share";

// A friend's shared result. The query only carries catalog indices; the personal message sits in
// the URL fragment and is read in the browser (SharedSong), so the server never sees it.
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function resolve(searchParams: Props["searchParams"]) {
  const pick = parsePick(await searchParams, songs.length, blessings.length);
  if (!pick) return null;
  const track = songs[pick.songIndex]!;
  return {
    song: { title: track.title, artist: track.artist, videoId: track.videoId },
    blessing: blessings[pick.blessingIndex]!,
    hopeLabel: findHope(pick.hope)?.label ?? null,
  };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const shared = await resolve(searchParams);
  const title = shared ? `친구가 보낸 새해 첫 곡 · ${shared.song.title}` : "올해 첫 곡은 뭐양?";
  const description = shared
    ? `${shared.song.artist} - ${shared.song.title}. 너도 복주머니를 열어 2027년 첫 곡을 받아 봐!`
    : "복주머니를 열어 2027년 새해 첫 곡과 덕담을 받아 보세요.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", locale: "ko_KR", images: [{ url: "/assets/yang.png", width: 1254, height: 1254 }] },
    twitter: { card: "summary", title, description, images: ["/assets/yang.png"] },
  };
}

export default async function SharePage({ searchParams }: Props) {
  return <SharedSong shared={await resolve(searchParams)} />;
}
