import { z } from "zod";

export const researchScopeSchema = z.literal("topic");

export const researchSourceTypeSchema = z.enum([
  "official",
  "education",
  "reference",
]);

export const researchSourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  sourceType: researchSourceTypeSchema,
  publisher: z.string().min(1),
  retrievedAt: z.string().min(1),
  quoteOrSummary: z.string().min(1),
});

export const topicResearchSchema = z.object({
  topicId: z.string().min(1),
  scope: researchScopeSchema,
  canonicalTitle: z.string().min(1),
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

export type ResearchScope = z.infer<typeof researchScopeSchema>;
export type ResearchSourceType = z.infer<typeof researchSourceTypeSchema>;
export type ResearchSource = z.infer<typeof researchSourceSchema>;
export type TopicResearch = z.infer<typeof topicResearchSchema>;
export type TopicResearchPayload = Omit<TopicResearch, "topicId" | "scope">;
