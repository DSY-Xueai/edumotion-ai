import type { ResearchProvider } from "./researchProvider";
import { saveResearch } from "./saveResearch";

export const runResearch = async ({
  topicId,
  provider,
}: {
  topicId: string;
  provider: ResearchProvider;
}) => {
  const result = await provider.researchTopic({
    topicId,
    promptContext: topicId,
  });

  await saveResearch({
    topicId,
    scope: "topic",
    ...result,
  });

  return result;
};
