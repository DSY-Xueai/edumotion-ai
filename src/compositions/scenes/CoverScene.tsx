import { AbsoluteFill } from "remotion";

export const CoverScene = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => {
  return (
    <AbsoluteFill
      style={{
        padding: 80,
        justifyContent: "center",
        background:
          "linear-gradient(180deg, rgb(245, 239, 230) 0%, rgb(230, 219, 204) 100%)",
      }}
    >
      <div style={{ fontSize: 28, letterSpacing: 6, textTransform: "uppercase" }}>
        AI Video
      </div>
      <h1 style={{ fontSize: 84, lineHeight: 1.1, margin: "30px 0 24px" }}>{title}</h1>
      <p style={{ fontSize: 34, lineHeight: 1.4, maxWidth: 820 }}>{subtitle}</p>
    </AbsoluteFill>
  );
};
