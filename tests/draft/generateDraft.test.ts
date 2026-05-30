import { access } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateDraft } from "../../src/lib/draft/generateDraft";
import { checkEnglishDraftQuality } from "../../src/lib/draft/checkEnglishDraftQuality";
import { readDraft } from "../../src/lib/draft/readDraft";
import { createDraftProvider } from "../../src/lib/providers/createDraftProvider";
import type { TopicResearch } from "../../src/lib/research/schema";
import { getTopicWorkspace } from "../../src/lib/workspace/getTopicWorkspace";

describe("generateDraft", () => {
  it("creates a lesson draft with script segments and storyboard scenes", async () => {
    let receivedPromptContext = "";
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
        createDraft: async ({ promptContext }) => {
          receivedPromptContext = promptContext;

          return {
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
        };
        },
      },
      promptContext: "custom draft context",
    });

    const storedDraft = await readDraft("math-b1-ch1-topic-001");

    expect(draft.storyboardScenes[0]?.type).toBe("hook");
    expect(receivedPromptContext).toBe("custom draft context");
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

  it("builds mock drafts from current research instead of subject-specific old topic templates", async () => {
    process.env.PIPELINE_PROVIDER_MODE = "mock";
    const provider = createDraftProvider();
    const baseResearch = {
      scope: "topic" as const,
      definitions: ["当前定义"],
      formulas: [],
      principles: ["当前规律"],
      examples: ["当前例子"],
      misconceptions: ["当前误区"],
      prerequisites: [],
      nextConnections: [],
      visualizationHints: ["当前画面提示"],
      sources: [],
    };
    const sceneBudgets = {
      hook: 8,
      definition: 8,
      rule: 8,
      compare: 8,
      process: 8,
      graph: 8,
      pitfall: 8,
      wrap: 8,
    };
    const drafts = await Promise.all([
      provider.createDraft({
        topicId: "math-test-topic",
        research: {
          ...baseResearch,
          topicId: "math-test-topic",
          canonicalTitle: "函数单调性",
        } satisfies TopicResearch,
        sceneBudgets,
        promptContext: "函数单调性",
      }),
      provider.createDraft({
        topicId: "physics-test-topic",
        research: {
          ...baseResearch,
          topicId: "physics-test-topic",
          canonicalTitle: "牛顿第二定律",
          formulas: ["F=ma"],
        } satisfies TopicResearch,
        sceneBudgets,
        promptContext: "牛顿第二定律",
      }),
      provider.createDraft({
        topicId: "chemistry-test-topic",
        research: {
          ...baseResearch,
          topicId: "chemistry-test-topic",
          canonicalTitle: "溶液浓度",
        } satisfies TopicResearch,
        sceneBudgets,
        promptContext: "溶液浓度",
      }),
    ]);
    const allText = drafts
      .flatMap((draft) => draft.scriptSegments.map((segment) => segment.text))
      .join("\n");

    expect(allText).toContain("函数单调性");
    expect(allText).toContain("牛顿第二定律");
    expect(allText).toContain("溶液浓度");
    expect(allText).not.toContain("集合");
    expect(allText).not.toContain("参考系");
    expect(allText).not.toContain("位置随时间");
    expect(allText).not.toContain("物质分类");
  });
});

describe("checkEnglishDraftQuality", () => {
  it("rejects replacement-marker copy before TTS can amplify corrupted text", () => {
    const quality = checkEnglishDraftQuality({
      draft: {
        toneProfile: "english-vocabulary-card",
        durationTargetSec: 20,
        hook: "?????????",
        summary: "about",
        scriptSegments: [
          { id: "seg-hook", kind: "hook", text: "?????????" },
          { id: "seg-definition", kind: "definition", text: "???????? about???????????" },
          { id: "seg-compare", kind: "compare", text: "???????????????????????????" },
        ],
        storyboardScenes: [
          { id: "scene-definition", type: "definition", segmentIds: ["seg-hook", "seg-definition", "seg-compare"], durationSec: 20 },
        ],
        subtitleDraft: [],
        visualPlan: [],
        qaNotes: [],
      },
      research: {
        topicId: "english-word-00014",
        scope: "topic",
        canonicalTitle: "about",
        phonetic: "/əˈbaʊt/",
        definitions: ["关于；大约"],
        formulas: [],
        principles: [],
        examples: [],
        misconceptions: [],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: [],
        sources: [],
      },
    });

    expect(quality.ok).toBe(false);
    expect(quality.issues).toContain("Draft copy contains replacement-marker text, which usually means the Chinese script was corrupted before TTS.");
  });

  it("rejects literal Unicode escape copy before TTS", () => {
    const quality = checkEnglishDraftQuality({
      draft: {
        toneProfile: "english-vocabulary-card",
        durationTargetSec: 20,
        hook: "one word",
        summary: "above",
        scriptSegments: [
          { id: "seg-definition", kind: "definition", text: "above means 在上方" },
          { id: "seg-compare", kind: "compare", text: "位置在上方，就是 above。" },
          { id: "seg-wrap", kind: "wrap", text: "记住 above：位\\u7f6在上方。" },
        ],
        storyboardScenes: [
          { id: "scene-definition", type: "definition", segmentIds: ["seg-definition", "seg-compare", "seg-wrap"], durationSec: 20 },
        ],
        subtitleDraft: [],
        visualPlan: [],
        qaNotes: [],
      },
      research: {
        topicId: "english-word-00015",
        scope: "topic",
        canonicalTitle: "above",
        phonetic: "/əˈbʌv/",
        definitions: ["在上方"],
        formulas: [],
        principles: [],
        examples: [],
        misconceptions: [],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: [],
        sources: [],
      },
    });

    expect(quality.ok).toBe(false);
    expect(quality.issues).toContain("Draft copy contains literal escape text, which usually means Unicode was not decoded before TTS.");
  });
});
