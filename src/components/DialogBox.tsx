"use client";

// The bottom dock and the red sheep speech bubble used by every conversation step.
import { useEffect, useState, type Ref } from "react";
import styled, { css, keyframes } from "styled-components";
import { DESKTOP, MOBILE, colors } from "@/styles/global";
import { bodyText } from "./pixel";

/**
 * The conversation panel at the bottom. `$top` lifts it under the HUD while the phone keyboard is
 * up for the name input: in-app browsers often lay the keyboard over the page without resizing
 * it, so a bottom panel would hide what is being typed. `$tall` (the result) may grow up to the HUD
 * on phones so the whole card shows; the title and the sheep behind it give way.
 */
export const Dock = styled.div<{ $top?: boolean; $tall?: boolean }>`
  position: fixed;
  z-index: 10;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom) + 24px);
  width: min(760px, calc(100% - 40px));
  /* vh first: some in-app WebViews drop a declaration that uses dvh */
  max-height: calc(100vh - env(safe-area-inset-bottom) - 120px);
  max-height: calc(100dvh - env(safe-area-inset-bottom) - 120px);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;

  ${MOBILE} {
    width: calc(100% - 32px);
    bottom: calc(env(safe-area-inset-bottom) + 20px);
    /* leave the title and the red sheep at least ~320px; a taller panel scrolls instead */
    max-height: calc(100vh - env(safe-area-inset-bottom) - 320px);
    max-height: calc(100dvh - env(safe-area-inset-bottom) - 320px);
  }

  ${({ $tall }) =>
    $tall &&
    css`
      ${MOBILE} {
        /* up to just under the HUD buttons */
        max-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 84px);
        max-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 84px);
      }
    `}

  ${({ $top }) =>
    $top &&
    css`
      top: calc(env(safe-area-inset-top) + 62px);
      bottom: auto;
      max-height: none;
      ${MOBILE} {
        top: calc(env(safe-area-inset-top) + 62px);
        bottom: auto;
        max-height: none;
      }
    `}
`;

/** Shows `text` one character at a time; clicking the line (or `instant`) completes it. */
export function useTypewriter(text: string, instant: boolean, speed = 32) {
  const [shown, setShown] = useState(instant ? text.length : 0);
  const [prev, setPrev] = useState(text);
  if (prev !== text) {
    setPrev(text);
    setShown(instant ? text.length : 0);
  }
  useEffect(() => {
    if (instant || shown >= text.length) return;
    const timer = setTimeout(() => setShown((n) => Math.min(text.length, n + 1)), speed);
    return () => clearTimeout(timer);
  }, [instant, shown, speed, text]);
  return { visible: text.slice(0, shown), done: shown >= text.length, complete: () => setShown(text.length) };
}

const pop = keyframes`
  0% { transform: translateY(12px) scale(0.96); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
`;

/** Speech bubble whose stepped pixel tail points up at the red sheep standing above the dock. */
const Bubble = styled.section`
  position: relative;
  width: min(560px, 100%);
  margin: 22px auto 0;
  padding: 18px 20px 16px;
  background: ${colors.paper};
  color: ${colors.ink};
  text-align: center;
  box-shadow:
    0 -4px 0 0 ${colors.ink},
    0 4px 0 0 ${colors.ink},
    -4px 0 0 0 ${colors.ink},
    4px 0 0 0 ${colors.ink},
    inset 0 -4px 0 0 ${colors.paperShade},
    0 10px 0 0 rgba(20, 10, 20, 0.4);
  animation: ${pop} 0.28s steps(4) both;

  /* tail outline (ink), 4px steps */
  &::before,
  &::after {
    content: "";
    position: absolute;
    left: 50%;
  }
  &::before {
    top: -16px;
    width: 24px;
    height: 12px;
    margin-left: -12px;
    background: ${colors.ink};
    clip-path: polygon(8px 0, 16px 0, 16px 4px, 20px 4px, 20px 8px, 24px 8px, 24px 12px, 0 12px, 0 8px, 4px 8px, 4px 4px, 8px 4px);
  }
  /* tail fill (paper), opens through the top border */
  &::after {
    top: -12px;
    width: 16px;
    height: 12px;
    margin-left: -8px;
    background: ${colors.paper};
    clip-path: polygon(4px 0, 12px 0, 12px 4px, 16px 4px, 16px 12px, 0 12px, 0 4px, 4px 4px);
  }

  ${MOBILE} {
    padding: 16px 14px 14px;
  }
`;

const BubbleSpeaker = styled.h2`
  position: absolute;
  top: -14px;
  left: 12px;
  padding: 0 8px;
  background: ${colors.red};
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.6;
  outline-offset: 4px;
  ${DESKTOP} {
    font-size: 18px;
    top: -18px;
  }
`;

const BubbleLine = styled.p`
  ${bodyText}
  font-weight: 700;
  cursor: default;
  /* one block per written line: Chrome does not balance across forced line breaks */
  & > span[aria-hidden] > span {
    display: block;
    text-wrap: balance;
  }
`;

interface SpeechBubbleProps {
  speaker: string;
  text: string;
  instant: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}

/** The red sheep talking in a bubble (no portrait column); the step's answer goes right below it. */
export function SpeechBubble({ speaker, text, instant, headingRef }: SpeechBubbleProps) {
  const { visible, complete } = useTypewriter(text, instant);
  return (
    <Bubble aria-label="붉은 양의 말">
      <BubbleSpeaker ref={headingRef} tabIndex={-1}>
        {speaker}
      </BubbleSpeaker>
      <BubbleLine onClick={complete}>
        <span aria-hidden="true">
          {visible.split("\n").map((part, i) => (
            <span key={i}>{part}</span>
          ))}
        </span>
        <span className="visually-hidden" aria-live="polite">
          {text}
        </span>
      </BubbleLine>
    </Bubble>
  );
}
