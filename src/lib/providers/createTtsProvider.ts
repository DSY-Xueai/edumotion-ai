import type { TtsProvider } from "../audio/ttsProvider";
import { splitNarrationText } from "../audio/splitNarrationText";
import {
  clipWavToDuration,
  compressInternalSilenceFromWav,
  concatenateWavFiles,
  trimSilenceFromWav,
} from "../audio/wav";
import type { TtsChunkTiming } from "../audio/schema";
import { readProviderConfig } from "./config";
import { ensureQwenTtsCloneServer } from "./ensureQwenTtsCloneServer";

const parseTimeMs = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.round(value * 1000);
};

const parseDurationMs = (value: unknown): number | undefined => {
  const parsed = parseTimeMs(value);

  if (parsed === undefined || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const parseChunkTimings = (
  transcription: Record<string, unknown>,
  fallbackText: string,
  fallbackDurationMs: number,
) => {
  const segmentObjects = Array.isArray(transcription.segments)
    ? transcription.segments
    : [];
  const parsedSegments = segmentObjects
    .map((segment) => {
      if (!segment || typeof segment !== "object") {
        return null;
      }

      const text =
        typeof segment.text === "string" ? segment.text.trim() : undefined;
      const startMs = parseTimeMs(segment.start);
      const endMs = parseTimeMs(segment.end);

      if (!text || startMs === undefined || endMs === undefined || endMs <= startMs) {
        return null;
      }

      return { text, startMs, endMs };
    })
    .filter((segment): segment is { text: string; startMs: number; endMs: number } => Boolean(segment));

  if (parsedSegments.length > 0) {
    return parsedSegments;
  }

  return [
    {
      text: fallbackText,
      startMs: 0,
      endMs: fallbackDurationMs,
    },
  ];
};

const readErrorMessage = async (response: Response) => {
  const body = await response.text();

  return body || response.statusText;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const decodeBase64 = (value: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array(Buffer.from(value, "base64"));

const buildQwenSynthesizedSegment = ({
  text,
  audioBytes,
}: {
  text: string;
  audioBytes: Uint8Array<ArrayBuffer>;
}) => {
  const trimmed = trimSilenceFromWav(audioBytes);

  return {
    audioFile: {
      extension: "wav",
      data: trimmed.bytes,
    },
    durationMs: trimmed.durationMs,
    chunks: [
      {
        text,
        startMs: 0,
        endMs: trimmed.durationMs,
      },
    ],
  };
};

const shiftChunks = (
  chunks: TtsChunkTiming[],
  trimStartMs: number,
  durationMs: number,
) =>
  chunks
    .map((chunk) => {
      const startMs = Math.max(0, chunk.startMs - trimStartMs);
      const endMs = Math.min(durationMs, Math.max(startMs, chunk.endMs - trimStartMs));

      return {
        ...chunk,
        startMs,
        endMs,
      };
    })
    .filter((chunk) => chunk.endMs > chunk.startMs);

const qwenGenerationOptions = (config: ReturnType<typeof readProviderConfig>) => ({
  seed: config.QWEN_TTS_SEED,
  do_sample: config.QWEN_TTS_DO_SAMPLE,
  temperature: config.QWEN_TTS_TEMPERATURE,
  top_p: config.QWEN_TTS_TOP_P,
});

const mockSceneDurationMs: Record<string, number> = {
  pronunciation: 1500,
  hook: 12000,
  definition: 14000,
  rule: 10000,
  compare: 10000,
  process: 12000,
  graph: 10000,
  pitfall: 8000,
  wrap: 8000,
};

const englishMockSceneDurationMs: Record<string, number> = {
  pronunciation: 1200,
  hook: 1600,
  definition: 3600,
  process: 1200,
  compare: 2600,
  pitfall: 2400,
  wrap: 2600,
};

const getMockDurationMs = ({
  topicId,
  kind,
  text,
}: {
  topicId: string;
  kind: string;
  text: string;
}) => {
  if (topicId.startsWith("english-")) {
    return englishMockSceneDurationMs[kind] ?? Math.max(1200, text.length * 95);
  }

  return mockSceneDurationMs[kind] ?? Math.max(2000, text.length * 120);
};

const createMockWavBytes = (durationMs: number) => {
  const sampleRate = 16000;
  const channelCount = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const sampleCount = Math.max(
    1,
    Math.round((durationMs / 1000) * sampleRate),
  );
  const dataSize = sampleCount * channelCount * bytesPerSample;
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
  view.setUint16(offset, channelCount, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * channelCount * bytesPerSample, true);
  offset += 4;
  view.setUint16(offset, channelCount * bytesPerSample, true);
  offset += 2;
  view.setUint16(offset, bitsPerSample, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const fadeIn = Math.min(1, sampleIndex / 1200);
    const fadeOut = Math.min(1, (sampleCount - sampleIndex) / 1200);
    const amplitude = Math.round(
      Math.sin((2 * Math.PI * 220 * sampleIndex) / sampleRate) *
        2400 *
        fadeIn *
        fadeOut,
    );

    view.setInt16(offset, amplitude, true);
    offset += 2;
  }

  return new Uint8Array(buffer);
};

const isEnglishPronunciationSegment = (topicId: string, segment: { kind: string }) =>
  topicId.startsWith("english-") && segment.kind === "pronunciation";

const maxEnglishPronunciationDurationMs = 2500;

const buildQwenPronunciationFallbackInstruction = (word: string) =>
  `只清楚读出这个英文单词 ${word}，一次即可，不要添加解释。`;

const buildQwenTextParts = ({
  text,
  language,
  instruct,
}: {
  text: string;
  language: string;
  instruct?: string;
}) =>
  splitNarrationText(text).map((textPart) => ({
    text: textPart,
    spokenText: textPart,
    language,
    instruct,
  }));

const capEnglishVideoSegment = <T extends {
  audioFile: { extension: string; data: Uint8Array<ArrayBuffer> };
  durationMs: number;
  chunks: TtsChunkTiming[];
}>(
  result: T,
  segment: { kind: string; text: string },
): T => {
  if (segment.kind !== "pronunciation") {
    return result;
  }

  const maxDurationMs = maxEnglishPronunciationDurationMs;

  if (
    result.audioFile.extension !== "wav" ||
    result.durationMs <= maxDurationMs
  ) {
    return result;
  }

  const clipped = clipWavToDuration(result.audioFile.data, maxDurationMs);

  return {
    ...result,
    audioFile: {
      ...result.audioFile,
      data: clipped.bytes,
    },
    durationMs: clipped.durationMs,
    chunks: [
      {
        text: segment.text,
        startMs: 0,
        endMs: clipped.durationMs,
      },
    ],
  };
};

const synthesizeOpenAISpeechSegment = async ({
  config,
  text,
}: {
  config: ReturnType<typeof readProviderConfig>;
  text: string;
}) => {
  const speechResponse = await fetch(`${config.OPENAI_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.TTS_MODEL,
      voice: config.TTS_VOICE,
      input: text,
      response_format: config.TTS_RESPONSE_FORMAT,
    }),
  });

  if (!speechResponse.ok) {
    throw new Error(
      `OpenAI speech generation failed: ${speechResponse.status} ${await readErrorMessage(
        speechResponse,
      )}`,
    );
  }

  const audioBytes = new Uint8Array(await speechResponse.arrayBuffer());
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([audioBytes], {
      type: speechResponse.headers.get("content-type") ?? "application/octet-stream",
    }),
    `segment.${config.TTS_RESPONSE_FORMAT}`,
  );
  formData.append("model", config.ALIGNMENT_MODEL);
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  const transcriptionResponse = await fetch(`${config.OPENAI_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!transcriptionResponse.ok) {
    throw new Error(
      `OpenAI transcription alignment failed: ${transcriptionResponse.status} ${await readErrorMessage(
        transcriptionResponse,
      )}`,
    );
  }

  const transcription = (await transcriptionResponse.json()) as Record<string, unknown>;
  const durationMs =
    parseDurationMs(transcription.duration) ?? Math.max(900, text.length * 55);
  const trimmed = trimSilenceFromWav(audioBytes);

  return {
    audioFile: {
      extension: config.TTS_RESPONSE_FORMAT,
      data: trimmed.bytes,
    },
    durationMs: trimmed.durationMs,
    chunks: shiftChunks(
      parseChunkTimings(transcription, text, durationMs),
      trimmed.trimStartMs,
      trimmed.durationMs,
    ),
  };
};

const synthesizeQwenLocalSegment = async ({
  config,
  segment,
  language = config.QWEN_TTS_LANGUAGE,
  instruct = config.QWEN_TTS_INSTRUCT,
}: {
  config: ReturnType<typeof readProviderConfig>;
  segment: { text: string };
  language?: string;
  instruct?: string;
}) => {
  const textParts = buildQwenTextParts({
    text: segment.text,
    language,
    instruct,
  });
  const audioFiles: Uint8Array<ArrayBuffer>[] = [];
  const chunks: TtsChunkTiming[] = [];
  let currentStartMs = 0;

  for (const textPart of textParts) {
    const response = await fetch(
      `${trimTrailingSlash(config.QWEN_TTS_BASE_URL)}/v1/audio/speech`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: textPart.spokenText,
          speaker: config.QWEN_TTS_SPEAKER,
          language: textPart.language,
          instruct: textPart.instruct,
          ...qwenGenerationOptions(config),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Qwen local TTS generation failed: ${response.status} ${await readErrorMessage(
          response,
        )}`,
      );
    }

    const audioBytes: Uint8Array<ArrayBuffer> = new Uint8Array(await response.arrayBuffer());
    const trimmed = trimSilenceFromWav(audioBytes);
    const compressed = compressInternalSilenceFromWav(trimmed.bytes);
    const audio =
      textPart.language === "English" && compressed.durationMs > maxEnglishPronunciationDurationMs
        ? clipWavToDuration(compressed.bytes, maxEnglishPronunciationDurationMs)
        : { bytes: compressed.bytes, durationMs: compressed.durationMs };
    const durationMs = audio.durationMs;
    const endMs = currentStartMs + durationMs;

    audioFiles.push(audio.bytes);
    chunks.push({
      text: textPart.text,
      startMs: currentStartMs,
      endMs,
    });
    currentStartMs = endMs;
  }

  return {
    audioFile: {
      extension: "wav",
      data: concatenateWavFiles(audioFiles),
    },
    durationMs: currentStartMs,
    chunks,
  };
};

export const createTtsProvider = (): TtsProvider => {
  const config = readProviderConfig();
  const ensureQwenReady = async () => {
    await ensureQwenTtsCloneServer(config);
  };

  if (config.TTS_PROVIDER === "qwen-local") {
    return {
      synthesizeSegments: async ({ topicId, segments }) => {
        await ensureQwenReady();

        if (segments.some((segment) => isEnglishPronunciationSegment(topicId, segment))) {
          const results = [];

          for (const segment of segments) {
            if (isEnglishPronunciationSegment(topicId, segment)) {
              const result = config.OPENAI_API_KEY
                ? await synthesizeOpenAISpeechSegment({ config, text: segment.text })
                : await synthesizeQwenLocalSegment({
                    config,
                    segment,
                    language: config.QWEN_TTS_LANGUAGE,
                    instruct: buildQwenPronunciationFallbackInstruction(segment.text),
                  });

              results.push(capEnglishVideoSegment(result, segment));
              continue;
            }

            const result = await synthesizeQwenLocalSegment({
              config,
              segment,
            });

            results.push(
              topicId.startsWith("english-")
                ? capEnglishVideoSegment(result, segment)
                : result,
            );
          }

          return results;
        }

        const response = await fetch(
          `${trimTrailingSlash(config.QWEN_TTS_BASE_URL)}/v1/audio/speech-batch`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              items: segments.map((segment) => ({
                id: segment.id,
                text: segment.text,
                speaker: config.QWEN_TTS_SPEAKER,
                language: config.QWEN_TTS_LANGUAGE,
                instruct: config.QWEN_TTS_INSTRUCT,
              })),
              ...qwenGenerationOptions(config),
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `Qwen local TTS batch generation failed: ${response.status} ${await readErrorMessage(
              response,
            )}`,
          );
        }

        const payload = (await response.json()) as {
          items?: Array<{ id?: unknown; audioBase64?: unknown }>;
        };
        const items = Array.isArray(payload.items) ? payload.items : [];

        return segments.map((segment) => {
          const item = items.find((candidate) => candidate.id === segment.id);

          if (!item || typeof item.audioBase64 !== "string") {
            throw new Error(`Qwen local TTS batch response missing audio for ${segment.id}`);
          }

          return buildQwenSynthesizedSegment({
            text: segment.text,
            audioBytes: decodeBase64(item.audioBase64),
          });
        });
      },
      synthesizeSegment: async ({ topicId, segment }) => {
        await ensureQwenReady();
        if (isEnglishPronunciationSegment(topicId, segment) && config.OPENAI_API_KEY) {
          const result = await synthesizeOpenAISpeechSegment({
            config,
            text: segment.text,
          });

          return capEnglishVideoSegment(result, segment);
        }

        if (isEnglishPronunciationSegment(topicId, segment)) {
          const result = await synthesizeQwenLocalSegment({
            config,
            segment,
            language: config.QWEN_TTS_LANGUAGE,
            instruct: buildQwenPronunciationFallbackInstruction(segment.text),
          });

          return capEnglishVideoSegment(result, segment);
        }

        const result = await synthesizeQwenLocalSegment({
          config,
          segment,
        });

        return topicId.startsWith("english-")
          ? capEnglishVideoSegment(result, segment)
          : result;
      },
    };
  }

  if (config.TTS_PROVIDER === "openai" && config.PIPELINE_PROVIDER_MODE === "openai") {
    return {
      synthesizeSegment: async ({ segment }) => {
        const speechResponse = await fetch(`${config.OPENAI_BASE_URL}/audio/speech`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.TTS_MODEL,
            voice: config.TTS_VOICE,
            input: segment.text,
            response_format: config.TTS_RESPONSE_FORMAT,
          }),
        });

        if (!speechResponse.ok) {
          throw new Error(
            `OpenAI speech generation failed: ${speechResponse.status} ${await readErrorMessage(
              speechResponse,
            )}`,
          );
        }

        const audioBytes = new Uint8Array(await speechResponse.arrayBuffer());
        const formData = new FormData();
        formData.append(
          "file",
          new Blob([audioBytes], {
            type: speechResponse.headers.get("content-type") ?? "application/octet-stream",
          }),
          `segment.${config.TTS_RESPONSE_FORMAT}`,
        );
        formData.append("model", config.ALIGNMENT_MODEL);
        formData.append("response_format", "verbose_json");
        formData.append("timestamp_granularities[]", "segment");

        const transcriptionResponse = await fetch(
          `${config.OPENAI_BASE_URL}/audio/transcriptions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.OPENAI_API_KEY}`,
            },
            body: formData,
          },
        );

        if (!transcriptionResponse.ok) {
          throw new Error(
            `OpenAI transcription alignment failed: ${transcriptionResponse.status} ${await readErrorMessage(
              transcriptionResponse,
            )}`,
          );
        }

        const transcription = (await transcriptionResponse.json()) as Record<
          string,
          unknown
        >;
        const durationMs =
          parseDurationMs(transcription.duration) ??
          Math.max(900, segment.text.length * 55);

        return {
          audioFile: {
            extension: config.TTS_RESPONSE_FORMAT,
            data: audioBytes,
          },
          durationMs,
          chunks: parseChunkTimings(transcription, segment.text, durationMs),
        };
      },
    };
  }

  return {
    synthesizeSegment: async ({ topicId, segment }) => {
      const durationMs = getMockDurationMs({
        topicId,
        kind: segment.kind,
        text: segment.text,
      });

      return {
        audioFile: {
          extension: "wav",
          data: createMockWavBytes(durationMs),
        },
        durationMs,
        chunks: [
          {
            text: segment.text,
            startMs: 0,
            endMs: durationMs,
          },
        ],
      };
    },
  };
};
