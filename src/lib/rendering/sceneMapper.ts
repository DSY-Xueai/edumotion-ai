import type { AudioManifest, SubtitleCue } from "../audio/schema";
import type { ApprovedLesson } from "../review/schema";
import type { TimedRenderScene, TimedRenderSegment } from "./schema";

const buildTimedSegments = (
  audioManifest: AudioManifest,
): Map<string, TimedRenderSegment> => {
  let currentStartMs = 0;
  const segmentMap = new Map<string, TimedRenderSegment>();

  for (const segment of audioManifest.segments) {
    const startMs = currentStartMs;
    const endMs = startMs + segment.durationMs;

    segmentMap.set(segment.segmentId, {
      id: segment.segmentId,
      kind: segment.kind,
      text: segment.text,
      audioPath: segment.audioPath,
      durationMs: segment.durationMs,
      startMs,
      endMs,
    });

    currentStartMs = endMs;
  }

  return segmentMap;
};

const collectSubtitleCues = (
  cues: SubtitleCue[],
  segmentIds: string[],
): SubtitleCue[] => cues.filter((cue) => segmentIds.includes(cue.segmentId));

export const mapScenesForRender = ({
  approvedScript,
  approvedStoryboard,
  audioManifest,
}: Pick<ApprovedLesson, "approvedScript" | "approvedStoryboard"> & {
  audioManifest: AudioManifest;
}): TimedRenderScene[] => {
  const scriptMap = new Map(
    approvedScript.map((segment) => [segment.id, segment] as const),
  );
  const timedSegments = buildTimedSegments(audioManifest);

  return approvedStoryboard.map((scene) => {
    const segments = scene.segmentIds.map((segmentId) => {
      const scriptSegment = scriptMap.get(segmentId);
      const timedSegment = timedSegments.get(segmentId);

      if (!scriptSegment || !timedSegment) {
        throw new Error(`Missing render segment data for "${segmentId}".`);
      }

      return timedSegment;
    });

    const startMs = segments[0]!.startMs;
    const endMs = segments[segments.length - 1]!.endMs;
    const subtitleCues = collectSubtitleCues(
      audioManifest.subtitleTrack.cues,
      scene.segmentIds,
    );

    return {
      id: scene.id,
      type: scene.type,
      segmentIds: scene.segmentIds,
      narration: segments.map((segment) => segment.text).join(" "),
      startMs,
      endMs,
      durationMs: endMs - startMs,
      targetDurationMs: Math.round(scene.durationSec * 1000),
      segments,
      subtitleCues,
    };
  });
};
