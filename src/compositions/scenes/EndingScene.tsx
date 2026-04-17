import { AbsoluteFill } from "remotion";

export const EndingScene = ({
  heading,
  text,
}: {
  heading: string;
  text: string;
}) => {
  return (
    <AbsoluteFill
      style={{
        padding: 80,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        backgroundColor: "#161616",
        color: "#f7f2ea",
      }}
    >
      <h2 style={{ fontSize: 68, margin: "0 0 24px" }}>{heading}</h2>
      <p style={{ fontSize: 34, lineHeight: 1.45, maxWidth: 820 }}>{text}</p>
    </AbsoluteFill>
  );
};
