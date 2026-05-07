import { z } from "zod";
import { subjectSchema } from "../curriculum/schema";
import { scriptSegmentSchema, storyboardSceneSchema } from "../draft/schema";
import { researchSourceSchema } from "../research/schema";

export const approvedSourceSummarySchema = z.object({
  canonicalTitle: z.string().min(1),
  phonetic: z.string().optional(),
  definitions: z.array(z.string()),
  formulas: z.array(z.string()),
  principles: z.array(z.string()),
  examples: z.array(z.string()),
  misconceptions: z.array(z.string()),
  prerequisites: z.array(z.string()),
  nextConnections: z.array(z.string()),
  visualizationHints: z.array(z.string()),
  sources: z.array(researchSourceSchema),
});

export const approvedLessonSchema = z.object({
  topicId: z.string().min(1),
  subject: subjectSchema,
  version: z.number().int().positive(),
  approvedAt: z.string().min(1),
  reviewNotes: z.array(z.string().min(1)),
  approvedScript: z.array(scriptSegmentSchema).min(1),
  approvedStoryboard: z.array(storyboardSceneSchema).min(1),
  sourceSummary: approvedSourceSummarySchema,
});

export type ApprovedSourceSummary = z.infer<typeof approvedSourceSummarySchema>;
export type ApprovedLesson = z.infer<typeof approvedLessonSchema>;
