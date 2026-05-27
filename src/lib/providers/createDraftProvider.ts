import type { DraftProvider } from "../draft/draftProvider";
import type { SceneBudgetMap } from "../draft/defaultSceneBudgets";
import {
  lessonDraftSchema,
  storyboardSceneTypeSchema,
  type LessonDraftPayload,
} from "../draft/schema";
import { checkEnglishDraftQuality } from "../draft/checkEnglishDraftQuality";
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

    if (/(不正常|反常|异常|变态)/u.test(meaningTail)) {
      if (/ly$/i.test(word) || research.principles.some((value) => /^adv\b/i.test(value))) {
        return {
          leadText: `怎么记 ${compactMeaning}？正常洗衣机只在原地转，这台却边唱歌边转圈，最后还跳出阳台，`,
          storyText: `这种动作方式明显就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        };
      }

      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？正常体温大约三十六七度，体温计突然显示八十度还说健康，`,
          storyText: `这种明显偏离正常范围的情况，就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `说起 ${compactMeaning}，正常考试该写答案，有人却把试卷倒过来当菜单点菜，`,
          storyText: `这种反常状态就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: `记 ${compactMeaning}，就看正常体温三十六七度，屏幕突然跳到八十度还提示健康，`,
          storyText: `这种明显异常，就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的画面：大家都按绿灯往前走，只有这个信号灯半夜开始倒着数数，`,
          storyText: `这种不按常理来的样子，就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
      ]);
    }

    if (/(出色|有能力|优秀|能干|厉害|杰出|卓越|非凡|出众|棒|强|擅长|精通)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？别人做不了的事，你轻松就拿下了，`,
          storyText: `这种本事就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的最好画面：难题摆在面前，别人绕路，你直接把它解了，`,
          storyText: `这种表现就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: `说起 ${compactMeaning}，一群人里只有你敢站出来把事情做成，`,
          storyText: `这就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `记 ${compactMeaning} 有一招：别人还在犹豫，你已经做完了，`,
          storyText: `这种状态就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 这个词，想到的是：再难的事交给你，都能成，`,
          storyText: `这就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
      ]);
    }

    if (/(聪明|智慧|明智|机灵|灵巧)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？一个问题还没说完，你已经知道答案了，`,
          storyText: `这种反应就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的画面：别人还在翻书，你一眼就看透了关键，`,
          storyText: `这种脑筋就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: `说起 ${compactMeaning}，就像考试时别人还在读题，你已经交卷了，`,
          storyText: `这种脑子就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
      ]);
    }

    if (/(勇敢|大胆|英勇|无畏)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？周围的人都往后退，你一步跨了出去，`,
          storyText: `这个动作就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的画面：明知有风险，还是第一个举起了手，`,
          storyText: `这种气魄就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: `说到 ${compactMeaning}，心里有恐惧但行动没有停下，`,
          storyText: `这股胆量就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
      ]);
    }

    if (/(善良|仁慈|大方|慷慨|好心|体贴)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？一个陌生人摔倒了，你二话不说就去扶，`,
          storyText: `这种心意就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的画面：自己不多拿，反而把多的那份让给了别人，`,
          storyText: `这种举动就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: `说起 ${compactMeaning}，明明可以不给，却主动伸出了手，`,
          storyText: `这颗心就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
      ]);
    }

    if (/(坚强|坚定|顽强|牢固|稳固|刚强)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？一遍又一遍地失败，可你站起来继续，`,
          storyText: `这股劲就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的画面：不管别人怎么劝你放弃，你都纹丝不动，`,
          storyText: `这种定力就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: `要说 ${compactMeaning}，受再多打击，心还是硬的，脊梁还是直的，`,
          storyText: `这种韧性就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
      ]);
    }

    if (/(懒|笨|蠢|胆小|粗心|自私|傲慢|小气|贪|凶|狠)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？明明该做的事，找一堆借口不去碰，`,
          storyText: `这副样子就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的画面：一个机会在眼前，因为怕就缩了回去，`,
          storyText: `这种退缩就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: `说起 ${compactMeaning}，眼里只有自己，完全不管别人的感受，`,
          storyText: `这种态度就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 这个词，画面很清楚：该做的事不去做，该帮的人不去帮，`,
          storyText: `这就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
      ]);
    }

    if (/(快|慢|迅速|缓慢)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？一眨眼的功夫，事情已经办完了，`,
          storyText: `这种节奏就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的画面：别人刚起步，你这边已经到终点了，`,
          storyText: `这个速度就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: `说 ${compactMeaning}，就像等红灯时旁边车道已经绿了，`,
          storyText: `这种对比就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
      ]);
    }

    if (/(大|小|巨大|微小|强|弱|高|矮|宽阔|狭窄)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？两个东西放在一起，差距一目了然，`,
          storyText: `其中一个就是${compactMeaning}的，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的画面：和周围一比，它立刻突了出来，`,
          storyText: `这种感觉就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: `记 ${compactMeaning} 很简单：从这一头看不到那一头，`,
          storyText: `这感觉就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
      ]);
    }

    if (/(难|容易|简单|困难|复杂)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？第一次上手就做完了，没翻书没问人，`,
          storyText: `这种体验就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的画面：试了好几遍都在同一个地方卡住，`,
          storyText: `这种感觉就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: `说到 ${compactMeaning}，就是那种一步还是十步才能走完的差别，`,
          storyText: `这种体验就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
      ]);
    }

    if (/(美|漂亮|好看|丑|难看)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？一眼看过去，目光就移不开了，`,
          storyText: `这就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的画面：不需要任何解释，眼睛自己会告诉你，`,
          storyText: `这种感觉就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
        {
          leadText: `说起 ${compactMeaning}，就是一种你看到了就自然知道的东西，`,
          storyText: `这就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
      ]);
    }

    if (/(热|冷|温暖|寒冷|凉|烫)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？皮肤一碰到，信号立刻传遍全身，`,
          storyText: `这种感觉就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 很好记：伸出手的那一瞬间，身体自己告诉你的，`,
          storyText: `就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
      ]);
    }

    if (/(好|棒|佳|良)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？一件事做完，你忍不住给自己点头，`,
          storyText: `这种评价就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的画面：从里到外都挑不出毛病，`,
          storyText: `这感觉就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
      ]);
    }

    if (/(坏|差|劣|糟糕|可怕|讨厌)/u.test(meaningTail)) {
      return pickVariant(seed, [
        {
          leadText: `怎么记 ${compactMeaning}？经历完这件事，你再也不想碰到第二次，`,
          storyText: `这种感受就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，就是${compactMeaning}。`,
        },
        {
          leadText: `${compactMeaning} 的画面：从头到尾都让人想逃离，`,
          storyText: `这种感觉就是${compactMeaning}，`,
          echoText: `${word}，`,
          wrapStoryText: `所以：${word}，记住${compactMeaning}。`,
        },
      ]);
    }

    throw new Error(
      `Mock English draft provider cannot create a grounded mnemonic for ${word}. Use PIPELINE_PROVIDER_MODE=openai for production English vocabulary drafts.`,
    );
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
        const isEnglishTopic = topicId.startsWith("english-");
        const buildUserPrompt = (qualityIssues: string[]) =>
          isEnglishTopic
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
                "The mnemonic scene must logically prove the Chinese meaning: verbs need a clear actor/action, nouns need a clear action/state/result, adjectives and adverbs need a concrete visible state, position, manner, or result.",
                "Do not use weak object scenes that only say nobody touches something, something sits there, or 不再继续就是... unless the actor, decision, and meaning are explicit.",
                "Do not use generic picture wording such as 清晰的画面、对应着、脑子里有一个场景、放进一个画面、画面里只有一件事、和一个画面焊在一起.",
                qualityIssues.length > 0
                  ? `Previous draft failed quality checks. Rewrite the mnemonic to fix these issues: ${qualityIssues.join(" | ")}`
                  : "",
                "Every storyboard scene must reference existing script segment ids.",
                "Keep the video short and compact.",
                "Do not write STEM framing.",
              ]
                .filter(Boolean)
                .join("\n")
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
              ].join("\n");

        let qualityIssues: string[] = [];

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const structured = await requestStructuredOpenAIOutput<LessonDraftPayload>({
            apiKey: config.OPENAI_API_KEY ?? "",
            baseUrl: config.OPENAI_BASE_URL,
            model: config.DRAFT_MODEL,
            schemaName: "lesson_draft_payload",
            schema: draftPayloadSchema,
            systemPrompt: isEnglishTopic
              ? "You are a senior Chinese English vocabulary short-video lesson designer. Return only structured JSON for a one-word-one-video lesson draft that matches a layered vocabulary card style, with a short Chinese cadence: 一秒记一个单词。今天要记的单词是 X，意思是...。Keep the whole video visually static on one centered word card, use only one storyboard scene, do not surface phonetic in the narration, do not add extra instructional labels, and keep the pronunciation beat as a standalone segment using the English word itself. The rest should follow the reference style with a fresh mnemonic story whose action or state logically proves the word meaning, not a repeated fixed anecdote."
              : "You are a senior Chinese high-school STEM short-video lesson designer. Return only structured JSON for a 60-90 second educational lesson draft.",
            userPrompt: buildUserPrompt(qualityIssues),
          });
          const parsed = lessonDraftSchema.parse({
            topicId,
            ...structured,
          });
          const draft = {
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

          if (!isEnglishTopic) {
            return draft;
          }

          const quality = checkEnglishDraftQuality({ draft, research });

          if (quality.ok) {
            return draft;
          }

          qualityIssues = quality.issues;
        }

        throw new Error(
          `OpenAI English draft failed quality checks after 3 attempts: ${qualityIssues.join(" | ")}`,
        );
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
