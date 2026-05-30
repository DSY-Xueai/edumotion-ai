import { rm } from "node:fs/promises";
import path from "node:path";
import { getTopicWorkspace } from "../../workspace/getTopicWorkspace";

const removeIfExists = async (targetPath: string) => {
  await rm(targetPath, { recursive: true, force: true });
};

export const cleanupFailedEnglishTopic = async (topicId: string) => {
  const workspace = getTopicWorkspace(topicId);

  await Promise.all([
    removeIfExists(path.join(workspace, "draft", "lesson.json")),
    removeIfExists(path.join(workspace, "approved", "lesson.json")),
    removeIfExists(path.join(workspace, "audio")),
    removeIfExists(path.join(workspace, "render", "video.mp4")),
    removeIfExists(path.join(workspace, "render", "render-package.json")),
    removeIfExists(
      path.join(process.cwd(), "public", "generated", topicId, "audio"),
    ),
  ]);
};
