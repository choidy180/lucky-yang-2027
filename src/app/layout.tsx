import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import StyledComponentsRegistry from "@/styles/registry";

// Galmuri11 (SIL OFL 1.1, see src/fonts/OFL-Galmuri.md): a Korean bitmap-style font, 12px grid.
const pixel = localFont({
  src: [
    { path: "../fonts/Galmuri11.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Galmuri11-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-pixel",
  display: "swap",
  fallback: ["Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
  adjustFontFallback: false,
});

// Absolute base for link-preview images: an explicit site URL, else Vercel's production domain.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3027");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "올해 첫 곡은 뭐양? · 복주머니 레코드",
  description: "새벽 초원의 붉은 양에게 이름을 알려 주고, 복주머니를 열어 2027년 새해 첫 곡과 덕담을 받아 보세요.",
  referrer: "strict-origin-when-cross-origin",
  icons: { icon: "/assets/yang.png" },
  formatDetection: { telephone: false },
  // Link previews in messengers. On Vercel, Next.js resolves these against the production URL.
  openGraph: {
    title: "올해 첫 곡은 뭐양? · 복주머니 레코드",
    description: "새벽 초원의 붉은 양을 찾아 복주머니를 열고, 2027년 새해 첫 곡과 덕담을 받아 보세요.",
    type: "website",
    locale: "ko_KR",
    images: [{ url: "/assets/yang.png", width: 1254, height: 1254 }],
  },
  twitter: { card: "summary", images: ["/assets/yang.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2c295b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Browser extensions (e.g. ColorZilla's `cz-shortcut-listen`, Grammarly, Dark Reader) add
  // attributes to <html>/<body> before React hydrates. This only ignores attribute differences
  // on these two elements; mismatches inside the app are still reported.
  return (
    <html lang="ko" className={pixel.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
