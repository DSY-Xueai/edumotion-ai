import { access } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readResearch } from "../../src/lib/research/readResearch";
import { saveResearch } from "../../src/lib/research/saveResearch";
import { getTopicWorkspace } from "../../src/lib/workspace/getTopicWorkspace";

describe("research persistence", () => {
  it("persists topic research with structured sources", async () => {
    await saveResearch({
      topicId: "math-b1-ch1-topic-001",
      scope: "topic",
      canonicalTitle: "集合的含义",
      definitions: ["定义"],
      formulas: [],
      principles: [],
      examples: ["例子"],
      misconceptions: ["误区"],
      prerequisites: [],
      nextConnections: [],
      visualizationHints: ["关键词高亮"],
      sources: [
        {
          title: "Source",
          url: "https://example.com",
          sourceType: "official",
          publisher: "Example",
          retrievedAt: "2026-04-26",
          quoteOrSummary: "summary",
        },
      ],
    });

    const research = await readResearch("math-b1-ch1-topic-001");

    expect(research.scope).toBe("topic");
    expect(research.canonicalTitle).toBe("集合的含义");
    expect(research.sources).toHaveLength(1);
    expect(research.sources[0]?.url).toBe("https://example.com");
    await expect(
      access(
        path.join(
          getTopicWorkspace("math-b1-ch1-topic-001"),
          "research",
          "topic.json",
        ),
      ),
    ).resolves.toBeUndefined();
  });
});
