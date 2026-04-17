import { describe, expect, it } from "vitest";
import { buildVideoSpec } from "../src/lib/normalizer/buildVideoSpec";

describe("buildVideoSpec", () => {
  it("creates cover, body, and ending scenes", () => {
    const spec = buildVideoSpec({
      sourceFile: "tests/fixtures/article.txt",
      title: "AI 让视频制作更高效",
      paragraphs: [
        "第一段内容主要说明自动化视频生成的价值。",
        "第二段内容说明配图不是强制要求，没有图时也能回退为信息卡。",
      ],
      images: [],
    });

    expect(spec.scenes[0].type).toBe("cover");
    expect(spec.scenes.at(-1)?.type).toBe("ending");
    expect(spec.scenes.length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to info scenes when there are no images", () => {
    const spec = buildVideoSpec({
      sourceFile: "tests/fixtures/article.txt",
      title: "AI 让视频制作更高效",
      paragraphs: ["没有配图时应该生成信息卡。"],
      images: [],
    });

    expect(spec.scenes.some((scene) => scene.type === "info")).toBe(true);
  });
});
