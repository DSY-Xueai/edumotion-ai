import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { runPipeline } from "../lib/pipeline/runPipeline";

const args = process.argv.slice(2);
const sourceFile = args[0];
const outFile = args[1] ?? "out/video.mp4";
const imagePaths = args.slice(2);

if (!sourceFile) {
  throw new Error(
    "Usage: npm run render -- <sourceFile> [outFile] [image1 image2 ...]",
  );
}

const spec = await runPipeline({ sourceFile, imagePaths });

await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile(
  path.resolve("out", "video-spec.json"),
  JSON.stringify(spec, null, 2),
  "utf8",
);

const bundleLocation = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  onProgress: () => undefined,
});

const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: "AutoVideo",
  inputProps: spec,
});

await renderMedia({
  serveUrl: bundleLocation,
  composition,
  codec: "h264",
  outputLocation: path.resolve(outFile),
  inputProps: spec,
});
