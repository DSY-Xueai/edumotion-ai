import { Composition } from "remotion";
import { AutoVideoComposition } from "./compositions/AutoVideoComposition";
import { getVideoDurationInFrames } from "./lib/getVideoDurationInFrames";
import type { RenderPackage } from "./lib/rendering/schema";

const defaultProps: RenderPackage = {
  topicId: "demo-topic",
  lessonVersion: 1,
  canonicalTitle: "Demo Topic",
  approvedAt: "2026-04-26T00:00:00.000Z",
  generatedAt: "2026-04-26T00:00:00.000Z",
  totalDurationMs: 5000,
  meta: {
    topicId: "demo-topic",
    subject: "math",
    aspectRatio: "9:16",
  },
  subject: "math",
  themeTokens: {
    palette: "math-clean",
    typography: "math-serif",
    accent: "#1f4b99",
  },
  audioTracks: [],
  subtitleTrack: {
    topicId: "demo-topic",
    subject: "math",
    cues: [],
  },
  scenes: [
    {
      id: "scene-1",
      kind: "hook",
      component: "math/hook",
      durationInFrames: 90,
      payload: {
        title: "Demo Topic",
        narration: "Waiting for curriculum pipeline data.",
      },
    },
    {
      id: "scene-2",
      kind: "wrap",
      component: "math/wrap",
      durationInFrames: 60,
      payload: {
        title: "Demo Topic",
        narration: "The STEM render pipeline is ready for the next step.",
      },
    },
  ],
  durationInFrames: 150,
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
