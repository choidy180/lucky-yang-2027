"use client";

import styled from "styled-components";
import { MOBILE, colors, fonts } from "@/styles/global";

export const MASCOT_SRC = "/assets/yang.png";

const actionBase = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 11px 22px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
`;

export const PrimaryButton = styled.button`
  ${actionBase}
  background: ${colors.red};
  color: #fff;
  border: 1.5px solid #87342b;
  box-shadow: 0 3px 0 #84382d;

  &:hover:enabled {
    background: ${colors.redHover};
    transform: translateY(-1px);
  }
  &:active:enabled {
    transform: translateY(2px);
    box-shadow: none;
  }
  &:disabled {
    background: #e5d8c8;
    border-color: #cbbba5;
    color: #65564b;
    box-shadow: none;
  }
`;

export const SecondaryButton = styled.button`
  ${actionBase}
  background: #fffaf0;
  color: ${colors.ink};
  border: 1px solid #ad9a82;

  &:hover:enabled {
    background: #fff4e0;
    transform: translateY(-1px);
  }
  &:disabled {
    color: #8a7d70;
  }
`;

export const PlainButton = styled.button`
  border: 0;
  background: none;
  padding: 6px 2px;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${colors.ink};

  &:hover:enabled {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  &:disabled {
    color: #9b8f82;
  }
  ${MOBILE} {
    font-size: 0.8rem;
  }
`;

export const Eyebrow = styled.p`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  color: #9f3e31;
  font: 700 0.78rem/1.4 ${fonts.mono};
  letter-spacing: 0.12em;

  &::before {
    content: "";
    flex: none;
    width: 22px;
    height: 3px;
    background: #d15f47;
  }
  ${MOBILE} {
    font-size: 0.72rem;
  }
`;

export const Spark = styled.span`
  font-size: 1.1rem;
  color: #ffdb83;

  button:disabled & {
    color: #8a7560;
  }
`;

export const TinyDisc = styled.i`
  display: inline-block;
  flex: none;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: radial-gradient(circle, #faf7ee 0 15%, #766a5b 20% 48%, #958777 51% 55%, #766a5b 57%);
`;
