import { describe, expect, it } from "vitest";
import { saveDraft } from "../../src/lib/draft/saveDraft";
import { runApprovedToRender } from "../../src/lib/pipeline/runApprovedToRender";
import { saveResearch } from "../../src/lib/research/saveResearch";
import { approveDraft } from "../../src/lib/review/approveDraft";
import { readTopicManifest } from "../../src/lib/workspace/readTopicManifest";

const seedApprovedTopic = async (topicId: string) => {
  await saveResearch({
    topicId,
    scope: "topic",
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
        title: "Textbook",
        url: "https://example.com/textbook",
        sourceType: "official",
        publisher: "PEP",
        retrievedAt: "2026-04-26",
        quoteOrSummary: "summary",
      },
    ],
  });
  await saveDraft({
    topicId,
    toneProfile: "clear",
    durationTargetSec: 75,
    hook: "先别急着背定义",
    summary: "集合入门",
    scriptSegments: [
      { id: "seg-1", kind: "hook", text: "先别急着背定义" },
      { id: "seg-2", kind: "wrap", text: "记住定义边界就够了" },
    ],
    storyboardScenes: [
      { id: "scene-1", type: "hook", segmentIds: ["seg-1"], durationSec: 8 },
      { id: "scene-2", type: "wrap", segmentIds: ["seg-2"], durationSec: 8 },
    ],
    subtitleDraft: [
      { id: "sub-1", segmentId: "seg-1", text: "先别急着背定义" },
      { id: "sub-2", segmentId: "seg-2", text: "记住定义边界就够了" },
    ],
    visualPlan: ["关键词高亮"],
    qaNotes: [],
  });
  await approveDraft({ topicId, reviewNotes: ["通过"] });
};

describe("runApprovedToRender", () => {
  it("rejects final render when runtime would fall back to mock tone audio", async () => {
    process.env.PIPELINE_PROVIDER_MODE = "mock";
    process.env.TTS_PROVIDER = "openai";

    const topicId = "render-topic-mock-blocked";
    await seedApprovedTopic(topicId);

    await expect(runApprovedToRender({ topicId })).rejects.toThrow(
      /Mock TTS is active/,
    );
  });

  it("moves an approved topic to rendered artifacts", async () => {
    const topicId = "render-topic-001";
    await seedApprovedTopic(topicId);

    const renderPackage = await runApprovedToRender({
      topicId,
      ttsProvider: {
        synthesizeSegment: async ({ segment }) => ({
          audioFile: {
            extension: "txt",
            data: new Uint8Array([1, 2, 3]),
          },
          durationMs: 1200,
          chunks: [{ text: segment.text, startMs: 0, endMs: 1200 }],
        }),
      },
      renderedAt: "2026-04-26T12:00:00.000Z",
    });

    const manifest = await readTopicManifest(topicId);

    expect(renderPackage.topicId).toBe(topicId);
    expect(renderPackage.scenes).toHaveLength(2);
    expect(manifest.status).toBe("rendered");
  });
});
