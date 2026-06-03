import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readEnglishWordbank } from "../../curriculum/englishWordbank";
import { checkEnglishVideoQuality } from "../../quality/checkEnglishVideoQuality";
import { approveDraft } from "../../review/approveDraft";
import { readApprovedLesson } from "../../review/readApprovedLesson";
import { getTopicWorkspaceRoot } from "../../workspace/getTopicWorkspace";
import { runApprovedToRender } from "../runApprovedToRender";
import { runTopicToDraft } from "../runTopicToDraft";
import { checkBatchCopyUniqueness } from "./checkBatchCopyUniqueness";
import { cleanupFailedEnglishTopic } from "./cleanupFailedEnglishTopic";
import {
  englishBatchInputSchema,
  englishBatchManifestSchema,
  type EnglishBatchAttempt,
  type EnglishBatchFailureStage,
  type EnglishBatchManifest,
} from "./schema";

type ScriptSegment = { id: string; kind: string; text: string };

type AttemptResult =
  | {
      ok: true;
      approvedScript: ScriptSegment[];
    }
  | {
      ok: false;
      stage: EnglishBatchFailureStage;
      reason: string;
      failedCheckIds: string[];
      approvedScript: ScriptSegment[];
    };

export const runEnglishBatchQueue = async ({
  topicIds,
  targetPassed,
  now = () => new Date().toISOString(),
  getWord,
  runAttempt,
  cleanupFailedTopic,
  writeManifest,
}: {
  topicIds: string[];
  targetPassed: number;
  now?: () => string;
  getWord: (topicId: string) => string;
  runAttempt: (input: {
    topicId: string;
    attempt: 1 | 2;
    previousFailure?: EnglishBatchAttempt;
    passedScripts: Array<{ topicId: string; approvedScript: ScriptSegment[] }>;
  }) => Promise<AttemptResult>;
  cleanupFailedTopic: (topicId: string) => Promise<void>;
  writeManifest: (manifest: EnglishBatchManifest) => Promise<void>;
}) => {
  englishBatchInputSchema.parse({ topicIds, targetPassed });

  const createdAt = now();
  const passedTopics: string[] = [];
  const retryPassedTopics: string[] = [];
  const failedTopics: Array<{
    topicId: string;
    word: string;
    finalStatus: "failed";
    attempts: EnglishBatchAttempt[];
  }> = [];
  const passedScripts: Array<{
    topicId: string;
    approvedScript: ScriptSegment[];
  }> = [];

  for (const [topicIndex, topicId] of topicIds.entries()) {
    if (passedTopics.length >= targetPassed) {
      break;
    }

    const attempts: EnglishBatchAttempt[] = [];
    let passed = false;

    for (const attempt of [1, 2] as const) {
      const result = await runAttempt({
        topicId,
        attempt,
        previousFailure: attempts[attempts.length - 1],
        passedScripts,
      });

      if (result.ok) {
        passedTopics.push(topicId);
        if (attempt === 2) {
          retryPassedTopics.push(topicId);
        }
        passedScripts.push({ topicId, approvedScript: result.approvedScript });
        passed = true;
        break;
      }

      attempts.push({
        attempt,
        stage: result.stage,
        reason: result.reason,
        failedCheckIds: result.failedCheckIds,
        at: now(),
      });
    }

    if (!passed) {
      failedTopics.push({
        topicId,
        word: getWord(topicId),
        finalStatus: "failed",
        attempts,
      });
      await cleanupFailedTopic(topicId);
    }

    await writeManifest(
      englishBatchManifestSchema.parse({
        id: `english-batch-${createdAt.slice(0, 10)}`,
        createdAt,
        updatedAt: now(),
        targetPassed,
        inputTopicIds: topicIds,
        passedTopicIds: passedTopics,
        retryPassedTopicIds: retryPassedTopics,
        failedTopics,
        unprocessedTopicIds: topicIds.slice(topicIndex + 1),
      }),
    );
  }

  return {
    targetPassed,
    passed: passedTopics.length,
    firstAttemptPassed: passedTopics.length - retryPassedTopics.length,
    retryPassed: retryPassedTopics.length,
    failed: failedTopics.length,
    unprocessed: Math.max(
      0,
      topicIds.length - passedTopics.length - failedTopics.length,
    ),
    passedTopics,
    retryPassedTopics,
    failedTopics,
  };
};

const stageForCheckId = (checkId: string): EnglishBatchFailureStage => {
  if (checkId.startsWith("visual-")) {
    return "visual_quality";
  }

  if (
    checkId.startsWith("audio") ||
    checkId.startsWith("asr-") ||
    checkId.startsWith("video") ||
    checkId === "script-audio-alignment" ||
    checkId === "audio-provider"
  ) {
    return "audio_quality";
  }

  if (
    checkId === "duration" ||
    checkId === "subtitle-cue-duration" ||
    checkId === "audio-manifest"
  ) {
    return "render_quality";
  }

  return "draft_quality";
};

const defaultWriteManifest = async (manifest: EnglishBatchManifest) => {
  const batchDirectory = path.join(getTopicWorkspaceRoot(), "batches");

  await mkdir(batchDirectory, { recursive: true });
  await writeFile(
    path.join(batchDirectory, `${manifest.id}.json`),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
};

export const runEnglishBatchQueueWithDefaults = async ({
  topicIds,
  targetPassed,
  now,
  writeManifest = defaultWriteManifest,
  cleanupFailedTopic = cleanupFailedEnglishTopic,
}: {
  topicIds: string[];
  targetPassed: number;
  now?: () => string;
  writeManifest?: (manifest: EnglishBatchManifest) => Promise<void>;
  cleanupFailedTopic?: (topicId: string) => Promise<void>;
}) => {
  const wordbank = await readEnglishWordbank();
  const wordsByTopicId = new Map(
    wordbank.entries.map((entry) => [entry.id, entry.word] as const),
  );
  const shouldRegenerateDraft = (failure?: EnglishBatchAttempt) =>
    !failure ||
    failure.stage === "draft_quality" ||
    failure.stage === "duplicate_copy";

  return runEnglishBatchQueue({
    topicIds,
    targetPassed,
    now,
    getWord: (topicId) => wordsByTopicId.get(topicId) ?? topicId,
    writeManifest,
    cleanupFailedTopic,
    runAttempt: async ({ topicId, previousFailure, passedScripts }) => {
      if (shouldRegenerateDraft(previousFailure)) {
        const retryContext = previousFailure
          ? [
              wordsByTopicId.get(topicId) ?? topicId,
              `Previous batch attempt failed at ${previousFailure.stage}.`,
              `Fix this issue in the next draft: ${previousFailure.reason}`,
              `Failed checks: ${previousFailure.failedCheckIds.join(", ")}`,
            ].join("\n")
          : undefined;

        await runTopicToDraft({
          topicId,
          ...(retryContext ? { promptContext: retryContext } : {}),
        });
        await approveDraft({
          topicId,
          reviewNotes: ["auto-approved by english batch quality queue"],
        });
      }

      const approvedLesson = await readApprovedLesson(topicId);
      const duplicate = checkBatchCopyUniqueness({
        topicId,
        approvedScript: approvedLesson.approvedScript,
        passedScripts,
      });

      if (!duplicate.ok) {
        return {
          ok: false,
          stage: duplicate.stage,
          reason: duplicate.reason,
          failedCheckIds: ["duplicate-copy"],
          approvedScript: approvedLesson.approvedScript,
        };
      }

      await runApprovedToRender({ topicId, allowMockAudio: false });

      const quality = await checkEnglishVideoQuality({
        topicId,
        inspectMedia: true,
      });

      if (!quality.ok) {
        const failedCheck = quality.checks.find((check) => !check.ok);

        return {
          ok: false,
          stage: stageForCheckId(failedCheck?.id ?? "environment"),
          reason: failedCheck?.message ?? "English quality check failed.",
          failedCheckIds: quality.checks
            .filter((check) => !check.ok)
            .map((check) => check.id),
          approvedScript: approvedLesson.approvedScript,
        };
      }

      return {
        ok: true,
        approvedScript: approvedLesson.approvedScript,
      };
    },
  });
};
