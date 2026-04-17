import { AbsoluteFill, Img } from "remotion";

export const ImageTextScene = ({
  heading,
  text,
  imagePath,
}: {
  heading: string;
  text: string;
  imagePath?: string;
}) => {
  return (
    <AbsoluteFill
      style={{
        padding: 60,
        backgroundColor: "#f7f2ea",
        color: "#161616",
        gap: 32,
      }}
    >
      {imagePath ? (
        <div style={{ flex: 1, overflow: "hidden", borderRadius: 28 }}>
          <Img
            src={imagePath}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h2 style={{ fontSize: 64, margin: 0, lineHeight: 1.1 }}>{heading}</h2>
        <p style={{ fontSize: 34, margin: 0, lineHeight: 1.45 }}>{text}</p>
      </div>
    </AbsoluteFill>
  );
};
