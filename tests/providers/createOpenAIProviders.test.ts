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
