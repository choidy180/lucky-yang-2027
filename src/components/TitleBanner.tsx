"use client";

import type { Ref } from "react";
import styled, { css, keyframes } from "styled-components";
import { DESKTOP, MOBILE, colors } from "@/styles/global";

const drop = keyframes`
  0% { transform: translateY(-0.9em); opacity: 0; }
  55% { transform: translateY(0.12em); opacity: 1; }
  75% { transform: translateY(-0.06em); }
  100% { transform: translateY(0); opacity: 1; }
`;

const rise = keyframes`
  from { transform: translateY(12px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

/** Outline drawn with hard text-shadows, one font pixel (em/12) thick. */
const outline = (color: string) => css`
  --p: calc(1em / 12);
  text-shadow:
    calc(var(--p) * -1) 0 0 ${color},
    var(--p) 0 0 ${color},
    0 calc(var(--p) * -1) 0 ${color},
    0 var(--p) 0 ${color},
    calc(var(--p) * -1) calc(var(--p) * -1) 0 ${color},
    var(--p) calc(var(--p) * -1) 0 ${color},
    calc(var(--p) * -1) var(--p) 0 ${color},
    var(--p) var(--p) 0 ${color},
    0 calc(var(--p) * 3) 0 ${color};
`;

const Wrap = styled.header<{ $compact: boolean; $hidden: boolean }>`
  position: fixed;
  z-index: 5;
  left: 0;
  right: 0;
  top: calc(env(safe-area-inset-top) + 68px);
  display: grid;
  justify-items: center;
  gap: 10px;
  pointer-events: none;
  text-align: center;
  transition: transform 0.4s steps(4), top 0.4s steps(4);

  ${MOBILE} {
    top: calc(env(safe-area-inset-top) + 58px);
  }
  transform-origin: top center;
  /* hidden while the name panel sits at the top for the phone keyboard */
  opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};
  ${({ $compact }) =>
    $compact &&
    css`
      transform: scale(0.7);
    `}
`;

const Title = styled.h1`
  font-weight: 700;
  font-size: 48px;
  line-height: 1.15;
  color: ${colors.cream};
  ${outline(colors.ink)}

  ${DESKTOP} {
    font-size: 72px;
  }
  @media (min-width: 741px) and (max-height: 960px) {
    font-size: 60px;
  }
  @media (min-width: 741px) and (max-height: 720px) {
    font-size: 48px;
  }

  .line {
    display: block;
    white-space: nowrap;
  }
  .accent {
    color: #ff6b57;
  }
  .ch {
    display: inline-block;
    white-space: pre;
    opacity: 0;
    animation: ${drop} 0.42s steps(6) both;
  }
`;

const Sub = styled.p`
  font-size: 18px;
  color: ${colors.gold};
  letter-spacing: 0.08em;
  ${outline(colors.ink)}
  opacity: 0;
  animation: ${rise} 0.4s steps(4) 0.95s both;
  ${DESKTOP} {
    font-size: 24px;
  }
  @media (max-height: 720px) {
    display: none;
  }
`;

const LINES: { text: string; accent?: boolean }[] = [{ text: "올해 첫 곡은" }, { text: "뭐양?", accent: true }];

export default function TitleBanner({ compact, hidden = false, wrapRef }: { compact: boolean; hidden?: boolean; wrapRef?: Ref<HTMLElement> }) {
  let i = 0;
  return (
    <Wrap ref={wrapRef} $compact={compact} $hidden={hidden} aria-hidden={hidden || undefined}>
      <Title aria-label="올해 첫 곡은 뭐양?">
        {LINES.map((line) => (
          <span key={line.text} className={line.accent ? "line accent" : "line"} aria-hidden="true">
            {[...line.text].map((ch) => {
              const delay = i++ * 70;
              return (
                <span key={`${line.text}-${delay}`} className="ch" style={{ animationDelay: `${delay}ms` }}>
                  {ch}
                </span>
              );
            })}
          </span>
        ))}
      </Title>
      <Sub>2027 정미년 · 붉은 양의 해</Sub>
    </Wrap>
  );
}
