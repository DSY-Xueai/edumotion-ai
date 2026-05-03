import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTopicWorkspace } from "../workspace/getTopicWorkspace";
import { approvedLessonSchema, type ApprovedLesson } from "./schema";

export const readApprovedLesson = async (
  topicId: string,
): Promise<ApprovedLesson> => {
  const approvedLessonPath = path.join(
    getTopicWorkspace(topicId),
    "approved",
    "lesson.json",
  );
  const rawContent = await readFile(approvedLessonPath, "utf8");

  return approvedLessonSchema.parse(JSON.parse(rawContent));
};
