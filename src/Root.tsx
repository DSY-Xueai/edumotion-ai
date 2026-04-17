import { Composition } from "remotion";
import { AutoVideoComposition } from "./compositions/AutoVideoComposition";
import { getVideoDurationInFrames } from "./lib/getVideoDurationInFrames";
import type { VideoSpec } from "./lib/schema";

const defaultProps: VideoSpec = {
  meta: {
    title: "Demo Video",
    aspectRatio: "9:16",
    theme: "editorial-bold",
    sourceFile: "demo.txt",
  },
  assets: {
    images: [],
  },
  scenes: [
    {
      id: "scene-1",
      type: "cover",
      title: "Demo Video",
      subtitle: "Waiting for pipeline data",
      duration: 90,
    },
    {
      id: "scene-2",
      type: "ending",
      heading: "总结",
      text: "准备开始渲染",
      duration: 75,
    },
  ],
};

export const Root = () => {
  return (
    <Composition
      id="AutoVideo"
      component={AutoVideoComposition}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={getVideoDurationInFrames(defaultProps.scenes)}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => ({
        durationInFrames: getVideoDurationInFrames(props.scenes),
      })}
    />
  );
};
