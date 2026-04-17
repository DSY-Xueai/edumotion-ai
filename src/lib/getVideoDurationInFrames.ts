import type { Scene } from "./schema";

export const getVideoDurationInFrames = (scenes: Scene[]) => {
  return scenes.reduce((total, scene) => total + scene.duration, 0);
};
