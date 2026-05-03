import { resumeTopic } from "./resumeTopic";

export const runBatch = async ({
  topicIds,
  allowMockAudio = false,
}: {
  topicIds: string[];
  allowMockAudio?: boolean;
}) => {
  for (const topicId of topicIds) {
    await resumeTopic({ topicId, allowMockAudio });
  }
};
