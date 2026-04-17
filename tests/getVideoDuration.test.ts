import { describe, expect, it } from "vitest";
import { getVideoDurationInFrames } from "../src/lib/getVideoDurationInFrames";

describe("getVideoDurationInFrames", () => {
  it("sums all scene durations", () => {
    expect(
      getVideoDurationInFrames([
        {
          id: "scene-1",
          type: "cover",
          title: "Title",
          subtitle: "Subtitle",
          duration: 90,
        },
        {
          id: "scene-2",
          type: "ending",
          heading: "总结",
          text: "Done",
          duration: 75,
        },
      ]),
    ).toBe(165);
  });
});
