import { getNextRunnableTopic } from "../../lib/pipeline/getNextRunnableTopic";
import { runBatch } from "../../lib/pipeline/runBatch";

const readOptions = (args: string[], name: string) =>
  args.reduce<string[]>((values, current, index) => {
    if (current === name && args[index + 1]) {
      values.push(args[index + 1]!);
    }

    return values;
  }, []);

export const handleBatchAction = async (action: string, args: string[]) => {
  if (action === "run") {
    const topicIds = readOptions(args, "--topic-id");
    const allowMockAudio = args.includes("--allow-mock-audio");

    if (topicIds.length === 0) {
      throw new Error("Missing --topic-id");
    }

    await runBatch({ topicIds, allowMockAudio });
    console.log(
      JSON.stringify({ topicIds, status: "completed", allowMockAudio }, null, 2),
    );
    return;
  }

  if (action === "next") {
    const topic = await getNextRunnableTopic();
    console.log(JSON.stringify({ topic }, null, 2));
    return;
  }

  throw new Error(`Unknown batch action: ${action}`);
};
