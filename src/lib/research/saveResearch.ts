import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getTopicWorkspace } from "../workspace/getTopicWorkspace";
import { topicResearchSchema, type TopicResearch } from "./schema";

export const saveResearch = async (research: TopicResearch): Promise<void> => {
  const parsedResearch = topicResearchSchema.parse(research);
  const researchDirectory = path.join(
    getTopicWorkspace(parsedResearch.topicId),
    "research",
  );

  await mkdir(researchDirectory, { recursive: true });
  await writeFile(
    path.join(researchDirectory, "topic.json"),
    JSON.stringify(parsedResearch, null, 2),
    "utf8",
  );
};
