import type { DraftProvider } from "../draft/draftProvider";
import type { SceneBudgetMap } from "../draft/defaultSceneBudgets";
import {
  lessonDraftSchema,
  storyboardSceneTypeSchema,
  type LessonDraftPayload,
} from "../draft/schema";
import type { TopicResearch } from "../research/schema";
import { readProviderConfig } from "./config";
import { requestStructuredOpenAIOutput } from "./openaiStructuredOutput";

const firstResearchText = (values: string[], fallback: string) =>
  values.find((value) => value.trim().length > 0) ?? fallback;

const visualPlanFromResearch = (research: TopicResearch, fallback: string[]) => {
  const hints = research.visualizationHints
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4);

  return hints.length > 0 ? hints : fallback;
};

const scene = ({
  topicId,
  type,
  segmentKind = type,
  durationSec,
}: {
  topicId: string;
  type: "hook" | "definition" | "rule" | "compare" | "process" | "graph" | "pitfall" | "wrap";
  segmentKind?: string;
  durationSec: number;
}) => ({
  id: `${topicId}-scene-${type}`,
  type,
  segmentIds: [`${topicId}-seg-${segmentKind}`],
  durationSec,
});

const subtitlesFor = (
  topicId: string,
  segments: Array<{ id: string; text: string }>,
) =>
  segments.map((segment) => ({
    id: segment.id.replace("-seg-", "-sub-"),
    segmentId: segment.id,
    text: segment.text,
  }));

const buildMathDraft = ({
  topicId,
  research,
  sceneBudgets,
}: {
  topicId: string;
  research: TopicResearch;
  sceneBudgets: SceneBudgetMap;
}) => {
  const hookText = `先看 ${research.canonicalTitle} 要解决什么判断、关系或变化规律。`;
  const definitionText = firstResearchText(
    research.definitions,
    `${research.canonicalTitle} 需要先明确核心对象和条件。`,
  );
  const ruleText = firstResearchText(
    [...research.formulas, ...research.principles, ...research.examples],
    `用一个最短例子说明 ${research.canonicalTitle} 的判断方法。`,
  );
  const compareText = firstResearchText(
    research.principles,
    `把 ${research.canonicalTitle} 的条件逐条拆开，对照例子检查。`,
  );
  const pitfallText = firstResearchText(
    research.misconceptions,
    `学习 ${research.canonicalTitle} 时，不要把相近概念混成同一件事。`,
  );
  const wrapText = `收束一下：先抓定义，再看条件和例子，最后用易错点回头检查 ${research.canonicalTitle}。`;
  const scriptSegments = [
    { id: `${topicId}-seg-hook`, kind: "hook", text: hookText },
    { id: `${topicId}-seg-definition`, kind: "definition", text: definitionText },
    { id: `${topicId}-seg-rule`, kind: "rule", text: ruleText },
    { id: `${topicId}-seg-compare`, kind: "compare", text: compareText },
    { id: `${topicId}-seg-pitfall`, kind: "pitfall", text: pitfallText },
    { id: `${topicId}-seg-wrap`, kind: "wrap", text: wrapText },
  ];

  return {
    toneProfile: "math-clear-structured",
    durationTargetSec: 62,
    hook: hookText,
    summary: `${research.canonicalTitle} 的结构化判断路径`,
    scriptSegments,
    storyboardScenes: [
      scene({ topicId, type: "hook", durationSec: sceneBudgets.hook }),
      scene({ topicId, type: "definition", durationSec: sceneBudgets.definition }),
      scene({ topicId, type: "rule", durationSec: sceneBudgets.rule }),
      scene({ topicId, type: "compare", durationSec: sceneBudgets.compare }),
      scene({ topicId, type: "pitfall", durationSec: sceneBudgets.pitfall }),
      scene({ topicId, type: "wrap", durationSec: sceneBudgets.wrap }),
    ],
    subtitleDraft: subtitlesFor(topicId, scriptSegments),
    visualPlan: visualPlanFromResearch(research, [
      "结构关系",
      "条件对照",
      "推导路径",
      "易错提醒",
    ]),
    qaNotes: [],
  };
};

const buildPhysicsDraft = ({
  topicId,
  research,
  sceneBudgets,
}: {
  topicId: string;
  research: TopicResearch;
  sceneBudgets: SceneBudgetMap;
}) => {
  const hookText = `先看 ${research.canonicalTitle} 的现象，再追问变量之间怎样影响。`;
  const processText = firstResearchText(
    research.principles,
    `分析 ${research.canonicalTitle} 时，先找对象，再找变量关系。`,
  );
  const graphText = firstResearchText(
    research.examples,
    `用一个具体情境观察 ${research.canonicalTitle} 的过程。`,
  );
  const ruleText = firstResearchText(
    [...research.formulas, ...research.principles],
    `把 ${research.canonicalTitle} 的核心规律写成清晰关系。`,
  );
  const pitfallText = firstResearchText(
    research.misconceptions,
    `最容易错的是只记 ${research.canonicalTitle} 的名字，不看适用条件。`,
  );
  const wrapText = `记住 ${research.canonicalTitle}：现象、变量、规律和易错点要放在同一条因果链里看。`;
  const scriptSegments = [
    { id: `${topicId}-seg-hook`, kind: "hook", text: hookText },
    { id: `${topicId}-seg-process`, kind: "process", text: processText },
    { id: `${topicId}-seg-graph`, kind: "graph", text: graphText },
    { id: `${topicId}-seg-rule`, kind: "rule", text: ruleText },
    { id: `${topicId}-seg-pitfall`, kind: "pitfall", text: pitfallText },
    { id: `${topicId}-seg-wrap`, kind: "wrap", text: wrapText },
  ];

  return {
    toneProfile: "physics-causal-lab",
    durationTargetSec: 60,
    hook: hookText,
    summary: `${research.canonicalTitle} 的变量关系`,
    scriptSegments,
    storyboardScenes: [
      scene({ topicId, type: "hook", durationSec: sceneBudgets.hook }),
      scene({ topicId, type: "process", durationSec: sceneBudgets.process }),
      scene({ topicId, type: "graph", durationSec: sceneBudgets.graph }),
      scene({ topicId, type: "rule", durationSec: sceneBudgets.rule }),
      scene({ topicId, type: "pitfall", durationSec: sceneBudgets.pitfall }),
      scene({ topicId, type: "wrap", durationSec: sceneBudgets.wrap }),
    ],
    subtitleDraft: subtitlesFor(topicId, scriptSegments),
    visualPlan: visualPlanFromResearch(research, [
      "变量关系",
      "过程示意",
      "规律卡片",
      "误区校正",
    ]),
    qaNotes: [],
  };
};

const buildChemistryDraft = ({
  topicId,
  research,
  sceneBudgets,
}: {
  topicId: string;
  research: TopicResearch;
  sceneBudgets: SceneBudgetMap;
}) => {
  const hookText = `先看 ${research.canonicalTitle} 关注的是物质、粒子还是反应路径。`;
  const compareText = firstResearchText(
    research.definitions,
    `先明确 ${research.canonicalTitle} 的对象和判断边界。`,
  );
  const processText = firstResearchText(
    research.principles,
    `把 ${research.canonicalTitle} 的变化步骤按先后关系排开。`,
  );
  const ruleText = firstResearchText(
    [...research.formulas, ...research.examples],
    `用一个例子说明 ${research.canonicalTitle} 的判断方法。`,
  );
  const pitfallText = firstResearchText(
    research.misconceptions,
    `不要把 ${research.canonicalTitle} 和相近概念混在一起。`,
  );
  const wrapText = `最后把 ${research.canonicalTitle} 放回对象、规律、例子和误区这四层一起看。`;
  const scriptSegments = [
    { id: `${topicId}-seg-hook`, kind: "hook", text: hookText },
    { id: `${topicId}-seg-compare`, kind: "compare", text: compareText },
    { id: `${topicId}-seg-process`, kind: "process", text: processText },
    { id: `${topicId}-seg-rule`, kind: "rule", text: ruleText },
    { id: `${topicId}-seg-pitfall`, kind: "pitfall", text: pitfallText },
    { id: `${topicId}-seg-wrap`, kind: "wrap", text: wrapText },
  ];

  return {
    toneProfile: "chemistry-layered-experiment",
    durationTargetSec: 60,
    hook: hookText,
    summary: `${research.canonicalTitle} 的对象和路径`,
    scriptSegments,
    storyboardScenes: [
      scene({ topicId, type: "hook", durationSec: sceneBudgets.hook }),
      scene({ topicId, type: "compare", durationSec: sceneBudgets.compare }),
      scene({ topicId, type: "process", durationSec: sceneBudgets.process }),
      scene({ topicId, type: "rule", durationSec: sceneBudgets.rule }),
      scene({ topicId, type: "pitfall", durationSec: sceneBudgets.pitfall }),
      scene({ topicId, type: "wrap", durationSec: sceneBudgets.wrap }),
    ],
    subtitleDraft: subtitlesFor(topicId, scriptSegments),
    visualPlan: visualPlanFromResearch(research, [
      "对象分类",
      "过程路径",
      "规律卡片",
      "误区校正",
    ]),
    qaNotes: [],
  };
};

const draftPayloadSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    toneProfile: { type: "string" },
    durationTargetSec: { type: "integer" },
    hook: { type: "string" },
    summary: { type: "string" },
    scriptSegments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          kind: {
            type: "string",
            enum: storyboardSceneTypeSchema.options,
          },
          text: { type: "string" },
        },
        required: ["id", "kind", "text"],
      },
    },
    storyboardScenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: storyboardSceneTypeSchema.options,
          },
          segmentIds: {
            type: "array",
            items: { type: "string" },
          },
          durationSec: { type: "number" },
        },
        required: ["id", "type", "segmentIds", "durationSec"],
      },
    },
    subtitleDraft: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          segmentId: { type: "string" },
          text: { type: "string" },
        },
        required: ["id", "segmentId", "text"],
      },
    },
    visualPlan: {
      type: "array",
      items: { type: "string" },
    },
    qaNotes: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "toneProfile",
    "durationTargetSec",
    "hook",
    "summary",
    "scriptSegments",
    "storyboardScenes",
    "subtitleDraft",
    "visualPlan",
    "qaNotes",
  ],
} as const;

export const createDraftProvider = (): DraftProvider => {
  const config = readProviderConfig();

  if (config.PIPELINE_PROVIDER_MODE === "openai") {
    return {
      createDraft: async ({ topicId, research, sceneBudgets, promptContext }) => {
        const structured = await requestStructuredOpenAIOutput<LessonDraftPayload>({
          apiKey: config.OPENAI_API_KEY ?? "",
          baseUrl: config.OPENAI_BASE_URL,
          model: config.DRAFT_MODEL,
          schemaName: "lesson_draft_payload",
          schema: draftPayloadSchema,
          systemPrompt:
            "You are a senior Chinese high-school STEM short-video lesson designer. Return only structured JSON for a 60-90 second educational lesson draft.",
          userPrompt: [
            `Topic ID: ${topicId}`,
            `Subject: ${topicId.split("-")[0]}`,
            `Prompt context: ${promptContext}`,
            `Canonical title: ${research.canonicalTitle}`,
            `Definitions: ${research.definitions.join(" | ")}`,
            `Formulas: ${research.formulas.join(" | ")}`,
            `Principles: ${research.principles.join(" | ")}`,
            `Examples: ${research.examples.join(" | ")}`,
            `Misconceptions: ${research.misconceptions.join(" | ")}`,
            `Visualization hints: ${research.visualizationHints.join(" | ")}`,
            `Scene budgets: ${JSON.stringify(sceneBudgets)}`,
            "Return Chinese content.",
            "Use concise but teachable narration.",
            "Every storyboard scene must reference existing script segment ids.",
            "Choose scene types that fit the subject instead of forcing all scene kinds.",
            "Duration target should stay in the 60-90 second range.",
          ].join("\n"),
        });
        const parsed = lessonDraftSchema.parse({
          topicId,
          ...structured,
        });

        return {
          toneProfile: parsed.toneProfile,
          durationTargetSec: parsed.durationTargetSec,
          hook: parsed.hook,
          summary: parsed.summary,
          scriptSegments: parsed.scriptSegments,
          storyboardScenes: parsed.storyboardScenes,
          subtitleDraft: parsed.subtitleDraft,
          visualPlan: parsed.visualPlan,
          qaNotes: parsed.qaNotes,
        };
      },
    };
  }

  if (config.PIPELINE_PROVIDER_MODE !== "mock") {
    throw new Error("Only mock and openai draft providers are implemented in this stage.");
  }

  return {
    createDraft: async ({ topicId, research, sceneBudgets }) => {
      if (topicId.startsWith("physics-")) {
        return buildPhysicsDraft({ topicId, research, sceneBudgets });
      }

      if (topicId.startsWith("chemistry-")) {
        return buildChemistryDraft({ topicId, research, sceneBudgets });
      }

      return buildMathDraft({ topicId, research, sceneBudgets });
    },
  };
};
