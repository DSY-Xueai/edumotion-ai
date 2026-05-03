import { readTopicManifest } from "../workspace/readTopicManifest";
import { loadCurriculum } from "../curriculum/loadCurriculum";

const isMissingManifestError = (error: unknown) =>
  error instanceof Error &&
  /ENOENT|no such file or directory/i.test(error.message);

export const getNextRunnableTopic = async () => {
  const curriculum = await loadCurriculum("pep-2019");
  const topics = Object.values(curriculum.subjects).flatMap(
    (subjectGroup) => subjectGroup.topics,
  );

  for (const topic of topics) {
    try {
      const manifest = await readTopicManifest(topic.id);

      if (manifest.status !== "rendered") {
        return topic;
      }
    } catch (error) {
      if (isMissingManifestError(error)) {
        return topic;
      }

      throw error;
    }
  }

  return null;
};
