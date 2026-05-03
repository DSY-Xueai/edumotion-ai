import { z } from "zod";

export const storyboardSceneTypeSchema = z.enum([
  "hook",
  "definition",
  "rule",
  "compare",
  "process",
  "graph",
  "pitfall",
  "wrap",
]);

export const scriptSegmentSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  text: z.string().min(1),
});

export const storyboardSceneSchema = z.object({
  id: z.string().min(1),
  type: storyboardSceneTypeSchema,
  segmentIds: z.array(z.string().min(1)).min(1),
  durationSec: z.number().positive(),
});

export const subtitleDraftItemSchema = z.object({
  id: z.string().min(1),
  segmentId: z.string().min(1),
  text: z.string().min(1),
});

export const lessonDraftSchema = z.object({
  topicId: z.string().min(1),
  toneProfile: z.string().min(1),
  durationTargetSec: z.number().int().positive(),
  hook: z.string().min(1),
  summary: z.string().min(1),
  scriptSegments: z.array(scriptSegmentSchema).min(1),
  storyboardScenes: z.array(storyboardSceneSchema).min(1),
  subtitleDraft: z.array(subtitleDraftItemSchema),
  visualPlan: z.array(z.string().min(1)),
  qaNotes: z.array(z.string()),
});

export type StoryboardSceneType = z.infer<typeof storyboardSceneTypeSchema>;
export type ScriptSegment = z.infer<typeof scriptSegmentSchema>;
export type StoryboardScene = z.infer<typeof storyboardSceneSchema>;
export type SubtitleDraftItem = z.infer<typeof subtitleDraftItemSchema>;
export type LessonDraft = z.infer<typeof lessonDraftSchema>;
export type LessonDraftPayload = Omit<LessonDraft, "topicId">;
