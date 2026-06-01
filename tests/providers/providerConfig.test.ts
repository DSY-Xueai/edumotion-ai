import { describe, expect, it } from "vitest";
import {
  assertTtsReadyForFinalRender,
  inspectProviderConfig,
  readProviderConfig,
} from "../../src/lib/providers/config";

describe("readProviderConfig", () => {
  it("allows mock mode without an OpenAI API key", () => {
    expect(
      readProviderConfig({
        PIPELINE_PROVIDER_MODE: "mock",
      }),
    ).toMatchObject({
      PIPELINE_PROVIDER_MODE: "mock",
    });
  });

  it("allows openai mode without an OpenAI API key so callers can fall back locally", () => {
    expect(
      readProviderConfig({
        PIPELINE_PROVIDER_MODE: "openai",
        OPENAI_API_KEY: "",
      }),
    ).toMatchObject({
      PIPELINE_PROVIDER_MODE: "openai",
      OPENAI_API_KEY: undefined,
    });
  });

  it("fills OpenAI TTS defaults for real audio generation", () => {
    expect(
      readProviderConfig({
        OPENAI_API_KEY: "test-key",
      }),
    ).toMatchObject({
      OPENAI_BASE_URL: "https://api.openai.com/v1",
      TTS_PROVIDER: "openai",
      TTS_MODEL: "tts-1-hd",
      TTS_VOICE: "alloy",
      TTS_RESPONSE_FORMAT: "wav",
      ALIGNMENT_MODEL: "gpt-4o-transcribe",
    });
  });

  it("accepts mock TTS as an explicit fallback in openai mode", () => {
    expect(
      readProviderConfig({
        PIPELINE_PROVIDER_MODE: "openai",
        OPENAI_API_KEY: "test-key",
        TTS_PROVIDER: "mock",
      }),
    ).toMatchObject({
      PIPELINE_PROVIDER_MODE: "openai",
      TTS_PROVIDER: "mock",
    });
  });

  it("accepts local Qwen TTS without requiring an OpenAI API key", () => {
    expect(
      readProviderConfig({
        PIPELINE_PROVIDER_MODE: "mock",
        TTS_PROVIDER: "qwen-local",
      }),
    ).toMatchObject({
      PIPELINE_PROVIDER_MODE: "mock",
      TTS_PROVIDER: "qwen-local",
      QWEN_TTS_BASE_URL: "http://127.0.0.1:8020",
      QWEN_TTS_SPEAKER: "Vivian",
      QWEN_TTS_LANGUAGE: "Chinese",
    });

    expect(
      inspectProviderConfig({
        PIPELINE_PROVIDER_MODE: "mock",
        TTS_PROVIDER: "qwen-local",
      }),
    ).toMatchObject({
      ttsProvider: "qwen-local",
      effectiveTtsMode: "qwen-local",
      mockAudioFallbackActive: false,
      requiresApiKey: false,
    });
  });

  it("defaults local Qwen auto-start to the focused reference audio", () => {
    expect(
      readProviderConfig({
        PIPELINE_PROVIDER_MODE: "mock",
        TTS_PROVIDER: "qwen-local",
      }),
    ).toMatchObject({
      QWEN_TTS_AUTO_START_REF_AUDIO: "assets/voice-clone/reference-voice-focused.wav",
      QWEN_TTS_AUTO_START_X_VECTOR_ONLY_MODE: true,
    });
  });

  it("defaults local Qwen requests to bounded generation and a finite timeout", () => {
    expect(
      readProviderConfig({
        PIPELINE_PROVIDER_MODE: "mock",
        TTS_PROVIDER: "qwen-local",
      }),
    ).toMatchObject({
      QWEN_TTS_MAX_NEW_TOKENS: 96,
      QWEN_TTS_REQUEST_TIMEOUT_MS: 120000,
    });
  });

  it("inspects provider runtime requirements without throwing", () => {
    expect(
      inspectProviderConfig({
        PIPELINE_PROVIDER_MODE: "mock",
      }),
    ).toMatchObject({
      providerMode: "mock",
      effectiveTtsMode: "mock",
      mockAudioFallbackActive: true,
      requiresApiKey: false,
      apiKeyConfigured: false,
    });

    expect(
      inspectProviderConfig({
        PIPELINE_PROVIDER_MODE: "openai",
        TTS_PROVIDER: "openai",
      }),
    ).toMatchObject({
      providerMode: "openai",
      ttsProvider: "openai",
      effectiveTtsMode: "mock",
      mockAudioFallbackActive: true,
      requiresApiKey: false,
      apiKeyConfigured: false,
    });
  });

  it("requires explicit opt-in before final render can use mock audio", () => {
    expect(() =>
      assertTtsReadyForFinalRender({
        env: {
          PIPELINE_PROVIDER_MODE: "mock",
        },
      }),
    ).toThrow(/Mock TTS is active/);

    expect(() =>
      assertTtsReadyForFinalRender({
        env: {
          PIPELINE_PROVIDER_MODE: "mock",
        },
        allowMockAudio: true,
      }),
    ).not.toThrow();

    expect(() =>
      assertTtsReadyForFinalRender({
        env: {
          PIPELINE_PROVIDER_MODE: "openai",
          OPENAI_API_KEY: "",
          TTS_PROVIDER: "openai",
        },
      }),
    ).toThrow(/Mock TTS is active/);

    expect(() =>
      assertTtsReadyForFinalRender({
        env: {
          PIPELINE_PROVIDER_MODE: "openai",
          OPENAI_API_KEY: "test-key",
          TTS_PROVIDER: "openai",
        },
      }),
    ).not.toThrow();

    expect(() =>
      assertTtsReadyForFinalRender({
        env: {
          PIPELINE_PROVIDER_MODE: "mock",
          TTS_PROVIDER: "qwen-local",
        },
      }),
    ).not.toThrow();
  });
});
