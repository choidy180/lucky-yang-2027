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
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  padding: 20px 26px 22px;
  overflow: auto;
  overscroll-behavior: contain;
  animation: ${pop} 0.32s steps(5) both;
  /* This window scrolls on short phones. PixelWindow's bevel is an absolutely positioned
     ::before that would scroll with the content and draw a stray line across the buttons, so the
     bevel is an inset shadow here (painted on the box, it stays put). */
  box-shadow:
    0 -4px 0 0 ${colors.ink},
    0 4px 0 0 ${colors.ink},
    -4px 0 0 0 ${colors.ink},
    4px 0 0 0 ${colors.ink},
    0 12px 0 0 rgba(20, 10, 20, 0.45),
    inset 0 4px 0 0 #ffffff,
    inset 0 -4px 0 0 ${colors.paperShade};
  &::before {
    content: none;
  }

  ${MOBILE} {
    padding: 14px 14px 14px;
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

const HopeChip = styled.p`
  display: inline-block;
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
  /* phones: the sheep and its bubble need the height more than a 36px title does */
  ${MOBILE} {
    margin-top: 6px;
    font-size: 24px;
    line-height: 1.25;
  }
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
  position: relative;
  margin: 22px 0 16px;
  padding: 14px 14px 10px;
  background: #fff;
  box-shadow:
    0 -2px 0 0 ${colors.paperShade},
    0 2px 0 0 ${colors.paperShade},
    -2px 0 0 0 ${colors.paperShade},
    2px 0 0 0 ${colors.paperShade};

  /* label tag on the top edge, like the speaker tag on the bubble */
  h3 {
    position: absolute;
    top: -11px;
    left: 10px;
    padding: 0 6px;
    background: ${colors.wine};
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.6;
  }
  p {
    font-size: 18px;
    line-height: 1.6;
  }
  ${MOBILE} {
    margin: 18px 0 12px;
  }
  ${DESKTOP} {
    h3 {
      top: -15px;
      font-size: 18px;
    }
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
  ${MOBILE} {
    gap: 12px;
  }

  & > :first-child {
    flex: 1 1 200px;
  }
  & > :not(:first-child) {
    flex: 1 1 auto;
  }
  /* phones: "첫 곡 듣기" on its own row, "티켓 저장" and "친구에게 공유" side by side below */
  ${MOBILE} {
    & > :first-child {
      flex-basis: 100%;
    }
    & > :not(:first-child) {
      flex: 1 1 0;
      padding-inline: 10px;
    }
  }
`;

const Again = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 0 4px;
  ${MOBILE} {
    margin-top: 12px;
  }

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
        {/* The sheep's bubble above says whose song it is; this keeps it for screen readers. */}
        <p className="visually-hidden">{ticket.name}님의 새해 첫 곡</p>
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
