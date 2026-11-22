"use client";

import type { MouseEvent, Ref } from "react";
import styled from "styled-components";
import type { Ticket } from "@/lib/types";
import { MOBILE, colors } from "@/styles/global";
import { Eyebrow, PrimaryButton, SecondaryButton } from "./ui";

const Recipient = styled(Eyebrow)`
  font-family: inherit;
  font-size: 0.95rem;
  letter-spacing: 0;
  overflow-wrap: anywhere;
`;

const SongTitle = styled.h2`
  margin: 19px 0 3px;
  font-size: clamp(1.75rem, 3.1vw, 2.8rem);
  line-height: 1.19;
  letter-spacing: -0.065em;
  font-weight: 700;

  ${MOBILE} {
    margin-top: 12px;
  }
`;

const Artist = styled.p`
  margin: 0;
  color: #736858;
  font-weight: 600;
`;

const Fortune = styled.div`
  width: 100%;
  margin: 20px 0;
  padding: 14px 0;
  border-top: 1px dashed #c9bba6;
  border-bottom: 1px dashed #c9bba6;

  h3 {
    font-size: 0.76rem;
    font-weight: 700;
    color: ${colors.wine};
  }
  p {
    margin-top: 4px;
    font-size: 1.04rem;
    line-height: 1.65;
    letter-spacing: -0.03em;
  }

  ${MOBILE} {
    margin: 13px 0;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;

  ${PrimaryButton} {
    flex: 1 1 160px;
  }
  ${SecondaryButton} {
    flex: 0 1 auto;
  }
`;

const Again = styled.button`
  margin-top: 14px;
  padding: 6px 0;
  border: 0;
  background: none;
  color: ${colors.wine};
  font-size: 0.9rem;
  font-weight: 700;

  &:hover:enabled {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  &:disabled {
    color: #9b8f82;
  }
`;

interface DrawResultProps {
  ticket: Ticket;
  canRedraw: boolean;
  showRedraw: boolean;
  busy: boolean;
  saving: boolean;
  titleRef: Ref<HTMLHeadingElement>;
  onListen: (event: MouseEvent<HTMLButtonElement>) => void;
  onSave: () => void;
  onRedraw: () => void;
}

export default function DrawResult({ ticket, canRedraw, showRedraw, busy, saving, titleRef, onListen, onSave, onRedraw }: DrawResultProps) {
  return (
    <>
      <Recipient>{ticket.name}님의 새해 첫 곡</Recipient>
      <SongTitle ref={titleRef} tabIndex={-1}>
        {ticket.song.title}
      </SongTitle>
      <Artist>{ticket.song.artist}</Artist>
      <Fortune>
        <h3>새해 덕담</h3>
        <p>{ticket.blessing}</p>
      </Fortune>
      <Actions>
        <PrimaryButton type="button" onClick={onListen} disabled={busy}>
          <span aria-hidden="true">▶</span> 첫 곡 듣기
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onSave} disabled={busy || saving} aria-busy={saving}>
          {saving ? "티켓 만드는 중…" : "티켓 저장"}
        </SecondaryButton>
      </Actions>
      {showRedraw && (
        <Again type="button" onClick={onRedraw} disabled={!canRedraw}>
          {busy ? "복주머니 여는 중…" : <>↻&nbsp; 다시 뽑기</>}
        </Again>
      )}
    </>
  );
}
