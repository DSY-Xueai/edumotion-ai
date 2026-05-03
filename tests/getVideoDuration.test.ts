import { describe, expect, it } from "vitest";
import { getVideoDurationInFrames } from "../src/lib/getVideoDurationInFrames";

describe("getVideoDurationInFrames", () => {
  it("sums render package scene durations", () => {
    expect(
      getVideoDurationInFrames([
        {
          id: "scene-1",
          kind: "hook",
          component: "math/hook",
          durationInFrames: 90,
          payload: {
            title: "Title",
          },
        },
        {
          id: "scene-2",
          kind: "wrap",
          component: "math/wrap",
          durationInFrames: 75,
          payload: {
            title: "Done",
          },
        },
      ]),
    ).toBe(165);
  });
});
