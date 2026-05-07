import { afterEach, describe, expect, it, vi } from "vitest";
import { createDraftProvider } from "../../src/lib/providers/createDraftProvider";
import type { TopicResearch } from "../../src/lib/research/schema";

describe("createDraftProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds english drafts with a pronunciation-first script", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const provider = createDraftProvider();
    const draft = await provider.createDraft({
      topicId: "english-word-00001",
      research: {
        topicId: "english-word-00001",
        scope: "topic",
        canonicalTitle: "morose",
        definitions: ["郁闷的；闷闷不乐的"],
        formulas: ["/məˈroʊs/"],
        principles: ["adj.", "形容词"],
        examples: ["没人送我玫瑰，morose，当然郁闷了。"],
        misconceptions: ["别把 morose 和 more 搞混。"],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: ["用单词卡和联想法表达。"],
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
    expect(draft.durationTargetSec).toBe(18);
    expect(draft.scriptSegments[0]).toMatchObject({
      kind: "pronunciation",
      text: "morose",
    });
    expect(draft.scriptSegments.map((segment) => segment.kind)).toEqual([
      "pronunciation",
      "hook",
      "definition",
      "process",
      "compare",
      "wrap",
    ]);
    expect(draft.scriptSegments[1]?.text).toBe("一秒记一个单词。");
    expect(draft.scriptSegments[2]?.text).toContain("今天这个词叫 morose");
    expect(draft.scriptSegments[3]?.text).toBe("怎么记？");
    expect(draft.scriptSegments[4]?.text).toContain("morose");
    expect(draft.scriptSegments[5]?.text).toContain("morose");
    expect(draft.storyboardScenes.map((scene) => scene.type)).toEqual([
      "hook",
      "definition",
      "process",
      "compare",
      "pitfall",
      "wrap",
    ]);
    expect(draft.visualPlan.join("\n")).toContain("单词卡");
  });
});
