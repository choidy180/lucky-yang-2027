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
