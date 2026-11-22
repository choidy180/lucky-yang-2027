"use client";

import type { MouseEvent, Ref } from "react";
import styled, { keyframes } from "styled-components";
import type { Ticket } from "@/lib/types";
import { DESKTOP, MOBILE, colors } from "@/styles/global";
import { PixelButton, PixelWindow } from "./pixel";

const pop = keyframes`
  0% { transform: scale(0.92); opacity: 0; }
  60% { transform: scale(1.02); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const Window = styled(PixelWindow)`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  padding: 20px 26px 22px;
  overflow: auto;
  overscroll-behavior: contain;
  animation: ${pop} 0.32s steps(5) both;

  ${MOBILE} {
    padding: 16px 16px 18px;
  }
  /* Wide screens: song | blessing side by side to keep the window short. */
  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    column-gap: 24px;
    align-items: center;

    & > :nth-child(3),
    & > :nth-child(4) {
      grid-column: 1 / -1;
    }
  }
`;

const SongInfo = styled.div`
  min-width: 0;
`;

const Banner = styled.p`
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

const HopeChip = styled.p`
  display: inline-block;
  margin-top: 6px;
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
  ${DESKTOP} {
    font-size: 48px;
  }
  @media (min-width: 900px) {
    font-size: 36px;
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
  margin: 14px 0 16px;
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
  align-items: center;
  gap: 16px 18px;
  padding: 4px;

  & > :first-child {
    flex: 1 1 200px;
  }
  & > :not(:first-child) {
    flex: 1 1 auto;
  }
`;

const Again = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 0 4px;

  small {
    font-size: 12px;
    color: ${colors.muted};
    ${DESKTOP} {
      font-size: 18px;
    }
  }
`;

interface ResultWindowProps {
  ticket: Ticket;
  hopeLabel: string | null;
  showRedraw: boolean;
  canRedraw: boolean;
  busy: boolean;
  saving: boolean;
  titleRef: Ref<HTMLHeadingElement>;
  onListen: (event: MouseEvent<HTMLButtonElement>) => void;
  onSave: () => void;
  onShare: () => void;
  onRedraw: () => void;
}

export default function ResultWindow({ ticket, hopeLabel, showRedraw, canRedraw, busy, saving, titleRef, onListen, onSave, onShare, onRedraw }: ResultWindowProps) {
  return (
    <Window as="section" aria-label="새해 첫 곡 결과" aria-busy={busy}>
      <SongInfo>
        <Banner>
          <span aria-hidden="true">♪</span>
          {ticket.name}님의 새해 첫 곡
        </Banner>
        {hopeLabel && <HopeChip>내년 1순위 소망 · {hopeLabel}</HopeChip>}
        <SongTitle ref={titleRef} tabIndex={-1}>
          {ticket.song.title}
        </SongTitle>
        <Artist>{ticket.song.artist}</Artist>
      </SongInfo>
      <Wish>
        <h3>새해 덕담</h3>
        <p>{ticket.blessing}</p>
      </Wish>
      <Actions>
        <PixelButton type="button" onClick={onListen} disabled={busy}>
          <span aria-hidden="true">▶</span> 첫 곡 듣기
        </PixelButton>
        <PixelButton type="button" $tone="paper" onClick={onSave} disabled={busy || saving} aria-busy={saving}>
          {saving ? "티켓 만드는 중…" : "티켓 저장"}
        </PixelButton>
        <PixelButton type="button" $tone="paper" onClick={onShare} disabled={busy}>
          친구에게 공유
        </PixelButton>
      </Actions>
      {showRedraw && (
        <Again>
          <PixelButton type="button" $tone="paper" $small onClick={onRedraw} disabled={!canRedraw}>
            ↻ 다른 소망 고르기
          </PixelButton>
          <small>TEST MODE</small>
        </Again>
      )}
    </Window>
  );
}
