import { checkEnglishVideoQuality } from "../../lib/quality/checkEnglishVideoQuality";

const readOption = (args: string[], name: string) => {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

export const handleQualityAction = async (action: string, args: string[]) => {
  if (action !== "english") {
    throw new Error(`Unknown quality action: ${action}`);
  }

  const topicId = readOption(args, "--topic-id");

  if (!topicId) {
    throw new Error("Missing --topic-id");
  }

  const result = await checkEnglishVideoQuality({
    topicId,
    inspectMedia: !args.includes("--skip-media"),
  });

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }
};
