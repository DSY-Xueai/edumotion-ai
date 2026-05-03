import type { RenderPackage } from "../lib/rendering/schema";
import { AdaptiveMotionComposition } from "./adaptiveMotion/AdaptiveMotionComposition";

export const AutoVideoComposition = (props: RenderPackage) => {
  return <AdaptiveMotionComposition {...props} />;
};
