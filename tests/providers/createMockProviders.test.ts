import { afterEach, describe, expect, it } from "vitest";
import { defaultSceneBudgets } from "../../src/lib/draft/defaultSceneBudgets";
import { createDraftProvider } from "../../src/lib/providers/createDraftProvider";
import { createResearchProvider } from "../../src/lib/providers/createResearchProvider";

const previousEnv = { ...process.env };

afterEach(() => {
  process.env = { ...previousEnv };
});

const useMockProviders = () => {
  process.env = {
    ...previousEnv,
    OPENAI_API_KEY: "dummy-key",
    PIPELINE_PROVIDER_MODE: "mock",
  };
};

describe("mock providers", () => {
  it("returns readable Chinese research content for math topics", async () => {
    useMockProviders();
    const provider = await createResearchProvider();

    const result = await provider.researchTopic({
      topicId: "math-b1-ch1-topic-001",
      promptContext: "math-b1-ch1-topic-001",
    });

    expect(result.canonicalTitle).toBe("集合的概念");
    expect(result.definitions[0]).toContain("集合");
    expect(result.principles[0]).toContain("元素");
  });

  it("builds a physics draft with process-heavy storyboard scenes", async () => {
    useMockProviders();
    const provider = createDraftProvider();

    const result = await provider.createDraft({
      topicId: "physics-b1-ch1-topic-001",
      research: {
        topicId: "physics-b1-ch1-topic-001",
        canonicalTitle: "运动的描述",
        scope: "topic",
        definitions: ["运动需要位置随时间变化来描述。"],
        formulas: ["v=Δx/Δt"],
        principles: ["先选参考系，再描述位置变化。"],
        examples: ["列车进站时，相对站台位置持续变化。"],
        misconceptions: ["看到物体动就不必说明参考系。"],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: ["用位移条和时间轴表示变化。"],
        sources: [],
      },
      sceneBudgets: defaultSceneBudgets,
      promptContext: "运动的描述",
    });

    expect(result.storyboardScenes.map((scene) => scene.type)).toEqual([
      "hook",
      "process",
      "graph",
      "rule",
      "pitfall",
      "wrap",
    ]);
    expect(result.scriptSegments).toHaveLength(6);
  });

  it("returns projectile motion research content for the local preview topic", async () => {
    useMockProviders();
    const provider = await createResearchProvider();

    const result = await provider.researchTopic({
      topicId: "physics-b2-ch5-topic-001",
      promptContext: "平抛运动",
    });

    expect(result.canonicalTitle).toBe("平抛运动");
    expect(result.definitions.join(" ")).toContain("水平初速度");
    expect(result.formulas).toContain("x=v₀t");
    expect(result.formulas).toContain("y=1/2gt²");
    expect(result.visualizationHints.join(" ")).toContain("抛物线");
  });

  it("fills missing English wordbank phonetics for vocabulary videos", async () => {
    useMockProviders();
    const provider = await createResearchProvider();

    const result = await provider.researchTopic({
      topicId: "english-word-00004",
      promptContext: "abbreviation",
    });

    expect(result.canonicalTitle).toBe("abbreviation");
    expect(result.phonetic).toBe("/əˌbriːviˈeɪʃən/");
    expect(result.formulas).toContain("/əˌbriːviˈeɪʃən/");
  });

  it("builds a chemistry draft with compare and process scenes", async () => {
    useMockProviders();
    const provider = createDraftProvider();

    const result = await provider.createDraft({
      topicId: "chemistry-b1-ch1-topic-001",
      research: {
        topicId: "chemistry-b1-ch1-topic-001",
        canonicalTitle: "物质的分类及转化",
        scope: "topic",
        definitions: ["可以按照组成和性质对物质进行分类。"],
        formulas: [],
        principles: ["分类是为了更快判断物质间的联系和转化。"],
        examples: ["铁和氧气反应后生成新的物质。"],
        misconceptions: ["分类只是背名词，不影响反应判断。"],
        prerequisites: [],
        nextConnections: [],
        visualizationHints: ["先分层分类，再给出转化箭头。"],
        sources: [],
      },
      sceneBudgets: defaultSceneBudgets,
      promptContext: "物质的分类及转化",
    });

    expect(result.storyboardScenes.map((scene) => scene.type)).toEqual([
      "hook",
      "compare",
      "process",
      "rule",
      "pitfall",
      "wrap",
    ]);
    expect(result.visualPlan[0]).toContain("分类");
  });
});
