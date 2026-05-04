import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTopicWorkspace } from "./getTopicWorkspace";
import { topicManifestSchema, type TopicManifest } from "./schema";

export const readTopicManifest = async (
  topicId: string,
): Promise<TopicManifest> => {
  const manifestPath = path.join(getTopicWorkspace(topicId), "manifest.json");
  const rawContent = await readFile(manifestPath, "utf8");

  return topicManifestSchema.parse(JSON.parse(rawContent));
};
