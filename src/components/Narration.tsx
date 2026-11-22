"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import styled, { keyframes } from "styled-components";
import { DESKTOP, MOBILE, colors } from "@/styles/global";
import { useTypewriter } from "./DialogBox";
import { Blink, PixelButton, PixelWindow } from "./pixel";

/** End-of-year encouragement; one is picked at random as the first line of the narration. */
export const CHEERS = [
  "올 한 해 정말 고생 많았어요.",
  "올해도 끝까지 잘 버텨 줘서 고마워요.",
  "바쁘게 달려온 한 해, 수고 많으셨어요.",
  "힘든 날도 웃는 날도 있었죠. 정말 잘했어요.",
  "남몰래 애쓴 시간까지 다 알아요. 고생했어요.",
  "올해의 당신에게 커다란 박수를 보내요.",
  "넘어져도 다시 일어난 한 해, 멋졌어요.",
  "쉼 없이 달려온 당신, 이제 잠깐 쉬어 가요.",
  "올해도 당신 덕분에 누군가는 웃었을 거예요.",
  "애썼던 모든 날이 새해의 밑거름이 될 거예요.",
] as const;

/** The story after the encouragement: why there is a red sheep to find. */
export const STORY = [
  "그런 당신을 위해, 새벽 초원의 양들이 새해 선물을 준비했어요.",
  "선물은 바로 올해의 첫 곡!\n그런데 선물을 든 붉은 양이 그만 양떼 속에 숨어 버렸대요.",
  "헤드폰을 낀 붉은 양을 찾아서 콕 눌러 주세요.",
] as const;

const appear = keyframes`
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

/** Full-screen catcher: a click or tap anywhere advances the narration (the HUD stays on top). */
const Layer = styled.div`
  position: fixed;
  inset: 0;
  z-index: 15;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
`;

const Box = styled.section`
  position: absolute;
  left: 0;
  right: 0;
  margin-inline: auto;
  bottom: calc(env(safe-area-inset-bottom) + 28px);
  width: min(760px, calc(100% - 40px));
  padding: 20px 24px 18px;
  background: rgba(19, 21, 50, 0.86);
  color: ${colors.cream};
  box-shadow:
    0 -4px 0 0 ${colors.cream},
    0 4px 0 0 ${colors.cream},
    -4px 0 0 0 ${colors.cream},
    4px 0 0 0 ${colors.cream},
    0 12px 0 0 rgba(10, 8, 24, 0.45);
  animation: ${appear} 0.3s steps(5) 0.15s both;

  ${MOBILE} {
    width: calc(100% - 32px);
    bottom: calc(env(safe-area-inset-bottom) + 22px);
    padding: 16px 16px 14px;
  }
`;

const Line = styled.p`
  min-height: 3.2em;
  font-size: 18px;
  line-height: 1.6;
  white-space: pre-line;
  ${DESKTOP} {
    font-size: 24px;
    line-height: 1.5;
  }
`;

const Foot = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Dots = styled.span`
  display: inline-flex;
  gap: 6px;
  i {
    width: 8px;
    height: 8px;
    background: rgba(255, 243, 214, 0.3);
  }
  i[data-on="true"] {
    background: ${colors.gold};
  }
`;

const Next = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
  border: 0;
  background: none;
  color: ${colors.gold};
  font-size: 18px;
  font-weight: 700;
  ${DESKTOP} {
    font-size: 24px;
  }
  small {
    font-size: 12px;
    font-weight: 400;
    color: rgba(255, 243, 214, 0.7);
    ${DESKTOP} {
      font-size: 18px;
    }
  }
`;

interface NarrationProps {
  /** typing off (reduced motion) */
  instant: boolean;
  onDone: () => void;
  /** first user gesture: lets the browser play sound later */
  onGesture?: () => void;
}

/** "Text game" narration: types one line at a time; click/tap/Enter/Space to continue. */
export function Narration({ instant, onDone, onGesture }: NarrationProps) {
  // Picked after hydration so the server HTML and the first client render match.
  const [cheer, setCheer] = useState<string | null>(null);
  useEffect(() => {
    setCheer(CHEERS[Math.floor(Math.random() * CHEERS.length)]!);
  }, []);
  const lines = [cheer ?? "", ...STORY];
  const [index, setIndex] = useState(0);
  const text = cheer === null ? "" : lines[index]!;
  const { visible, done, complete } = useTypewriter(text, instant, 42);
  const last = index === lines.length - 1;

  const advance = useCallback(() => {
    onGesture?.();
    if (cheer === null) return;
    if (!done) complete();
    else if (!last) setIndex((i) => i + 1);
    else onDone();
  }, [cheer, complete, done, last, onDone, onGesture]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target instanceof HTMLElement && event.target.closest("button")) return; // the button handles it
      event.preventDefault();
      advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  const onNext = (event: MouseEvent) => {
    event.stopPropagation();
    advance();
  };

  return (
    <Layer onClick={advance}>
      <Box aria-label="이야기">
        <Line>
          <span aria-hidden="true">{visible}</span>
          <span className="visually-hidden" aria-live="polite">
            {text}
          </span>
        </Line>
        <Foot>
          <Dots aria-hidden="true">
            {lines.map((_, i) => (
              <i key={i} data-on={i <= index} />
            ))}
          </Dots>
          <Next type="button" onClick={onNext}>
            {index === 0 && <small>화면을 눌러 계속</small>}
            {last && done ? "찾으러 가기" : "다음"}
            <Blink aria-hidden="true">▼</Blink>
          </Next>
        </Foot>
      </Box>
    </Layer>
  );
}

const Hint = styled(PixelWindow)`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 12px 16px;
  text-align: center;
  animation: ${appear} 0.3s steps(5) both;

  p {
    font-size: 18px;
    font-weight: 700;
    color: ${colors.red};
    ${DESKTOP} {
      font-size: 24px;
    }
  }
`;

/** After the narration: a small reminder, so the meadow stays visible for searching. */
export function FindHint({ onGiveUp }: { onGiveUp: () => void }) {
  return (
    <Hint as="section" aria-label="붉은 양 찾기">
      <p>헤드폰을 낀 붉은 양을 찾아 눌러 주세요!</p>
      <PixelButton type="button" $tone="paper" $small onClick={onGiveUp}>
        못 찾겠어요
      </PixelButton>
    </Hint>
  );
}
