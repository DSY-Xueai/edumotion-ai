import { z } from "zod";

export const providerModeSchema = z.enum(["mock", "openai"]);
export const renderModeSchema = z.enum(["mock", "real"]);
export const ttsProviderSchema = z.enum(["mock", "openai", "qwen-local"]);

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
  QWEN_TTS_BASE_URL: z.string().min(1).default("http://127.0.0.1:8020"),
  QWEN_TTS_SPEAKER: z.string().min(1).default("Vivian"),
  QWEN_TTS_LANGUAGE: z.string().min(1).default("Chinese"),
  QWEN_TTS_INSTRUCT: z.string().optional(),
  QWEN_TTS_SEED: z.coerce.number().int().nonnegative().default(20260504),
  QWEN_TTS_DO_SAMPLE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  QWEN_TTS_TEMPERATURE: z.coerce.number().positive().default(0.2),
  QWEN_TTS_TOP_P: z.coerce.number().positive().max(1).default(0.8),
  QWEN_TTS_AUTO_START: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  QWEN_TTS_AUTO_START_MODEL_DIR: z
    .string()
    .min(1)
    .default("D:\\Qwen3-TTS\\Qwen3-TTS-12Hz-1.7B-Base"),
  QWEN_TTS_AUTO_START_DEVICE_MAP: z.string().min(1).default("cuda:0"),
  QWEN_TTS_AUTO_START_DTYPE: z.string().min(1).default("bfloat16"),
  QWEN_TTS_AUTO_START_REF_AUDIO: z
    .string()
    .min(1)
    .default("assets/voice-clone/reference-voice-focused.wav"),
  QWEN_TTS_AUTO_START_REF_TEXT: z.string().optional(),
  QWEN_TTS_AUTO_START_X_VECTOR_ONLY_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
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
export type EffectiveTtsMode = "mock" | "openai" | "qwen-local";

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
  TTS_PROVIDER === "qwen-local"
    ? "qwen-local"
    : PIPELINE_PROVIDER_MODE === "openai" && TTS_PROVIDER === "openai"
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
    qwenTtsBaseUrl: parsed.QWEN_TTS_BASE_URL,
    qwenTtsSpeaker: parsed.QWEN_TTS_SPEAKER,
    qwenTtsLanguage: parsed.QWEN_TTS_LANGUAGE,
    qwenTtsAutoStart: parsed.QWEN_TTS_AUTO_START,
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

  if (
    allowMockAudio ||
    inspection.effectiveTtsMode === "openai" ||
    inspection.effectiveTtsMode === "qwen-local"
  ) {
    return inspection;
  }

  throw new Error(
    "Mock TTS is active, so this render would contain placeholder tone audio instead of spoken narration. Configure PIPELINE_PROVIDER_MODE=openai with OPENAI_API_KEY and TTS_PROVIDER=openai, or rerun with --allow-mock-audio for test-only output.",
  );
};
