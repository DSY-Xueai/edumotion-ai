import { describe, expect, it } from "vitest";
import { buildSubtitleTrack } from "../../src/lib/audio/buildSubtitleTrack";

describe("buildSubtitleTrack", () => {
  it("normalizes timed chunks into stable global subtitle cues", () => {
    const track = buildSubtitleTrack([
      {
        segmentId: "seg-1",
        durationMs: 1000,
        chunks: [
          { text: "  定义  ", startMs: 0, endMs: 400 },
          { text: "   ", startMs: 400, endMs: 450 },
          { text: "集合", startMs: 450, endMs: 1000 },
        ],
      },
      {
        segmentId: "seg-2",
        durationMs: 900,
        chunks: [{ text: "元素", startMs: 0, endMs: 950 }],
      },
    ]);

    expect(track.cues).toEqual([
      {
        id: "seg-1:1",
        segmentId: "seg-1",
        text: "定义",
        startMs: 0,
        endMs: 400,
      },
      {
        id: "seg-1:2",
        segmentId: "seg-1",
        text: "集合",
        startMs: 450,
        endMs: 1000,
      },
      {
        id: "seg-2:1",
        segmentId: "seg-2",
        text: "元素",
        startMs: 1000,
        endMs: 1900,
      },
    ]);
  });

  it("does not split a timed TTS chunk by punctuation without real audio boundaries", () => {
    const track = buildSubtitleTrack([
      {
        segmentId: "seg-wrap",
        durationMs: 3600,
        chunks: [
          {
            text: "所以：able，就是有能力的、出色的。",
            startMs: 0,
            endMs: 3600,
          },
        ],
      },
    ]);

    expect(track.cues).toEqual([
      {
        id: "seg-wrap:1",
        segmentId: "seg-wrap",
        text: "所以：able，就是有能力的、出色的。",
        startMs: 0,
        endMs: 3600,
      },
    ]);
  });
});
