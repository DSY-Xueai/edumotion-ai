import { videoSpecSchema, type VideoSpec } from "../schema";
import { estimateSceneDuration } from "./sceneTiming";

export const buildVideoSpec = ({
  sourceFile,
  title,
  paragraphs,
  images,
}: {
  sourceFile: string;
  title: string;
  paragraphs: string[];
  images: Array<{ id: string; path: string; usage: "cover" | "body" }>;
}): VideoSpec => {
  const coverImage = images.find((image) => image.usage === "cover");
  const bodyImages = images.filter((image) => image.usage === "body");

  const bodyScenes = paragraphs.map((paragraph, index) => {
    const bodyImage = bodyImages[index];

    if (bodyImage) {
      return {
        id: `scene-${index + 2}`,
        type: "image-text" as const,
        heading: `重点 ${index + 1}`,
        text: paragraph.slice(0, 140),
        keywords: paragraph.split(/[，。；、\s]/).filter(Boolean).slice(0, 3),
        imageId: bodyImage.id,
        duration: estimateSceneDuration(paragraph),
      };
    }

    return {
      id: `scene-${index + 2}`,
      type: "info" as const,
      heading: `重点 ${index + 1}`,
      bullets: [paragraph.slice(0, 36), paragraph.slice(36, 72)].filter(Boolean),
      duration: estimateSceneDuration(paragraph),
    };
  });

  const spec = {
    meta: {
      title,
      aspectRatio: "9:16" as const,
      theme: "editorial-bold",
      sourceFile,
    },
    assets: {
      images: coverImage ? [coverImage, ...bodyImages] : bodyImages,
    },
    scenes: [
      {
        id: "scene-1",
        type: "cover" as const,
        title,
        subtitle: paragraphs[0]?.slice(0, 48) || "自动生成图文解说视频",
        duration: 90,
      },
      ...bodyScenes,
      {
        id: `scene-${bodyScenes.length + 2}`,
        type: "ending" as const,
        heading: "总结",
        text: paragraphs.at(-1)?.slice(0, 60) || "视频生成完成",
        duration: 75,
      },
    ],
  };

  return videoSpecSchema.parse(spec);
};
