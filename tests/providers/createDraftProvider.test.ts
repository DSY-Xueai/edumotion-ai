import { describe, expect, it } from "vitest";
import { createDraftProvider } from "../../src/lib/providers/createDraftProvider";
import type { TopicResearch } from "../../src/lib/research/schema";

describe("createDraftProvider", () => {
  it("builds english drafts around a single vocabulary word", async () => {
    process.env.PIPELINE_PROVIDER_MODE = "mock";

    const provider = createDraftProvider();
    const draft = await provider.createDraft({
      topicId: "english-word-00001",
      research: {
        topicId: "english-word-00001",
        scope: "topic",
        canonicalTitle: "morose",
        definitions: ["郁闷的；阴郁的"],
        formulas: ["/məˈrəʊs/"],
        principles: ["adj.", "形容词"],
        examples: ["mo + rose = morose"],
        misconceptions: ["别把 morose 和 more 搞混。"],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: ["做成单词卡，先露出词，再露出音标、释义和口诀。"],
        sources: [],
      } satisfies TopicResearch,
      sceneBudgets: {
        hook: 6,
        definition: 8,
        rule: 8,
        compare: 6,
        process: 6,
        graph: 6,
        pitfall: 6,
        wrap: 6,
      },
      promptContext: "morose",
    });

    expect(draft.toneProfile).toBe("english-vocabulary-card");
    expect(draft.durationTargetSec).toBeLessThanOrEqual(45);
    expect(draft.scriptSegments.map((segment) => segment.text).join("\n")).toContain(
      "morose",
    );
    expect(draft.visualPlan.join("\n")).toContain("单词卡");
    expect(draft.storyboardScenes.map((scene) => scene.type)).toEqual([
      "hook",
      "definition",
      "compare",
      "wrap",
    ]);
  });
});
