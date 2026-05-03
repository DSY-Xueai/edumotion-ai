import { access } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateDraft } from "../../src/lib/draft/generateDraft";
import { readDraft } from "../../src/lib/draft/readDraft";
import { getTopicWorkspace } from "../../src/lib/workspace/getTopicWorkspace";

describe("generateDraft", () => {
  it("creates a lesson draft with script segments and storyboard scenes", async () => {
    const draft = await generateDraft({
      topicId: "math-b1-ch1-topic-001",
      research: {
        topicId: "math-b1-ch1-topic-001",
        canonicalTitle: "集合的含义",
        scope: "topic",
        definitions: ["定义"],
        formulas: [],
        principles: ["原则"],
        examples: ["例子"],
        misconceptions: ["误区"],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: ["关键词拆解"],
        sources: [],
      },
      provider: {
        createDraft: async () => ({
          toneProfile: "humorous-clear",
          durationTargetSec: 75,
          hook: "先别急着背定义",
          summary: "集合入门",
          scriptSegments: [
            { id: "seg-1", kind: "hook", text: "先别急着背定义" },
          ],
          storyboardScenes: [
            {
              id: "scene-1",
              type: "hook",
              segmentIds: ["seg-1"],
              durationSec: 8,
            },
          ],
          subtitleDraft: [
            { id: "sub-1", segmentId: "seg-1", text: "先别急着背定义" },
          ],
          visualPlan: ["关键词高亮"],
          qaNotes: [],
        }),
      },
    });

    const storedDraft = await readDraft("math-b1-ch1-topic-001");

    expect(draft.storyboardScenes[0]?.type).toBe("hook");
    expect(storedDraft.topicId).toBe("math-b1-ch1-topic-001");
    await expect(
      access(
        path.join(
          getTopicWorkspace("math-b1-ch1-topic-001"),
          "draft",
          "lesson.json",
        ),
      ),
    ).resolves.toBeUndefined();
  });
});
