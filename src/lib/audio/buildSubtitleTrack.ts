import {
  subtitleTrackSchema,
  subtitleTrackSourceSegmentSchema,
  type SubtitleTrack,
  type SubtitleTrackSourceSegment,
} from "./schema";

export const buildSubtitleTrack = (
  sourceSegments: SubtitleTrackSourceSegment[],
): SubtitleTrack => {
  const parsedSegments = sourceSegments.map((segment) =>
    subtitleTrackSourceSegmentSchema.parse(segment),
  );
  const cues = [];
  let offsetMs = 0;

  for (const segment of parsedSegments) {
    let cueIndex = 0;

    for (const chunk of segment.chunks) {
      const text = chunk.text.trim();
      const startMs = offsetMs + Math.min(chunk.startMs, segment.durationMs);
      const endMs = offsetMs + Math.min(chunk.endMs, segment.durationMs);

      if (!text || endMs <= startMs) {
        continue;
      }

      cueIndex += 1;
      cues.push({
        id: `${segment.segmentId}:${cueIndex}`,
        segmentId: segment.segmentId,
        text,
        startMs,
        endMs,
      });
    }

    offsetMs += segment.durationMs;
  }

  return subtitleTrackSchema.parse({ cues });
};
