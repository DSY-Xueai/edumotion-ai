import { describe, expect, it } from "vitest";
import { runPipeline } from "../src/lib/pipeline/runPipeline";

describe("runPipeline", () => {
  it("returns a validated video spec for a txt article", async () => {
    const result = await runPipeline({
      sourceFile: "tests/fixtures/article.txt",
      imagePaths: [],
    });

    expect(result.meta.title).toBe("AI 让视频制作更高效");
    expect(result.scenes.length).toBeGreaterThan(1);
  });
});
