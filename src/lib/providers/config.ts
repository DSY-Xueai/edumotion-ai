import { z } from "zod";

export const providerModeSchema = z.enum(["mock", "openai"]);
export const renderModeSchema = z.enum(["mock", "real"]);
export const ttsProviderSchema = z.enum(["mock", "openai"]);

const baseEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().min(1).default("https://api.openai.com/v1"),
  RESEARCH_MODEL: z.string().min(1).default("gpt-5"),
  DRAFT_MODEL: z.string().min(1).default("gpt-5"),
  TTS_PROVIDER: ttsProviderSchema.default("openai"),
  TTS_MODEL: z.string().min(1).default("tts-1-hd"),
  TTS_VOICE: z.string().min(1).default("alloy"),
  TTS_RESPONSE_FORMAT: z.string().min(1).default("wav"),
  ALIGNMENT_MODEL: z.string().min(1).default("gpt-4o-transcribe"),
  PIPELINE_PROVIDER_MODE: providerModeSchema.default("mock"),
  RENDER_OUTPUT_MODE: renderModeSchema.default("mock"),
});

const envSchema = baseEnvSchema.superRefine((env, ctx) => {
  if (env.PIPELINE_PROVIDER_MODE === "openai" && !env.OPENAI_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["OPENAI_API_KEY"],
      message: "OPENAI_API_KEY is required when PIPELINE_PROVIDER_MODE=openai",
    });
  }
});

export type ProviderConfig = z.infer<typeof envSchema>;
export type ProviderConfigInspection = ReturnType<typeof inspectProviderConfig>;
export type EffectiveTtsMode = "mock" | "openai";

const normalizeEnv = (env: Record<string, string | undefined>) =>
  Object.fromEntries(
    Object.entries(env).map(([key, value]) => [
      key,
      value === "" ? undefined : value,
    ]),
  ) as Record<string, string | undefined>;

export const readProviderConfig = (
  env: Record<string, string | undefined> = process.env,
): ProviderConfig => envSchema.parse(normalizeEnv(env));

export const resolveEffectiveTtsMode = ({
  PIPELINE_PROVIDER_MODE,
  TTS_PROVIDER,
}: Pick<ProviderConfig, "PIPELINE_PROVIDER_MODE" | "TTS_PROVIDER">): EffectiveTtsMode =>
  PIPELINE_PROVIDER_MODE === "openai" && TTS_PROVIDER === "openai"
    ? "openai"
    : "mock";

export const inspectProviderConfig = (
  env: Record<string, string | undefined> = process.env,
) => {
  const parsed = baseEnvSchema.parse(normalizeEnv(env));
  const effectiveTtsMode = resolveEffectiveTtsMode(parsed);

  return {
    providerMode: parsed.PIPELINE_PROVIDER_MODE,
    renderMode: parsed.RENDER_OUTPUT_MODE,
    ttsProvider: parsed.TTS_PROVIDER,
    effectiveTtsMode,
    mockAudioFallbackActive: effectiveTtsMode === "mock",
    ttsVoice: parsed.TTS_VOICE,
    openaiBaseUrl: parsed.OPENAI_BASE_URL,
    requiresApiKey: parsed.PIPELINE_PROVIDER_MODE === "openai",
    apiKeyConfigured: Boolean(parsed.OPENAI_API_KEY),
  };
};

export const assertTtsReadyForFinalRender = ({
  allowMockAudio = false,
  env = process.env,
}: {
  allowMockAudio?: boolean;
  env?: Record<string, string | undefined>;
}) => {
  const inspection = inspectProviderConfig(env);

  if (allowMockAudio || inspection.effectiveTtsMode === "openai") {
    return inspection;
  }

  throw new Error(
    "Mock TTS is active, so this render would contain placeholder tone audio instead of spoken narration. Configure PIPELINE_PROVIDER_MODE=openai with OPENAI_API_KEY and TTS_PROVIDER=openai, or rerun with --allow-mock-audio for test-only output.",
  );
};
