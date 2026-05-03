import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTopicWorkspace } from "../workspace/getTopicWorkspace";
import { lessonDraftSchema, type LessonDraft } from "./schema";

export const readDraft = async (topicId: string): Promise<LessonDraft> => {
  const draftPath = path.join(
    getTopicWorkspace(topicId),
    "draft",
    "lesson.json",
  );
  const rawContent = await readFile(draftPath, "utf8");

  return lessonDraftSchema.parse(JSON.parse(rawContent));
};
