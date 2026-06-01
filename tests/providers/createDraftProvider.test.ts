import { afterEach, describe, expect, it, vi } from "vitest";
import { createDraftProvider } from "../../src/lib/providers/createDraftProvider";
import { createResearchProvider } from "../../src/lib/providers/createResearchProvider";
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
      "compare",
      "pitfall",
      "pronunciation",
      "wrap",
    ]);
    expect(draft.scriptSegments[0]?.text).toBe("一秒钟记一个单词。");
    expect(draft.scriptSegments[1]?.text).toBe("今天要记的单词是 abandon，意思是：丢弃；放弃，抛弃。");
    expect(draft.scriptSegments[2]?.text).toBe("一件东西不再要了，你直接决定丢掉，");
    expect(draft.scriptSegments[3]?.text).toBe("这个动作就是丢弃、放弃，");
    expect(draft.scriptSegments[4]?.text).toBe("abandon");
    expect(draft.scriptSegments[5]?.text).toBe("所以：abandon，就是丢弃、放弃。");
    expect(draft.scriptSegments.map((segment) => segment.text)).not.toContain("怎么记？");
    expect(draft.storyboardScenes.map((scene) => scene.type)).toEqual([
      "definition",
    ]);
    expect(draft.storyboardScenes[0]?.durationSec).toBe(20);
    expect(draft.storyboardScenes[0]?.segmentIds).toEqual(
      draft.scriptSegments.map((segment) => segment.id),
    );
    expect(draft.visualPlan.join("\n")).toContain("用单词卡和联想法表达");
  });

  it("does not recycle the same mnemonic story for a related word", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const provider = createDraftProvider();
    const baseResearch = {
      topicId: "english-word-00002",
      scope: "topic",
      canonicalTitle: "abandon",
      definitions: ["丢弃；放弃，抛弃"],
      phonetic: "/əˈbændən/",
      formulas: ["/əˈbændən/"],
      principles: ["v.", "来源：CET4 + CET6"],
      examples: [],
      misconceptions: [],
      prerequisites: [],
      nextConnections: [],
      visualizationHints: [],
      sources: [],
    } satisfies TopicResearch;

    const abandon = await provider.createDraft({
      topicId: "english-word-00002",
      research: {
        ...baseResearch,
        canonicalTitle: "abandon",
      },
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

    const abandonment = await provider.createDraft({
      topicId: "english-word-00003",
      research: {
        ...baseResearch,
        topicId: "english-word-00003",
        canonicalTitle: "abandonment",
        phonetic: "",
        formulas: [],
        definitions: ["放弃"],
        principles: ["n.", "来源：CET6"],
      },
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
      promptContext: "abandonment",
    });

    expect(abandon.scriptSegments[3]?.text).not.toBe(abandonment.scriptSegments[3]?.text);
    expect(abandon.scriptSegments[5]?.text).not.toBe(abandonment.scriptSegments[5]?.text);
  });

  it("grounds abandonment mnemonics in a real give-up action instead of a weak object scene", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const provider = createDraftProvider();
    const draft = await provider.createDraft({
      topicId: "english-word-00003",
      research: {
        topicId: "english-word-00003",
        scope: "topic",
        canonicalTitle: "abandonment",
        phonetic: "",
        definitions: ["放弃"],
        formulas: [],
        principles: ["n.", "来源：CET6"],
        examples: [],
        misconceptions: [],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: [],
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
      promptContext: "abandonment",
    });

    const mnemonicText = draft.scriptSegments
      .filter((segment) => !["hook", "definition", "pronunciation"].includes(segment.kind))
      .map((segment) => segment.text)
      .join("\n");

    expect(mnemonicText).toContain("决定");
    expect(mnemonicText).toMatch(/停掉|停止|不再推进|放弃这件事/u);
    expect(mnemonicText).not.toMatch(/纸箱|没人再碰|搁置|旧东西/u);
  });

  it("builds meaning-led english mnemonics that explain the current word", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const provider = createDraftProvider();
    const draft = await provider.createDraft({
      topicId: "english-word-00005",
      research: {
        topicId: "english-word-00005",
        scope: "topic",
        canonicalTitle: "abide",
        phonetic: "",
        definitions: ["忍受；遵守"],
        formulas: [],
        principles: ["v.", "来源：CET6"],
        examples: [],
        misconceptions: ["别把 abide 和相似拼写的词混淆。"],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: [],
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
      promptContext: "abide",
    });

    const memoryText = draft.scriptSegments.map((segment) => segment.text).join("\n");

    expect(memoryText).toContain("忍受");
    expect(memoryText).toContain("遵守");
    expect(memoryText).toContain("abide");
    expect(memoryText).toMatch(/忍住|忍着|难受|不舒服/u);
    expect(memoryText).toMatch(/规则|规矩|要求|照做/u);
    expect(memoryText).toContain("忍受、遵守");
  });

  it("builds abbreviation mnemonics from a concrete shortening action", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const provider = createDraftProvider();
    const draft = await provider.createDraft({
      topicId: "english-word-00004",
      research: {
        topicId: "english-word-00004",
        scope: "topic",
        canonicalTitle: "abbreviation",
        phonetic: "/əˌbriːviˈeɪʃən/",
        definitions: ["节略，缩写，缩短"],
        formulas: ["/əˌbriːviˈeɪʃən/"],
        principles: ["n.", "来源：CET6"],
        examples: [],
        misconceptions: [],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: [],
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
      promptContext: "abbreviation",
    });

    const mnemonicText = draft.scriptSegments
      .filter((segment) => !["hook", "definition", "pronunciation"].includes(segment.kind))
      .map((segment) => segment.text)
      .join("\n");

    expect(mnemonicText).toMatch(/长词|全称|完整名字/u);
    expect(mnemonicText).toMatch(/缩成|缩短|省掉/u);
    expect(mnemonicText).toContain("缩写");
    expect(mnemonicText).not.toContain("不靠空想");
  });

  it("builds abnormal mnemonics from a concrete abnormal scene instead of generic picture copy", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const provider = createDraftProvider();
    const draft = await provider.createDraft({
      topicId: "english-word-00008",
      research: {
        topicId: "english-word-00008",
        scope: "topic",
        canonicalTitle: "abnormal",
        phonetic: "/æˈbnɔrməl/",
        definitions: ["不正常的；变态的", "反常的， 异常的"],
        formulas: ["/æˈbnɔrməl/"],
        principles: ["adj.", "来源：CET4 + CET6"],
        examples: [],
        misconceptions: [],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: [],
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
      promptContext: "abnormal",
    });

    const mnemonicText = draft.scriptSegments
      .filter((segment) => !["hook", "definition", "pronunciation"].includes(segment.kind))
      .map((segment) => segment.text)
      .join("\n");

    expect(draft.scriptSegments[2]?.text).toBe(
      "怎么记 不正常的、变态的？正常体温大约三十六七度，体温计突然显示八十度还说健康，",
    );
    expect(draft.scriptSegments[3]?.text).toBe(
      "这种明显偏离正常范围的情况，就是不正常的、变态的，",
    );
    expect(mnemonicText).toContain("不正常的、变态的");
    expect(mnemonicText).toMatch(/正常体温|三十六七度|八十度|偏离正常范围/u);
    expect(mnemonicText).not.toMatch(/反常的|异常的/u);
    expect(mnemonicText).not.toMatch(/清晰的画面|对应着|脑子里立刻有一个场景|放进一个画面|焊在一起/u);
  });

  it("does not reuse the abnormal scenario for related abnormally videos", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const provider = createDraftProvider();
    const draft = await provider.createDraft({
      topicId: "english-word-00009",
      research: {
        topicId: "english-word-00009",
        scope: "topic",
        canonicalTitle: "abnormally",
        phonetic: "/æˈbnɔrməli/",
        definitions: ["不正常的"],
        formulas: ["/æˈbnɔrməli/"],
        principles: ["adv.", "来源：CET6"],
        examples: [],
        misconceptions: [],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: [],
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
      promptContext: "abnormally",
    });

    const mnemonicText = draft.scriptSegments
      .filter((segment) => !["hook", "definition", "pronunciation"].includes(segment.kind))
      .map((segment) => segment.text)
      .join("\n");

    expect(mnemonicText).toContain("不正常的");
    expect(mnemonicText).toMatch(/洗衣机|跳出阳台|边唱歌边转圈/u);
    expect(mnemonicText).not.toMatch(/正常体温|三十六七度|体温计|八十度/u);
  });

  it("rejects unknown english mock mnemonics instead of using a generic picture fallback", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const provider = createDraftProvider();

    await expect(
      provider.createDraft({
        topicId: "english-word-00010",
        research: {
          topicId: "english-word-00010",
          scope: "topic",
          canonicalTitle: "aboard",
          phonetic: "/əˈbɔrd/",
          definitions: ["在船、飞机、火车或公共汽车上"],
          formulas: ["/əˈbɔrd/"],
          principles: ["adv.", "来源：CET4 + CET6"],
          examples: [],
          misconceptions: [],
          prerequisites: [],
          nextConnections: [],
          visualizationHints: [],
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
        promptContext: "aboard",
      }),
    ).rejects.toThrow(/Local English draft provider cannot create a grounded mnemonic/);
  });

  it("keeps every script line unique for supported english mock fixtures", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const researchProvider = await createResearchProvider();
    const draftProvider = createDraftProvider();
    const topicIds = [
      "english-word-00002",
      "english-word-00003",
      "english-word-00004",
      "english-word-00005",
      "english-word-00007",
      "english-word-00008",
      "english-word-00009",
    ];
    const seen = new Map<string, string>();

    for (const topicId of topicIds) {
      const research = await researchProvider.researchTopic({
        topicId,
        promptContext: topicId,
      });
      const draft = await draftProvider.createDraft({
        topicId,
        research: {
          topicId,
          scope: "topic",
          ...research,
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
        promptContext: topicId,
      });

      for (const segment of draft.scriptSegments) {
        if (segment.kind !== "pronunciation") {
          expect(
            segment.text,
            `non-pronunciation segment should not be a standalone English word in ${topicId}`,
          ).not.toMatch(new RegExp(`^${research.canonicalTitle}[，,。.]?$`, "u"));
        }

        const previous = seen.get(segment.text);

        if (segment.kind !== "hook") {
          expect(previous, `duplicate script text in ${topicId}: ${segment.text}`).toBeUndefined();
        }
        seen.set(segment.text, `${topicId}:${segment.id}`);
      }
    }
  });
});
