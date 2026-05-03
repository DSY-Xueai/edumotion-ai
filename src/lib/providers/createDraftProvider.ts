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

const buildMathDraft = ({
  topicId,
  research,
  sceneBudgets,
}: {
  topicId: string;
  research: TopicResearch;
  sceneBudgets: SceneBudgetMap;
}) => {
  const hookText = `先别急着背定义，${research.canonicalTitle}真正难的不是名词本身，而是你能不能一眼看出哪些对象能放进同一个整体。`;
  const definitionText =
    research.definitions[0] ??
    `${research.canonicalTitle}要先说明对象的范围，再把它们作为一个整体来看。`;
  const ruleText =
    research.examples[0] ??
    "像 {1,2,3} 和 {3,2,1} 这样的写法，顺序不同但整体不变，这正是集合和普通列表最重要的区别。";
  const compareText =
    research.principles[0] ??
    "判断一个集合时，要连续检查三个条件：元素是不是确定的，元素会不会重复，顺序会不会改变结果。";
  const pitfallText =
    research.misconceptions[0] ??
    "最容易错的地方，是把重复出现的元素当成会生成一个新集合，其实集合只关心有没有，不关心出现几次。";
  const wrapText = `记住这一套顺序：先抓定义，再看表示，再做条件判断，最后回头检查易错点，你就不会把 ${research.canonicalTitle} 学成死记硬背。`;

  return {
    toneProfile: "math-clear-structured",
    durationTargetSec: 62,
    hook: hookText,
    summary: `${research.canonicalTitle}的判断框架`,
    scriptSegments: [
      { id: `${topicId}-seg-hook`, kind: "hook", text: hookText },
      { id: `${topicId}-seg-definition`, kind: "definition", text: definitionText },
      { id: `${topicId}-seg-rule`, kind: "rule", text: ruleText },
      { id: `${topicId}-seg-compare`, kind: "compare", text: compareText },
      { id: `${topicId}-seg-pitfall`, kind: "pitfall", text: pitfallText },
      { id: `${topicId}-seg-wrap`, kind: "wrap", text: wrapText },
    ],
    storyboardScenes: [
      {
        id: `${topicId}-scene-hook`,
        type: "hook" as const,
        segmentIds: [`${topicId}-seg-hook`],
        durationSec: sceneBudgets.hook,
      },
      {
        id: `${topicId}-scene-definition`,
        type: "definition" as const,
        segmentIds: [`${topicId}-seg-definition`],
        durationSec: sceneBudgets.definition,
      },
      {
        id: `${topicId}-scene-rule`,
        type: "rule" as const,
        segmentIds: [`${topicId}-seg-rule`],
        durationSec: sceneBudgets.rule,
      },
      {
        id: `${topicId}-scene-compare`,
        type: "compare" as const,
        segmentIds: [`${topicId}-seg-compare`],
        durationSec: sceneBudgets.compare,
      },
      {
        id: `${topicId}-scene-pitfall`,
        type: "pitfall" as const,
        segmentIds: [`${topicId}-seg-pitfall`],
        durationSec: sceneBudgets.pitfall,
      },
      {
        id: `${topicId}-scene-wrap`,
        type: "wrap" as const,
        segmentIds: [`${topicId}-seg-wrap`],
        durationSec: sceneBudgets.wrap,
      },
    ],
    subtitleDraft: [
      { id: `${topicId}-sub-hook`, segmentId: `${topicId}-seg-hook`, text: hookText },
      {
        id: `${topicId}-sub-definition`,
        segmentId: `${topicId}-seg-definition`,
        text: definitionText,
      },
      { id: `${topicId}-sub-rule`, segmentId: `${topicId}-seg-rule`, text: ruleText },
      {
        id: `${topicId}-sub-compare`,
        segmentId: `${topicId}-seg-compare`,
        text: compareText,
      },
      {
        id: `${topicId}-sub-pitfall`,
        segmentId: `${topicId}-seg-pitfall`,
        text: pitfallText,
      },
      { id: `${topicId}-sub-wrap`, segmentId: `${topicId}-seg-wrap`, text: wrapText },
    ],
    visualPlan: ["板书表达", "条件对比", "易错提醒", "规则归纳"],
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
  const hookText = "为什么同样在动，有时说它动，有时又说它静？这不是嘴硬，而是因为物理描述从来都离不开参考系。";
  const processText =
    research.principles[0] ??
    "描述运动时，先选参考系，再说明位置随时间怎样变化，最后再谈快慢和方向。";
  const graphText =
    research.examples[0] ??
    "把时间放在横轴，把位置放在纵向，你就能看到列车进站时位置一点点靠近站台。";
  const ruleText =
    research.formulas[0] ??
    "速度本质上是在单位时间内看位移变化得有多快，所以公式把位移和时间直接联系起来。";
  const pitfallText =
    research.misconceptions[0] ??
    "最常见的误区，是一看到物体移动就下结论，却不先交代它是相对于谁在动。";
  const wrapText = "所以这节课只记一件事：运动不是孤立描述出来的，参考系、位置变化和时间刻度必须一起出现。";

  return {
    toneProfile: "physics-causal-lab",
    durationTargetSec: 60,
    hook: hookText,
    summary: `${research.canonicalTitle}的观察顺序`,
    scriptSegments: [
      { id: `${topicId}-seg-hook`, kind: "hook", text: hookText },
      { id: `${topicId}-seg-process`, kind: "process", text: processText },
      { id: `${topicId}-seg-graph`, kind: "graph", text: graphText },
      { id: `${topicId}-seg-rule`, kind: "rule", text: ruleText },
      { id: `${topicId}-seg-pitfall`, kind: "pitfall", text: pitfallText },
      { id: `${topicId}-seg-wrap`, kind: "wrap", text: wrapText },
    ],
    storyboardScenes: [
      {
        id: `${topicId}-scene-hook`,
        type: "hook" as const,
        segmentIds: [`${topicId}-seg-hook`],
        durationSec: sceneBudgets.hook,
      },
      {
        id: `${topicId}-scene-process`,
        type: "process" as const,
        segmentIds: [`${topicId}-seg-process`],
        durationSec: sceneBudgets.process,
      },
      {
        id: `${topicId}-scene-graph`,
        type: "graph" as const,
        segmentIds: [`${topicId}-seg-graph`],
        durationSec: sceneBudgets.graph,
      },
      {
        id: `${topicId}-scene-rule`,
        type: "rule" as const,
        segmentIds: [`${topicId}-seg-rule`],
        durationSec: sceneBudgets.rule,
      },
      {
        id: `${topicId}-scene-pitfall`,
        type: "pitfall" as const,
        segmentIds: [`${topicId}-seg-pitfall`],
        durationSec: sceneBudgets.pitfall,
      },
      {
        id: `${topicId}-scene-wrap`,
        type: "wrap" as const,
        segmentIds: [`${topicId}-seg-wrap`],
        durationSec: sceneBudgets.wrap,
      },
    ],
    subtitleDraft: [
      { id: `${topicId}-sub-hook`, segmentId: `${topicId}-seg-hook`, text: hookText },
      {
        id: `${topicId}-sub-process`,
        segmentId: `${topicId}-seg-process`,
        text: processText,
      },
      { id: `${topicId}-sub-graph`, segmentId: `${topicId}-seg-graph`, text: graphText },
      { id: `${topicId}-sub-rule`, segmentId: `${topicId}-seg-rule`, text: ruleText },
      {
        id: `${topicId}-sub-pitfall`,
        segmentId: `${topicId}-seg-pitfall`,
        text: pitfallText,
      },
      { id: `${topicId}-sub-wrap`, segmentId: `${topicId}-seg-wrap`, text: wrapText },
    ],
    visualPlan: ["变量关系", "图像观察", "过程拆解", "误区校正"],
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
  const hookText = "同样是物质变化，为什么有的只是重新分类，有的却会真正变成另一种物质？化学入门先要把这条线分清。";
  const compareText =
    research.definitions[0] ??
    "先看物质属于哪一类，再看这一类物质和另一类物质之间会不会发生可观察的转化。";
  const processText =
    research.principles[0] ??
    "从宏观现象出发，再回到微观粒子层面，你才能明白分类为什么会影响反应判断。";
  const ruleText =
    research.examples[0] ??
    "像铁生锈这样的例子告诉我们，物质一旦组成发生变化，分类和性质都会跟着变。";
  const pitfallText =
    research.misconceptions[0] ??
    "最容易犯的错，是把分类当成死背表格，却忽略了它本来就是为反应判断服务的。";
  const wrapText = "所以学化学不要只记名称，要把分类、转化和微观解释三件事放在同一条链里理解。";

  return {
    toneProfile: "chemistry-layered-experiment",
    durationTargetSec: 60,
    hook: hookText,
    summary: `${research.canonicalTitle}的分类与转化视角`,
    scriptSegments: [
      { id: `${topicId}-seg-hook`, kind: "hook", text: hookText },
      { id: `${topicId}-seg-compare`, kind: "compare", text: compareText },
      { id: `${topicId}-seg-process`, kind: "process", text: processText },
      { id: `${topicId}-seg-rule`, kind: "rule", text: ruleText },
      { id: `${topicId}-seg-pitfall`, kind: "pitfall", text: pitfallText },
      { id: `${topicId}-seg-wrap`, kind: "wrap", text: wrapText },
    ],
    storyboardScenes: [
      {
        id: `${topicId}-scene-hook`,
        type: "hook" as const,
        segmentIds: [`${topicId}-seg-hook`],
        durationSec: sceneBudgets.hook,
      },
      {
        id: `${topicId}-scene-compare`,
        type: "compare" as const,
        segmentIds: [`${topicId}-seg-compare`],
        durationSec: sceneBudgets.compare,
      },
      {
        id: `${topicId}-scene-process`,
        type: "process" as const,
        segmentIds: [`${topicId}-seg-process`],
        durationSec: sceneBudgets.process,
      },
      {
        id: `${topicId}-scene-rule`,
        type: "rule" as const,
        segmentIds: [`${topicId}-seg-rule`],
        durationSec: sceneBudgets.rule,
      },
      {
        id: `${topicId}-scene-pitfall`,
        type: "pitfall" as const,
        segmentIds: [`${topicId}-seg-pitfall`],
        durationSec: sceneBudgets.pitfall,
      },
      {
        id: `${topicId}-scene-wrap`,
        type: "wrap" as const,
        segmentIds: [`${topicId}-seg-wrap`],
        durationSec: sceneBudgets.wrap,
      },
    ],
    subtitleDraft: [
      { id: `${topicId}-sub-hook`, segmentId: `${topicId}-seg-hook`, text: hookText },
      {
        id: `${topicId}-sub-compare`,
        segmentId: `${topicId}-seg-compare`,
        text: compareText,
      },
      {
        id: `${topicId}-sub-process`,
        segmentId: `${topicId}-seg-process`,
        text: processText,
      },
      { id: `${topicId}-sub-rule`, segmentId: `${topicId}-seg-rule`, text: ruleText },
      {
        id: `${topicId}-sub-pitfall`,
        segmentId: `${topicId}-seg-pitfall`,
        text: pitfallText,
      },
      { id: `${topicId}-sub-wrap`, segmentId: `${topicId}-seg-wrap`, text: wrapText },
    ],
    visualPlan: ["分类对照", "反应路径", "实验提醒", "误区校正"],
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
