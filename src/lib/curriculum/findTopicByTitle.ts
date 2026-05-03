import type { LoadedCurriculum, TopicNode } from "./schema";

export const findTopicByTitle = (
  curriculum: LoadedCurriculum,
  title: string,
): TopicNode | undefined =>
  Object.values(curriculum.subjects)
    .flatMap((subjectGroup) => subjectGroup.topics)
    .find((topic) => topic.title === title);
