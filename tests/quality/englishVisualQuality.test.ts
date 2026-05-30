import { execFile } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { checkEnglishVisualQuality } from "../../src/lib/quality/checkEnglishVisualQuality";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

const mockedExecFile = vi.mocked(execFile);

describe("checkEnglishVisualQuality", () => {
  it("passes when ffmpeg blackframe output has no black frames and render package carries word cues", async () => {
    mockedExecFile.mockImplementation(((...args: unknown[]) => {
      const callback = args.at(-1);
      if (typeof callback === "function") {
        callback(null, "", "");
      }
      return {} as ReturnType<typeof execFile>;
    }) as typeof execFile);

    const result = await checkEnglishVisualQuality({
      videoPath: "video.mp4",
      renderPackage: {
        canonicalTitle: "aboard",
        scenes: [
          {
            id: "scene-definition",
            kind: "definition",
            component: "english/definition",
            durationInFrames: 600,
            payload: {
              word: "aboard",
              subtitleCues: [
                { text: "今天要记的单词是 aboard，意思是：上船。" },
              ],
            },
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
  });

  it("fails closed when ffmpeg inspection errors", async () => {
    mockedExecFile.mockImplementation(((...args: unknown[]) => {
      const callback = args.at(-1);
      if (typeof callback === "function") {
        callback(new Error("ffmpeg failed"), "", "");
      }
      return {} as ReturnType<typeof execFile>;
    }) as typeof execFile);

    const result = await checkEnglishVisualQuality({
      videoPath: "video.mp4",
      renderPackage: {
        canonicalTitle: "aboard",
        scenes: [],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.checks[0]?.id).toBe("visual-media-readable");
  });
});
