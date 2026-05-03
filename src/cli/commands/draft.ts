import { generateDraft } from "../../lib/draft/generateDraft";
import { createDraftProvider } from "../../lib/providers/createDraftProvider";
import { readResearch } from "../../lib/research/readResearch";
import { writeTopicManifest } from "../../lib/workspace/writeTopicManifest";

const readOption = (args: string[], name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

export const handleDraftGenerate = async (args: string[]) => {
  const topicId = readOption(args, "--topic-id");

  if (!topicId) {
    throw new Error("Missing --topic-id");
  }

  const updatedAt = new Date().toISOString();
  const draft = await generateDraft({
    topicId,
    research: await readResearch(topicId),
    provider: createDraftProvider(),
  });
  await writeTopicManifest({ topicId, status: "draft_generated", updatedAt });
  await writeTopicManifest({ topicId, status: "pending_review", updatedAt });
  console.log(JSON.stringify({ topicId, status: "pending_review", draft }, null, 2));
};
