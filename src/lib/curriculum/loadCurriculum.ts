import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  curriculumIndexSchema,
  type CurriculumEdition,
  type LoadedCurriculum,
  type Subject,
  type TopicNode,
} from "./schema";

const SUBJECTS: Subject[] = ["math", "physics", "chemistry"];

const sortTopics = (topics: TopicNode[]) =>
  [...topics].sort((left, right) => left.orderIndex - right.orderIndex);

export const loadCurriculum = async (
  edition: CurriculumEdition,
): Promise<LoadedCurriculum> => {
  const curriculumPath = path.join(
    process.cwd(),
    "curriculum",
    edition,
    "index.json",
  );
  const rawContent = await readFile(curriculumPath, "utf8");
  const parsedContent = curriculumIndexSchema.parse(JSON.parse(rawContent));

  const subjects = SUBJECTS.reduce<LoadedCurriculum["subjects"]>(
    (result, subject) => {
      result[subject] = {
        id: subject,
        topics: sortTopics(
          parsedContent.topics.filter((topic) => topic.subject === subject),
        ),
      };

      return result;
    },
    {} as LoadedCurriculum["subjects"],
  );

  return {
    edition: parsedContent.edition,
    subjects,
  };
};
