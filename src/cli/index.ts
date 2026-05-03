import { handleCurriculumList } from "./commands/curriculum";
import { handleBatchAction } from "./commands/batch";
import { handleDoctor } from "./commands/doctor";
import { handleDraftGenerate } from "./commands/draft";
import { handlePipelineAction } from "./commands/pipeline";
import { handleProviderAction } from "./commands/provider";
import { handleProduceRender } from "./commands/produce";
import { handleResearchRun } from "./commands/research";
import { handleReviewAction } from "./commands/review";
import { handleTopicNext } from "./commands/topic";
import { handleTopicStatus } from "./commands/topic";

const [domain, action, ...rest] = process.argv.slice(2);

const main = async () => {
  if (domain === "curriculum" && action === "list") {
    await handleCurriculumList(rest);
  } else if (domain === "research" && action === "run") {
    await handleResearchRun(rest);
  } else if (domain === "draft" && action === "generate") {
    await handleDraftGenerate(rest);
  } else if (domain === "review") {
    await handleReviewAction([action, ...rest]);
  } else if (domain === "produce" && action === "render") {
    await handleProduceRender(rest);
  } else if (domain === "pipeline") {
    await handlePipelineAction(action, rest);
  } else if (domain === "provider") {
    await handleProviderAction(action, rest);
  } else if (domain === "batch") {
    await handleBatchAction(action, rest);
  } else if (domain === "doctor") {
    await handleDoctor();
  } else if (domain === "topic" && action === "next") {
    await handleTopicNext(rest);
  } else if (domain === "topic" && action === "status") {
    await handleTopicStatus(rest);
  } else {
    throw new Error("Unknown command");
  }
};

void main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown CLI error";
  console.error(message);
  process.exitCode = 1;
});
