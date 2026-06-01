import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/runCli";

describe("doctor command", () => {
  it("reports mock mode without requiring a runtime API key", async () => {
    const result = await runCli(["doctor"], {
      PIPELINE_PROVIDER_MODE: "mock",
      RENDER_OUTPUT_MODE: "real",
      OPENAI_API_KEY: "",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"providerMode": "mock"');
    expect(result.stdout).toContain('"effectiveTtsMode": "mock"');
    expect(result.stdout).toContain('"mockAudioFallbackActive": true');
    expect(result.stdout).toContain('"requiresApiKey": false');
    expect(result.stdout).toContain('"apiKeyConfigured": false');
    expect(result.stdout).toContain("placeholder tone audio");
    expect(result.stdout).toContain('"workspaceRoot"');
    expect(result.stdout).toContain('"legacyRenderEntryRetired": true');
  });

  it("reports openai mode requirements without crashing when the key is missing", async () => {
    const result = await runCli(["doctor"], {
      PIPELINE_PROVIDER_MODE: "openai",
      RENDER_OUTPUT_MODE: "real",
      OPENAI_API_KEY: "",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"providerMode": "openai"');
    expect(result.stdout).toContain('"effectiveTtsMode": "mock"');
    expect(result.stdout).toContain('"mockAudioFallbackActive": true');
    expect(result.stdout).toContain('"requiresApiKey": false');
    expect(result.stdout).toContain('"apiKeyConfigured": false');
    expect(result.stdout).toContain("placeholder tone audio");
    expect(result.stdout).toContain('"browserExecutableFound"');
  });

  it("reports the configured TTS provider separately from the text provider mode", async () => {
    const result = await runCli(["doctor"], {
      PIPELINE_PROVIDER_MODE: "openai",
      TTS_PROVIDER: "mock",
      OPENAI_API_KEY: "test-key",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"providerMode": "openai"');
    expect(result.stdout).toContain('"ttsProvider": "mock"');
    expect(result.stdout).toContain('"mockAudioFallbackActive": true');
  });

  it("reports local Qwen TTS settings", async () => {
    const result = await runCli(["doctor"], {
      PIPELINE_PROVIDER_MODE: "mock",
      TTS_PROVIDER: "qwen-local",
      QWEN_TTS_BASE_URL: "http://127.0.0.1:8020",
      QWEN_TTS_SPEAKER: "Vivian",
      QWEN_TTS_LANGUAGE: "Chinese",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"ttsProvider": "qwen-local"');
    expect(result.stdout).toContain('"effectiveTtsMode": "qwen-local"');
    expect(result.stdout).toContain('"qwenTtsBaseUrl": "http://127.0.0.1:8020"');
    expect(result.stdout).toContain('"qwenTtsSpeaker": "Vivian"');
    expect(result.stdout).toContain('"qwenTtsLanguage": "Chinese"');
    expect(result.stdout).toContain("ready to generate spoken narration audio");
  });
});
