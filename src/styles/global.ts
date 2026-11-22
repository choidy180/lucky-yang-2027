"use client";

import { createGlobalStyle } from "styled-components";

export const colors = {
  night: "#131532",
  dusk: "#2c295b",
  ink: "#3a2622",
  paper: "#fff7e6",
  paperShade: "#f1dcc0",
  red: "#d9473b",
  redDark: "#a8352b",
  redLight: "#f07a5f",
  wine: "#b33e35",
  gold: "#ffd36b",
  cream: "#fff3d6",
  muted: "#7a5f55",
  focus: "#ffd36b",
} as const;

export const fonts = {
  pixel: 'var(--font-pixel), "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
} as const;

/** Phone layout below this width. */
export const MOBILE = "@media (max-width: 740px)";
export const DESKTOP = "@media (min-width: 741px)";

export const GlobalStyle = createGlobalStyle`
  :root {
    --night: ${colors.night};
    --ink: ${colors.ink};
    --paper: ${colors.paper};
    --red: ${colors.red};
    color-scheme: dark;
  }

  *, *::before, *::after { box-sizing: border-box; }

  html, body { height: 100%; }
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }

  body {
    margin: 0;
    overflow: hidden;
    background: ${colors.night};
    color: ${colors.cream};
    font-family: ${fonts.pixel};
    font-size: 18px;
    line-height: 1.5;
    word-break: keep-all;
    overflow-wrap: anywhere;
    -webkit-font-smoothing: none;
  }

  h1, h2, h3, p { margin: 0; font-weight: inherit; }

  button, input { font: inherit; color: inherit; }
  button { cursor: pointer; -webkit-tap-highlight-color: transparent; }
  button:disabled { cursor: default; }
  a { color: inherit; -webkit-tap-highlight-color: transparent; }

  :focus-visible {
    outline: 4px solid ${colors.focus};
    outline-offset: 4px;
  }
  [tabindex="-1"]:focus:not(:focus-visible) { outline: none; }

  [hidden] { display: none !important; }

  .visually-hidden {
    position: absolute !important;
    width: 1px; height: 1px;
    margin: -1px; padding: 0; border: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      animation-delay: 0ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
