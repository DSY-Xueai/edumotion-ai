import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSceneBudgets } from "../../src/lib/draft/defaultSceneBudgets";
import { createDraftProvider } from "../../src/lib/providers/createDraftProvider";
import { createResearchProvider } from "../../src/lib/providers/createResearchProvider";

describe("openai structured providers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses chat completions structured output for research generation", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "openai");
    vi.stubEnv("RESEARCH_MODEL", "gpt-5");

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  canonicalTitle: "集合的概念",
                  definitions: ["一般地，指定的某些对象的全体称为一个集合。"],
                  formulas: ["A={1,2,3}"],
                  principles: ["集合中的元素是确定的、互异的、无序的。"],
                  examples: ["{1,2,3} 与 {3,2,1} 表示同一个集合。"],
                  misconceptions: ["把重复元素当成会生成新集合。"],
                  prerequisites: [],
                  nextConnections: ["下一步衔接：集合的表示"],
                  visualizationHints: ["用大括号、元素卡片和对照栏表现集合。"],
                  sources: [
                    {
                      title: "人民教育出版社教材",
                      url: "https://example.com/pep-math",
                      sourceType: "official",
                      publisher: "PEP",
                      retrievedAt: "2026-04-27",
                      quoteOrSummary: "集合强调对象全体与元素特性。",
                    },
                  ],
                }),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const provider = await createResearchProvider();
    const result = await provider.researchTopic({
      topicId: "math-b1-ch1-topic-001",
      promptContext: "math-b1-ch1-topic-001",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.openai.com/v1/chat/completions",
    );
    expect(result.canonicalTitle).toBe("集合的概念");
    expect(result.sources[0]?.publisher).toBe("PEP");
  });

  it("uses chat completions structured output for draft generation", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "openai");
    vi.stubEnv("DRAFT_MODEL", "gpt-5");

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  toneProfile: "math-clear-structured",
                  durationTargetSec: 62,
                  hook: "先别急着背定义。",
                  summary: "集合概念的判断框架",
                  scriptSegments: [
                    {
                      id: "math-b1-ch1-topic-001-seg-hook",
                      kind: "hook",
                      text: "先别急着背定义。",
                    },
                    {
                      id: "math-b1-ch1-topic-001-seg-definition",
                      kind: "definition",
                      text: "一般地，指定的某些对象的全体称为一个集合。",
                    },
                    {
                      id: "math-b1-ch1-topic-001-seg-wrap",
                      kind: "wrap",
                      text: "最后回头检查易错点。",
                    },
                  ],
                  storyboardScenes: [
                    {
                      id: "math-b1-ch1-topic-001-scene-hook",
                      type: "hook",
                      segmentIds: ["math-b1-ch1-topic-001-seg-hook"],
                      durationSec: 12,
                    },
                    {
                      id: "math-b1-ch1-topic-001-scene-definition",
                      type: "definition",
                      segmentIds: ["math-b1-ch1-topic-001-seg-definition"],
                      durationSec: 14,
                    },
                    {
                      id: "math-b1-ch1-topic-001-scene-wrap",
                      type: "wrap",
                      segmentIds: ["math-b1-ch1-topic-001-seg-wrap"],
                      durationSec: 8,
                    },
                  ],
                  subtitleDraft: [
                    {
                      id: "sub-hook",
                      segmentId: "math-b1-ch1-topic-001-seg-hook",
                      text: "先别急着背定义。",
                    },
                  ],
                  visualPlan: ["板书表达", "条件对比", "易错提醒"],
                  qaNotes: [],
                }),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const provider = createDraftProvider();
    const result = await provider.createDraft({
      topicId: "math-b1-ch1-topic-001",
      research: {
        topicId: "math-b1-ch1-topic-001",
        scope: "topic",
        canonicalTitle: "集合的概念",
        definitions: ["一般地，指定的某些对象的全体称为一个集合。"],
        formulas: ["A={1,2,3}"],
        principles: ["集合中的元素是确定的、互异的、无序的。"],
        examples: ["{1,2,3} 与 {3,2,1} 表示同一个集合。"],
        misconceptions: ["把重复元素当成会生成新集合。"],
        prerequisites: [],
        nextConnections: ["下一步衔接：集合的表示"],
        visualizationHints: ["用大括号、元素卡片和对照栏表现集合。"],
        sources: [],
      },
      sceneBudgets: defaultSceneBudgets,
      promptContext: "集合的概念",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.openai.com/v1/chat/completions",
    );
    expect(result.toneProfile).toBe("math-clear-structured");
    expect(result.storyboardScenes[0]?.type).toBe("hook");
  });

  it("retries weak english mnemonic drafts with quality feedback", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "openai");
    vi.stubEnv("DRAFT_MODEL", "gpt-5");

    const weakDraft = {
      toneProfile: "english-vocabulary-card",
      durationTargetSec: 20,
      hook: "一秒钟记一个单词。",
      summary: "aboard 的单词记忆卡",
      scriptSegments: [
        {
          id: "english-word-00010-seg-hook",
          kind: "hook",
          text: "一秒钟记一个单词。",
        },
        {
          id: "english-word-00010-seg-definition",
          kind: "definition",
          text: "今天要记的单词是 aboard，意思是：在船、飞机、火车或公共汽车上。",
        },
        {
          id: "english-word-00010-seg-compare-lead",
          kind: "compare",
          text: "怎么记 在船、飞机？一个清晰的画面闪过眼前，",
        },
        {
          id: "english-word-00010-seg-pitfall",
          kind: "pitfall",
          text: "它就对应着在船、飞机，",
        },
        {
          id: "english-word-00010-seg-pronunciation",
          kind: "pronunciation",
          text: "aboard",
        },
        {
          id: "english-word-00010-seg-wrap",
          kind: "wrap",
          text: "所以：aboard，就是在船、飞机。",
        },
      ],
      storyboardScenes: [
        {
          id: "english-word-00010-scene-definition",
          type: "definition",
          segmentIds: [
            "english-word-00010-seg-hook",
            "english-word-00010-seg-definition",
            "english-word-00010-seg-compare-lead",
            "english-word-00010-seg-pitfall",
            "english-word-00010-seg-pronunciation",
            "english-word-00010-seg-wrap",
          ],
          durationSec: 20,
        },
      ],
      subtitleDraft: [],
      visualPlan: ["单词卡"],
      qaNotes: [],
    };
    const groundedDraft = {
      ...weakDraft,
      scriptSegments: [
        weakDraft.scriptSegments[0],
        weakDraft.scriptSegments[1],
        {
          id: "english-word-00010-seg-compare-lead",
          kind: "compare",
          text: "怎么记 在船、飞机？登机口通知大家上飞机，你已经走进客舱、坐在座位上，",
        },
        {
          id: "english-word-00010-seg-pitfall",
          kind: "pitfall",
          text: "人已经在飞机里面，这个位置状态就是在船、飞机，",
        },
        weakDraft.scriptSegments[4],
        weakDraft.scriptSegments[5],
      ],
    };

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(weakDraft) } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(groundedDraft) } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const provider = createDraftProvider();
    const result = await provider.createDraft({
      topicId: "english-word-00010",
      research: {
        topicId: "english-word-00010",
        scope: "topic",
        canonicalTitle: "aboard",
        definitions: ["在船、飞机、火车或公共汽车上"],
        formulas: ["/əˈbɔrd/"],
        principles: ["adv.", "来源：CET4 + CET6"],
        examples: [],
        misconceptions: [],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: [],
        sources: [],
      },
      sceneBudgets: defaultSceneBudgets,
      promptContext: "aboard",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondRequest = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
    expect(secondRequest.messages[1].content).toContain("Previous draft failed quality checks");
    expect(result.scriptSegments[2]?.text).toContain("客舱");
    expect(result.scriptSegments[3]?.text).toContain("位置状态");
  });

  it("supports a custom OpenAI-compatible base URL", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "openai");
    vi.stubEnv("OPENAI_BASE_URL", "https://example-proxy.test/v1");
    vi.stubEnv("RESEARCH_MODEL", "gpt-5");

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  canonicalTitle: "集合的概念",
                  definitions: [],
                  formulas: [],
                  principles: [],
                  examples: [],
                  misconceptions: [],
                  prerequisites: [],
                  nextConnections: [],
                  visualizationHints: [],
                  sources: [],
                }),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const provider = await createResearchProvider();
    await provider.researchTopic({
      topicId: "math-b1-ch1-topic-001",
      promptContext: "math-b1-ch1-topic-001",
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://example-proxy.test/v1/chat/completions",
    );
  });
});
