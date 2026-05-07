import { afterEach, describe, expect, it, vi } from "vitest";
import { createDraftProvider } from "../../src/lib/providers/createDraftProvider";
import type { TopicResearch } from "../../src/lib/research/schema";

describe("createDraftProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds english drafts with a fresh mnemonic and a separate pronunciation beat", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const provider = createDraftProvider();
    const draft = await provider.createDraft({
      topicId: "english-word-00002",
      research: {
        topicId: "english-word-00002",
        scope: "topic",
        canonicalTitle: "abandon",
        phonetic: "/əˈbændən/",
        definitions: ["丢弃；放弃，抛弃"],
        formulas: ["/əˈbændən/"],
        principles: ["v.", "动词"],
        examples: ["你背着一堆东西赶路，太重了，干脆先把最沉的那袋放下。"],
        misconceptions: ["别把 abandon 和 ability 搞混。"],
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
      promptContext: "abandon",
    });

    expect(draft.toneProfile).toBe("english-vocabulary-card");
    expect(draft.durationTargetSec).toBe(20);
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
    expect(draft.scriptSegments[0]?.text).toBe("一秒钟记一个单词。");
    expect(draft.scriptSegments[1]?.text).toBe("今天要记的单词是 abandon，意思是：丢弃；放弃，抛弃。");
    expect(draft.scriptSegments[2]?.text).toBe("怎么记？");
    expect(draft.scriptSegments[3]?.text).toBe("你背着一堆东西赶路，");
    expect(draft.scriptSegments[4]?.text).toBe("太重了，干脆先把最沉的那袋放下，");
    expect(draft.scriptSegments[5]?.text).toBe("abandon，");
    expect(draft.scriptSegments[6]?.text).toBe("abandon");
    expect(draft.scriptSegments[7]?.text).toBe("所以：先放弃、先丢下。");
    expect(draft.scriptSegments[8]?.text).toBe("abandon，丢弃；放弃，抛弃。");
    expect(draft.storyboardScenes.map((scene) => scene.type)).toEqual([
      "definition",
    ]);
    expect(draft.storyboardScenes[0]?.segmentIds).toEqual(
      draft.scriptSegments.map((segment) => segment.id),
    );
    expect(draft.visualPlan.join("\n")).toContain("用单词卡和联想法表达");
  });
});
