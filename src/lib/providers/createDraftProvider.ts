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

const hashSeed = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
    hash >>>= 0;
  }

  return hash;
};

const pickVariant = <T,>(seed: string, variants: T[]) =>
  variants[hashSeed(seed) % variants.length] ?? variants[0];

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

const buildEnglishDraft = ({
  topicId,
  research,
  sceneBudgets,
}: {
  topicId: string;
  research: TopicResearch;
  sceneBudgets: SceneBudgetMap;
}) => {
  const word = research.canonicalTitle;
  const meaning = firstResearchText(
    research.definitions,
    "郁闷的、闷闷不乐的",
  );
  const meaningTail = meaning.replace(/[。.!！?？；;]+$/u, "");
  const compactMeaning =
    meaningTail
      .split(/[；;，,、]/u)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join("、") || meaningTail;

  const buildMemoryScript = () => {
    const seed = `${topicId}:${word}:${meaningTail}`;

    if (/(郁闷|闷闷不乐|不开心|沮丧)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: "你暗恋的人过生日，别人都送花，",
          storyText: "只有你——手里空空的，",
          echoText: "没人送我玫瑰，",
          wrapStoryText: `${word}，当然郁闷了。`,
        },
        {
          leadText: "热闹的人群都在笑，",
          storyText: "你却像站在门外吹风，",
          echoText: "没人送我玫瑰，",
          wrapStoryText: `${word}，就是那种闷闷不乐。`,
        },
        {
          leadText: "别人都拿着礼物进门，",
          storyText: "轮到你时却两手空空，",
          echoText: "没人送我玫瑰，",
          wrapStoryText: `${word}，心里自然就沉下去了。`,
        },
      ]);
    }

    if (/(放弃|丢弃|抛弃|舍弃)/u.test(meaningTail)) {
      const nounVariants = [
        {
          leadText: "一个计划做到一半，负责人决定停掉，",
          storyText: `这种“${compactMeaning}这件事”，就是 ${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: "原本答应负责的事，却决定丢下不管，",
          storyText: `这种不再承担的状态，就是${compactMeaning}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: "项目还没完成，却决定停止推进，",
          storyText: `这个决定本身，就是${compactMeaning}，`,
          wrapStoryText: `所以：${word}，指的是${compactMeaning}。`,
        },
      ];
      const verbVariants = [
        {
          leadText: "原本想继续的计划，最后决定停掉，",
          storyText: `这个动作就是${compactMeaning}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: "一件东西不再要了，你直接决定丢掉，",
          storyText: `这个动作就是${compactMeaning}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: "走到一半发现不该继续，就主动停下，",
          storyText: `这个动作才是${compactMeaning}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
      ];

      return pickVariant(seed, /ment$/i.test(word) ? nounVariants : verbVariants);
    }

    if (/(缩写|缩短|节略|省略)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: "一个完整名字太长，先省掉一部分，",
          storyText: `缩成更短的写法，就是${compactMeaning}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: "长词写起来太费劲，就保留关键字母，",
          storyText: `把它缩短后的形式，就是${compactMeaning}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: "全称太长，写的时候压缩成短形式，",
          storyText: `这个短形式，就是${compactMeaning}，`,
          wrapStoryText: `所以：${word}，指的是${compactMeaning}。`,
        },
      ]);
    }

    if (/(忍受|容忍|遵守|遵从|服从)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: "遇到不舒服的规则，",
          storyText: `先忍住照做，就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: "明明有点难受，",
          storyText: `还守住规矩，就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，抓住${compactMeaning}。`,
        },
        {
          leadText: "规则不一定轻松，",
          storyText: `忍着照做，就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，意思是${compactMeaning}。`,
        },
      ]);
    }

    return pickVariant(seed, [
      {
        leadText: `先抓中文义项：${compactMeaning}，`,
        storyText: `画面只服务：${compactMeaning}，`,
        echoText: `${word}，`,
        wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
      },
      {
        leadText: `${word} 不靠空想，`,
        storyText: `直接对上：${compactMeaning}，`,
        echoText: `${word}，`,
        wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
      },
      {
        leadText: `这一轮只记 ${word} 的核心意思，`,
        storyText: `马上想到：${compactMeaning}，`,
        echoText: `${word}，`,
        wrapStoryText: `所以：${word}，核心是${compactMeaning}。`,
      },
    ]);
  };

  const memory = buildMemoryScript();
  const hookText = "一秒钟记一个单词。";
  const definitionText = `今天要记的单词是 ${word}，意思是：${meaningTail}。`;
  const pronunciationText = word;
  const wrapText = memory.wrapStoryText;
  const scriptSegments = [
    { id: `${topicId}-seg-hook`, kind: "hook", text: hookText },
    { id: `${topicId}-seg-definition`, kind: "definition", text: definitionText },
    { id: `${topicId}-seg-compare-lead`, kind: "compare", text: memory.leadText },
    { id: `${topicId}-seg-pitfall`, kind: "pitfall", text: memory.storyText },
    { id: `${topicId}-seg-pronunciation`, kind: "pronunciation", text: pronunciationText },
    { id: `${topicId}-seg-wrap`, kind: "wrap", text: wrapText },
  ];
  const storyboardScenes: LessonDraftPayload["storyboardScenes"] = [
    {
      id: `${topicId}-scene-definition`,
      type: "definition",
      segmentIds: scriptSegments.map((segment) => segment.id),
      durationSec: 20,
    },
  ];

  return {
    toneProfile: "english-vocabulary-card",
    durationTargetSec: 20,
    hook: hookText,
    summary: `${word} 的单词记忆卡`,
    scriptSegments,
    storyboardScenes,
    subtitleDraft: subtitlesFor(topicId, scriptSegments),
    visualPlan: visualPlanFromResearch(research, [
      "单词必须足够大",
      "先出发音再出释义",
      "联想故事只保留一条主线",
      "最后用解释句收束",
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
            enum: [...storyboardSceneTypeSchema.options, "pronunciation"],
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
            topicId.startsWith("english-")
              ? "You are a senior Chinese English vocabulary short-video lesson designer. Return only structured JSON for a one-word-one-video lesson draft that matches a layered vocabulary card style, with a short Chinese cadence: 一秒记一个单词。今天要记的单词是 X，意思是...。Keep the whole video visually static on one centered word card, use only one storyboard scene, do not surface phonetic in the narration, do not add extra instructional labels, and keep the pronunciation beat as a standalone segment using the English word itself. The rest should follow the reference style with a fresh mnemonic story whose action or state logically proves the word meaning, not a repeated fixed anecdote."
              : "You are a senior Chinese high-school STEM short-video lesson designer. Return only structured JSON for a 60-90 second educational lesson draft.",
          userPrompt:
            topicId.startsWith("english-")
              ? [
                  `Topic ID: ${topicId}`,
                  `Subject: english`,
                  `Prompt context: ${promptContext}`,
                  `Word: ${research.canonicalTitle}`,
                  `Phonetic: ${research.phonetic || research.formulas.join(" | ")}`,
                  `Meanings: ${research.definitions.join(" | ")}`,
                  `Part of speech / hints: ${research.principles.join(" | ")}`,
                  `Mnemonic examples: ${research.examples.join(" | ")}`,
                  `Misconceptions: ${research.misconceptions.join(" | ")}`,
                  `Visualization hints: ${research.visualizationHints.join(" | ")}`,
                  `Scene budgets: ${JSON.stringify(sceneBudgets)}`,
                  "Return Chinese content only.",
                  "Use a layered vocabulary-card style similar to a short-form word memo video.",
                  "Follow the cadence: 一秒记一个单词。今天要记的单词是 X，意思是：...。怎么记？...",
                  "Keep the entire video on one storyboard scene and one centered visual focus.",
                  "Do not mention phonetic in the narration.",
                  "Do not include instructional labels like 巧记、词性提示 or other on-screen explanations in the visual plan.",
                  "The pronunciation beat must be a standalone English segment using the English word itself.",
                  "Use Chinese segments for the memory hook, contrast, and recap, and build the mnemonic as a fresh story derived from the word meaning.",
                  "The mnemonic scene must logically prove the Chinese meaning: verbs need a clear actor/action, nouns need a clear action/state/result, and adjectives need a concrete trait being shown.",
                  "Do not use weak object scenes that only say nobody touches something, something sits there, or 不再继续就是... unless the actor, decision, and meaning are explicit.",
                  "Every storyboard scene must reference existing script segment ids.",
                  "Keep the video short and compact.",
                  "Do not write STEM framing.",
                ].join("\n")
              : [
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
      if (topicId.startsWith("english-")) {
        return buildEnglishDraft({ topicId, research, sceneBudgets });
      }

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
