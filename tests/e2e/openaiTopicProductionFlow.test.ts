import { afterEach, describe, expect, it, vi } from "vitest";
import { runTopicToDraft } from "../../src/lib/pipeline/runTopicToDraft";
import { approveDraft } from "../../src/lib/review/approveDraft";
import { runApprovedToRender } from "../../src/lib/pipeline/runApprovedToRender";
import { createDraftProvider } from "../../src/lib/providers/createDraftProvider";
import { createResearchProvider } from "../../src/lib/providers/createResearchProvider";
import { createTtsProvider } from "../../src/lib/providers/createTtsProvider";
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

    let chatCompletionRequestCount = 0;
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.endsWith("/chat/completions")) {
        chatCompletionRequestCount += 1;
        const content =
          chatCompletionRequestCount === 1
            ? {
                canonicalTitle: "set concept",
                definitions: ["A set is a collection of determined objects."],
                formulas: ["A={1,2,3}"],
                principles: ["Elements are determined, distinct, and unordered."],
                examples: ["{1,2,3} and {3,2,1} name the same set."],
                misconceptions: ["Repeated elements do not create a new set."],
                prerequisites: [],
                nextConnections: ["set notation"],
                visualizationHints: ["Use braces and element cards."],
                sources: [
                  {
                    title: "PEP math textbook",
                    url: "https://example.com/pep-math",
                    sourceType: "official",
                    publisher: "PEP",
                    retrievedAt: "2026-04-27",
                    quoteOrSummary: "Set definition reference.",
                  },
                ],
              }
            : {
                toneProfile: "math-clear-structured",
                durationTargetSec: 34,
                hook: "Start with the key idea.",
                summary: "A compact set concept draft.",
                scriptSegments: [
                  {
                    id: "math-b1-ch1-topic-001-seg-hook",
                    kind: "hook",
                    text: "Start with the key idea.",
                  },
                  {
                    id: "math-b1-ch1-topic-001-seg-definition",
                    kind: "definition",
                    text: "A set collects determined objects.",
                  },
                  {
                    id: "math-b1-ch1-topic-001-seg-wrap",
                    kind: "wrap",
                    text: "Check that repeated elements are ignored.",
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
                    text: "Start with the key idea.",
                  },
                ],
                visualPlan: ["blackboard", "comparison", "mistake warning"],
                qaNotes: [],
              };

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify(content),
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.endsWith("/audio/speech")) {
        return new Response(Uint8Array.from([1, 2, 3]), {
          status: 200,
          headers: {
            "content-type": "audio/wav",
          },
        });
      }

      if (url.endsWith("/audio/transcriptions")) {
        return new Response(
          JSON.stringify({
            duration: 1.2,
            segments: [
              {
                text: "mock",
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
        );
      }

      throw new Error(`Unexpected fetch request: ${url}`);
    });

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
