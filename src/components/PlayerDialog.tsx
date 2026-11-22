"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { Song } from "@/lib/types";
import { loadYouTubeApi, type YTPlayer } from "@/lib/youtube";
import { colors } from "@/styles/global";
import Modal, { DialogNote } from "./Modal";
import { PixelButton } from "./pixel";

const Video = styled.iframe`
  display: block;
  width: 100%;
  min-width: 200px;
  min-height: 180px;
  aspect-ratio: 16 / 9;
  border: 0;
  background: #1b1a3a;
  box-shadow:
    0 -4px 0 0 #3a2622,
    0 4px 0 0 #3a2622,
    -4px 0 0 0 #3a2622,
    4px 0 0 0 #3a2622;
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
  // enablejsapi lets the IFrame API attach to this embed for the muted-autoplay fallback.
  const query = new URLSearchParams({ autoplay: "1", playsinline: "1", rel: "0", enablejsapi: "1", origin });
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
  const [muted, setMuted] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<YTPlayer | null>(null);

  // The embed shows and starts at once (autoplay). When the IFrame API is ready it attaches to that
  // embed: many phones and in-app browsers only allow sound after a tap inside the video, so if it
  // has not started it plays muted and the "소리 켜기" button (or YouTube's own) unmutes it.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !frame.current) return;
        player.current = new YT.Player(frame.current, {
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
        // API blocked: the embed still plays on tap.
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      player.current = null; // the iframe belongs to React; it goes away with the dialog
    };
  }, [song.videoId]);

  const unmute = () => {
    player.current?.unMute();
    player.current?.playVideo();
    setMuted(false);
  };

  const title = `${song.artist} · ${song.title} 공식 YouTube 영상`;

  return (
    <Modal title={song.title} onClose={onClose}>
      <p>{song.artist}</p>
      <Video
        ref={frame}
        src={embedUrl(song.videoId, origin)}
        title={title}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
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
