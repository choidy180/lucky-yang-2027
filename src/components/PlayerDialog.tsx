"use client";

import { useState } from "react";
import styled from "styled-components";
import type { Song } from "@/lib/types";
import Modal, { DialogNote } from "./Modal";

const Video = styled.iframe`
  display: block;
  width: 100%;
  min-width: 200px;
  min-height: 200px;
  aspect-ratio: 16 / 9;
  border: 0;
  background: #1b1a3a;
  box-shadow:
    0 -4px 0 0 #3a2622,
    0 4px 0 0 #3a2622,
    -4px 0 0 0 #3a2622,
    4px 0 0 0 #3a2622;
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

interface PlayerDialogProps {
  song: Song;
  onClose: () => void;
}

export default function PlayerDialog({ song, onClose }: PlayerDialogProps) {
  // Mounted only after a click, so window is available.
  const [origin] = useState(() => window.location.origin);

  return (
    <Modal title={song.title} onClose={onClose}>
      <p>{song.artist}</p>
      <Video
        src={embedUrl(song.videoId, origin)}
        title={`${song.artist} · ${song.title} 공식 YouTube 영상`}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <Links>
        <a href={watchUrl(song.videoId)} target="_blank" rel="noopener noreferrer">
          YouTube에서 직접 듣기
        </a>
      </Links>
      <DialogNote>영상이 재생되지 않으면 위 링크로 열어 주세요. YouTube 광고가 나올 수 있어요.</DialogNote>
    </Modal>
  );
}
