import { readFile } from "node:fs/promises";
import mammoth from "mammoth";

export const readSourceFile = async (filePath: string) => {
  if (filePath.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  return readFile(filePath, "utf8");
};
