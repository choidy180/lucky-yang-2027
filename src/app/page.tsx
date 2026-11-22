import NewYearExperience from "@/components/NewYearExperience";

// Server component. The intro poster and backdrop are part of the initial HTML;
// the client component takes over the animation, the form and the draw.
export default function Page() {
  return (
    <>
      <NewYearExperience />
      <noscript>
        <p style={{ position: "fixed", inset: "auto 0 0", zIndex: 40, margin: 0, padding: 12, background: "#fff", textAlign: "center" }}>
          복주머니를 열려면 브라우저에서 자바스크립트를 켜 주세요.
        </p>
      </noscript>
    </>
  );
}
