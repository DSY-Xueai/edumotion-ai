import { z } from "zod";

export const englishBatchFailureStageSchema = z.enum([
  "draft_quality",
  "duplicate_copy",
  "audio_quality",
  "render_quality",
  "visual_quality",
  "environment",
]);

export const englishBatchTopicStatusSchema = z.enum([
  "queued",
  "attempting",
  "retrying",
  "passed",
  "retry_passed",
  "failed",
  "skipped",
]);

const englishBatchTopicIdSchema = z.string().regex(/^english-word-\d{5}$/u);
const englishBatchTimestampSchema = z.iso.datetime();

export const englishBatchInputSchema = z
  .object({
    topicIds: z.array(englishBatchTopicIdSchema).min(1),
    targetPassed: z.number().int().positive(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const uniqueTopicIds = new Set(input.topicIds);

    if (uniqueTopicIds.size !== input.topicIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["topicIds"],
        message: "topicIds must be unique",
      });
    }

    if (input.targetPassed > input.topicIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetPassed"],
        message: "targetPassed cannot exceed topicIds length",
      });
    }
  });

export const englishBatchAttemptSchema = z
  .object({
    attempt: z.literal(1).or(z.literal(2)),
    stage: englishBatchFailureStageSchema,
    reason: z.string().min(1),
    failedCheckIds: z.array(z.string().min(1)),
    at: englishBatchTimestampSchema,
  })
  .strict();

export const englishBatchFailedTopicSchema = z
  .object({
    topicId: englishBatchTopicIdSchema,
    word: z.string().min(1),
    finalStatus: z.literal("failed"),
    attempts: z.array(englishBatchAttemptSchema).min(1).max(2),
  })
  .strict();

export const englishBatchManifestSchema = z
  .object({
    id: z.string().min(1),
    createdAt: englishBatchTimestampSchema,
    updatedAt: englishBatchTimestampSchema,
    targetPassed: z.number().int().positive(),
    inputTopicIds: z.array(englishBatchTopicIdSchema).min(1),
    passedTopicIds: z.array(englishBatchTopicIdSchema),
    retryPassedTopicIds: z.array(englishBatchTopicIdSchema).default([]),
    failedTopics: z.array(englishBatchFailedTopicSchema),
    unprocessedTopicIds: z.array(englishBatchTopicIdSchema),
  })
  .strict();

export type EnglishBatchFailureStage = z.infer<typeof englishBatchFailureStageSchema>;
export type EnglishBatchTopicStatus = z.infer<typeof englishBatchTopicStatusSchema>;
export type EnglishBatchAttempt = z.infer<typeof englishBatchAttemptSchema>;
export type EnglishBatchFailedTopic = z.infer<typeof englishBatchFailedTopicSchema>;
export type EnglishBatchManifest = z.infer<typeof englishBatchManifestSchema>;
export type EnglishBatchInput = z.infer<typeof englishBatchInputSchema>;
