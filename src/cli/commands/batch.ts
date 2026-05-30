import { getNextRunnableTopic } from "../../lib/pipeline/getNextRunnableTopic";
import { resolveEnglishBatchTopics } from "../../lib/pipeline/englishBatch/resolveEnglishBatchTopics";
import { runEnglishBatchQueueWithDefaults } from "../../lib/pipeline/englishBatch/runEnglishBatchQueue";
import { runBatch } from "../../lib/pipeline/runBatch";

const readOptions = (args: string[], name: string) =>
  args.reduce<string[]>((values, current, index) => {
    if (current === name && args[index + 1]) {
      values.push(args[index + 1]!);
    }

    return values;
  }, []);

const readOption = (args: string[], name: string) => {
  const index = args.indexOf(name);

  return index === -1 ? undefined : args[index + 1];
};

const readPositiveIntegerOption = (args: string[], name: string) => {
  const raw = readOption(args, name);

  if (!raw) {
    throw new Error(`Missing ${name}`);
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
};

export const handleBatchAction = async (action: string, args: string[]) => {
  if (action === "english") {
    const topicIds = resolveEnglishBatchTopics({
      from: readOption(args, "--from"),
      to: readOption(args, "--to"),
      topicIds: readOptions(args, "--topic-id"),
    });
    const targetPassed = readPositiveIntegerOption(args, "--target");
    const report = await runEnglishBatchQueueWithDefaults({
      topicIds,
      targetPassed,
    });

    console.log(JSON.stringify(report, null, 2));

    if (report.passed < targetPassed) {
      process.exitCode = 1;
    }

    return;
  }

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
