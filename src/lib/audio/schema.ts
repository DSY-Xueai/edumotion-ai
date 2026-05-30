import { z } from "zod";

export const ttsChunkTimingSchema = z
  .object({
    text: z.string(),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
  })
  .refine(({ startMs, endMs }) => endMs >= startMs, {
    message: "Chunk timing endMs must be greater than or equal to startMs.",
    path: ["endMs"],
  });

export const synthesizedAudioFileSchema = z.object({
  extension: z.string().min(1),
  data: z.instanceof(Uint8Array),
});

export const ttsProviderNameSchema = z.enum(["mock", "openai", "qwen-local"]);

export const synthesizedSegmentSchema = z.object({
  audioFile: synthesizedAudioFileSchema,
  durationMs: z.number().int().positive(),
  chunks: z.array(ttsChunkTimingSchema).min(1),
});

export const subtitleTrackSourceSegmentSchema = z.object({
  segmentId: z.string().min(1),
  durationMs: z.number().int().positive(),
  chunks: z.array(ttsChunkTimingSchema).min(1),
});

export const subtitleCueSchema = z
  .object({
    id: z.string().min(1),
    segmentId: z.string().min(1),
    text: z.string().min(1),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
  })
  .refine(({ startMs, endMs }) => endMs > startMs, {
    message: "Subtitle cue endMs must be greater than startMs.",
    path: ["endMs"],
  });

export const subtitleTrackSchema = z.object({
  cues: z.array(subtitleCueSchema),
});

export const audioSegmentManifestSchema = z.object({
  segmentId: z.string().min(1),
  kind: z.string().min(1),
  text: z.string().min(1),
  audioPath: z.string().min(1),
  durationMs: z.number().int().positive(),
  chunks: z.array(ttsChunkTimingSchema).min(1),
});

export const audioManifestSchema = z.object({
  topicId: z.string().min(1),
  version: z.literal(1),
  ttsProvider: ttsProviderNameSchema,
  generatedAt: z.string().min(1),
  segments: z.array(audioSegmentManifestSchema).min(1),
  subtitleTrack: subtitleTrackSchema,
  totalDurationMs: z.number().int().positive(),
});

export type TtsChunkTiming = z.infer<typeof ttsChunkTimingSchema>;
export type SynthesizedAudioFile = z.infer<typeof synthesizedAudioFileSchema>;
export type TtsProviderName = z.infer<typeof ttsProviderNameSchema>;
export type SynthesizedSegment = z.infer<typeof synthesizedSegmentSchema>;
export type SubtitleTrackSourceSegment = z.infer<
  typeof subtitleTrackSourceSegmentSchema
>;
export type SubtitleCue = z.infer<typeof subtitleCueSchema>;
export type SubtitleTrack = z.infer<typeof subtitleTrackSchema>;
export type AudioSegmentManifest = z.infer<typeof audioSegmentManifestSchema>;
export type AudioManifest = z.infer<typeof audioManifestSchema>;
