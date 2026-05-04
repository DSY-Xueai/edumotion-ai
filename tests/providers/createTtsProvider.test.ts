import { afterEach, describe, expect, it, vi } from "vitest";
import { createTtsProvider } from "../../src/lib/providers/createTtsProvider";

const createSilentWav = (durationMs: number) => {
  const sampleRate = 16000;
  const bytesPerSample = 2;
  const sampleCount = Math.max(1, Math.round((durationMs / 1000) * sampleRate));
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  const writeString = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset, value.charCodeAt(index));
      offset += 1;
    }
  };

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * bytesPerSample, true);
  offset += 4;
  view.setUint16(offset, bytesPerSample, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);

  return new Uint8Array(buffer);
};

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

  it("uses local Qwen TTS with short sentence alignment from generated wav durations", async () => {
    vi.stubEnv("TTS_PROVIDER", "qwen-local");
    vi.stubEnv("QWEN_TTS_BASE_URL", "http://127.0.0.1:8020");
    vi.stubEnv("QWEN_TTS_SPEAKER", "Vivian");

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(createSilentWav(500), {
          status: 200,
          headers: { "content-type": "audio/wav" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(createSilentWav(700), {
          status: 200,
          headers: { "content-type": "audio/wav" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    const result = await provider.synthesizeSegment({
      topicId: "physics-b1-projectile-motion",
      segment: {
        id: "seg-rule",
        kind: "rule",
        text: "水平方向做匀速直线运动。竖直方向做自由落体运动。",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "http://127.0.0.1:8020/v1/audio/speech",
      "http://127.0.0.1:8020/v1/audio/speech",
    ]);
    expect(
      fetchMock.mock.calls.map((call) =>
        JSON.parse(String((call[1] as RequestInit).body)),
      ),
    ).toEqual([
      expect.objectContaining({
        text: "水平方向做匀速直线运动。",
        speaker: "Vivian",
        language: "Chinese",
      }),
      expect.objectContaining({
        text: "竖直方向做自由落体运动。",
        speaker: "Vivian",
        language: "Chinese",
      }),
    ]);
    expect(result.audioFile.extension).toBe("wav");
    expect(new TextDecoder().decode(result.audioFile.data.slice(0, 4))).toBe(
      "RIFF",
    );
    expect(result.durationMs).toBe(1200);
    expect(result.chunks).toEqual([
      { text: "水平方向做匀速直线运动。", startMs: 0, endMs: 500 },
      { text: "竖直方向做自由落体运动。", startMs: 500, endMs: 1200 },
    ]);
  });

  it("batch synthesizes local Qwen segments in one request for stable timbre", async () => {
    vi.stubEnv("TTS_PROVIDER", "qwen-local");
    vi.stubEnv("QWEN_TTS_BASE_URL", "http://127.0.0.1:8020");
    vi.stubEnv("QWEN_TTS_SPEAKER", "Vivian");
    vi.stubEnv("QWEN_TTS_SEED", "1234");

    const wavA = Buffer.from(createSilentWav(400)).toString("base64");
    const wavB = Buffer.from(createSilentWav(600)).toString("base64");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            { id: "seg-1", audioBase64: wavA },
            { id: "seg-2", audioBase64: wavB },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    const results = await provider.synthesizeSegments?.({
      topicId: "physics-b2-ch5-topic-001",
      segments: [
        { id: "seg-1", kind: "hook", text: "先看平抛运动。" },
        { id: "seg-2", kind: "rule", text: "水平匀速，竖直自由落体。" },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:8020/v1/audio/speech-batch",
    );
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      items: [
        expect.objectContaining({
          id: "seg-1",
          text: "先看平抛运动。",
          speaker: "Vivian",
          language: "Chinese",
        }),
        expect.objectContaining({
          id: "seg-2",
          text: "水平匀速，竖直自由落体。",
          speaker: "Vivian",
          language: "Chinese",
        }),
      ],
      seed: 1234,
      do_sample: false,
      temperature: 0.2,
      top_p: 0.8,
    });
    expect(results?.map((result) => result.durationMs)).toEqual([400, 600]);
    expect(results?.map((result) => result.chunks[0]?.text)).toEqual([
      "先看平抛运动。",
      "水平匀速，竖直自由落体。",
    ]);
  });
});
