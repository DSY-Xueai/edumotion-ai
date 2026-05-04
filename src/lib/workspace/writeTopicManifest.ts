import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getTopicWorkspace } from "./getTopicWorkspace";
import { topicManifestSchema, type TopicManifest } from "./schema";

export const writeTopicManifest = async (
  manifest: TopicManifest,
): Promise<void> => {
  const parsedManifest = topicManifestSchema.parse(manifest);
  const topicWorkspace = getTopicWorkspace(parsedManifest.topicId);

  await mkdir(topicWorkspace, { recursive: true });
  await writeFile(
    path.join(topicWorkspace, "manifest.json"),
    JSON.stringify(parsedManifest, null, 2),
    "utf8",
  );
};
