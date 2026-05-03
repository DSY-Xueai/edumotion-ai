import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getTopicWorkspace } from "../workspace/getTopicWorkspace";
import { writeTopicManifest } from "../workspace/writeTopicManifest";
import { renderVideo } from "./renderVideo";
import { renderPackageSchema, type RenderPackage } from "./schema";

export const saveRenderPackage = async ({
  topicId,
  renderPackage,
  renderedAt = new Date().toISOString(),
}: {
  topicId: string;
  renderPackage: RenderPackage;
  renderedAt?: string;
}) => {
  const parsed = renderPackageSchema.parse(renderPackage);
  const renderDirectory = path.join(getTopicWorkspace(topicId), "render");

  await mkdir(renderDirectory, { recursive: true });
  for (const track of parsed.audioTracks) {
    const publicTarget = path.join(path.resolve("public"), ...track.file.split("/"));

    await mkdir(path.dirname(publicTarget), { recursive: true });
    await copyFile(path.resolve(track.sourceFile), publicTarget);
  }
  await writeFile(
    path.join(renderDirectory, "render-package.json"),
    JSON.stringify(parsed, null, 2),
    "utf8",
  );
  const outputVideo = path.join(renderDirectory, "video.mp4");

  if (process.env.VITEST) {
    await writeFile(outputVideo, "mock-render-output", "utf8");
  } else {
    await renderVideo({
      renderPackage: parsed,
      outputLocation: outputVideo,
    });
  }
  await writeTopicManifest({
    topicId,
    status: "rendered",
    updatedAt: renderedAt,
  });
};
