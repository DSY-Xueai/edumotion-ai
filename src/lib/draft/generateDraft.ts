import type { TopicResearch } from "../research/schema";
import { defaultSceneBudgets } from "./defaultSceneBudgets";
import type { DraftProvider } from "./draftProvider";
import { saveDraft } from "./saveDraft";
import { lessonDraftSchema, type LessonDraft } from "./schema";

export const generateDraft = async ({
  topicId,
  research,
  provider,
  promptContext = research.canonicalTitle,
}: {
  topicId: string;
  research: TopicResearch;
  provider: DraftProvider;
  promptContext?: string;
}): Promise<LessonDraft> => {
  const result = await provider.createDraft({
    topicId,
    research,
    sceneBudgets: defaultSceneBudgets,
    promptContext,
  });

  const draft = lessonDraftSchema.parse({
    topicId,
    ...result,
  });

  await saveDraft(draft);

  return draft;
};
