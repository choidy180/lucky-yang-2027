"use client";

import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { decodeNote, type ShareNote } from "@/lib/share";
import type { Song } from "@/lib/types";
import { DESKTOP, MOBILE, colors } from "@/styles/global";
import PlayerDialog from "./PlayerDialog";
import { PixelButton, PixelWindow } from "./pixel";

const pop = keyframes`
  0% { transform: translateY(12px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
`;

/** The body never scrolls (the game is full screen), so this page scrolls inside its own layer. */
const Scroll = styled.main`
  position: fixed;
  inset: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  background:
    radial-gradient(1px 1px at 12% 18%, ${colors.cream} 50%, transparent 51%),
    radial-gradient(1px 1px at 78% 12%, ${colors.cream} 50%, transparent 51%),
    radial-gradient(2px 2px at 64% 30%, ${colors.gold} 50%, transparent 51%),
    radial-gradient(1px 1px at 30% 40%, ${colors.cream} 50%, transparent 51%),
    radial-gradient(1px 1px at 90% 46%, ${colors.cream} 50%, transparent 51%),
    radial-gradient(2px 2px at 8% 60%, ${colors.gold} 50%, transparent 51%),
    linear-gradient(180deg, ${colors.night} 0%, ${colors.dusk} 70%, #3d6b4a 100%);
  background-attachment: fixed;
`;

const Column = styled.div`
  width: min(600px, 100%);
  margin: 0 auto;
  padding: max(24px, env(safe-area-inset-top)) 20px max(48px, env(safe-area-inset-bottom));
  display: grid;
  justify-items: center;
  gap: 18px;
  ${MOBILE} {
    padding-inline: 16px;
  }
`;

const Home = styled.a`
  justify-self: start;
  padding: 4px 10px;
  color: ${colors.cream};
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  box-shadow:
    0 -3px 0 0 ${colors.cream},
    0 3px 0 0 ${colors.cream},
    -3px 0 0 0 ${colors.cream},
    3px 0 0 0 ${colors.cream};
  background: rgba(19, 21, 50, 0.72);
  ${DESKTOP} {
    font-size: 18px;
  }
`;

const Mascot = styled.img`
  width: 132px;
  height: 132px;
  filter: drop-shadow(0 6px 0 rgba(6, 6, 20, 0.45));
  ${DESKTOP} {
    width: 168px;
    height: 168px;
  }
`;

const Card = styled(PixelWindow)<{ $ready: boolean }>`
  width: 100%;
  padding: 22px 24px 24px;
  opacity: ${(p) => (p.$ready ? 1 : 0)};
  animation: ${(p) => (p.$ready ? pop : "none")} 0.32s steps(5) both;
  ${MOBILE} {
    padding: 18px 16px 20px;
  }
`;

const Banner = styled.h1`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${colors.red};
  font-size: 18px;
  font-weight: 700;
  overflow-wrap: anywhere;
  ${DESKTOP} {
    font-size: 24px;
  }
`;

const Bubble = styled.blockquote`
  position: relative;
  margin: 14px 0 6px;
  padding: 12px 14px;
  background: ${colors.night};
  color: ${colors.cream};
  font-size: 18px;
  line-height: 1.6;
  white-space: pre-line;
  overflow-wrap: anywhere;
  ${DESKTOP} {
    font-size: 24px;
    line-height: 1.5;
  }
  &::after {
    /* pixel speech-bubble tail */
    content: "";
    position: absolute;
    left: 22px;
    bottom: -8px;
    width: 12px;
    height: 8px;
    background: ${colors.night};
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }
`;

const HopeChip = styled.p`
  display: inline-block;
  margin-top: 12px;
  padding: 1px 8px;
  background: #ffe9d6;
  color: ${colors.wine};
  font-size: 12px;
  font-weight: 700;
  ${DESKTOP} {
    font-size: 18px;
  }
`;

const SongTitle = styled.h2`
  margin-top: 8px;
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
  ${DESKTOP} {
    font-size: 48px;
  }
`;

const Artist = styled.p`
  margin-top: 2px;
  color: ${colors.muted};
  font-size: 18px;
  ${DESKTOP} {
    font-size: 24px;
  }
`;

const Wish = styled.div`
  margin: 14px 0 18px;
  padding: 12px 14px;
  background: #fff;
  box-shadow:
    0 -2px 0 0 ${colors.paperShade},
    0 2px 0 0 ${colors.paperShade},
    -2px 0 0 0 ${colors.paperShade},
    2px 0 0 0 ${colors.paperShade};
  h3 {
    font-size: 18px;
    font-weight: 700;
    color: ${colors.wine};
  }
  p {
    margin-top: 4px;
    font-size: 18px;
    line-height: 1.6;
  }
  ${DESKTOP} {
    h3,
    p {
      font-size: 24px;
    }
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px 18px;
  padding: 4px;
  & > * {
    flex: 1 1 200px;
    text-decoration: none;
  }
`;

const Lead = styled.p`
  margin-top: 10px;
  color: ${colors.muted};
  font-size: 18px;
  line-height: 1.6;
  ${DESKTOP} {
    font-size: 24px;
  }
`;

interface Shared {
  song: Song;
  blessing: string;
  hopeLabel: string | null;
}

export default function SharedSong({ shared }: { shared: Shared | null }) {
  const [note, setNote] = useState<ShareNote>({ from: "", message: "" });
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  // The message lives in the URL fragment, which only the browser can read.
  useEffect(() => {
    const read = () => setNote(decodeNote(window.location.hash));
    read();
    setReady(true);
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  return (
    <Scroll>
      <Column>
        <Home href="/">♪ 복주머니 레코드</Home>
        <Mascot src="/assets/yang.png" alt="" width={168} height={168} />
        {shared ? (
          <Card as="article" $ready={ready} aria-labelledby="sharedTitle">
            <Banner id="sharedTitle">
              <span aria-hidden="true">♪</span>
              {note.from ? `${note.from}님이 보낸 새해 첫 곡` : "친구가 보낸 새해 첫 곡"}
            </Banner>
            {note.message && <Bubble>{note.message}</Bubble>}
            {shared.hopeLabel && <HopeChip>내년 1순위 소망 · {shared.hopeLabel}</HopeChip>}
            <SongTitle>{shared.song.title}</SongTitle>
            <Artist>{shared.song.artist}</Artist>
            <Wish>
              <h3>새해 덕담</h3>
              <p>{shared.blessing}</p>
            </Wish>
            <Actions>
              <PixelButton type="button" onClick={() => setPlaying(true)}>
                <span aria-hidden="true">▶</span> 첫 곡 듣기
              </PixelButton>
              <PixelButton as="a" href="/" $tone="paper">
                나도 첫 곡 받기
              </PixelButton>
            </Actions>
          </Card>
        ) : (
          <Card as="article" $ready={ready} aria-labelledby="sharedTitle">
            <Banner id="sharedTitle">링크가 올바르지 않아요</Banner>
            <Lead>주소가 잘렸거나 바뀐 것 같아요. 대신 복주머니를 열어 나만의 첫 곡을 받아 보세요!</Lead>
            <Actions style={{ marginTop: 18 }}>
              <PixelButton as="a" href="/">
                올해 첫 곡 받으러 가기
              </PixelButton>
            </Actions>
          </Card>
        )}
      </Column>
      {playing && shared && <PlayerDialog song={shared.song} onClose={() => setPlaying(false)} />}
    </Scroll>
  );
}
