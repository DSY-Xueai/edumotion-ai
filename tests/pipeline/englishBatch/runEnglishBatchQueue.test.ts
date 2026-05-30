import { describe, expect, it, vi } from "vitest";
import { runEnglishBatchQueue } from "../../../src/lib/pipeline/englishBatch/runEnglishBatchQueue";

describe("runEnglishBatchQueue", () => {
  it("continues after a failed topic and stops when target passed count is reached", async () => {
    const cleanupFailedTopic = vi.fn();
    const result = await runEnglishBatchQueue({
      topicIds: [
        "english-word-00013",
        "english-word-00014",
        "english-word-00015",
      ],
      targetPassed: 2,
      now: () => "2026-05-28T00:00:00.000Z",
      getWord: (topicId) =>
        ({
          "english-word-00013": "abortion",
          "english-word-00014": "aboard",
          "english-word-00015": "abolish",
        })[topicId] ?? topicId,
      runAttempt: async ({ topicId, attempt }) => {
        if (topicId === "english-word-00013") {
          return {
            ok: false,
            stage: "draft_quality",
            reason: attempt === 1 ? "weak mnemonic" : "still weak mnemonic",
            failedCheckIds: ["mnemonic-meaning"],
            approvedScript: [],
          };
        }

        return {
          ok: true,
          approvedScript: [
            {
              id: `${topicId}-seg-compare`,
              kind: "compare",
              text: `${topicId} fresh story`,
            },
          ],
        };
      },
      cleanupFailedTopic,
      writeManifest: async () => undefined,
    });

    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.passedTopics).toEqual([
      "english-word-00014",
      "english-word-00015",
    ]);
    expect(cleanupFailedTopic).toHaveBeenCalledWith("english-word-00013");
  });
});
