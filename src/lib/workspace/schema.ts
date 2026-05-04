import { z } from "zod";

export const topicStatusSchema = z.enum([
  "not_started",
  "researched",
  "draft_generated",
  "pending_review",
  "revision_requested",
  "approved",
  "tts_generated",
  "subtitle_aligned",
  "rendered",
  "failed",
]);

export const topicManifestSchema = z.object({
  topicId: z.string().min(1),
  status: topicStatusSchema,
  updatedAt: z.string().min(1),
});

export type TopicStatus = z.infer<typeof topicStatusSchema>;
export type TopicManifest = z.infer<typeof topicManifestSchema>;
