"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import styled from "styled-components";
import { colors } from "@/styles/global";

const Dialog = styled.dialog`
  width: min(530px, calc(100% - 32px));
  max-width: none;
  max-height: min(84dvh, calc(100% - 32px));
  padding: 0;
  overflow: auto;
  overscroll-behavior: contain;
  background: ${colors.card};
  color: ${colors.ink};
  border: 1.5px solid #655b4c;
  border-radius: 15px;
  box-shadow: 0 5px 0 #56463744;

  &::backdrop {
    background: #27231f72;
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
  padding: 17px 23px;
  background: ${colors.card};
  border-bottom: 1px solid ${colors.edge};

  h2 {
    font-size: 1.25rem;
    letter-spacing: -0.05em;
    line-height: 1.3;
  }
`;

const Close = styled.button`
  flex: none;
  width: 36px;
  height: 36px;
  border: 1px solid ${colors.edge};
  border-radius: 7px;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
`;

const Body = styled.div`
  padding: 19px 23px 24px;

  p {
    margin: 5px 0 15px;
  }
  ol {
    margin: 0;
    padding-left: 1.35rem;
  }
  li + li {
    margin-top: 10px;
  }
  a {
    color: #9d372e;
    font-weight: 700;
    text-underline-offset: 4px;
  }
`;

export const DialogNote = styled.p`
  margin-top: 12px !important;
  color: #736554;
  font-size: 0.86rem;
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
