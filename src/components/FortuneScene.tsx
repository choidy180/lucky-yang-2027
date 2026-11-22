"use client";

import { useEffect, useRef } from "react";
import styled, { css, keyframes } from "styled-components";
import { BAG_SIZE, SCENE_SIZE, drawBag, drawScene } from "@/lib/art";
import { MOBILE, fonts } from "@/styles/global";
import { MASCOT_SRC } from "./ui";

const Side = styled.div`
  display: flex;
  padding: 14px;
  background: #eee6d7;
  border-right: 1px solid #c9b9a0;

  ${MOBILE} {
    padding: 8px;
    border-right: 0;
    border-bottom: 1px solid #c9b9a0;
  }
`;

const sparkle = keyframes`
  from { opacity: 0; transform: scale(0.4) rotate(-20deg); }
  to { opacity: 1; transform: scale(1) rotate(0); }
`;

const Scene = styled.div<{ $revealed: boolean }>`
  position: relative;
  isolation: isolate;
  width: 100%;
  min-height: 400px;
  overflow: hidden;
  border: 1px solid #8b987c;
  border-radius: 9px;
  background: #c9e4df;

  &::after {
    content: "✦";
    position: absolute;
    right: 23%;
    bottom: 41%;
    color: #fff6bd;
    text-shadow: 1px 2px #c88f41;
    font-size: 2rem;
    pointer-events: none;
    opacity: 0;
    ${({ $revealed }) =>
      $revealed &&
      css`
        opacity: 1;
        animation: ${sparkle} 0.36s ease-out both;
      `}
  }

  @media (min-width: 1500px) {
    min-height: 445px;
  }
  @media (max-width: 980px) {
    min-height: 360px;
  }
  ${MOBILE} {
    min-height: 0;
    height: clamp(195px, 53vw, 310px);
  }
`;

// Scale the 336×272 grid uniformly; crop sky or edges instead of stretching the pixels.
const Landscape = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 62% 100%;
  image-rendering: pixelated;
`;

const Stamp = styled.div`
  position: absolute;
  left: 5%;
  top: 5%;
  padding: 6px 7px 4px;
  border: 2px solid #ad4b38;
  border-radius: 4px;
  background: #fff6dc82;
  color: #a03d2e;
  text-align: center;
  font: 700 0.69rem/1.35 Georgia, serif;
  letter-spacing: 0.02em;
  transform: rotate(-4deg);

  span {
    display: block;
    font: 700 0.77rem/1.5 ${fonts.sans};
  }
`;

const GroundShadow = styled.div`
  position: absolute;
  left: 20%;
  bottom: 15%;
  width: 59%;
  height: 6%;
  border-radius: 50%;
  background: #48695035;
`;

const Mascot = styled.img`
  position: absolute;
  left: 12%;
  bottom: 13%;
  width: 57%;
  height: 68%;
  object-fit: contain;
  filter: drop-shadow(0 3px 0 #6d594e20);
  pointer-events: none;
  user-select: none;

  ${MOBILE} {
    left: 20%;
    width: 48%;
    height: 74%;
  }
`;

const shake = keyframes`
  10%, 50%, 90% { transform: rotate(-10deg); }
  30%, 70% { transform: rotate(10deg) translateY(-5px); }
`;

const BagButton = styled.button<{ $shaking: boolean; $revealed: boolean }>`
  position: absolute;
  right: 15%;
  bottom: 15%;
  width: 27%;
  aspect-ratio: ${BAG_SIZE.width} / ${BAG_SIZE.height};
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  filter: drop-shadow(0 3px 0 #59452b33);
  /* Swing around the bag's own bottom point. */
  transform-origin: 50% 92%;
  transition: transform 0.2s ease;
  ${({ $revealed }) => $revealed && "transform: rotate(-7deg);"}

  &:hover:enabled {
    transform: rotate(4deg) translateY(-3px);
  }
  ${({ $shaking }) =>
    $shaking &&
    css`
      animation: ${shake} 0.62s ease-in-out;
    `}

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }

  ${MOBILE} {
    right: 19%;
    width: 22%;
  }
`;

const Caption = styled.div`
  position: absolute;
  left: 4%;
  right: 4%;
  bottom: 3%;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #263d32;
  font-size: 0.78rem;
  font-weight: 700;

  [lang="en"] {
    font: 700 0.68rem ${fonts.mono};
    letter-spacing: 0.11em;
  }
  .rule {
    width: 25px;
    height: 1px;
    background: #3b5542;
  }
  .spark {
    color: #40644a;
  }

  ${MOBILE} {
    font-size: 0.7rem;
    [lang="en"] {
      font-size: 0.59rem;
    }
  }
`;

interface FortuneSceneProps {
  revealed: boolean;
  shaking: boolean;
  bagDisabled: boolean;
  bagLabel: string;
  onBag: () => void;
}

export default function FortuneScene({ revealed, shaking, bagDisabled, bagLabel, onBag }: FortuneSceneProps) {
  const landscapeRef = useRef<HTMLCanvasElement>(null);
  const bagRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (landscapeRef.current) drawScene(landscapeRef.current);
    const bag = bagRef.current;
    if (!bag) return;
    drawBag(bag);
    // Repaint the embroidered 복 once the UI font is ready.
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) drawBag(bag);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Side>
      <Scene $revealed={revealed}>
        <Landscape ref={landscapeRef} width={SCENE_SIZE.width} height={SCENE_SIZE.height} aria-hidden="true" />
        <Stamp aria-hidden="true">
          二〇二七<span>정미년</span>
        </Stamp>
        <GroundShadow />
        {/* eslint-disable-next-line @next/next/no-img-element -- same original PNG as the intro and ticket */}
        <Mascot src={MASCOT_SRC} alt="헤드폰을 목에 건 붉은 아기 양" width={1254} height={1254} draggable={false} />
        <BagButton
          type="button"
          aria-label={bagLabel}
          disabled={bagDisabled}
          onClick={onBag}
          $shaking={shaking}
          $revealed={revealed}
        >
          <canvas ref={bagRef} width={BAG_SIZE.width} height={BAG_SIZE.height} aria-hidden="true" />
        </BagButton>
        <Caption>
          <span className="spark" aria-hidden="true">
            ✦
          </span>
          붉은 양의 해 <span className="rule" aria-hidden="true" /> <span lang="en">YEAR OF THE SHEEP</span>
        </Caption>
      </Scene>
    </Side>
  );
}
