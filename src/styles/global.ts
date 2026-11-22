"use client";

import { createGlobalStyle } from "styled-components";

export const colors = {
  page: "#faf7ee",
  card: "#fffdf5",
  ink: "#302c28",
  muted: "#685f55",
  red: "#c94a3d",
  redHover: "#b93f34",
  wine: "#b33e35",
  edge: "#d8cbbb",
  frame: "#635848",
  gold: "#d5a243",
  focus: "#235f74",
} as const;

export const fonts = {
  sans: 'Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
  mono: '"Courier New", Courier, monospace',
} as const;

/** One-column layout below this width. */
export const MOBILE = "@media (max-width: 740px)";

export const GlobalStyle = createGlobalStyle`
  :root {
    --page: ${colors.page};
    --card: ${colors.card};
    --ink: ${colors.ink};
    --muted: ${colors.muted};
    --red: ${colors.red};
    --wine: ${colors.wine};
    --edge: ${colors.edge};
    --sans: ${fonts.sans};
    --mono: ${fonts.mono};
    color-scheme: light;
  }

  *, *::before, *::after { box-sizing: border-box; }

  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }

  body {
    margin: 0;
    min-height: 100svh;
    background-color: var(--page);
    background-image: radial-gradient(#b6a58c33 0.75px, transparent 0.85px);
    background-size: 7px 7px;
    color: var(--ink);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.55;
    word-break: keep-all;
    overflow-wrap: anywhere;
  }

  h1, h2, h3, p { margin: 0; }
  strong, b { font-weight: 700; }

  button, input { font: inherit; color: inherit; }
  button { cursor: pointer; -webkit-tap-highlight-color: transparent; }
  button:disabled { cursor: default; }
  a { color: inherit; -webkit-tap-highlight-color: transparent; }

  button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
    outline: 3px solid ${colors.focus};
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
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
