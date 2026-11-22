import GameExperience from "@/components/GameExperience";

// Server component. The stage, HUD and skip button are in the initial HTML;
// the client component runs the pixel scene, the conversation and the draw.
export default function Page() {
  return (
    <>
      <GameExperience />
      <noscript>
        <p style={{ position: "fixed", inset: "auto 0 0", zIndex: 40, margin: 0, padding: 12, background: "#fff7e6", color: "#3a2622", textAlign: "center" }}>
          복주머니를 열려면 브라우저에서 자바스크립트를 켜 주세요.
        </p>
      </noscript>
    </>
  );
}
