import { runApprovedToRender } from "../../lib/pipeline/runApprovedToRender";
import { runTopicToDraft } from "../../lib/pipeline/runTopicToDraft";

const readOption = (args: string[], name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

export const handlePipelineAction = async (
  action: string,
  args: string[],
) => {
  const topicId = readOption(args, "--topic-id");
  const allowMockAudio = args.includes("--allow-mock-audio");

  if (!topicId) {
    throw new Error("Missing --topic-id");
  }

  if (action === "to-draft") {
    await runTopicToDraft({ topicId });
    console.log(JSON.stringify({ topicId, status: "pending_review" }, null, 2));
    return;
  }

  if (action === "to-render") {
    await runApprovedToRender({ topicId, allowMockAudio });
    console.log(
      JSON.stringify({ topicId, status: "rendered", allowMockAudio }, null, 2),
    );
    return;
  }

  throw new Error(`Unknown pipeline action: ${action}`);
};
