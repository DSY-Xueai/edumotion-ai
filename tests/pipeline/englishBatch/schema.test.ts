import { describe, expect, it } from "vitest";
import {
  englishBatchInputSchema,
  englishBatchManifestSchema,
} from "../../../src/lib/pipeline/englishBatch/schema";

describe("english batch schemas", () => {
  it("accepts explicit topic ids with a target count", () => {
    expect(
      englishBatchInputSchema.parse({
        topicIds: ["english-word-00013", "english-word-00014"],
        targetPassed: 2,
      }),
    ).toEqual({
      topicIds: ["english-word-00013", "english-word-00014"],
      targetPassed: 2,
    });
  });

  it("rejects target count larger than the explicit input count", () => {
    expect(() =>
      englishBatchInputSchema.parse({
        topicIds: ["english-word-00013"],
        targetPassed: 2,
      }),
    ).toThrow(/targetPassed cannot exceed topicIds length/u);
  });

  it("rejects unknown input keys", () => {
    expect(() =>
      englishBatchInputSchema.parse({
        topicIds: ["english-word-00013"],
        targetPassed: 1,
        extra: true,
      }),
    ).toThrow();
  });

  it("rejects duplicate topic ids", () => {
    expect(() =>
      englishBatchInputSchema.parse({
        topicIds: ["english-word-00013", "english-word-00013"],
        targetPassed: 1,
      }),
    ).toThrow(/topicIds must be unique/u);
  });

  it("stores failed attempts with stage and reason", () => {
    const manifest = englishBatchManifestSchema.parse({
      id: "english-batch-2026-05-28",
      createdAt: "2026-05-28T00:00:00.000Z",
      updatedAt: "2026-05-28T00:00:00.000Z",
      targetPassed: 1,
      inputTopicIds: ["english-word-00013"],
      passedTopicIds: [],
      failedTopics: [
        {
          topicId: "english-word-00013",
          word: "abortion",
          finalStatus: "failed",
          attempts: [
            {
              attempt: 1,
              stage: "draft_quality",
              reason: "Mnemonic copy does not explain the meaning.",
              failedCheckIds: ["mnemonic-meaning"],
              at: "2026-05-28T00:01:00.000Z",
            },
          ],
        },
      ],
      unprocessedTopicIds: [],
    });

    expect(manifest.failedTopics[0]?.attempts[0]?.stage).toBe("draft_quality");
    expect(manifest.failedTopics[0]?.attempts[0]?.reason).toBe(
      "Mnemonic copy does not explain the meaning.",
    );
  });

  it("rejects invalid manifest topic ids", () => {
    expect(() =>
      englishBatchManifestSchema.parse({
        id: "english-batch-2026-05-28",
        createdAt: "2026-05-28T00:00:00.000Z",
        updatedAt: "2026-05-28T00:00:00.000Z",
        targetPassed: 1,
        inputTopicIds: ["word-00013"],
        passedTopicIds: [],
        failedTopics: [],
        unprocessedTopicIds: [],
      }),
    ).toThrow();
  });

  it("rejects invalid manifest timestamps", () => {
    expect(() =>
      englishBatchManifestSchema.parse({
        id: "english-batch-2026-05-28",
        createdAt: "not-a-date",
        updatedAt: "2026-05-28T00:00:00.000Z",
        targetPassed: 1,
        inputTopicIds: ["english-word-00013"],
        passedTopicIds: [],
        failedTopics: [],
        unprocessedTopicIds: [],
      }),
    ).toThrow();
  });

  it("rejects failed topics with more than two attempts", () => {
    expect(() =>
      englishBatchManifestSchema.parse({
        id: "english-batch-2026-05-28",
        createdAt: "2026-05-28T00:00:00.000Z",
        updatedAt: "2026-05-28T00:00:00.000Z",
        targetPassed: 1,
        inputTopicIds: ["english-word-00013"],
        passedTopicIds: [],
        failedTopics: [
          {
            topicId: "english-word-00013",
            word: "abortion",
            finalStatus: "failed",
            attempts: [
              {
                attempt: 1,
                stage: "draft_quality",
                reason: "Mnemonic copy does not explain the meaning.",
                failedCheckIds: ["mnemonic-meaning"],
                at: "2026-05-28T00:01:00.000Z",
              },
              {
                attempt: 2,
                stage: "duplicate_copy",
                reason: "Copy repeats another topic.",
                failedCheckIds: ["duplicate-copy"],
                at: "2026-05-28T00:02:00.000Z",
              },
              {
                attempt: 1,
                stage: "audio_quality",
                reason: "Audio is clipped.",
                failedCheckIds: ["audio-clipped"],
                at: "2026-05-28T00:03:00.000Z",
              },
            ],
          },
        ],
        unprocessedTopicIds: [],
      }),
    ).toThrow();
  });
});
