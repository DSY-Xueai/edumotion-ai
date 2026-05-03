import { z } from "zod";
import type { TopicStatus } from "../workspace/schema";

export const revisionActionSchema = z.enum(["approve", "regenerate", "edit"]);

export const revisionActionInputSchema = z.object({
  action: revisionActionSchema,
  reviewNotes: z.array(z.string().min(1)).default([]),
});

export const getStatusForRevisionAction = (
  action: z.infer<typeof revisionActionSchema>,
): TopicStatus => (action === "approve" ? "approved" : "revision_requested");

export type RevisionAction = z.infer<typeof revisionActionSchema>;
export type RevisionActionInput = z.infer<typeof revisionActionInputSchema>;
