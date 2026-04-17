import { describe, expect, it } from "vitest";
import { readSourceFile } from "../src/lib/ingest/readSourceFile";
import { parseArticle } from "../src/lib/parser/parseArticle";

describe("parseArticle", () => {
  it("reads txt and derives title plus paragraphs", async () => {
    const content = await readSourceFile("tests/fixtures/article.txt");
    const parsed = parseArticle({
      sourceFile: "tests/fixtures/article.txt",
      content,
    });

    expect(parsed.title).toBe("AI 让视频制作更高效");
    expect(parsed.paragraphs.length).toBeGreaterThan(1);
  });

  it("strips markdown heading markers", async () => {
    const content = await readSourceFile("tests/fixtures/article.md");
    const parsed = parseArticle({
      sourceFile: "tests/fixtures/article.md",
      content,
    });

    expect(parsed.title).toBe("AI 让视频制作更高效");
    expect(parsed.paragraphs[0]).not.toMatch(/^#/);
  });

  it("reads docx content and derives title", async () => {
    const content = await readSourceFile("tests/fixtures/article.docx");
    const parsed = parseArticle({
      sourceFile: "tests/fixtures/article.docx",
      content,
    });

    expect(parsed.title).toBe("AI 让视频制作更高效");
    expect(parsed.paragraphs.length).toBeGreaterThan(1);
  });
});
