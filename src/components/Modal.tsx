"use client";

import { useEffect, useId, useRef, useState, type FocusEvent, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import styled from "styled-components";
import { DESKTOP, MOBILE, colors } from "@/styles/global";
import { pixelFrame } from "./pixel";

const Dialog = styled.dialog`
  width: min(560px, calc(100% - 40px));
  max-width: none;
  /* first line: browsers (some in-app WebViews) that drop the whole min() when dvh is unknown */
  max-height: calc(100% - 40px);
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

  /* Phones: pinned near the top, so a keyboard or an in-app browser's toolbar at the bottom never
     hides the header and the first fields. */
  ${MOBILE} {
    width: calc(100% - 24px);
    margin: calc(env(safe-area-inset-top) + 12px) auto auto;
    max-height: calc(100% - 24px);
  }
  /* Typing on a phone: use all of the screen above the keyboard (height set from script). */
  &[data-typing="true"] {
    max-height: var(--above-keyboard, calc(100% - 24px));
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
const isField = (el: EventTarget | null): el is HTMLElement =>
  el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");

export default function Modal({ title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [typing, setTyping] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Page height before any keyboard showed up. */
  const baseHeight = useRef(0);

  // Phone keyboards: the dialog keeps all the height that is left above the keyboard (only the
  // keyboard's share is taken away) and scrolls the focused field to its top. Browsers report the
  // keyboard in one of three ways:
  //  - the page itself gets shorter (KakaoTalk's in-app browser): the usual 100% - 24px already fits;
  //  - only the visual viewport gets shorter (Safari, Chrome): use that height;
  //  - nothing changes (keyboard laid over the page): assume it takes about 40% of the screen.
  const fitAboveKeyboard = () => {
    const dialog = ref.current;
    if (!dialog) return;
    const vv = window.visualViewport;
    const inner = window.innerHeight;
    const base = Math.max(baseHeight.current, inner);
    let height: number | null;
    if (vv && vv.height < inner - 80) height = vv.height - 24;
    else if (inner < base - 120) height = null;
    else height = base * 0.6 - 24;
    dialog.style.setProperty("--above-keyboard", height === null ? "calc(100% - 24px)" : `${Math.max(240, Math.round(height))}px`);
  };

  const onFocusIn = (event: FocusEvent<HTMLDialogElement>) => {
    if (!isField(event.target) || !window.matchMedia("(pointer: coarse)").matches) return;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    fitAboveKeyboard();
    setTyping(true);
    const field = event.target;
    setTimeout(() => {
      fitAboveKeyboard();
      // field at the top (under the sticky header), so what follows it — the send buttons — shows
      field.scrollIntoView({ block: "start" });
    }, 350); // after the keyboard has slid in
  };

  const onFocusOut = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      if (!isField(document.activeElement) || !ref.current?.contains(document.activeElement)) setTyping(false);
    }, 200);
  };

  useEffect(() => {
    baseHeight.current = window.innerHeight;
  }, []);

  useEffect(() => {
    if (!typing) return;
    const vv = window.visualViewport;
    vv?.addEventListener("resize", fitAboveKeyboard);
    window.addEventListener("resize", fitAboveKeyboard);
    return () => {
      vv?.removeEventListener("resize", fitAboveKeyboard);
      window.removeEventListener("resize", fitAboveKeyboard);
    };
  }, [typing]);

  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

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
    <Dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={onCancel}
      onClick={onBackdrop}
      onFocus={onFocusIn}
      onBlur={onFocusOut}
      data-typing={typing}
    >
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
