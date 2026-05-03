import type { RenderPackageScene } from "./rendering/schema";

export const getVideoDurationInFrames = (scenes: RenderPackageScene[]) =>
  scenes.reduce((total, scene) => total + Number(scene.durationInFrames), 0);
