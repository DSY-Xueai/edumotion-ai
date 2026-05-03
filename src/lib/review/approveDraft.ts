import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { inferSubjectFromTopicId } from "../curriculum/inferSubjectFromTopicId";
import { readDraft } from "../draft/readDraft";
import { readResearch } from "../research/readResearch";
import { getTopicWorkspace } from "../workspace/getTopicWorkspace";
import { writeTopicManifest } from "../workspace/writeTopicManifest";
import { approvedLessonSchema, type ApprovedLesson } from "./schema";

export const approveDraft = async ({
  topicId,
  approvedAt = new Date().toISOString(),
  reviewNotes = [],
}: {
  topicId: string;
  approvedAt?: string;
  reviewNotes?: string[];
}): Promise<ApprovedLesson> => {
  const [draft, research] = await Promise.all([
    readDraft(topicId),
    readResearch(topicId),
  ]);
  const approvedLesson = approvedLessonSchema.parse({
    topicId,
    subject: inferSubjectFromTopicId(topicId),
    version: 1,
    approvedAt,
    reviewNotes,
    approvedScript: draft.scriptSegments,
    approvedStoryboard: draft.storyboardScenes,
    sourceSummary: {
      canonicalTitle: research.canonicalTitle,
      definitions: research.definitions,
      formulas: research.formulas,
      principles: research.principles,
      examples: research.examples,
      misconceptions: research.misconceptions,
      prerequisites: research.prerequisites,
      nextConnections: research.nextConnections,
      visualizationHints: research.visualizationHints,
      sources: research.sources,
    },
  });
  const approvedDirectory = path.join(getTopicWorkspace(topicId), "approved");

  await mkdir(approvedDirectory, { recursive: true });
  await writeFile(
    path.join(approvedDirectory, "lesson.json"),
    JSON.stringify(approvedLesson, null, 2),
    "utf8",
  );
  await writeTopicManifest({
    topicId,
    status: "approved",
    updatedAt: approvedAt,
  });

  return approvedLesson;
};
