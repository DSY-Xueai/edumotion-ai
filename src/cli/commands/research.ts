import { createResearchProvider } from "../../lib/providers/createResearchProvider";
import { runResearch } from "../../lib/research/runResearch";
import { writeTopicManifest } from "../../lib/workspace/writeTopicManifest";

const readOption = (args: string[], name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

export const handleResearchRun = async (args: string[]) => {
  const topicId = readOption(args, "--topic-id");

  if (!topicId) {
    throw new Error("Missing --topic-id");
  }

  const updatedAt = new Date().toISOString();
  await writeTopicManifest({ topicId, status: "not_started", updatedAt });
  const result = await runResearch({
    topicId,
    provider: await createResearchProvider(),
  });
  await writeTopicManifest({ topicId, status: "researched", updatedAt });
  console.log(JSON.stringify({ topicId, status: "researched", research: result }, null, 2));
};
