import type { TtsProvider } from "../audio/ttsProvider";
import { splitNarrationText } from "../audio/splitNarrationText";
import { concatenateWavFiles, readWavInfo } from "../audio/wav";
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
  const durationMs = readWavInfo(audioBytes).durationMs;

  return {
    audioFile: {
      extension: "wav",
      data: audioBytes,
    },
    durationMs,
    chunks: [
      {
        text,
        startMs: 0,
        endMs: durationMs,
      },
    ],
  };
};

const qwenGenerationOptions = (config: ReturnType<typeof readProviderConfig>) => ({
  seed: config.QWEN_TTS_SEED,
  do_sample: config.QWEN_TTS_DO_SAMPLE,
  temperature: config.QWEN_TTS_TEMPERATURE,
  top_p: config.QWEN_TTS_TOP_P,
});

const mockSceneDurationMs: Record<string, number> = {
  hook: 12000,
  definition: 14000,
  rule: 10000,
  compare: 10000,
  process: 12000,
  graph: 10000,
  pitfall: 8000,
  wrap: 8000,
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

export const createTtsProvider = (): TtsProvider => {
  const config = readProviderConfig();
  const ensureQwenReady = async () => {
    await ensureQwenTtsCloneServer(config);
  };

  if (config.TTS_PROVIDER === "qwen-local") {
    return {
      synthesizeSegments: async ({ segments }) => {
        await ensureQwenReady();
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
      synthesizeSegment: async ({ segment }) => {
        await ensureQwenReady();
        const textParts = splitNarrationText(segment.text);
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
                text: textPart,
                speaker: config.QWEN_TTS_SPEAKER,
                language: config.QWEN_TTS_LANGUAGE,
                instruct: config.QWEN_TTS_INSTRUCT,
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

          const audioBytes: Uint8Array<ArrayBuffer> = new Uint8Array(
            await response.arrayBuffer(),
          );
          const durationMs = readWavInfo(audioBytes).durationMs;
          const endMs = currentStartMs + durationMs;

          audioFiles.push(audioBytes);
          chunks.push({
            text: textPart,
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
    synthesizeSegment: async ({ segment }) => {
      const durationMs =
        mockSceneDurationMs[segment.kind] ??
        Math.max(2000, segment.text.length * 120);

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
