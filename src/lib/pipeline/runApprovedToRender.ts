import { generateSegmentAudio } from "../audio/generateSegmentAudio";
import type { TtsProvider } from "../audio/ttsProvider";
import { assertTtsReadyForFinalRender } from "../providers/config";
import { createTtsProvider } from "../providers/createTtsProvider";
import { readApprovedLesson } from "../review/readApprovedLesson";
import { buildRenderPackage } from "../rendering/buildRenderPackage";
import { saveRenderPackage } from "../rendering/saveRenderPackage";

export const runApprovedToRender = async ({
  topicId,
  ttsProvider,
  allowMockAudio = false,
  renderedAt = new Date().toISOString(),
}: {
  topicId: string;
  ttsProvider?: TtsProvider;
  allowMockAudio?: boolean;
  renderedAt?: string;
}) => {
  const approvedLesson = await readApprovedLesson(topicId);
  const resolvedTtsProvider =
    ttsProvider ??
    (() => {
      assertTtsReadyForFinalRender({ allowMockAudio });
      return createTtsProvider();
    })();
  const audioManifest = await generateSegmentAudio({
    topicId,
    provider: resolvedTtsProvider,
    generatedAt: renderedAt,
  });
  const renderPackage = buildRenderPackage({
    approvedLesson,
    audioManifest,
  });

  await saveRenderPackage({
    topicId,
    renderPackage,
    renderedAt,
  });

  return renderPackage;
};
