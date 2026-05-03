import { generateDraft } from "../draft/generateDraft";
import type { DraftProvider } from "../draft/draftProvider";
import { createDraftProvider } from "../providers/createDraftProvider";
import { createResearchProvider } from "../providers/createResearchProvider";
import { readResearch } from "../research/readResearch";
import type { ResearchProvider } from "../research/researchProvider";
import { runResearch } from "../research/runResearch";
import { writeTopicManifest } from "../workspace/writeTopicManifest";

export const runTopicToDraft = async ({
  topicId,
  researchProvider,
  draftProvider,
  updatedAt = new Date().toISOString(),
}: {
  topicId: string;
  researchProvider?: ResearchProvider;
  draftProvider?: DraftProvider;
  updatedAt?: string;
}) => {
  await writeTopicManifest({
    topicId,
    status: "not_started",
    updatedAt,
  });
  const resolvedResearchProvider =
    researchProvider ?? (await createResearchProvider());
  await runResearch({ topicId, provider: resolvedResearchProvider });
  await writeTopicManifest({
    topicId,
    status: "researched",
    updatedAt,
  });

  const research = await readResearch(topicId);
  const resolvedDraftProvider = draftProvider ?? createDraftProvider();
  await generateDraft({
    topicId,
    research,
    provider: resolvedDraftProvider,
  });
  await writeTopicManifest({
    topicId,
    status: "draft_generated",
    updatedAt,
  });
  await writeTopicManifest({
    topicId,
    status: "pending_review",
    updatedAt,
  });
};
