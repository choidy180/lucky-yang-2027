import { notFound } from "next/navigation";
import OgPreview from "./OgPreview";

// Development-only: preview and download the link-preview image (public/og.png).
export default function DevOgPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <OgPreview />;
}
