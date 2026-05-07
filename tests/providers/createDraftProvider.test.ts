import { afterEach, describe, expect, it, vi } from "vitest";
import { createDraftProvider } from "../../src/lib/providers/createDraftProvider";
import type { TopicResearch } from "../../src/lib/research/schema";

describe("createDraftProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds english drafts with the reference cadence and a separate pronunciation beat", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const provider = createDraftProvider();
    const draft = await provider.createDraft({
      topicId: "english-word-00001",
      research: {
        topicId: "english-word-00001",
        scope: "topic",
        canonicalTitle: "morose",
        definitions: ["郁闷的、闷闷不乐的"],
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
    expect(draft.scriptSegments.map((segment) => segment.kind)).toEqual([
      "hook",
      "definition",
      "process",
      "compare",
      "pitfall",
      "compare",
      "pronunciation",
      "wrap",
      "wrap",
    ]);
    expect(draft.scriptSegments[0]?.text).toBe("一秒记一个单词。");
    expect(draft.scriptSegments[1]?.text).toBe("今天这个词叫 morose，意思是：郁闷的、闷闷不乐的。");
    expect(draft.scriptSegments[2]?.text).toBe("怎么记？");
    expect(draft.scriptSegments[3]?.text).toBe("你暗恋的人过生日，别人都送花，");
    expect(draft.scriptSegments[4]?.text).toBe("只有你——没人送你玫瑰。");
    expect(draft.scriptSegments[5]?.text).toBe("没人送我玫瑰，");
    expect(draft.scriptSegments[6]?.text).toBe("morose，");
    expect(draft.scriptSegments[7]?.text).toBe("当然郁闷了。");
    expect(draft.scriptSegments[8]?.text).toBe("morose，郁闷的、闷闷不乐的。");
    expect(draft.storyboardScenes.map((scene) => scene.type)).toEqual([
      "hook",
      "definition",
      "compare",
      "process",
      "pitfall",
      "wrap",
    ]);
    expect(draft.storyboardScenes[0]?.segmentIds).toEqual(["english-word-00001-seg-hook"]);
    expect(draft.storyboardScenes[1]?.segmentIds).toEqual([
      "english-word-00001-seg-definition",
      "english-word-00001-seg-process",
    ]);
    expect(draft.storyboardScenes[2]?.segmentIds).toEqual([
      "english-word-00001-seg-compare-lead",
      "english-word-00001-seg-pitfall",
    ]);
    expect(draft.storyboardScenes[3]?.segmentIds).toEqual([
      "english-word-00001-seg-memory",
      "english-word-00001-seg-pronunciation",
    ]);
    expect(draft.storyboardScenes[4]?.segmentIds).toEqual(["english-word-00001-seg-wrap"]);
    expect(draft.storyboardScenes[5]?.segmentIds).toEqual(["english-word-00001-seg-recap"]);
    expect(draft.visualPlan.join("\n")).toContain("单词卡");
  });
});
