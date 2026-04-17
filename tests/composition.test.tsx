import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { AutoVideoComposition } from "../src/compositions/AutoVideoComposition";
import type { VideoSpec } from "../src/lib/schema";

vi.mock("remotion", () => {
  return {
    AbsoluteFill: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Sequence: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Img: ({ src }: { src: string }) => <img src={src} alt="" />,
  };
});

describe("AutoVideoComposition", () => {
  it("renders cover and info scene content from a video spec", () => {
    const spec: VideoSpec = {
      meta: {
        title: "AI 让视频制作更高效",
        aspectRatio: "9:16",
        theme: "editorial-bold",
        sourceFile: "tests/fixtures/article.txt",
      },
      assets: {
        images: [],
      },
      scenes: [
        {
          id: "scene-1",
          type: "cover",
          title: "AI 让视频制作更高效",
          subtitle: "自动化视频生成",
          duration: 90,
        },
        {
          id: "scene-2",
          type: "info",
          heading: "重点 1",
          bullets: ["第一条信息", "第二条信息"],
          duration: 90,
        },
        {
          id: "scene-3",
          type: "ending",
          heading: "总结",
          text: "视频生成完成",
          duration: 75,
        },
      ],
    };

    const html = renderToStaticMarkup(<AutoVideoComposition {...spec} />);

    expect(html).toContain("AI 让视频制作更高效");
    expect(html).toContain("第一条信息");
    expect(html).toContain("视频生成完成");
  });
});
