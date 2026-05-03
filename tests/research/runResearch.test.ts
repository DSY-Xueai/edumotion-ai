import { describe, expect, it } from "vitest";
import { readResearch } from "../../src/lib/research/readResearch";
import { runResearch } from "../../src/lib/research/runResearch";

describe("runResearch", () => {
  it("stores canonical topic research with sources", async () => {
    let providerInput:
      | {
          topicId: string;
          promptContext: string;
        }
      | undefined;

    await runResearch({
      topicId: "math-b1-ch1-topic-001",
      provider: {
        researchTopic: async (input) => {
          providerInput = input;

          return {
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
                sourceType: "official" as const,
                publisher: "Example",
                retrievedAt: "2026-04-26",
                quoteOrSummary: "summary",
              },
            ],
          };
        },
      },
    });

    const research = await readResearch("math-b1-ch1-topic-001");

    expect(providerInput).toEqual({
      topicId: "math-b1-ch1-topic-001",
      promptContext: "math-b1-ch1-topic-001",
    });
    expect(research.sources).toHaveLength(1);
    expect(research.canonicalTitle).toBe("集合的含义");
  });
});
