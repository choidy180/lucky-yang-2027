"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { CROP_CENTER, playPortrait } from "@/lib/portrait";
import { MOBILE } from "@/styles/global";
import { MASCOT_SRC, TinyDisc } from "./ui";

const ART = 1254;

const Opening = styled.section`
  position: fixed;
  inset: 0;
  z-index: 20;
  overflow: hidden;
  isolation: isolate;
  background: #ffedcd;
  container-type: size;
`;

// Poster crop = canvas crop: scale = max(w/970, min(w/550, h/568)), centred on (610, 597).
const Poster = styled.img`
  position: absolute;
  left: 50%;
  top: 50%;
  height: auto;
  max-width: none;
  width: max(calc(100vw * ${ART / 970}), min(calc(100vw * ${ART / 550}), calc(100vh * ${ART / 568})));
  width: max(calc(100cqw * ${ART / 970}), min(calc(100cqw * ${ART / 550}), calc(100cqh * ${ART / 568})));
  transform: translate(${(-CROP_CENTER.x / ART) * 100}%, ${(-CROP_CENTER.y / ART) * 100}%);
  pointer-events: none;
  user-select: none;
`;

const Portrait = styled.canvas`
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
`;

const TopBar = styled.div`
  position: absolute;
  top: max(20px, env(safe-area-inset-top));
  left: clamp(16px, 3.3vw, 72px);
  right: clamp(16px, 3.3vw, 72px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  ${MOBILE} {
    top: max(14px, env(safe-area-inset-top));
  }
`;

const pill = css`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #5f342f;
  background: #fff8eadf;
`;

const Brand = styled.span`
  ${pill}
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: -0.05em;
`;

const Skip = styled.button`
  ${pill}
  min-height: 42px;
  padding: 5px 14px;
  border: 1px solid #804f4060;
  border-radius: 24px;
  font-size: 0.86rem;
  font-weight: 600;

  span {
    font-size: 1.3rem;
    line-height: 1;
  }
`;

const fill = keyframes`
  from { transform: scaleX(0.04); }
  to { transform: scaleX(1); }
`;

const Progress = styled.div<{ $duration: number | null }>`
  position: absolute;
  left: 50%;
  bottom: max(26px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: 88px;
  height: 3px;
  border-radius: 5px;
  background: #ffead0b0;
  overflow: hidden;

  i {
    display: block;
    width: 100%;
    height: 100%;
    background: #a44035;
    transform-origin: left;
    transform: scaleX(0.04);
    ${({ $duration }) =>
      $duration !== null &&
      css`
        animation: ${fill} ${$duration}ms linear both;
      `}
  }
`;

interface IntroPortraitProps {
  /** Called once per mount: natural end, skip, or a loading/canvas failure. */
  onFinish: () => void;
}

export default function IntroPortrait({ onFinish }: IntroPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const finishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishRef.current();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) {
      finish();
      return;
    }
    finishedRef.current = false;
    const stop = playPortrait(canvas, image, {
      onStart: (ms) => setDuration(ms),
      onFinish: finish,
    });
    // Strict Mode re-runs, unmount after skip and replays all land here: no timer or frame survives.
    return stop;
  }, [finish]);

  return (
    <Opening aria-label="붉은 양의 새해 인사">
      {/* eslint-disable-next-line @next/next/no-img-element -- raw pixels are needed for the canvas */}
      <Poster ref={imageRef} src={MASCOT_SRC} alt="" width={ART} height={ART} fetchPriority="high" decoding="async" draggable={false} />
      <Portrait ref={canvasRef} role="img" aria-label="붉은 양이 눈을 세 번 깜빡이고, 고개를 끄덕인 뒤 노래를 흥얼거려요." />
      <TopBar>
        <Brand>
          <TinyDisc aria-hidden="true" /> 복주머니 레코드
        </Brand>
        <Skip type="button" onClick={finish}>
          건너뛰기 <span aria-hidden="true">›</span>
        </Skip>
      </TopBar>
      <Progress $duration={duration} aria-hidden="true">
        <i />
      </Progress>
    </Opening>
  );
}
