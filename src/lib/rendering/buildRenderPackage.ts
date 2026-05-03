import path from "node:path";
import type { AudioManifest } from "../audio/schema";
import { getSubjectAdapter } from "../pipeline/getSubjectAdapter";
import type { ApprovedLesson } from "../review/schema";
import { getTopicWorkspace } from "../workspace/getTopicWorkspace";
import { renderPackageSchema, type RenderPackage } from "./schema";
import { mapScenesForRender } from "./sceneMapper";

export const buildRenderPackage = ({
  approvedLesson,
  audioManifest,
}: {
  approvedLesson: ApprovedLesson;
  audioManifest: AudioManifest;
}): RenderPackage => {
  const sceneMap = mapScenesForRender({
    approvedScript: approvedLesson.approvedScript,
    approvedStoryboard: approvedLesson.approvedStoryboard,
    audioManifest,
  });
  const subjectAdapter = getSubjectAdapter(approvedLesson.subject);
  const renderScenes = sceneMap.map((scene) =>
    subjectAdapter.mapScene({
      canonicalTitle: approvedLesson.sourceSummary.canonicalTitle,
      sourceSummary: approvedLesson.sourceSummary,
      scene,
    }),
  );
  const totalDurationInFrames = renderScenes.reduce(
    (total, scene) => total + scene.durationInFrames,
    0,
  );
  let audioOffsetMs = 0;

  return renderPackageSchema.parse({
    topicId: approvedLesson.topicId,
    lessonVersion: approvedLesson.version,
    canonicalTitle: approvedLesson.sourceSummary.canonicalTitle,
    approvedAt: approvedLesson.approvedAt,
    generatedAt: audioManifest.generatedAt,
    totalDurationMs: audioManifest.totalDurationMs,
    meta: {
      topicId: approvedLesson.topicId,
      subject: approvedLesson.subject,
      aspectRatio: "9:16",
    },
    subject: approvedLesson.subject,
    themeTokens: subjectAdapter.themeTokens(),
    audioTracks: audioManifest.segments.map((segment) => {
      const startMs = audioOffsetMs;
      const endMs = startMs + segment.durationMs;
      audioOffsetMs = endMs;

      return {
        id: segment.segmentId,
        file: path.posix.join(
          "generated",
          approvedLesson.topicId,
          "audio",
          path.posix.basename(segment.audioPath),
        ),
        sourceFile: path.join(
          getTopicWorkspace(approvedLesson.topicId),
          ...segment.audioPath.split("/"),
        ),
        startMs,
        endMs,
        durationMs: segment.durationMs,
      };
    }),
    subtitleTrack: {
      topicId: approvedLesson.topicId,
      subject: approvedLesson.subject,
      cues: audioManifest.subtitleTrack.cues,
    },
    scenes: renderScenes,
    durationInFrames: totalDurationInFrames,
  });
};
