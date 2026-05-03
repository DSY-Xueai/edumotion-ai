import { runApprovedToRender } from "../../lib/pipeline/runApprovedToRender";

const readOption = (args: string[], name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

export const handleProduceRender = async (args: string[]) => {
  const topicId = readOption(args, "--topic-id");
  const allowMockAudio = args.includes("--allow-mock-audio");

  if (!topicId) {
    throw new Error("Missing --topic-id");
  }

  const renderPackage = await runApprovedToRender({ topicId, allowMockAudio });

  console.log(
    JSON.stringify(
      {
        topicId,
        status: "rendered",
        allowMockAudio,
        renderPackage,
      },
      null,
      2,
    ),
  );
};
