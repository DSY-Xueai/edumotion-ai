import { approveDraft } from "../../lib/review/approveDraft";
import {
  getStatusForRevisionAction,
  revisionActionInputSchema,
} from "../../lib/review/revisionActions";
import { writeTopicManifest } from "../../lib/workspace/writeTopicManifest";

const readOption = (args: string[], name: string) => {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

const readOptions = (args: string[], name: string) =>
  args.reduce<string[]>((values, current, index) => {
    if (current === name) {
      const nextValue = args[index + 1];

      if (nextValue) {
        values.push(nextValue);
      }
    }

    return values;
  }, []);

export const handleReviewAction = async (args: string[]) => {
  const topicId = readOption(args, "--topic-id");
  const action = readOption(args, "--action");

  if (!topicId) {
    throw new Error("Missing --topic-id");
  }

  if (!action) {
    throw new Error("Missing --action");
  }

  const requestedAt = readOption(args, "--at") ?? new Date().toISOString();
  const reviewAction = revisionActionInputSchema.parse({
    action,
    reviewNotes: readOptions(args, "--note"),
  });

  if (reviewAction.action === "approve") {
    const approvedLesson = await approveDraft({
      topicId,
      approvedAt: requestedAt,
      reviewNotes: reviewAction.reviewNotes,
    });

    console.log(
      JSON.stringify(
        {
          topicId,
          action: reviewAction.action,
          approvedLesson,
        },
        null,
        2,
      ),
    );
    return;
  }

  const status = getStatusForRevisionAction(reviewAction.action);
  await writeTopicManifest({
    topicId,
    status,
    updatedAt: requestedAt,
  });

  console.log(
    JSON.stringify(
      {
        topicId,
        action: reviewAction.action,
        status,
        reviewNotes: reviewAction.reviewNotes,
      },
      null,
      2,
    ),
  );
};
