import type { TopicResearchPayload } from "./schema";

export interface ResearchProvider {
  researchTopic(input: {
    topicId: string;
    promptContext: string;
  }): Promise<TopicResearchPayload>;
}
