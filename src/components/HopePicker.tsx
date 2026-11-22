"use client";

import type { Ref } from "react";
import styled from "styled-components";
import { hopes, type HopeKey } from "@/data/hopes";
import { DESKTOP, colors } from "@/styles/global";

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  padding: 4px;

  @media (min-width: 900px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  /* Phones: four compact columns, labels only, so the sheep keeps room above. */
  @media (max-width: 740px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px 10px;
    button {
      justify-items: center;
      min-height: 44px;
      padding: 6px 2px;
      text-align: center;
    }
    span {
      display: none;
    }
  }
`;

const Choice = styled.button`
  display: grid;
  gap: 2px;
  justify-items: start;
  min-height: 52px;
  padding: 8px 10px;
  border: 0;
  background: #fff;
  color: ${colors.ink};
  text-align: left;
  box-shadow:
    0 -3px 0 0 ${colors.ink},
    0 3px 0 0 ${colors.ink},
    -3px 0 0 0 ${colors.ink},
    3px 0 0 0 ${colors.ink},
    inset 0 -4px 0 0 ${colors.paperShade};

  strong {
    font-size: 18px;
    font-weight: 700;
    color: ${colors.red};
    ${DESKTOP} {
      font-size: 24px;
    }
  }
  span {
    font-size: 12px;
    color: ${colors.muted};
    line-height: 1.4;
  }

  &:hover:enabled {
    background: #fff4e0;
  }
  &:active:enabled {
    transform: translateY(2px);
  }
  &:disabled {
    background: #efe4d4;
    cursor: default;
  }
  &[aria-pressed="true"] {
    background: ${colors.red};
    strong,
    span {
      color: #fff;
    }
  }
`;

interface HopePickerProps {
  disabled: boolean;
  chosen: HopeKey | null;
  firstRef?: Ref<HTMLButtonElement>;
  onPick: (key: HopeKey) => void;
}

/** "내년에 가장 바라는 1순위 소망" — eight choices; picking one opens the lucky bag. */
export default function HopePicker({ disabled, chosen, firstRef, onPick }: HopePickerProps) {
  return (
    <Grid role="group" aria-label="내년 1순위 소망">
      {hopes.map((hope, i) => (
        <Choice
          key={hope.key}
          ref={i === 0 ? firstRef : undefined}
          type="button"
          disabled={disabled}
          aria-pressed={chosen === hope.key}
          aria-label={`${hope.label} — ${hope.desc}`}
          onClick={() => onPick(hope.key)}
        >
          <strong>{hope.label}</strong>
          <span>{hope.desc}</span>
        </Choice>
      ))}
    </Grid>
  );
}
