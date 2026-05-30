import { generateSegmentAudio } from "../audio/generateSegmentAudio";
import { estimateMinimumSpeechDurationMs } from "../audio/estimateSpeechTiming";
import type { TtsProvider } from "../audio/ttsProvider";
import { assertTtsReadyForFinalRender } from "../providers/config";
import { createTtsProvider } from "../providers/createTtsProvider";
import { readApprovedLesson } from "../review/readApprovedLesson";
import { buildRenderPackage } from "../rendering/buildRenderPackage";
import { saveRenderPackage } from "../rendering/saveRenderPackage";

const assertEnglishAudioReadyForRender = ({
  topicId,
  totalDurationMs,
  segments,
}: {
  topicId: string;
  totalDurationMs: number;
  segments: Array<{
    segmentId: string;
    kind: string;
    text: string;
    durationMs: number;
    chunks: Array<{ endMs: number; startMs: number; text: string }>;
  }>;
}) => {
  if (!topicId.startsWith("english-")) {
    return;
  }

  if (totalDurationMs > 30_000) {
    throw new Error(
      `English audio duration exceeds the 30s render limit: ${totalDurationMs}ms.`,
    );
  }

  const longSegment = segments.find((segment) => segment.durationMs > 8_000);
  if (longSegment) {
    throw new Error(
      `English audio segment ${longSegment.segmentId} is too long for render: ${longSegment.durationMs}ms.`,
    );
  }

  const longCue = segments
    .flatMap((segment) =>
      segment.chunks.map((chunk) => ({
        segmentId: segment.segmentId,
        durationMs: chunk.endMs - chunk.startMs,
      })),
    )
    .find((chunk) => chunk.durationMs > 6_000);
  if (longCue) {
    throw new Error(
      `English subtitle cue for ${longCue.segmentId} is too long for render: ${longCue.durationMs}ms.`,
    );
  }

  const shortSegment = segments.find((segment) => {
    const minimumDurationMs = estimateMinimumSpeechDurationMs({
      text: segment.text,
      kind: segment.kind,
    });

    return segment.durationMs < minimumDurationMs;
  });
  if (shortSegment) {
    const minimumDurationMs = estimateMinimumSpeechDurationMs({
      text: shortSegment.text,
      kind: shortSegment.kind,
    });

    throw new Error(
      `English audio segment ${shortSegment.segmentId} is too short for its script text: ${shortSegment.durationMs}ms, expected at least ${minimumDurationMs}ms.`,
    );
  }

  const shortCue = segments
    .flatMap((segment) =>
      segment.chunks.map((chunk) => {
        const durationMs = chunk.endMs - chunk.startMs;

        return {
          segmentId: segment.segmentId,
          durationMs,
          minimumDurationMs: estimateMinimumSpeechDurationMs({
            text: chunk.text,
            kind: segment.kind,
          }),
        };
      }),
    )
    .find((chunk) => chunk.durationMs < chunk.minimumDurationMs);
  if (shortCue) {
    throw new Error(
      `English subtitle cue for ${shortCue.segmentId} is too short for its script text: ${shortCue.durationMs}ms, expected at least ${shortCue.minimumDurationMs}ms.`,
    );
  }
};

export const runApprovedToRender = async ({
  topicId,
  ttsProvider,
  allowMockAudio = false,
  renderedAt = new Date().toISOString(),
}: {
  topicId: string;
  ttsProvider?: TtsProvider;
  allowMockAudio?: boolean;
  renderedAt?: string;
}) => {
  const approvedLesson = await readApprovedLesson(topicId);
  const resolvedTtsProvider =
    ttsProvider ??
    (() => {
      assertTtsReadyForFinalRender({ allowMockAudio });
      return createTtsProvider();
    })();
  const audioManifest = await generateSegmentAudio({
    topicId,
    provider: resolvedTtsProvider,
    generatedAt: renderedAt,
  });
  assertEnglishAudioReadyForRender(audioManifest);
  const renderPackage = buildRenderPackage({
    approvedLesson,
    audioManifest,
  });

  await saveRenderPackage({
    topicId,
    renderPackage,
    renderedAt,
  });

  return renderPackage;
};
