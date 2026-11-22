"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { Song } from "@/lib/types";
import { loadYouTubeApi, type YTPlayer } from "@/lib/youtube";
import { colors } from "@/styles/global";
import Modal, { DialogNote } from "./Modal";
import { PixelButton } from "./pixel";

const frame = `
  box-shadow:
    0 -4px 0 0 #3a2622,
    0 4px 0 0 #3a2622,
    -4px 0 0 0 #3a2622,
    4px 0 0 0 #3a2622;
`;

const Video = styled.iframe`
  display: block;
  width: 100%;
  min-width: 200px;
  min-height: 200px;
  aspect-ratio: 16 / 9;
  border: 0;
  background: #1b1a3a;
  ${frame}
`;

/** Holder the YouTube API replaces with its own iframe. */
const Stage = styled.div`
  position: relative;
  width: 100%;
  min-width: 200px;
  aspect-ratio: 16 / 9;
  background: #1b1a3a;
  ${frame}

  iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
`;

const SoundRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  margin-top: 16px;
  padding: 4px;

  small {
    color: ${colors.muted};
    font-size: 12px;
    line-height: 1.5;
  }
`;

const Links = styled.div`
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
`;

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function embedUrl(videoId: string, origin: string): string {
  // autoplay is allowed here because the player only exists after the user's click.
  const query = new URLSearchParams({ autoplay: "1", playsinline: "1", origin });
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${query}`;
}

/** How long to wait for playback with sound before falling back to muted autoplay. */
const SOUND_GRACE_MS = 1500;

interface PlayerDialogProps {
  song: Song;
  onClose: () => void;
}

export default function PlayerDialog({ song, onClose }: PlayerDialogProps) {
  // Mounted only after a click, so window is available.
  const [origin] = useState(() => window.location.origin);
  const [plain, setPlain] = useState(false);
  const [muted, setMuted] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);

  // Start playing right away. Many phones and in-app browsers only allow sound after a tap inside
  // the video; there the video starts muted and the "소리 켜기" button (or YouTube's own) unmutes it.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !stage.current) return;
        const mount = document.createElement("div");
        stage.current.replaceChildren(mount);
        player.current = new YT.Player(mount, {
          videoId: song.videoId,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, origin },
          events: {
            onReady: ({ target }) => {
              target.playVideo();
              timer = setTimeout(() => {
                const state = target.getPlayerState();
                if (state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING) {
                  target.mute();
                  target.playVideo();
                  setMuted(true);
                }
              }, SOUND_GRACE_MS);
            },
            onStateChange: ({ target, data }) => {
              if (data === YT.PlayerState.PLAYING) setMuted(target.isMuted());
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setPlain(true); // API blocked: the plain embed still plays on tap
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      player.current?.destroy();
      player.current = null;
    };
  }, [origin, song.videoId]);

  const unmute = () => {
    player.current?.unMute();
    player.current?.playVideo();
    setMuted(false);
  };

  const title = `${song.artist} · ${song.title} 공식 YouTube 영상`;

  return (
    <Modal title={song.title} onClose={onClose}>
      <p>{song.artist}</p>
      {plain ? (
        <Video
          src={embedUrl(song.videoId, origin)}
          title={title}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <Stage ref={stage} role="region" aria-label={title} />
      )}
      {muted && (
        <SoundRow>
          <PixelButton type="button" $small onClick={unmute}>
            ♪ 소리 켜기
          </PixelButton>
          <small>이 브라우저는 소리 자동재생을 막아서 음소거로 시작했어요.</small>
        </SoundRow>
      )}
      <Links>
        <a href={watchUrl(song.videoId)} target="_blank" rel="noopener noreferrer">
          YouTube에서 직접 듣기
        </a>
      </Links>
      <DialogNote>영상이 재생되지 않으면 위 링크로 열어 주세요. YouTube 광고가 나올 수 있어요.</DialogNote>
    </Modal>
  );
}
