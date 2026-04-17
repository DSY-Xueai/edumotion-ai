import { extractTitle } from "./extractTitle";

export type ParsedArticle = {
  title: string;
  paragraphs: string[];
};

export const parseArticle = ({
  sourceFile,
  content,
}: {
  sourceFile: string;
  content: string;
}): ParsedArticle => {
  const blocks = content
    .split(/\r?\n\r?\n/)
    .map((block) => block.replace(/\r?\n/g, " ").trim())
    .filter(Boolean);

  const title = extractTitle(blocks);
  const paragraphs =
    sourceFile.endsWith(".md") && blocks[0]?.startsWith("#")
      ? blocks.slice(1)
      : blocks.slice(1).length > 0
        ? blocks.slice(1)
        : blocks;

  return {
    title,
    paragraphs,
  };
};
