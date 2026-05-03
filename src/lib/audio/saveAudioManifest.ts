import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getTopicWorkspace } from "../workspace/getTopicWorkspace";
import { writeTopicManifest } from "../workspace/writeTopicManifest";
import { audioManifestSchema, type AudioManifest } from "./schema";

export const saveAudioManifest = async (
  manifest: AudioManifest,
): Promise<void> => {
  const parsedManifest = audioManifestSchema.parse(manifest);
  const audioDirectory = path.join(
    getTopicWorkspace(parsedManifest.topicId),
    "audio",
  );

  await mkdir(audioDirectory, { recursive: true });
  await writeFile(
    path.join(audioDirectory, "manifest.json"),
    JSON.stringify(parsedManifest, null, 2),
    "utf8",
  );
  await writeTopicManifest({
    topicId: parsedManifest.topicId,
    status:
      parsedManifest.subtitleTrack.cues.length > 0
        ? "subtitle_aligned"
        : "tts_generated",
    updatedAt: parsedManifest.generatedAt,
  });
};
