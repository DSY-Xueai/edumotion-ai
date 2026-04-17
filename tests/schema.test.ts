import { describe, expect, it } from "vitest";
import { videoSpecSchema } from "../src/lib/schema";

describe("videoSpecSchema", () => {
  it("accepts a minimal cover-only video spec", () => {
    const result = videoSpecSchema.safeParse({
      meta: {
        title: "Test Title",
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
          title: "Test Title",
          subtitle: "Intro",
          duration: 90,
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
