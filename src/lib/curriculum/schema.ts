import { z } from "zod";

export const subjectSchema = z.enum(["math", "physics", "chemistry"]);
export const curriculumEditionSchema = z.literal("pep-2019");

export const topicNodeSchema = z.object({
  id: z.string().min(1),
  subject: subjectSchema,
  edition: curriculumEditionSchema,
  volume: z.string().min(1),
  chapter: z.string().min(1),
  section: z.string().min(1),
  title: z.string().min(1),
  nodeType: z.literal("topic"),
  parentId: z.string().min(1),
  prevTopicId: z.string().optional(),
  nextTopicId: z.string().optional(),
  orderIndex: z.number().int().nonnegative(),
});

export const curriculumIndexSchema = z.object({
  edition: curriculumEditionSchema,
  topics: z.array(topicNodeSchema),
});

export type Subject = z.infer<typeof subjectSchema>;
export type CurriculumEdition = z.infer<typeof curriculumEditionSchema>;
export type TopicNode = z.infer<typeof topicNodeSchema>;
export type CurriculumIndex = z.infer<typeof curriculumIndexSchema>;

export type CurriculumSubjectGroup = {
  id: Subject;
  topics: TopicNode[];
};

export type LoadedCurriculum = {
  edition: CurriculumEdition;
  subjects: Record<Subject, CurriculumSubjectGroup>;
};
