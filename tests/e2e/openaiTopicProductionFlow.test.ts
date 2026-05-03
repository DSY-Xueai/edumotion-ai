import { afterEach, describe, expect, it, vi } from "vitest";
import { createDraftProvider } from "../../src/lib/providers/createDraftProvider";
import { createResearchProvider } from "../../src/lib/providers/createResearchProvider";
import { createTtsProvider } from "../../src/lib/providers/createTtsProvider";
import { runTopicToDraft } from "../../src/lib/pipeline/runTopicToDraft";
import { approveDraft } from "../../src/lib/review/approveDraft";
import { runApprovedToRender } from "../../src/lib/pipeline/runApprovedToRender";
import { readTopicManifest } from "../../src/lib/workspace/readTopicManifest";

describe("openai topic production flow", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("runs a topic from research to rendered artifact with mocked OpenAI providers", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "openai");
    vi.stubEnv("RESEARCH_MODEL", "gpt-5");
    vi.stubEnv("DRAFT_MODEL", "gpt-5");
    vi.stubEnv("TTS_MODEL", "tts-1-hd");
    vi.stubEnv("TTS_VOICE", "alloy");
    vi.stubEnv("TTS_RESPONSE_FORMAT", "wav");
    vi.stubEnv("ALIGNMENT_MODEL", "gpt-4o-transcribe");

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
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
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    toneProfile: "math-clear-structured",
                    durationTargetSec: 34,
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
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    for (const text of [
      "先别急着背定义。",
      "一般地，指定的某些对象的全体称为一个集合。",
      "最后回头检查易错点。",
    ]) {
      fetchMock
        .mockResolvedValueOnce(
          new Response(Uint8Array.from([1, 2, 3]), {
            status: 200,
            headers: {
              "content-type": "audio/wav",
            },
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              duration: 1.2,
              segments: [
                {
                  text,
                  start: 0,
                  end: 1.2,
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
    }

    vi.stubGlobal("fetch", fetchMock);

    const topicId = "math-b1-ch1-topic-001";
    await runTopicToDraft({
      topicId,
      researchProvider: await createResearchProvider(),
      draftProvider: createDraftProvider(),
    });
    await approveDraft({
      topicId,
      reviewNotes: ["pass"],
    });
    await runApprovedToRender({
      topicId,
      ttsProvider: createTtsProvider(),
    });

    const manifest = await readTopicManifest(topicId);

    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(manifest.status).toBe("rendered");
  });
});
