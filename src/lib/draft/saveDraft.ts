import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getTopicWorkspace } from "../workspace/getTopicWorkspace";
import { lessonDraftSchema, type LessonDraft } from "./schema";

export const saveDraft = async (draft: LessonDraft): Promise<void> => {
  const parsedDraft = lessonDraftSchema.parse(draft);
  const draftDirectory = path.join(
    getTopicWorkspace(parsedDraft.topicId),
    "draft",
  );

  await mkdir(draftDirectory, { recursive: true });
  await writeFile(
    path.join(draftDirectory, "lesson.json"),
    JSON.stringify(parsedDraft, null, 2),
    "utf8",
  );
};
