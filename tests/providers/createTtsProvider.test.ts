import { afterEach, describe, expect, it, vi } from "vitest";
import { createTtsProvider } from "../../src/lib/providers/createTtsProvider";
import { readWavInfo } from "../../src/lib/audio/wav";

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

const createToneWav = (durationMs: number) => {
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
  offset += 4;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const amplitude = Math.round(
      Math.sin((2 * Math.PI * 220 * sampleIndex) / sampleRate) * 9000,
    );

    view.setInt16(offset, amplitude, true);
    offset += 2;
  }

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
        new Response(createToneWav(1500), {
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
              { text: "first", start: 0, end: 0.7 },
              { text: "second", start: 0.7, end: 1.5 },
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
      segment: { id: "seg-rule", kind: "rule", text: "first, second" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/audio/speech");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(result.audioFile.extension).toBe("wav");
    expect(readWavInfo(result.audioFile.data).durationMs).toBe(1500);
    expect(result.durationMs).toBe(1500);
    expect(result.chunks).toEqual([
      { text: "first", startMs: 0, endMs: 700 },
      { text: "second", startMs: 700, endMs: 1500 },
    ]);
  });

  it("uses scene-level duration budgets in mock mode", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const provider = createTtsProvider();
    const result = await provider.synthesizeSegment({
      topicId: "math-b1-ch1-topic-001",
      segment: { id: "seg-definition", kind: "definition", text: "definition line" },
    });

    expect(result.audioFile.extension).toBe("wav");
    expect(new TextDecoder().decode(result.audioFile.data.slice(0, 4))).toBe("RIFF");
    expect(result.durationMs).toBe(14000);
    expect(result.chunks).toEqual([{ text: "definition line", startMs: 0, endMs: 14000 }]);
  });

  it("keeps english mock preview audio compact enough to avoid long frozen subtitles", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");
    vi.stubEnv("TTS_PROVIDER", "mock");

    const provider = createTtsProvider();
    const segments = [
      { id: "english-word-00005-seg-hook", kind: "hook", text: "一秒钟记一个单词。" },
      {
        id: "english-word-00005-seg-definition",
        kind: "definition",
        text: "今天要记的单词是 abide，意思是：忍受；遵守。",
      },
      { id: "english-word-00005-seg-process", kind: "process", text: "怎么记？" },
      { id: "english-word-00005-seg-compare-lead", kind: "compare", text: "忍受不舒服，也照规则做，" },
      { id: "english-word-00005-seg-pitfall", kind: "pitfall", text: "这就是 abide 的动作。" },
      { id: "english-word-00005-seg-pronunciation", kind: "pronunciation", text: "abide" },
      { id: "english-word-00005-seg-wrap", kind: "wrap", text: "abide，忍受；遵守。" },
    ];

    const results = await Promise.all(
      segments.map((segment) =>
        provider.synthesizeSegment({
          topicId: "english-word-00005",
          segment,
        }),
      ),
    );
    const totalDurationMs = results.reduce((total, result) => total + result.durationMs, 0);

    expect(totalDurationMs).toBeLessThanOrEqual(24000);
    expect(results.map((result) => result.durationMs)).toEqual([
      1600,
      3600,
      1200,
      2600,
      2400,
      1200,
      2600,
    ]);
  });

  it("supports a custom OpenAI-compatible base URL for speech and transcription", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "openai");
    vi.stubEnv("OPENAI_BASE_URL", "https://example-proxy.test/v1");

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(createToneWav(1200), {
          status: 200,
          headers: { "content-type": "audio/wav" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ duration: 1.2, segments: [{ text: "hook", start: 0, end: 1.2 }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    await provider.synthesizeSegment({
      topicId: "math-b1-ch1-topic-001",
      segment: { id: "seg-hook", kind: "hook", text: "hook" },
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://example-proxy.test/v1/audio/speech");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://example-proxy.test/v1/audio/transcriptions");
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
      segment: { id: "seg-wrap", kind: "wrap", text: "wrap" },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.audioFile.extension).toBe("wav");
    expect(result.durationMs).toBe(8000);
  });

  it("uses local Qwen TTS with short sentence alignment from generated wav durations", async () => {
    vi.stubEnv("TTS_PROVIDER", "qwen-local");
    vi.stubEnv("QWEN_TTS_BASE_URL", "http://127.0.0.1:8020");
    vi.stubEnv("QWEN_TTS_SPEAKER", "Vivian");
    vi.stubEnv("QWEN_TTS_AUTO_START", "false");
    vi.stubEnv("QWEN_TTS_MAX_NEW_TOKENS", "96");
    vi.stubEnv("QWEN_TTS_REQUEST_TIMEOUT_MS", "30000");

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
      segment: { id: "seg-rule", kind: "rule", text: "先看平抛运动。再看竖直方向。" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      "http://127.0.0.1:8020/v1/audio/speech",
      "http://127.0.0.1:8020/v1/audio/speech",
    ]);
    expect(
      fetchMock.mock.calls.map((call) =>
        JSON.parse(String((call[1] as RequestInit).body)),
      ),
    ).toEqual([
      expect.objectContaining({ max_new_tokens: 96 }),
      expect.objectContaining({ max_new_tokens: 96 }),
    ]);
    expect(fetchMock.mock.calls.every((call) => (call[1] as RequestInit).signal)).toBe(true);
    expect(result.durationMs).toBe(1200);
    expect(result.chunks).toEqual([
      { text: "先看平抛运动。", startMs: 0, endMs: 500 },
      { text: "再看竖直方向。", startMs: 500, endMs: 1200 },
    ]);
  });

  it("batch synthesizes local Qwen segments in one request for stable timbre", async () => {
    vi.stubEnv("TTS_PROVIDER", "qwen-local");
    vi.stubEnv("QWEN_TTS_BASE_URL", "http://127.0.0.1:8020");
    vi.stubEnv("QWEN_TTS_SPEAKER", "Vivian");
    vi.stubEnv("QWEN_TTS_SEED", "1234");
    vi.stubEnv("QWEN_TTS_AUTO_START", "false");

    const wavA = Buffer.from(createSilentWav(400)).toString("base64");
    const wavB = Buffer.from(createSilentWav(600)).toString("base64");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [{ id: "seg-1", audioBase64: wavA }, { id: "seg-2", audioBase64: wavB }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    const results = await provider.synthesizeSegments?.({
      topicId: "physics-b2-ch5-topic-001",
      segments: [
        { id: "seg-1", kind: "hook", text: "先看平抛运动。" },
        { id: "seg-2", kind: "rule", text: "水平方向匀速，竖直自由落体。" },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://127.0.0.1:8020/v1/audio/speech-batch");
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      items: [
        expect.objectContaining({ id: "seg-1", text: "先看平抛运动。", speaker: "Vivian", language: "Chinese" }),
        expect.objectContaining({ id: "seg-2", text: "水平方向匀速，竖直自由落体。", speaker: "Vivian", language: "Chinese" }),
      ],
      seed: 1234,
      do_sample: false,
      temperature: 0.2,
      top_p: 0.8,
      max_new_tokens: 96,
    });
    expect(results?.map((result) => result.durationMs)).toEqual([400, 600]);
    expect(results?.map((result) => result.chunks[0]?.text)).toEqual(["先看平抛运动。", "水平方向匀速，竖直自由落体。"]);
  });

  it("routes english pronunciation through English TTS while keeping Chinese lines on Qwen", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");
    vi.stubEnv("TTS_PROVIDER", "qwen-local");
    vi.stubEnv("QWEN_TTS_BASE_URL", "http://127.0.0.1:8020");
    vi.stubEnv("QWEN_TTS_SPEAKER", "Vivian");
    vi.stubEnv("QWEN_TTS_AUTO_START", "false");

    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url === "https://api.openai.com/v1/audio/speech") {
        return new Response(createToneWav(1100), { status: 200, headers: { "content-type": "audio/wav" } });
      }

      if (url === "https://api.openai.com/v1/audio/transcriptions") {
        return new Response(JSON.stringify({ duration: 1.1, segments: [{ text: "abandon", start: 0, end: 1.1 }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url === "http://127.0.0.1:8020/v1/audio/speech") {
        return new Response(createSilentWav(500), { status: 200, headers: { "content-type": "audio/wav" } });
      }

      throw new Error(`Unexpected fetch request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    const results = await provider.synthesizeSegments?.({
      topicId: "english-word-00002",
      segments: [
        { id: "english-word-00002-seg-pronunciation", kind: "pronunciation", text: "abandon" },
        { id: "english-word-00002-seg-definition", kind: "definition", text: "中文说明 abandon 中文说明" },
      ],
    });

    expect(fetchMock.mock.calls.filter((call) => String(call[0]) === "https://api.openai.com/v1/audio/speech")).toHaveLength(1);
    expect(fetchMock.mock.calls.filter((call) => String(call[0]) === "https://api.openai.com/v1/audio/transcriptions")).toHaveLength(1);
    expect(fetchMock.mock.calls.some((call) => String(call[0]) === "http://127.0.0.1:8020/v1/audio/speech")).toBe(true);
    expect(results?.[0]?.durationMs).toBe(1100);
    expect(results?.[0]?.chunks[0]?.text).toBe("abandon");
    expect(results?.[1]?.durationMs).toBeGreaterThan(0);
  });

  it("uses Chinese Qwen mode for fallback English pronunciation in multi-segment synthesis", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");
    vi.stubEnv("TTS_PROVIDER", "qwen-local");
    vi.stubEnv("QWEN_TTS_BASE_URL", "http://127.0.0.1:8020");
    vi.stubEnv("QWEN_TTS_SPEAKER", "Vivian");
    vi.stubEnv("QWEN_TTS_AUTO_START", "false");

    const payloads: Array<{ text?: string; language?: string; instruct?: string }> = [];
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url !== "http://127.0.0.1:8020/v1/audio/speech") {
        throw new Error(`Unexpected fetch request: ${url}`);
      }

      payloads.push(JSON.parse(String(init?.body ?? "{}")));

      return new Response(createSilentWav(500), {
        status: 200,
        headers: { "content-type": "audio/wav" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    await provider.synthesizeSegments?.({
      topicId: "english-word-00007",
      segments: [
        { id: "english-word-00007-seg-pronunciation", kind: "pronunciation", text: "able" },
        { id: "english-word-00007-seg-wrap", kind: "wrap", text: "所以：able，就是有能力的、出色的。" },
      ],
    });

    expect(payloads[0]).toEqual(
      expect.objectContaining({
        text: "able",
        language: "Chinese",
      }),
    );
    expect(payloads[0]?.instruct).toContain("英文单词 able");
  });

  it("synthesizes English-video Qwen segments sequentially to avoid overloading the local server", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");
    vi.stubEnv("TTS_PROVIDER", "qwen-local");
    vi.stubEnv("QWEN_TTS_BASE_URL", "http://127.0.0.1:8020");
    vi.stubEnv("QWEN_TTS_SPEAKER", "Vivian");
    vi.stubEnv("QWEN_TTS_AUTO_START", "false");

    let activeRequests = 0;
    let maxActiveRequests = 0;
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url !== "http://127.0.0.1:8020/v1/audio/speech") {
        throw new Error(`Unexpected fetch request: ${url}`);
      }

      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeRequests -= 1;

      return new Response(createSilentWav(300), {
        status: 200,
        headers: { "content-type": "audio/wav" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    await provider.synthesizeSegments?.({
      topicId: "english-word-00007",
      segments: [
        { id: "english-word-00007-seg-definition", kind: "definition", text: "今天要记 able。" },
        { id: "english-word-00007-seg-pronunciation", kind: "pronunciation", text: "able" },
        { id: "english-word-00007-seg-wrap", kind: "wrap", text: "所以 able。" },
      ],
    });

    expect(maxActiveRequests).toBe(1);
  });

  it("uses Chinese Qwen mode for pronunciation segments when OpenAI is unavailable", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");
    vi.stubEnv("TTS_PROVIDER", "qwen-local");
    vi.stubEnv("QWEN_TTS_BASE_URL", "http://127.0.0.1:8020");
    vi.stubEnv("QWEN_TTS_SPEAKER", "Vivian");
    vi.stubEnv("QWEN_TTS_AUTO_START", "false");

    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url === "http://127.0.0.1:8020/v1/audio/speech") {
        const payload = JSON.parse(String(init?.body ?? "{}")) as { text?: string; language?: string; instruct?: string };
        if (payload.text === "abandon") {
          expect(payload.language).toBe("Chinese");
          expect(payload.instruct).toContain("英文单词 abandon");
          return new Response(createSilentWav(500), { status: 200, headers: { "content-type": "audio/wav" } });
        }

        return new Response(createSilentWav(400), { status: 200, headers: { "content-type": "audio/wav" } });
      }

      throw new Error(`Unexpected fetch request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    const results = await provider.synthesizeSegments?.({
      topicId: "english-word-00002",
      segments: [
        { id: "english-word-00002-seg-pronunciation", kind: "pronunciation", text: "abandon" },
        { id: "english-word-00002-seg-definition", kind: "definition", text: "中文说明。" },
      ],
    });

    expect(results?.[0]?.chunks[0]?.text).toBe("abandon");
    expect(results?.[1]?.chunks[0]?.text).toBe("中文说明。");
  });

  it("keeps embedded English words inside normal English-video narration chunks", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");
    vi.stubEnv("TTS_PROVIDER", "qwen-local");
    vi.stubEnv("QWEN_TTS_BASE_URL", "http://127.0.0.1:8020");
    vi.stubEnv("QWEN_TTS_SPEAKER", "Vivian");
    vi.stubEnv("QWEN_TTS_AUTO_START", "false");

    const payloads: Array<{ text?: string; language?: string; instruct?: string }> = [];
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url !== "http://127.0.0.1:8020/v1/audio/speech") {
        throw new Error(`Unexpected fetch request: ${url}`);
      }

      payloads.push(JSON.parse(String(init?.body ?? "{}")));

      return new Response(createSilentWav(300), {
        status: 200,
        headers: { "content-type": "audio/wav" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    const result = await provider.synthesizeSegment({
      topicId: "english-word-00007",
      segment: {
        id: "english-word-00007-seg-wrap",
        kind: "wrap",
        text: "所以：able，就是有能力的、出色的。",
      },
    });

    expect(payloads.map((payload) => ({ text: payload.text, language: payload.language }))).toEqual([
      { text: "所以：able，就是有能力的、出色的。", language: "Chinese" },
    ]);
    expect(result.chunks.map((chunk) => chunk.text)).toEqual([
      "所以：able，就是有能力的、出色的。",
    ]);
  });

  it("caps overlong local English pronunciation audio to a short word beat", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");
    vi.stubEnv("TTS_PROVIDER", "qwen-local");
    vi.stubEnv("QWEN_TTS_BASE_URL", "http://127.0.0.1:8020");
    vi.stubEnv("QWEN_TTS_SPEAKER", "Vivian");
    vi.stubEnv("QWEN_TTS_AUTO_START", "false");

    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(createToneWav(10900), {
        status: 200,
        headers: { "content-type": "audio/wav" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    const result = await provider.synthesizeSegment({
      topicId: "english-word-00007",
      segment: { id: "english-word-00007-seg-pronunciation", kind: "pronunciation", text: "able" },
    });

    expect(result.durationMs).toBe(2500);
    expect(readWavInfo(result.audioFile.data).durationMs).toBe(2500);
    expect(result.chunks).toEqual([{ text: "able", startMs: 0, endMs: 2500 }]);
  });

  it("keeps overlong local English-video narration segments so visible copy is not cut off", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");
    vi.stubEnv("TTS_PROVIDER", "qwen-local");
    vi.stubEnv("QWEN_TTS_BASE_URL", "http://127.0.0.1:8020");
    vi.stubEnv("QWEN_TTS_SPEAKER", "Vivian");
    vi.stubEnv("QWEN_TTS_AUTO_START", "false");

    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(createToneWav(8240), {
        status: 200,
        headers: { "content-type": "audio/wav" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTtsProvider();
    const result = await provider.synthesizeSegment({
      topicId: "english-word-00002",
      segment: { id: "english-word-00002-seg-definition", kind: "definition", text: "第2个，意思：丢弃、放弃。" },
    });

    expect(result.durationMs).toBe(8240);
    expect(readWavInfo(result.audioFile.data).durationMs).toBe(8240);
    expect(result.chunks).toEqual([{ text: "第2个，意思：丢弃、放弃。", startMs: 0, endMs: 8240 }]);
  });
});
