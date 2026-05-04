import { loadCurriculum } from "../curriculum/loadCurriculum";
import { topicResearchSchema, type TopicResearchPayload } from "../research/schema";
import type { ResearchProvider } from "../research/researchProvider";
import { readProviderConfig } from "./config";
import { requestStructuredOpenAIOutput } from "./openaiStructuredOutput";

type MockResearchContent = {
  canonicalTitle: string;
  definitions: string[];
  formulas: string[];
  principles: string[];
  examples: string[];
  misconceptions: string[];
  visualizationHints: string[];
};

const topicFixtures: Record<string, MockResearchContent> = {
  "math-b1-ch1-topic-001": {
    canonicalTitle: "集合的概念",
    definitions: ["一般地，指定的某些对象的全体称为一个集合。"],
    formulas: ["A={1,2,3}"],
    principles: ["集合中的元素是确定的、互异的、无序的。"],
    examples: ["{1,2,3} 与 {3,2,1} 表示同一个集合。"],
    misconceptions: ["把重复元素当成会生成新集合。"],
    visualizationHints: ["用大括号、元素卡片和对照栏表现集合。"],
  },
  "math-b1-ch1-topic-002": {
    canonicalTitle: "集合的表示",
    definitions: ["集合通常用列举法或描述法来表示。"],
    formulas: ["A={x|x>0且x是整数}"],
    principles: ["选择表示法时，关键是让元素范围和条件清楚。"],
    examples: ["自然数集合可以写成 N={0,1,2,3,...}。"],
    misconceptions: ["描述法里只写条件，不说明对象范围。"],
    visualizationHints: ["一边列举，一边描述，做双栏对照。"],
  },
  "physics-b1-ch1-topic-001": {
    canonicalTitle: "运动的描述",
    definitions: ["运动是物体相对于参考系的位置随时间发生变化。"],
    formulas: ["v=Δx/Δt"],
    principles: ["先选参考系，再描述位置和时间的对应变化。"],
    examples: ["列车进站时，相对站台的位置不断变化。"],
    misconceptions: ["不说明参考系，也能准确描述运动。"],
    visualizationHints: ["用时间轴、位移条和速度公式搭建画面。"],
  },
  "physics-b1-ch1-topic-002": {
    canonicalTitle: "时间、位移和速度",
    definitions: ["时间刻画过程长短，位移刻画位置变化，速度刻画变化快慢。"],
    formulas: ["v=Δx/Δt"],
    principles: ["位移有方向，速度要结合时间区间理解。"],
    examples: ["汽车 5 秒内向东位移 20 米，平均速度为 4 米每秒。"],
    misconceptions: ["路程和位移总是一样。"],
    visualizationHints: ["把时间、位移和速度做成联动仪表。"],
  },
  "physics-b2-ch5-topic-001": {
    canonicalTitle: "平抛运动",
    definitions: ["平抛运动是物体以水平初速度抛出，只在重力作用下的曲线运动。"],
    formulas: ["x=v₀t", "y=1/2gt²"],
    principles: [
      "平抛运动可以分解为水平方向匀速直线运动和竖直方向自由落体运动。",
    ],
    examples: ["桌边小球水平飞出后，一边向前运动，一边向下落到地面。"],
    misconceptions: ["把轨迹弯曲误认为水平方向也有加速度。"],
    visualizationHints: ["用抛物线轨迹、水平位移尺和竖直下落尺同步展示。"],
  },
  "chemistry-b1-ch1-topic-001": {
    canonicalTitle: "物质的分类及转化",
    definitions: ["可以按照组成、性质和用途对物质进行分类。"],
    formulas: ["Fe + O₂ → 氧化物"],
    principles: ["分类帮助我们更快判断物质之间可能发生的转化。"],
    examples: ["铁在空气中生锈，说明金属可以转化为氧化物。"],
    misconceptions: ["分类只是背概念，和反应分析没有关系。"],
    visualizationHints: ["先做分类树，再补一条转化箭头链。"],
  },
  "chemistry-b1-ch1-topic-002": {
    canonicalTitle: "离子反应",
    definitions: ["在溶液中有离子参加的反应叫离子反应。"],
    formulas: ["Ag⁺ + Cl⁻ → AgCl↓"],
    principles: ["抓住实际参加反应的离子，省去旁观离子。"],
    examples: ["氯化钠溶液与硝酸银溶液反应生成白色沉淀。"],
    misconceptions: ["化学方程式里出现的所有离子都必须写进离子方程式。"],
    visualizationHints: ["用离子卡片和沉淀落下动画表达反应。"],
  },
};

const researchPayloadSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    canonicalTitle: { type: "string" },
    definitions: { type: "array", items: { type: "string" } },
    formulas: { type: "array", items: { type: "string" } },
    principles: { type: "array", items: { type: "string" } },
    examples: { type: "array", items: { type: "string" } },
    misconceptions: { type: "array", items: { type: "string" } },
    prerequisites: { type: "array", items: { type: "string" } },
    nextConnections: { type: "array", items: { type: "string" } },
    visualizationHints: { type: "array", items: { type: "string" } },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          sourceType: {
            type: "string",
            enum: ["official", "education", "reference"],
          },
          publisher: { type: "string" },
          retrievedAt: { type: "string" },
          quoteOrSummary: { type: "string" },
        },
        required: [
          "title",
          "url",
          "sourceType",
          "publisher",
          "retrievedAt",
          "quoteOrSummary",
        ],
      },
    },
  },
  required: [
    "canonicalTitle",
    "definitions",
    "formulas",
    "principles",
    "examples",
    "misconceptions",
    "prerequisites",
    "nextConnections",
    "visualizationHints",
    "sources",
  ],
} as const;

export const createResearchProvider = async (): Promise<ResearchProvider> => {
  const config = readProviderConfig();
  const curriculum = await loadCurriculum("pep-2019");
  const topics = Object.values(curriculum.subjects).flatMap(
    (subjectGroup) => subjectGroup.topics,
  );

  if (config.PIPELINE_PROVIDER_MODE === "openai") {
    return {
      researchTopic: async ({ topicId, promptContext }) => {
        const topic = topics.find((item) => item.id === topicId);

        if (!topic) {
          throw new Error(`Unknown topic for research provider: ${topicId}`);
        }

        const structured = await requestStructuredOpenAIOutput<TopicResearchPayload>({
          apiKey: config.OPENAI_API_KEY ?? "",
          baseUrl: config.OPENAI_BASE_URL,
          model: config.RESEARCH_MODEL,
          schemaName: "topic_research_payload",
          schema: researchPayloadSchema,
          systemPrompt:
            "You are a senior Chinese high-school STEM curriculum researcher. Return only structured JSON that is factually cautious, concise, and suitable for a short-form lesson pipeline.",
          userPrompt: [
            `Topic ID: ${topic.id}`,
            `Subject: ${topic.subject}`,
            `Edition: ${topic.edition}`,
            `Volume: ${topic.volume}`,
            `Chapter: ${topic.chapter}`,
            `Section: ${topic.section}`,
            `Topic title: ${topic.title}`,
            `Previous topic: ${topic.prevTopicId ?? "none"}`,
            `Next topic: ${topic.nextTopicId ?? "none"}`,
            `Prompt context: ${promptContext}`,
            "Return Chinese content.",
            "Need 1-3 items for each list field.",
            "Sources must be plausible textbook or educational references with valid-looking https URLs.",
            "Prefer textbook-level definitions, one formula only when relevant, and compact misconceptions/visualization hints.",
          ].join("\n"),
        });
        const parsed = topicResearchSchema.parse({
          topicId,
          scope: "topic",
          ...structured,
        });

        return {
          canonicalTitle: parsed.canonicalTitle,
          definitions: parsed.definitions,
          formulas: parsed.formulas,
          principles: parsed.principles,
          examples: parsed.examples,
          misconceptions: parsed.misconceptions,
          prerequisites: parsed.prerequisites,
          nextConnections: parsed.nextConnections,
          visualizationHints: parsed.visualizationHints,
          sources: parsed.sources,
        };
      },
    };
  }

  if (config.PIPELINE_PROVIDER_MODE !== "mock") {
    throw new Error("Only mock research provider is implemented in this stage.");
  }

  return {
    researchTopic: async ({ topicId }) => {
      const topic = topics.find((item) => item.id === topicId);

      if (!topic) {
        throw new Error(`Unknown topic for research provider: ${topicId}`);
      }

      const fixture = topicFixtures[topicId];
      const canonicalTitle = fixture?.canonicalTitle ?? topic.title;

      return {
        canonicalTitle,
        definitions:
          fixture?.definitions ?? [`${canonicalTitle}需要先讲清楚对象边界和核心定义。`],
        formulas: fixture?.formulas ?? [],
        principles:
          fixture?.principles ?? [`讲解 ${canonicalTitle} 时要先给出判断依据，再给例子。`],
        examples: fixture?.examples ?? [`用一个最短例子说明 ${canonicalTitle}。`],
        misconceptions:
          fixture?.misconceptions ?? [`不要把 ${canonicalTitle} 和相近概念混在一起。`],
        prerequisites: topic.prevTopicId ? [`回顾上一个知识点：${topic.prevTopicId}`] : [],
        nextConnections: topic.nextTopicId ? [`下一步衔接：${topic.nextTopicId}`] : [],
        visualizationHints:
          fixture?.visualizationHints ?? ["把关键定义、例子和提醒拆成不同画面层。"],
        sources: [
          {
            title: "Mock Textbook Source",
            url: `https://example.com/${topic.id}`,
            sourceType: "official" as const,
            publisher: "PEP",
            retrievedAt: "2026-04-26",
            quoteOrSummary: `${canonicalTitle} 的教材摘要与讲解重点。`,
          },
        ],
      };
    },
  };
};
