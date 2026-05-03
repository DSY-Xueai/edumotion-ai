import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { getPreferredBrowserExecutable } from "./getPreferredBrowserExecutable";
import type { RenderPackage } from "./schema";

export const renderVideo = async ({
  renderPackage,
  outputLocation,
}: {
  renderPackage: RenderPackage;
  outputLocation: string;
}) => {
  const browserExecutable = await getPreferredBrowserExecutable();
  const bundleLocation = await bundle({
    entryPoint: path.resolve("src/index.ts"),
    onProgress: () => undefined,
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "AutoVideo",
    inputProps: renderPackage,
    browserExecutable,
  });

  await renderMedia({
    serveUrl: bundleLocation,
    composition,
    codec: "h264",
    outputLocation,
    inputProps: renderPackage,
    browserExecutable,
  });
};
