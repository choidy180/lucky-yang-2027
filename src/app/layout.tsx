import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import StyledComponentsRegistry from "@/styles/registry";

export const metadata: Metadata = {
  title: "올해 첫 곡은 뭐양? · 복주머니 레코드",
  description: "붉은 양에게 이름을 알려주고, 2027년 새해 첫 곡과 덕담을 뽑아 보세요.",
  referrer: "strict-origin-when-cross-origin",
  icons: { icon: "/assets/yang.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf7ee",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
