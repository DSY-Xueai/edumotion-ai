import { afterEach, describe, expect, it, vi } from "vitest";
import { createTtsProvider } from "../../src/lib/providers/createTtsProvider";

describe("createTtsProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses OpenAI speech generation and transcription alignment in openai mode", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "openai");
    vi.stubEnv("TTS_PROVIDER", "openai");
    vi.stubEnv("TTS_MODEL", "tts-1-hd");
    vi.stubEnv("TTS_VOICE", "cedar");
    vi.stubEnv("TTS_RESPONSE_FORMAT", "wav");
    vi.stubEnv("ALIGNMENT_MODEL", "gpt-4o-transcribe");

    const fetchMock = vi
      .fn<typeof fetch>()
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
            duration: 1.5,
            segments: [
              {
                text: "先看定义",
                start: 0,
                end: 0.7,
              },
              {
                text: "再看条件",
                start: 0.7,
                end: 1.5,
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

    const provider = createTtsProvider();
    const result = await provider.synthesizeSegment({
      topicId: "math-b1-ch1-topic-001",
      segment: {
        id: "seg-rule",
        kind: "rule",
        text: "先看定义，再看条件。",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.openai.com/v1/audio/speech",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.openai.com/v1/audio/transcriptions",
    );
    expect(result.audioFile.extension).toBe("wav");
    expect(Array.from(result.audioFile.data)).toEqual([1, 2, 3]);
    expect(result.durationMs).toBe(1500);
    expect(result.chunks).toEqual([
      { text: "先看定义", startMs: 0, endMs: 700 },
      { text: "再看条件", startMs: 700, endMs: 1500 },
    ]);
  });

  it("uses scene-level duration budgets in mock mode", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const provider = createTtsProvider();
    const result = await provider.synthesizeSegment({
      topicId: "math-b1-ch1-topic-001",
      segment: {
        id: "seg-definition",
        kind: "definition",
        text: "一般地，指定的某些对象的全体称为一个集合。",
      },
    });

    expect(result.audioFile.extension).toBe("wav");
    expect(
      new TextDecoder().decode(result.audioFile.data.slice(0, 4)),
    ).toBe("RIFF");
    expect(result.durationMs).toBe(14000);
    expect(result.chunks).toEqual([
      {
        text: "一般地，指定的某些对象的全体称为一个集合。",
        startMs: 0,
        endMs: 14000,
      },
    ]);
  });
  it("supports a custom OpenAI-compatible base URL for speech and transcription", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "openai");
    vi.stubEnv("OPENAI_BASE_URL", "https://example-proxy.test/v1");

    const fetchMock = vi
      .fn<typeof fetch>()
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
                text: "hook",
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

    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    await provider.synthesizeSegment({
      topicId: "math-b1-ch1-topic-001",
      segment: {
        id: "seg-hook",
        kind: "hook",
        text: "hook",
      },
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://example-proxy.test/v1/audio/speech",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://example-proxy.test/v1/audio/transcriptions",
    );
  });

  it("falls back to local mock audio when TTS_PROVIDER=mock even if research and draft run in openai mode", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("TTS_PROVIDER", "mock");

    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    const result = await provider.synthesizeSegment({
      topicId: "math-b1-ch1-topic-001",
      segment: {
        id: "seg-wrap",
        kind: "wrap",
        text: "wrap",
      },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.audioFile.extension).toBe("wav");
    expect(result.durationMs).toBe(8000);
  });
});
