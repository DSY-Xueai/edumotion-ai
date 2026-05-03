import { loadCurriculum } from "../../lib/curriculum/loadCurriculum";
import { readTopicManifest } from "../../lib/workspace/readTopicManifest";

const readOption = (args: string[], name: string) => {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

export const handleTopicNext = async (args: string[]) => {
  const topicId = readOption(args, "--topic-id");

  if (!topicId) {
    throw new Error("Missing --topic-id");
  }

  const curriculum = await loadCurriculum("pep-2019");
  const topics = Object.values(curriculum.subjects).flatMap(
    (subjectGroup) => subjectGroup.topics,
  );
  const currentTopic = topics.find((topic) => topic.id === topicId);

  if (!currentTopic) {
    throw new Error(`Unknown topic: ${topicId}`);
  }

  console.log(
    JSON.stringify(
      {
        topicId: currentTopic.id,
        nextTopicId: currentTopic.nextTopicId ?? null,
      },
      null,
      2,
    ),
  );
};

export const handleTopicStatus = async (args: string[]) => {
  const topicId = readOption(args, "--topic-id");

  if (!topicId) {
    throw new Error("Missing --topic-id");
  }

  const manifest = await readTopicManifest(topicId);
  console.log(JSON.stringify(manifest, null, 2));
};
