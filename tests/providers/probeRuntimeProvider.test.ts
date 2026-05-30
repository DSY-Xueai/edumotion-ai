import { afterEach, describe, expect, it, vi } from "vitest";
import { probeRuntimeProvider } from "../../src/lib/providers/probeRuntimeProvider";

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

describe("probeRuntimeProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns a local-ready result in mock mode without calling fetch", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");

    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const result = await probeRuntimeProvider();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      providerMode: "mock",
      healthy: true,
      checks: {
        structuredOutput: "mock-ready",
      },
    });
  });

  it("still probes local Qwen TTS when structured output is in mock mode", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "mock");
    vi.stubEnv("TTS_PROVIDER", "qwen-local");
    vi.stubEnv("QWEN_TTS_AUTO_START", "false");

    const fetchMock = vi.fn<typeof fetch>().mockImplementation(() =>
      Promise.resolve(new Response(createSilentWav(900), {
        status: 200,
        headers: { "content-type": "audio/wav" },
      })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await probeRuntimeProvider({ includeTts: true });

    expect(fetchMock).toHaveBeenCalled();
    expect(result).toMatchObject({
      providerMode: "mock",
      healthy: true,
      checks: {
        structuredOutput: "mock-ready",
        tts: "ok",
      },
    });
  });

  it("probes structured output against the configured OpenAI-compatible base URL", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_BASE_URL", "https://example-proxy.test/v1");
    vi.stubEnv("RESEARCH_MODEL", "gpt-5");

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ok: true,
                  provider: "openai-compatible",
                  echo: "provider-probe",
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

    const result = await probeRuntimeProvider();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://example-proxy.test/v1/chat/completions",
    );
    expect(result).toMatchObject({
      providerMode: "openai",
      healthy: true,
      checks: {
        structuredOutput: "ok",
      },
    });
  });

  it("optionally probes the TTS and transcription endpoints too", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_BASE_URL", "https://example-proxy.test/v1");
    vi.stubEnv("RESEARCH_MODEL", "gpt-5");
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
                    ok: true,
                    provider: "openai-compatible",
                    echo: "provider-probe",
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
      )
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
            duration: 1.1,
            segments: [
              {
                text: "测试",
                start: 0,
                end: 1.1,
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

    const result = await probeRuntimeProvider({ includeTts: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://example-proxy.test/v1/audio/speech",
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "https://example-proxy.test/v1/audio/transcriptions",
    );
    expect(result).toMatchObject({
      providerMode: "openai",
      healthy: true,
      checks: {
        structuredOutput: "ok",
        tts: "ok",
        transcription: "ok",
      },
    });
  });

  it("reports mock-ready TTS when openai text models are paired with local mock audio", async () => {
    vi.stubEnv("PIPELINE_PROVIDER_MODE", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_BASE_URL", "https://example-proxy.test/v1");
    vi.stubEnv("RESEARCH_MODEL", "gpt-5.4");
    vi.stubEnv("TTS_PROVIDER", "mock");

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ok: true,
                  provider: "openai-compatible",
                  echo: "provider-probe",
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

    const result = await probeRuntimeProvider({ includeTts: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      providerMode: "openai",
      healthy: true,
      checks: {
        structuredOutput: "ok",
        tts: "mock-ready",
      },
    });
  });
});
