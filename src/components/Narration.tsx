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

const dim = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/**
 * Full-screen catcher over a dark veil: the meadow stays faintly visible behind the story,
 * and a click or tap anywhere advances it (the HUD stays on top).
 */
const Layer = styled.div`
  position: fixed;
  inset: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  background: radial-gradient(ellipse at center, rgba(12, 12, 34, 0.5) 0%, rgba(6, 6, 22, 0.78) 100%);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  animation: ${dim} 0.4s ease-out both;
`;

const Box = styled.section`
  position: relative;
  width: min(680px, 100%);
  padding: 28px 40px 22px;
  text-align: center;
  background: rgba(19, 21, 50, 0.9);
  color: ${colors.cream};
  box-shadow:
    0 -4px 0 0 ${colors.cream},
    0 4px 0 0 ${colors.cream},
    -4px 0 0 0 ${colors.cream},
    4px 0 0 0 ${colors.cream},
    0 16px 0 0 rgba(6, 6, 20, 0.5);
  animation: ${appear} 0.3s steps(5) 0.2s both;

  ${MOBILE} {
    padding: 20px 18px 16px;
  }
`;

const Head = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;

const Label = styled.span`
  color: ${colors.gold};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3em;
  ${DESKTOP} {
    font-size: 18px;
  }
`;

const Dots = styled.span`
  display: inline-flex;
  gap: 6px;
  i {
    width: 8px;
    height: 8px;
    background: rgba(255, 243, 214, 0.25);
  }
  i[data-on="true"] {
    background: ${colors.gold};
  }
`;

/** Fixed height so the box does not jump between short and long lines. */
const Line = styled.div<{ $lead: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 112px;
  margin: 14px 0 10px;
  word-break: keep-all;
  p span {
    display: block;
    text-wrap: balance; /* no lonely last word */
  }
  p {
    font-size: ${(p) => (p.$lead ? "24px" : "18px")};
    font-weight: ${(p) => (p.$lead ? 700 : 400)};
    line-height: ${(p) => (p.$lead ? 1.4 : 1.6)};
    color: ${(p) => (p.$lead ? colors.gold : colors.cream)};
  }
  ${DESKTOP} {
    min-height: 120px;
    margin: 18px 0 12px;
    p {
      font-size: ${(p) => (p.$lead ? "36px" : "24px")};
      line-height: ${(p) => (p.$lead ? 1.4 : 1.5)};
    }
  }
`;

const Foot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  small {
    font-size: 12px;
    color: rgba(255, 243, 214, 0.6);
    ${DESKTOP} {
      font-size: 18px;
    }
  }
  /* keeps its space after the first line so the box does not jump */
  small[data-show="false"] {
    visibility: hidden;
  }
`;

const Next = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border: 0;
  background: none;
  color: ${colors.gold};
  font-size: 18px;
  font-weight: 700;
  ${DESKTOP} {
    font-size: 24px;
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
      <Box role="dialog" aria-modal="false" aria-label="이야기">
        <Head aria-hidden="true">
          <Label>PROLOGUE</Label>
          <Dots>
            {lines.map((_, i) => (
              <i key={i} data-on={i <= index} />
            ))}
          </Dots>
        </Head>
        <Line $lead={index === 0}>
          <p aria-hidden="true">
            {visible.split("\n").map((part, i) => (
              <span key={i}>{part}</span>
            ))}
          </p>
          <span className="visually-hidden" aria-live="polite">
            {text}
          </span>
        </Line>
        <Foot>
          <Next type="button" onClick={onNext}>
            {last && done ? "찾으러 가기" : "다음"}
            <Blink aria-hidden="true">▼</Blink>
          </Next>
          <small aria-hidden="true" data-show={index === 0}>
            화면 아무 곳이나 눌러도 넘어가요
          </small>
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
