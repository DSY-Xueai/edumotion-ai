import { AbsoluteFill } from "remotion";

export const InfoScene = ({
  heading,
  bullets,
}: {
  heading: string;
  bullets: string[];
}) => {
  return (
    <AbsoluteFill
      style={{
        padding: 60,
        backgroundColor: "#f7f2ea",
        color: "#161616",
        justifyContent: "center",
      }}
    >
      <h2 style={{ fontSize: 64, margin: "0 0 36px", lineHeight: 1.1 }}>{heading}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {bullets.map((bullet) => (
          <div
            key={bullet}
            style={{
              padding: "24px 28px",
              borderRadius: 24,
              backgroundColor: "#ece1d3",
              fontSize: 34,
              lineHeight: 1.4,
            }}
          >
            {bullet}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
