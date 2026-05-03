import { describe, expect, it } from "vitest";
import { saveDraft } from "../../src/lib/draft/saveDraft";
import { runApprovedToRender } from "../../src/lib/pipeline/runApprovedToRender";
import { resumeTopic } from "../../src/lib/pipeline/resumeTopic";
import { saveResearch } from "../../src/lib/research/saveResearch";
import { approveDraft } from "../../src/lib/review/approveDraft";
import { readTopicManifest } from "../../src/lib/workspace/readTopicManifest";
import { writeTopicManifest } from "../../src/lib/workspace/writeTopicManifest";

describe("resumeTopic", () => {
  it("continues from approved status into rendered", async () => {
    process.env.OPENAI_API_KEY = "dummy-key";
    process.env.PIPELINE_PROVIDER_MODE = "mock";
    const topicId = "resume-topic-001";

    await saveResearch({
      topicId,
      scope: "topic",
      canonicalTitle: "集合",
      definitions: ["定义"],
      formulas: [],
      principles: [],
      examples: [],
      misconceptions: [],
      prerequisites: [],
      nextConnections: [],
      visualizationHints: [],
      sources: [
        {
          title: "Source",
          url: "https://example.com",
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
      hook: "hook",
      summary: "summary",
      scriptSegments: [{ id: "seg-1", kind: "hook", text: "hook" }],
      storyboardScenes: [
        { id: "scene-1", type: "hook", segmentIds: ["seg-1"], durationSec: 8 },
      ],
      subtitleDraft: [{ id: "sub-1", segmentId: "seg-1", text: "hook" }],
      visualPlan: [],
      qaNotes: [],
    });
    await approveDraft({ topicId, reviewNotes: ["通过"] });
    await writeTopicManifest({
      topicId,
      status: "approved",
      updatedAt: "2026-04-26T00:00:00.000Z",
    });

    await resumeTopic({ topicId, allowMockAudio: true });
    const manifest = await readTopicManifest(topicId);

    expect(manifest.status).toBe("rendered");
  });
});
