"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import styled from "styled-components";
import { DESKTOP, colors } from "@/styles/global";
import { pixelFrame } from "./pixel";

const Dialog = styled.dialog`
  width: min(560px, calc(100% - 40px));
  max-width: none;
  max-height: min(84dvh, calc(100% - 40px));
  padding: 0;
  overflow: auto;
  overscroll-behavior: contain;
  border: 0;
  border-radius: 0;
  background: ${colors.paper};
  color: ${colors.ink};
  font-family: inherit;
  ${pixelFrame(colors.ink)}

  &::backdrop {
    background: rgba(12, 10, 30, 0.6);
  }
`;

const Head = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px 12px 20px;
  background: ${colors.red};
  color: #fff;

  h2 {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.35;
    ${DESKTOP} {
      font-size: 24px;
    }
  }
`;

const Close = styled.button`
  flex: none;
  width: 40px;
  height: 40px;
  border: 0;
  background: ${colors.paper};
  color: ${colors.ink};
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  box-shadow: inset 0 -4px 0 0 ${colors.paperShade};
`;

const Body = styled.div`
  padding: 18px 22px 24px;
  font-size: 18px;
  line-height: 1.6;

  p {
    margin: 4px 0 14px;
  }
  ol {
    margin: 0;
    padding-left: 1.4em;
  }
  li + li {
    margin-top: 10px;
  }
  a {
    color: ${colors.wine};
    font-weight: 700;
    text-underline-offset: 4px;
  }
`;

export const DialogNote = styled.p`
  margin-top: 14px !important;
  color: ${colors.muted};
  font-size: 12px;
  line-height: 1.6;
  ${DESKTOP} {
    font-size: 18px;
  }
`;

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Native modal dialog. Content exists only while mounted, so closing (button, Esc, backdrop)
 * removes it — for the player that stops the sound. Focus returns to the element that opened it.
 */
export default function Modal({ title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  const onBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return;
    const r = event.currentTarget.getBoundingClientRect();
    const outside = event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
    if (outside) onClose();
  };

  return (
    <Dialog ref={ref} aria-labelledby={titleId} onCancel={onCancel} onClick={onBackdrop}>
      <Head>
        <h2 id={titleId}>{title}</h2>
        <Close type="button" onClick={onClose} aria-label="닫기">
          ×
        </Close>
      </Head>
      <Body>{children}</Body>
    </Dialog>
  );
}
