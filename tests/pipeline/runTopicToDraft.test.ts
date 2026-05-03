import { describe, expect, it } from "vitest";
import { readDraft } from "../../src/lib/draft/readDraft";
import { readResearch } from "../../src/lib/research/readResearch";
import { readTopicManifest } from "../../src/lib/workspace/readTopicManifest";
import { runTopicToDraft } from "../../src/lib/pipeline/runTopicToDraft";

describe("runTopicToDraft", () => {
  it("moves a topic from not_started to pending_review", async () => {
    const topicId = "math-b1-ch1-topic-001";

    await runTopicToDraft({
      topicId,
      researchProvider: {
        researchTopic: async () => ({
          canonicalTitle: "集合的含义",
          definitions: ["定义"],
          formulas: [],
          principles: ["原则"],
          examples: ["例子"],
          misconceptions: ["误区"],
          prerequisites: [],
          nextConnections: [],
          visualizationHints: ["关键词高亮"],
          sources: [
            {
              title: "Source",
              url: "https://example.com/research",
              sourceType: "official",
              publisher: "PEP",
              retrievedAt: "2026-04-26",
              quoteOrSummary: "summary",
            },
          ],
        }),
      },
      draftProvider: {
        createDraft: async () => ({
          toneProfile: "humorous-clear",
          durationTargetSec: 75,
          hook: "先别急着背定义",
          summary: "集合入门",
          scriptSegments: [{ id: "seg-1", kind: "hook", text: "先别急着背定义" }],
          storyboardScenes: [
            { id: "scene-1", type: "hook", segmentIds: ["seg-1"], durationSec: 8 },
          ],
          subtitleDraft: [{ id: "sub-1", segmentId: "seg-1", text: "先别急着背定义" }],
          visualPlan: ["关键词高亮"],
          qaNotes: [],
        }),
      },
      updatedAt: "2026-04-26T10:00:00.000Z",
    });

    const manifest = await readTopicManifest(topicId);
    const research = await readResearch(topicId);
    const draft = await readDraft(topicId);

    expect(manifest.status).toBe("pending_review");
    expect(research.canonicalTitle).toBe("集合的含义");
    expect(draft.storyboardScenes[0]?.type).toBe("hook");
  });
});
