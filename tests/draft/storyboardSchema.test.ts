import { describe, expect, it } from "vitest";
import { storyboardSceneSchema } from "../../src/lib/draft/schema";

describe("storyboardSceneSchema", () => {
  it("accepts the approved STEM scene vocabulary", () => {
    const scene = storyboardSceneSchema.parse({
      id: "scene-1",
      type: "definition",
      segmentIds: ["seg-1"],
      durationSec: 12,
    });

    expect(scene.type).toBe("definition");
  });

  it("rejects unsupported scene types", () => {
    expect(() =>
      storyboardSceneSchema.parse({
        id: "scene-2",
        type: "cover",
        segmentIds: ["seg-1"],
        durationSec: 6,
      }),
    ).toThrow();
  });
});
