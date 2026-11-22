"use client";

// Pixel-art UI primitives: notched 4px borders, chunky buttons, Galmuri text.
import styled, { css } from "styled-components";
import { DESKTOP, MOBILE, colors } from "@/styles/global";

/** A 4px border with cut corners plus a hard drop shadow (box-shadow trick, no images). */
export const pixelFrame = (border: string, shadow = "rgba(20, 10, 20, 0.45)") => css`
  box-shadow:
    0 -4px 0 0 ${border},
    0 4px 0 0 ${border},
    -4px 0 0 0 ${border},
    4px 0 0 0 ${border},
    0 12px 0 0 ${shadow};
`;

export const PixelWindow = styled.div`
  position: relative;
  background: ${colors.paper};
  color: ${colors.ink};
  ${pixelFrame(colors.ink)}

  &::before {
    /* inner light bevel */
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow:
      inset 0 4px 0 0 #ffffff,
      inset 0 -4px 0 0 ${colors.paperShade};
  }
`;

type Tone = "red" | "paper" | "night";

const toneCss: Record<Tone, ReturnType<typeof css>> = {
  red: css`
    background: ${colors.red};
    color: #fff;
    text-shadow: 0 2px 0 ${colors.redDark};
    box-shadow:
      0 -4px 0 0 ${colors.ink},
      0 4px 0 0 ${colors.ink},
      -4px 0 0 0 ${colors.ink},
      4px 0 0 0 ${colors.ink},
      inset 0 -6px 0 0 ${colors.redDark},
      inset 0 4px 0 0 ${colors.redLight};
  `,
  paper: css`
    background: ${colors.paper};
    color: ${colors.ink};
    box-shadow:
      0 -4px 0 0 ${colors.ink},
      0 4px 0 0 ${colors.ink},
      -4px 0 0 0 ${colors.ink},
      4px 0 0 0 ${colors.ink},
      inset 0 -6px 0 0 ${colors.paperShade},
      inset 0 4px 0 0 #fff;
  `,
  night: css`
    background: rgba(19, 21, 50, 0.72);
    color: ${colors.cream};
    box-shadow:
      0 -3px 0 0 ${colors.cream},
      0 3px 0 0 ${colors.cream},
      -3px 0 0 0 ${colors.cream},
      3px 0 0 0 ${colors.cream};
  `,
};

export const PixelButton = styled.button<{ $tone?: Tone; $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: ${({ $small }) => ($small ? 40 : 52)}px;
  padding: ${({ $small }) => ($small ? "4px 14px" : "8px 22px")};
  border: 0;
  border-radius: 0;
  font-family: inherit;
  font-size: ${({ $small }) => ($small ? 18 : 24)}px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  ${({ $tone = "red" }) => toneCss[$tone]}

  &:hover:enabled {
    filter: brightness(1.06);
  }
  &:active:enabled {
    transform: translateY(3px);
  }
  &:disabled {
    background: #cdbba4;
    color: #6b5a4f;
    text-shadow: none;
    box-shadow:
      0 -4px 0 0 #7f6c60,
      0 4px 0 0 #7f6c60,
      -4px 0 0 0 #7f6c60,
      4px 0 0 0 #7f6c60;
  }
  ${MOBILE} {
    font-size: 18px;
    min-height: ${({ $small }) => ($small ? 38 : 48)}px;
  }
`;

/** Body copy on the 12px grid: 18px (×1.5) on phones, 24px (×2) on larger screens. */
export const bodyText = css`
  font-size: 18px;
  line-height: 1.6;
  ${DESKTOP} {
    font-size: 24px;
    line-height: 1.5;
  }
`;

export const Blink = styled.span`
  display: inline-block;
  animation: blink 1s steps(1) infinite;
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
`;
