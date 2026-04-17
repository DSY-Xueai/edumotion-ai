import path from "node:path";
import { readSourceFile } from "../ingest/readSourceFile";
import { buildVideoSpec } from "../normalizer/buildVideoSpec";
import { parseArticle } from "../parser/parseArticle";

export const runPipeline = async ({
  sourceFile,
  imagePaths,
}: {
  sourceFile: string;
  imagePaths: string[];
}) => {
  const content = await readSourceFile(sourceFile);
  const parsed = parseArticle({ sourceFile, content });

  const images = imagePaths.map((imagePath, index) => ({
    id: `img-${index + 1}`,
    path: path.resolve(imagePath),
    usage: index === 0 ? ("cover" as const) : ("body" as const),
  }));

  return buildVideoSpec({
    sourceFile,
    title: parsed.title,
    paragraphs: parsed.paragraphs,
    images,
  });
};
