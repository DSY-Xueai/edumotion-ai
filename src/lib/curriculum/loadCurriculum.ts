import { readFile } from "node:fs/promises";
import path from "node:path";
import { readEnglishWordbank, buildEnglishTopicNodes } from "./englishWordbank";
import {
  curriculumIndexSchema,
  type CurriculumEdition,
  type LoadedCurriculum,
  type Subject,
  type TopicNode,
} from "./schema";

const SUBJECTS: Subject[] = ["math", "physics", "chemistry", "english"];

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

  let englishTopics: TopicNode[] = [];
  try {
    const englishWordbank = await readEnglishWordbank();
    englishTopics = buildEnglishTopicNodes(englishWordbank);
  } catch (error) {
    if (!(error instanceof Error) || !/ENOENT|no such file or directory/i.test(error.message)) {
      throw error;
    }
  }

  const allTopics = [...parsedContent.topics, ...englishTopics];

  const subjects = SUBJECTS.reduce<LoadedCurriculum["subjects"]>(
    (result, subject) => {
      result[subject] = {
        id: subject,
        topics: sortTopics(
          allTopics.filter((topic) => topic.subject === subject),
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
