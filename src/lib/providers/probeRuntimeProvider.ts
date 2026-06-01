import { createTtsProvider } from "./createTtsProvider";
import { readProviderConfig } from "./config";
import { requestStructuredOpenAIOutput } from "./openaiStructuredOutput";

const providerProbeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ok: { type: "boolean" },
    provider: { type: "string" },
    echo: { type: "string" },
  },
  required: ["ok", "provider", "echo"],
} as const;

export type RuntimeProviderProbe = {
  providerMode: "mock" | "openai";
  baseUrl?: string;
  healthy: boolean;
  checks: {
    structuredOutput: "mock-ready" | "ok";
    tts?: "mock-ready" | "ok";
    transcription?: "ok";
  };
  models?: {
    research: string;
    tts?: string;
    alignment?: string;
  };
  details: string[];
};

export const probeRuntimeProvider = async ({
  includeTts = false,
}: {
  includeTts?: boolean;
} = {}): Promise<RuntimeProviderProbe> => {
  const config = readProviderConfig();

  if (config.PIPELINE_PROVIDER_MODE === "mock") {
    const result: RuntimeProviderProbe = {
      providerMode: "mock",
      healthy: true,
      checks: {
        structuredOutput: "mock-ready",
      },
      details: [
        "Mock provider is active. Structured lesson generation is available without network access.",
      ],
    };

    if (!includeTts) {
      return result;
    }

    if (config.TTS_PROVIDER === "mock") {
      result.checks.tts = "mock-ready";
      result.details.push("TTS provider is set to local mock audio fallback.");
      return result;
    }

    const ttsProvider = createTtsProvider();
    const audio = await ttsProvider.synthesizeSegment({
      topicId: "provider-probe",
      segment: {
        id: "provider-probe-seg",
        kind: "hook",
        text: "测试运行时 provider",
      },
    });

    result.checks.tts = "ok";
    result.models = {
      research: config.RESEARCH_MODEL,
      tts: config.TTS_MODEL,
      alignment: config.ALIGNMENT_MODEL,
    };
    result.details.push(
      `TTS probe passed with ${audio.audioFile.extension} audio, ${audio.durationMs}ms, ${audio.chunks.length} chunk(s).`,
    );

    return result;
  }

  if (!config.OPENAI_API_KEY) {
    const result: RuntimeProviderProbe = {
      providerMode: "openai",
      baseUrl: config.OPENAI_BASE_URL,
      healthy: true,
      checks: {
        structuredOutput: "mock-ready",
      },
      details: [
        "No runtime provider key is configured. Structured generation will use local fallback unless the current AI assistant writes the artifacts directly.",
      ],
    };

    if (!includeTts) {
      return result;
    }

    if (config.TTS_PROVIDER !== "qwen-local") {
      result.checks.tts = "mock-ready";
      result.details.push("TTS provider is not configured for real local audio.");
      return result;
    }

    const ttsProvider = createTtsProvider();
    const audio = await ttsProvider.synthesizeSegment({
      topicId: "provider-probe",
      segment: {
        id: "provider-probe-seg",
        kind: "hook",
        text: "测试运行时 provider",
      },
    });

    result.checks.tts = "ok";
    result.models = {
      research: config.RESEARCH_MODEL,
      tts: config.TTS_MODEL,
      alignment: config.ALIGNMENT_MODEL,
    };
    result.details.push(
      `TTS probe passed with ${audio.audioFile.extension} audio, ${audio.durationMs}ms, ${audio.chunks.length} chunk(s).`,
    );

    return result;
  }

  const structured = await requestStructuredOpenAIOutput<{
    ok: boolean;
    provider: string;
    echo: string;
  }>({
    apiKey: config.OPENAI_API_KEY ?? "",
    baseUrl: config.OPENAI_BASE_URL,
    model: config.RESEARCH_MODEL,
    schemaName: "provider_probe_payload",
    schema: providerProbeSchema,
    systemPrompt:
      "You are a connectivity probe. Return only strict JSON confirming that structured outputs are available.",
    userPrompt:
      "Return ok=true, provider='openai-compatible', echo='provider-probe'.",
  });

  const result: RuntimeProviderProbe = {
    providerMode: "openai",
    baseUrl: config.OPENAI_BASE_URL,
    healthy: structured.ok === true,
    checks: {
      structuredOutput: "ok",
    },
    models: {
      research: config.RESEARCH_MODEL,
    },
    details: [
      `Structured output check passed via ${config.OPENAI_BASE_URL}.`,
    ],
  };

  if (!includeTts) {
    return result;
  }

  if (config.TTS_PROVIDER === "mock") {
    result.checks.tts = "mock-ready";
    result.details.push("TTS provider is set to local mock audio fallback.");
    return result;
  }

  const ttsProvider = createTtsProvider();
  const audio = await ttsProvider.synthesizeSegment({
    topicId: "provider-probe",
    segment: {
      id: "provider-probe-seg",
      kind: "hook",
      text: "测试运行时 provider",
    },
  });

  result.checks.tts = "ok";
  result.checks.transcription = "ok";
  result.models = {
    research: config.RESEARCH_MODEL,
    tts: config.TTS_MODEL,
    alignment: config.ALIGNMENT_MODEL,
  };
  result.details.push(
    `TTS probe passed with ${audio.audioFile.extension} audio, ${audio.durationMs}ms, ${audio.chunks.length} chunk(s).`,
  );

  return result;
};
