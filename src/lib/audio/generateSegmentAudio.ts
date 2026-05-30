import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readApprovedLesson } from "../review/readApprovedLesson";
import { getTopicWorkspace } from "../workspace/getTopicWorkspace";
import { buildSubtitleTrack } from "./buildSubtitleTrack";
import { saveAudioManifest } from "./saveAudioManifest";
import {
  audioManifestSchema,
  synthesizedSegmentSchema,
  type AudioManifest,
} from "./schema";
import type { TtsProvider } from "./ttsProvider";

export const generateSegmentAudio = async ({
  topicId,
  provider,
  generatedAt = new Date().toISOString(),
}: {
  topicId: string;
  provider: TtsProvider;
  generatedAt?: string;
}): Promise<AudioManifest> => {
  const approvedLesson = await readApprovedLesson(topicId);
  const audioDirectory = path.join(getTopicWorkspace(topicId), "audio");

  await mkdir(audioDirectory, { recursive: true });

  const approvedSegments = approvedLesson.approvedScript;
  const synthesizedResults = provider.synthesizeSegments
    ? await provider.synthesizeSegments({
        topicId,
        segments: approvedSegments,
      })
    : await Promise.all(
        approvedSegments.map((segment) =>
          provider.synthesizeSegment({
            topicId,
            segment,
          }),
        ),
      );
  const segments = [];

  for (const [index, segment] of approvedSegments.entries()) {
    const synthesized = synthesizedSegmentSchema.parse(
      synthesizedResults[index],
    );
    const extension = synthesized.audioFile.extension.replace(/^\.+/, "");
    const fileName = `${segment.id}.${extension}`;

    await writeFile(
      path.join(audioDirectory, fileName),
      synthesized.audioFile.data,
    );
    segments.push({
      segmentId: segment.id,
      kind: segment.kind,
      text: segment.text,
      audioPath: path.posix.join("audio", fileName),
      durationMs: synthesized.durationMs,
      chunks: synthesized.chunks,
    });
  }

  const subtitleTrack = buildSubtitleTrack(
    segments.map(({ segmentId, durationMs, chunks }) => ({
      segmentId,
      durationMs,
      chunks,
    })),
  );
  const manifest = audioManifestSchema.parse({
    topicId,
    version: 1,
    ttsProvider: provider.name,
    generatedAt,
    segments,
    subtitleTrack,
    totalDurationMs: segments.reduce(
      (total, segment) => total + segment.durationMs,
      0,
    ),
  });

  await saveAudioManifest(manifest);

  return manifest;
};
