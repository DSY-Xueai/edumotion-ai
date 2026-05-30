import { afterEach, describe, expect, it, vi } from "vitest";
import { runEnglishBatchQueueWithDefaults } from "../../../src/lib/pipeline/englishBatch/runEnglishBatchQueue";
import { readEnglishWordbank } from "../../../src/lib/curriculum/englishWordbank";
import { runTopicToDraft } from "../../../src/lib/pipeline/runTopicToDraft";
import { runApprovedToRender } from "../../../src/lib/pipeline/runApprovedToRender";
import { checkEnglishVideoQuality } from "../../../src/lib/quality/checkEnglishVideoQuality";
import { approveDraft } from "../../../src/lib/review/approveDraft";
import { readApprovedLesson } from "../../../src/lib/review/readApprovedLesson";

vi.mock("../../../src/lib/curriculum/englishWordbank", () => ({
  readEnglishWordbank: vi.fn(),
}));

vi.mock("../../../src/lib/pipeline/runTopicToDraft", () => ({
  runTopicToDraft: vi.fn(),
}));

vi.mock("../../../src/lib/review/approveDraft", () => ({
  approveDraft: vi.fn(),
}));

vi.mock("../../../src/lib/pipeline/runApprovedToRender", () => ({
  runApprovedToRender: vi.fn(),
}));

vi.mock("../../../src/lib/quality/checkEnglishVideoQuality", () => ({
  checkEnglishVideoQuality: vi.fn(),
}));

vi.mock("../../../src/lib/review/readApprovedLesson", () => ({
  readApprovedLesson: vi.fn(),
}));

describe("runEnglishBatchQueueWithDefaults", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("runs one topic through draft, approval, render, and quality gates", async () => {
    vi.mocked(readEnglishWordbank).mockResolvedValue({
      edition: "pep-2019",
      generatedAt: "2026-05-28T00:00:00.000Z",
      sourceFiles: [],
      entries: [
        {
          id: "english-word-00013",
          word: "abortion",
          normalizedWord: "abortion",
          phonetic: "",
          partOfSpeech: "n.",
          meaningLines: ["流产"],
          sourceLevels: ["CET6"],
          sourceLines: [
            {
              sourceLevel: "CET6",
              rawLine: "abortion n. 流产",
              phonetic: "",
              partOfSpeech: "n.",
              meaning: "流产",
            },
          ],
        },
      ],
    });
    vi.mocked(runTopicToDraft).mockResolvedValue(undefined);
    vi.mocked(approveDraft).mockResolvedValue({} as Awaited<ReturnType<typeof approveDraft>>);
    vi.mocked(runApprovedToRender).mockResolvedValue(
      {} as Awaited<ReturnType<typeof runApprovedToRender>>,
    );
    vi.mocked(checkEnglishVideoQuality).mockResolvedValue({
      topicId: "english-word-00013",
      ok: true,
      checks: [],
    });
    vi.mocked(readApprovedLesson).mockResolvedValue({
      approvedScript: [
        {
          id: "english-word-00013-seg-compare",
          kind: "compare",
          text: "医院知情同意书写明终止妊娠。",
        },
      ],
    } as Awaited<ReturnType<typeof readApprovedLesson>>);

    const report = await runEnglishBatchQueueWithDefaults({
      topicIds: ["english-word-00013"],
      targetPassed: 1,
      now: () => "2026-05-28T00:00:00.000Z",
      writeManifest: async () => undefined,
      cleanupFailedTopic: async () => undefined,
    });

    expect(runTopicToDraft).toHaveBeenCalledWith({
      topicId: "english-word-00013",
    });
    expect(approveDraft).toHaveBeenCalledWith({
      topicId: "english-word-00013",
      reviewNotes: ["auto-approved by english batch quality queue"],
    });
    expect(runApprovedToRender).toHaveBeenCalledWith({
      topicId: "english-word-00013",
      allowMockAudio: false,
    });
    expect(checkEnglishVideoQuality).toHaveBeenCalledWith({
      topicId: "english-word-00013",
      inspectMedia: true,
    });
    expect(report.passed).toBe(1);
  });

  it("passes the previous failure reason into the second draft attempt", async () => {
    vi.mocked(readEnglishWordbank).mockResolvedValue({
      edition: "pep-2019",
      generatedAt: "2026-05-28T00:00:00.000Z",
      sourceFiles: [],
      entries: [
        {
          id: "english-word-00013",
          word: "abortion",
          normalizedWord: "abortion",
          phonetic: "",
          partOfSpeech: "n.",
          meaningLines: ["流产"],
          sourceLevels: ["CET6"],
          sourceLines: [
            {
              sourceLevel: "CET6",
              rawLine: "abortion n. 流产",
              phonetic: "",
              partOfSpeech: "n.",
              meaning: "流产",
            },
          ],
        },
      ],
    });
    vi.mocked(runTopicToDraft).mockResolvedValue(undefined);
    vi.mocked(approveDraft).mockResolvedValue({} as Awaited<ReturnType<typeof approveDraft>>);
    vi.mocked(runApprovedToRender).mockResolvedValue(
      {} as Awaited<ReturnType<typeof runApprovedToRender>>,
    );
    vi.mocked(checkEnglishVideoQuality)
      .mockResolvedValueOnce({
        topicId: "english-word-00013",
        ok: false,
        checks: [
          {
            id: "mnemonic-meaning",
            ok: false,
            message: "Mnemonic copy does not explain the meaning.",
          },
        ],
      })
      .mockResolvedValueOnce({
        topicId: "english-word-00013",
        ok: true,
        checks: [],
      });
    vi.mocked(readApprovedLesson).mockResolvedValue({
      approvedScript: [
        {
          id: "english-word-00013-seg-compare",
          kind: "compare",
          text: "医院知情同意书写明终止妊娠。",
        },
      ],
    } as Awaited<ReturnType<typeof readApprovedLesson>>);

    const report = await runEnglishBatchQueueWithDefaults({
      topicIds: ["english-word-00013"],
      targetPassed: 1,
      now: () => "2026-05-28T00:00:00.000Z",
      writeManifest: async () => undefined,
      cleanupFailedTopic: async () => undefined,
    });

    expect(report.retryPassed).toBe(1);
    expect(runTopicToDraft).toHaveBeenNthCalledWith(2, {
      topicId: "english-word-00013",
      promptContext: expect.stringContaining(
        "Mnemonic copy does not explain the meaning.",
      ),
    });
  });

  it("retries media failures without regenerating the approved draft", async () => {
    vi.mocked(readEnglishWordbank).mockResolvedValue({
      edition: "pep-2019",
      generatedAt: "2026-05-28T00:00:00.000Z",
      sourceFiles: [],
      entries: [
        {
          id: "english-word-00013",
          word: "abortion",
          normalizedWord: "abortion",
          phonetic: "",
          partOfSpeech: "n.",
          meaningLines: ["流产"],
          sourceLevels: ["CET6"],
          sourceLines: [
            {
              sourceLevel: "CET6",
              rawLine: "abortion n. 流产",
              phonetic: "",
              partOfSpeech: "n.",
              meaning: "流产",
            },
          ],
        },
      ],
    });
    vi.mocked(runTopicToDraft).mockResolvedValue(undefined);
    vi.mocked(approveDraft).mockResolvedValue({} as Awaited<ReturnType<typeof approveDraft>>);
    vi.mocked(runApprovedToRender).mockResolvedValue(
      {} as Awaited<ReturnType<typeof runApprovedToRender>>,
    );
    vi.mocked(checkEnglishVideoQuality)
      .mockResolvedValueOnce({
        topicId: "english-word-00013",
        ok: false,
        checks: [
          {
            id: "audio-segment-quality",
            ok: false,
            message: "Audio segment cannot be decoded.",
          },
        ],
      })
      .mockResolvedValueOnce({
        topicId: "english-word-00013",
        ok: true,
        checks: [],
      });
    vi.mocked(readApprovedLesson).mockResolvedValue({
      approvedScript: [
        {
          id: "english-word-00013-seg-compare",
          kind: "compare",
          text: "医院知情同意书写明终止妊娠。",
        },
      ],
    } as Awaited<ReturnType<typeof readApprovedLesson>>);

    const report = await runEnglishBatchQueueWithDefaults({
      topicIds: ["english-word-00013"],
      targetPassed: 1,
      now: () => "2026-05-28T00:00:00.000Z",
      writeManifest: async () => undefined,
      cleanupFailedTopic: async () => undefined,
    });

    expect(report.retryPassed).toBe(1);
    expect(runTopicToDraft).toHaveBeenCalledTimes(1);
    expect(approveDraft).toHaveBeenCalledTimes(1);
    expect(runApprovedToRender).toHaveBeenCalledTimes(2);
  });
});
