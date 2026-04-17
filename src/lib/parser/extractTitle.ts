export const extractTitle = (blocks: string[]) => {
  return blocks[0]?.replace(/^#+\s*/, "").trim() || "Untitled Video";
};
