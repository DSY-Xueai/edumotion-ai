import { readTopicManifest } from "../workspace/readTopicManifest";
import { runApprovedToRender } from "./runApprovedToRender";
import { runTopicToDraft } from "./runTopicToDraft";

const isMissingManifestError = (error: unknown) =>
  error instanceof Error &&
  /ENOENT|no such file or directory/i.test(error.message);

export const resumeTopic = async ({
  topicId,
  allowMockAudio = false,
}: {
  topicId: string;
  allowMockAudio?: boolean;
}) => {
  let status = "not_started";

  try {
    status = (await readTopicManifest(topicId)).status;
  } catch (error) {
    if (!isMissingManifestError(error)) {
      throw error;
    }
  }

  if (
    status === "not_started" ||
    status === "researched" ||
    status === "draft_generated" ||
    status === "pending_review"
  ) {
    await runTopicToDraft({ topicId });
    return;
  }

  if (status === "revision_requested") {
    await runTopicToDraft({ topicId });
    return;
  }

  if (status === "approved" || status === "tts_generated" || status === "subtitle_aligned") {
    await runApprovedToRender({ topicId, allowMockAudio });
    return;
  }

  if (status === "rendered") {
    return;
  }

  if (status === "failed") {
    await runTopicToDraft({ topicId });
    return;
  }

  throw new Error(`Unsupported resume status: ${status}`);
};
