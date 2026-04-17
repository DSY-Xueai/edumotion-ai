import { AbsoluteFill, Sequence } from "remotion";
import type { VideoSpec } from "../lib/schema";
import { CoverScene } from "./scenes/CoverScene";
import { EndingScene } from "./scenes/EndingScene";
import { ImageTextScene } from "./scenes/ImageTextScene";
import { InfoScene } from "./scenes/InfoScene";

export const AutoVideoComposition = ({ assets, scenes }: VideoSpec) => {
  let start = 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f7f2ea",
        color: "#161616",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      {scenes.map((scene) => {
        const from = start;
        start += scene.duration;

        return (
          <Sequence key={scene.id} from={from} durationInFrames={scene.duration}>
            {scene.type === "cover" ? (
              <CoverScene title={scene.title} subtitle={scene.subtitle} />
            ) : null}
            {scene.type === "image-text" ? (
              <ImageTextScene
                heading={scene.heading}
                text={scene.text}
                imagePath={assets.images.find((image) => image.id === scene.imageId)?.path}
              />
            ) : null}
            {scene.type === "info" ? (
              <InfoScene heading={scene.heading} bullets={scene.bullets} />
            ) : null}
            {scene.type === "ending" ? (
              <EndingScene heading={scene.heading} text={scene.text} />
            ) : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
