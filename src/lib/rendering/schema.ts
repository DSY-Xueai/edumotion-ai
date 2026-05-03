import { z } from "zod";
import { subjectSchema } from "../curriculum/schema";
import { subtitleCueSchema } from "../audio/schema";
import { scriptSegmentSchema, storyboardSceneTypeSchema } from "../draft/schema";

const aspectRatioSchema = z.literal("9:16");

export const timedRenderSegmentSchema = scriptSegmentSchema.extend({
  audioPath: z.string().min(1),
  durationMs: z.number().int().positive(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
});

export const timedRenderSceneSchema = z.object({
  id: z.string().min(1),
  type: storyboardSceneTypeSchema,
  segmentIds: z.array(z.string().min(1)).min(1),
  narration: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  durationMs: z.number().int().positive(),
  targetDurationMs: z.number().int().positive(),
  segments: z.array(timedRenderSegmentSchema).min(1),
  subtitleCues: z.array(subtitleCueSchema),
});

export const renderPackageSceneSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  component: z.string().min(1),
  durationInFrames: z.number().int().positive(),
  payload: z.record(z.string(), z.unknown()),
});

export const renderPackageSchema = z.object({
  topicId: z.string().min(1),
  lessonVersion: z.number().int().positive(),
  canonicalTitle: z.string().min(1),
  approvedAt: z.string().min(1),
  generatedAt: z.string().min(1),
  totalDurationMs: z.number().int().positive(),
  meta: z.object({
    topicId: z.string().min(1),
    subject: subjectSchema,
    aspectRatio: aspectRatioSchema,
  }),
  subject: subjectSchema,
  themeTokens: z.object({
    palette: z.string().min(1),
    typography: z.string().min(1),
    accent: z.string().min(1),
  }),
  audioTracks: z.array(
    z.object({
      id: z.string().min(1),
      file: z.string().min(1),
      sourceFile: z.string().min(1),
      startMs: z.number().int().nonnegative(),
      endMs: z.number().int().positive(),
      durationMs: z.number().int().positive(),
    }),
  ),
  subtitleTrack: z.object({
    topicId: z.string().min(1),
    subject: subjectSchema,
    cues: z.array(subtitleCueSchema),
  }),
  scenes: z.array(renderPackageSceneSchema).min(1),
  durationInFrames: z.number().int().positive(),
});

export type TimedRenderSegment = z.infer<typeof timedRenderSegmentSchema>;
export type TimedRenderScene = z.infer<typeof timedRenderSceneSchema>;
export type RenderPackageScene = z.infer<typeof renderPackageSceneSchema>;
export type RenderSegment = TimedRenderSegment;
export type RenderScene = TimedRenderScene;
export type RenderPackage = z.infer<typeof renderPackageSchema>;
