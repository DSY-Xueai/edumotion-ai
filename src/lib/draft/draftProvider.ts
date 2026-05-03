import type { TopicResearch } from "../research/schema";
import type { SceneBudgetMap } from "./defaultSceneBudgets";
import type { LessonDraftPayload } from "./schema";

export interface DraftProvider {
  createDraft(input: {
    topicId: string;
    research: TopicResearch;
    sceneBudgets: SceneBudgetMap;
    promptContext: string;
  }): Promise<LessonDraftPayload>;
}
