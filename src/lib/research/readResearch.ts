import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTopicWorkspace } from "../workspace/getTopicWorkspace";
import { topicResearchSchema, type TopicResearch } from "./schema";

export const readResearch = async (topicId: string): Promise<TopicResearch> => {
  const researchPath = path.join(
    getTopicWorkspace(topicId),
    "research",
    "topic.json",
  );
  const rawContent = await readFile(researchPath, "utf8");

  return topicResearchSchema.parse(JSON.parse(rawContent));
};
