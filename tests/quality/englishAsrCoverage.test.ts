import { describe, expect, it } from "vitest";
import { checkAsrTranscriptCoverage } from "../../src/lib/quality/checkEnglishAsrCoverage";

const cues = [
  {
    id: "cue-1",
    segmentId: "seg-1",
    text: "今天要记的单词是 absence",
    startMs: 0,
    endMs: 2000,
  },
  {
    id: "cue-2",
    segmentId: "seg-2",
    text: "意思是缺席，不存在，缺乏",
    startMs: 2000,
    endMs: 5000,
  },
  {
    id: "cue-3",
    segmentId: "seg-3",
    text: "记住 absence：该出现的没出现",
    startMs: 5000,
    endMs: 8000,
  },
];

describe("checkAsrTranscriptCoverage", () => {
  it("passes when the ASR transcript has the target English word and enough speech coverage", () => {
    const result = checkAsrTranscriptCoverage({
      canonicalTitle: "absence",
      cues,
      transcript: {
        text: "今天要记的单词是 absence 意思是缺席不存在缺乏 记住 absence",
        segments: [
          { startMs: 0, endMs: 2100, text: "今天要记的单词是 absence" },
          { startMs: 2100, endMs: 5000, text: "意思是缺席不存在缺乏" },
          { startMs: 5000, endMs: 7900, text: "记住 absence" },
        ],
      },
    });

    expect(result.ok).toBe(true);
    expect(result.details.coverageRatio).toBeGreaterThanOrEqual(0.55);
  });

  it("fails when ASR returns no useful text", () => {
    const result = checkAsrTranscriptCoverage({
      canonicalTitle: "absence",
      cues,
      transcript: {
        text: "   ",
        segments: [],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.details.reason).toBe("empty-transcript");
  });

  it("fails when the target English word is not recognized", () => {
    const result = checkAsrTranscriptCoverage({
      canonicalTitle: "absence",
      cues,
      transcript: {
        text: "今天要记的单词 意思是缺席不存在缺乏",
        segments: [{ startMs: 0, endMs: 8000, text: "今天要记的单词 意思是缺席不存在缺乏" }],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.details.reason).toBe("missing-target-word");
  });

  it("fails when ASR sees only a small part of the subtitle timeline", () => {
    const result = checkAsrTranscriptCoverage({
      canonicalTitle: "absence",
      cues,
      transcript: {
        text: "absence 缺席",
        segments: [{ startMs: 0, endMs: 800, text: "absence 缺席" }],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.details.reason).toBe("low-timeline-coverage");
  });

  it("fails when ASR covers less than most of the subtitle timeline", () => {
    const result = checkAsrTranscriptCoverage({
      canonicalTitle: "absence",
      cues,
      transcript: {
        text: "今天要记的单词是 absence 意思是缺席",
        segments: [
          { startMs: 0, endMs: 2000, text: "今天要记的单词是 absence" },
          { startMs: 2000, endMs: 5000, text: "意思是缺席" },
        ],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.details.reason).toBe("low-timeline-coverage");
  });
});
