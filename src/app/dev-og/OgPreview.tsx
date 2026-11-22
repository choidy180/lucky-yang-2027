"use client";

import { useEffect, useRef, useState } from "react";
import { renderIconCanvas, renderOgCanvas } from "@/lib/og";
import { canvasToPng, downloadBlob } from "@/lib/ticket";

type Item = { id: string; file: string; label: string; make: () => Promise<HTMLCanvasElement>; width: number };

const ITEMS: Item[] = [
  { id: "og", file: "og.png", label: "링크 미리보기 public/og.png (1200×630)", make: renderOgCanvas, width: 1200 },
  { id: "icon", file: "icon.png", label: "아이콘 src/app/icon.png (512×512)", make: () => renderIconCanvas(512), width: 256 },
  { id: "apple", file: "apple-icon.png", label: "홈 화면 아이콘 src/app/apple-icon.png (180×180)", make: () => renderIconCanvas(180), width: 180 },
];

function Preview({ item }: { item: Item }) {
  const host = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let alive = true;
    void item.make().then((c) => {
      if (!alive || !host.current) return;
      c.style.width = "100%";
      c.style.height = "auto";
      c.style.imageRendering = "pixelated";
      host.current.replaceChildren(c);
      setCanvas(c);
    });
    return () => {
      alive = false;
    };
  }, [item]);
  return (
    <section style={{ marginBottom: 32 }}>
      <p style={{ marginBottom: 8 }}>{item.label}</p>
      <div ref={host} id={`og-${item.id}`} style={{ maxWidth: item.width }} />
      <button type="button" disabled={!canvas} style={{ marginTop: 12, padding: "8px 16px" }} onClick={async () => canvas && downloadBlob(await canvasToPng(canvas), item.file)}>
        {item.file} 내려받기
      </button>
    </section>
  );
}

/** Development-only previews of the generated images; download one to replace the file in the repo. */
export default function OgPreview() {
  return (
    <main style={{ position: "fixed", inset: 0, overflow: "auto", padding: 24, background: "#131532", color: "#fff3d6" }}>
      {ITEMS.map((item) => (
        <Preview key={item.id} item={item} />
      ))}
    </main>
  );
}
