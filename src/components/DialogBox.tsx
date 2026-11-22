"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import styled, { keyframes } from "styled-components";
import { HERO, HERO_PORTRAIT_ROWS, HERO_W, spriteCanvas } from "@/game/sprites";
import { DESKTOP, MOBILE, colors } from "@/styles/global";
import { Blink, PixelWindow, bodyText } from "./pixel";

const slideUp = keyframes`
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

export const Dock = styled.div`
  position: fixed;
  z-index: 10;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom) + 24px);
  width: min(760px, calc(100% - 40px));
  max-height: calc(100dvh - env(safe-area-inset-bottom) - 120px);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;

  ${MOBILE} {
    width: calc(100% - 32px);
    bottom: calc(env(safe-area-inset-bottom) + 20px);
  }
`;

const Box = styled(PixelWindow)`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 20px;
  padding: 20px 24px 22px;
  overflow: auto;
  overscroll-behavior: contain;
  animation: ${slideUp} 0.3s steps(5) both;

  ${MOBILE} {
    gap: 12px;
    padding: 16px 16px 18px;
  }
`;

const Portrait = styled.canvas`
  display: block;
  width: 108px;
  height: 84px;
  image-rendering: pixelated;
  background: #ffe2b8;
  box-shadow:
    0 -4px 0 0 ${colors.ink},
    0 4px 0 0 ${colors.ink},
    -4px 0 0 0 ${colors.ink},
    4px 0 0 0 ${colors.ink};
  margin: 4px;

  ${MOBILE} {
    width: 72px;
    height: 56px;
  }
`;

const Main = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
`;

const Speaker = styled.h2`
  justify-self: start;
  padding: 2px 10px;
  background: ${colors.red};
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
  outline-offset: 4px;
  ${DESKTOP} {
    font-size: 24px;
  }
`;

const Line = styled.p`
  ${bodyText}
  min-height: 3.2em;
  white-space: pre-line;
  cursor: default;
`;

const Arrow = styled(Blink)`
  margin-left: 6px;
  color: ${colors.red};
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

function HeroPortrait() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c) return;
    // Head and shoulders of the red sheep.
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.drawImage(spriteCanvas(HERO), 0, 0, HERO_W, HERO_PORTRAIT_ROWS, 0, 0, HERO_W, HERO_PORTRAIT_ROWS);
  }, []);
  return <Portrait ref={ref} width={HERO_W} height={HERO_PORTRAIT_ROWS} aria-hidden="true" />;
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
  white-space: pre-line;
  text-wrap: balance;
  cursor: default;
`;

interface SpeechBubbleProps {
  speaker: string;
  text: string;
  instant: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}

/** The red sheep talking in a bubble (no portrait column), for short one-line questions. */
export function SpeechBubble({ speaker, text, instant, headingRef }: SpeechBubbleProps) {
  const { visible, complete } = useTypewriter(text, instant);
  return (
    <Bubble aria-label="붉은 양의 말">
      <BubbleSpeaker ref={headingRef} tabIndex={-1}>
        {speaker}
      </BubbleSpeaker>
      <BubbleLine onClick={complete}>
        <span aria-hidden="true">{visible}</span>
        <span className="visually-hidden" aria-live="polite">
          {text}
        </span>
      </BubbleLine>
    </Bubble>
  );
}

interface DialogBoxProps {
  speaker: string;
  text: string;
  instant: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
  children?: ReactNode;
}

export default function DialogBox({ speaker, text, instant, headingRef, children }: DialogBoxProps) {
  const { visible, done, complete } = useTypewriter(text, instant);
  return (
    <Box as="section" aria-label="붉은 양과의 대화">
      <HeroPortrait />
      <Main>
        <Speaker ref={headingRef} tabIndex={-1}>
          {speaker}
        </Speaker>
        <Line onClick={complete}>
          <span aria-hidden="true">{visible}</span>
          {done && <Arrow aria-hidden="true">▼</Arrow>}
          <span className="visually-hidden" aria-live="polite">
            {text}
          </span>
        </Line>
        {children}
      </Main>
    </Box>
  );
}
