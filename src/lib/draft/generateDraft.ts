import type { TopicResearch } from "../research/schema";
import { defaultSceneBudgets } from "./defaultSceneBudgets";
import type { DraftProvider } from "./draftProvider";
import { saveDraft } from "./saveDraft";
import { lessonDraftSchema, type LessonDraft } from "./schema";

export const generateDraft = async ({
  topicId,
  research,
  provider,
}: {
  topicId: string;
  research: TopicResearch;
  provider: DraftProvider;
}): Promise<LessonDraft> => {
  const result = await provider.createDraft({
    topicId,
    research,
    sceneBudgets: defaultSceneBudgets,
    promptContext: research.canonicalTitle,
  });

  const draft = lessonDraftSchema.parse({
    topicId,
    ...result,
  });

  await saveDraft(draft);

  return draft;
};
