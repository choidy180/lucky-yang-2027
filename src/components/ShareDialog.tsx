"use client";

import { useId, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { SHARE_FROM_MAX, SHARE_MESSAGE_MAX, normalizeNote, shareText, shareUrl, type SharedPick } from "@/lib/share";
import type { Song } from "@/lib/types";
import { DESKTOP, colors } from "@/styles/global";
import Modal, { DialogNote } from "./Modal";
import { PixelButton } from "./pixel";

const Song = styled.p`
  margin: 0 0 16px !important;
  padding: 10px 12px;
  background: #fff;
  color: ${colors.wine};
  font-weight: 700;
  box-shadow:
    0 -2px 0 0 ${colors.paperShade},
    0 2px 0 0 ${colors.paperShade},
    -2px 0 0 0 ${colors.paperShade},
    2px 0 0 0 ${colors.paperShade};
  overflow-wrap: anywhere;
`;

const Field = styled.div`
  display: grid;
  gap: 6px;
  margin-bottom: 14px;

  label {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-weight: 700;
  }
  label small {
    font-weight: 400;
    color: ${colors.muted};
    font-size: 12px;
    ${DESKTOP} {
      font-size: 18px;
    }
  }
  input,
  textarea {
    width: 100%;
    padding: 10px 12px;
    border: 0;
    border-radius: 0;
    background: #fff;
    color: ${colors.ink};
    font: inherit;
    font-size: 18px;
    line-height: 1.5;
    box-shadow:
      0 -3px 0 0 ${colors.ink},
      0 3px 0 0 ${colors.ink},
      -3px 0 0 0 ${colors.ink},
      3px 0 0 0 ${colors.ink};
  }
  textarea {
    min-height: 6.2em;
    resize: vertical;
  }
  input::placeholder,
  textarea::placeholder {
    color: #b39b8c;
  }
`;

const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px 16px;
  margin-top: 18px;
  padding: 4px;
  & > * {
    flex: 1 1 160px;
  }
`;

const Status = styled.p`
  min-height: 1.6em;
  margin: 12px 0 0 !important;
  color: ${colors.wine};
  font-weight: 700;
`;

const Fallback = styled.input`
  width: 100%;
  margin-top: 8px;
  padding: 8px 10px;
  border: 2px solid ${colors.paperShade};
  background: #fff;
  color: ${colors.ink};
  font: inherit;
  font-size: 12px;
`;

interface ShareDialogProps {
  song: Song;
  pick: SharedPick;
  onClose: () => void;
}

export default function ShareDialog({ song, pick, onClose }: ShareDialogProps) {
  // Mounted only after a click, so window is available.
  const [origin] = useState(() => window.location.origin);
  const [canShare] = useState(() => typeof navigator.share === "function");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [showLink, setShowLink] = useState(false);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const fromId = useId();
  const messageId = useId();

  const note = useMemo(() => normalizeNote({ from, message }), [from, message]);
  const url = shareUrl(origin, pick, note);
  const text = shareText(song, note);

  const onShare = async () => {
    try {
      await navigator.share({ title: "올해 첫 곡은 뭐양?", text, url });
      setStatus("공유했어요!");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return; // closed the sheet
      void onCopy();
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("링크를 복사했어요! 친구에게 붙여 넣어 보내 주세요.");
      setShowLink(false);
    } catch {
      setStatus("자동 복사가 막혔어요. 아래 링크를 길게 눌러 복사해 주세요.");
      setShowLink(true);
      requestAnimationFrame(() => fallbackRef.current?.select());
    }
  };

  return (
    <Modal title="친구에게 공유하기" onClose={onClose}>
      <Song>
        ♪ {song.title} - {song.artist}
      </Song>
      <Field>
        <label htmlFor={fromId}>
          보내는 사람 <small>선택 · {Array.from(from).length}/{SHARE_FROM_MAX}</small>
        </label>
        <input
          id={fromId}
          type="text"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          maxLength={SHARE_FROM_MAX}
          autoComplete="off"
          placeholder="친구가 알아볼 이름이나 별명"
        />
      </Field>
      <Field>
        <label htmlFor={messageId}>
          함께 보낼 메시지 <small>선택 · {Array.from(message).length}/{SHARE_MESSAGE_MAX}</small>
        </label>
        <textarea
          id={messageId}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={SHARE_MESSAGE_MAX}
          placeholder={"올 한 해 고마웠어!\n새해에도 잘 부탁해 :)"}
        />
      </Field>
      <Buttons>
        {canShare && (
          <PixelButton type="button" onClick={() => void onShare()}>
            공유하기
          </PixelButton>
        )}
        <PixelButton type="button" $tone={canShare ? "paper" : "red"} onClick={() => void onCopy()}>
          링크 복사
        </PixelButton>
      </Buttons>
      <Status role="status" aria-live="polite">
        {status}
      </Status>
      {showLink && <Fallback ref={fallbackRef} readOnly value={url} aria-label="공유 링크" onFocus={(e) => e.currentTarget.select()} />}
      <DialogNote>친구는 링크에서 곡, 덕담, 메시지를 볼 수 있어요. 메시지는 링크 안에만 담기고 서버에는 저장되지 않아요.</DialogNote>
    </Modal>
  );
}
