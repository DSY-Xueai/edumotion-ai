import { subjectSchema, type Subject } from "./schema";

export const inferSubjectFromTopicId = (topicId: string): Subject => {
  const prefix = topicId.split("-")[0];
  const parsed = subjectSchema.safeParse(prefix);
  return parsed.success ? parsed.data : "math";
};
