import type { Subject } from "../curriculum/schema";
import type { ApprovedSourceSummary } from "../review/schema";
import type { TimedRenderScene } from "./schema";

export type SubjectThemeTokens = {
  palette: string;
  typography: string;
  accent: string;
};

type VariableCard = {
  label: string;
  meaning: string;
};

export type RenderPackageScene = {
  id: string;
  kind: string;
  component: string;
  durationInFrames: number;
  payload: Record<string, unknown>;
};

export interface SubjectAdapter {
  subject: Subject;
  visualSystemId: string;
  themeTokens(): SubjectThemeTokens;
  mapScene(input: {
    canonicalTitle: string;
    sourceSummary: ApprovedSourceSummary;
    scene: TimedRenderScene;
  }): RenderPackageScene;
}

const sceneLabelMap: Record<string, string> = {
  hook: "问题引入",
  definition: "关键定义",
  rule: "规律归纳",
  compare: "条件对比",
  process: "过程拆解",
  graph: "图像观察",
  pitfall: "易错提醒",
  wrap: "收束总结",
};

const firstText = (values: Array<string | undefined>, fallback: string) =>
  values.find((value): value is string => typeof value === "string" && value.trim().length > 0) ??
  fallback;

const takeDistinct = (values: string[], limit = 3) =>
  Array.from(new Set(values.filter((value) => value.trim().length > 0))).slice(0, limit);

const physicsMeaningMap: Record<string, string> = {
  F: "力",
  m: "质量",
  a: "加速度",
  v: "速度",
  t: "时间",
  s: "位移",
  p: "压强",
  I: "电流",
  U: "电压",
  R: "电阻",
  n: "折射率",
  i: "入射角",
  r: "折射角",
};

const splitWordChunks = (word: string) => {
  const trimmed = word.trim();

  if (!trimmed) {
    return [];
  }

  if (trimmed.includes("/") || trimmed.includes("-") || trimmed.includes(" ")) {
    return trimmed
      .split(/[\s/-]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (trimmed.length <= 4) {
    return [trimmed];
  }

  const match = trimmed.match(/^([^aeiouy]*[aeiouy]+)(.*)$/i);

  if (match?.[1] && match[2]) {
    return [match[1], match[2]];
  }

  return [trimmed];
};

const inferVariableCards = (formula: string): VariableCard[] => {
  const labels = Array.from(new Set(formula.match(/[A-Za-z]/g) ?? []));

  return labels.slice(0, 4).map((label) => ({
    label,
    meaning: physicsMeaningMap[label] ?? "物理量",
  }));
};

const buildBasePayload = ({
  canonicalTitle,
  scene,
}: {
  canonicalTitle: string;
  scene: TimedRenderScene;
}) => ({
  title: canonicalTitle,
  sceneLabel: sceneLabelMap[scene.type] ?? "知识片段",
  narration: scene.narration,
  segmentIds: scene.segmentIds,
  subtitleCues: scene.subtitleCues,
  targetDurationMs: scene.targetDurationMs,
  actualDurationMs: scene.durationMs,
});

const buildMathPayload = ({
  canonicalTitle,
  sourceSummary,
  scene,
}: {
  canonicalTitle: string;
  sourceSummary: ApprovedSourceSummary;
  scene: TimedRenderScene;
}) => ({
  ...buildBasePayload({ canonicalTitle, scene }),
  boardTitle: `${canonicalTitle} 表达`,
  boardExpression: firstText(
    sourceSummary.formulas,
    firstText(sourceSummary.examples, canonicalTitle),
  ),
  keyPoints: takeDistinct([
    ...sourceSummary.definitions,
    ...sourceSummary.principles,
    ...sourceSummary.examples,
  ]),
  exampleChips: takeDistinct(sourceSummary.examples, 3),
  misconceptionNote: firstText(
    sourceSummary.misconceptions,
    `注意区分 ${canonicalTitle} 和相近概念。`,
  ),
  nextHint: firstText(
    sourceSummary.nextConnections,
    `继续关注 ${canonicalTitle} 的条件、关系和表示方式。`,
  ),
});

const buildPhysicsPayload = ({
  canonicalTitle,
  sourceSummary,
  scene,
}: {
  canonicalTitle: string;
  sourceSummary: ApprovedSourceSummary;
  scene: TimedRenderScene;
}) => {
  const lawCard = firstText(
    sourceSummary.formulas,
    firstText(sourceSummary.principles, canonicalTitle),
  );

  return {
    ...buildBasePayload({ canonicalTitle, scene }),
    lawCard,
    variableCards: inferVariableCards(lawCard),
    processSteps: takeDistinct([
      firstText(sourceSummary.principles, scene.narration),
      firstText(sourceSummary.examples, `例子：${scene.narration}`),
      scene.narration,
    ]),
    observationNote: firstText(
      sourceSummary.visualizationHints,
      `用变量、箭头或过程示意表达 ${canonicalTitle}。`,
    ),
  };
};

const buildChemistryPayload = ({
  canonicalTitle,
  sourceSummary,
  scene,
}: {
  canonicalTitle: string;
  sourceSummary: ApprovedSourceSummary;
  scene: TimedRenderScene;
}) => ({
  ...buildBasePayload({ canonicalTitle, scene }),
  reactionLine: firstText(
    sourceSummary.formulas,
    firstText(sourceSummary.examples, canonicalTitle),
  ),
  particleLabels: takeDistinct(
    [...sourceSummary.definitions, ...sourceSummary.principles],
    3,
  ),
  labNotes: takeDistinct([
    ...sourceSummary.principles,
    ...sourceSummary.misconceptions,
    ...sourceSummary.visualizationHints,
  ]),
  compareFocus: firstText(
    sourceSummary.definitions,
    `先明确 ${canonicalTitle} 的对象、条件和变化关系。`,
  ),
});

const buildEnglishPayload = ({
  canonicalTitle,
  sourceSummary,
  scene,
}: {
  canonicalTitle: string;
  sourceSummary: ApprovedSourceSummary;
  scene: TimedRenderScene;
}) => {
  const englishSceneLabelMap: Record<string, string> = {
    hook: "发音",
    definition: "单词",
    process: "释义",
    compare: "记忆",
    pitfall: "联想",
    wrap: "回顾",
  };

  return {
    ...buildBasePayload({ canonicalTitle, scene }),
    sceneLabel: englishSceneLabelMap[scene.type] ?? "单词",
    word: canonicalTitle,
    phonetic: firstText([sourceSummary.phonetic, ...sourceSummary.formulas], ""),
    partOfSpeech: firstText(sourceSummary.principles, "word"),
    meaning: firstText(sourceSummary.definitions, canonicalTitle),
    meaningLines: takeDistinct(sourceSummary.definitions, 3),
    mnemonic: firstText(
      sourceSummary.examples,
      `巧记：${canonicalTitle} 先看读音，再看词形。`,
    ),
    contrast: firstText(
      sourceSummary.misconceptions,
      `别把 ${canonicalTitle} 和相似拼写的词混淆。`,
    ),
    wordChunks: splitWordChunks(canonicalTitle),
    cueHint: firstText(
      sourceSummary.visualizationHints,
      "用单词、音标、释义和口诀分层展示。",
    ),
  };
};

const buildAdapter = ({
  subject,
  themeTokens,
  payloadBuilder,
}: {
  subject: Subject;
  themeTokens: SubjectThemeTokens;
  payloadBuilder: (input: {
    canonicalTitle: string;
    sourceSummary: ApprovedSourceSummary;
    scene: TimedRenderScene;
  }) => Record<string, unknown>;
}): SubjectAdapter => ({
  subject,
  visualSystemId: subject,
  themeTokens: () => themeTokens,
  mapScene: ({ canonicalTitle, sourceSummary, scene }) => ({
    id: scene.id,
    kind: scene.type,
    component: `${subject}/${scene.type}`,
    durationInFrames: Math.max(1, Math.ceil((scene.durationMs / 1000) * 30)),
    payload: payloadBuilder({
      canonicalTitle,
      sourceSummary,
      scene,
    }),
  }),
});

export const mathSubjectAdapter = buildAdapter({
  subject: "math",
  themeTokens: {
    palette: "math-clean",
    typography: "math-serif",
    accent: "#1f4b99",
  },
  payloadBuilder: buildMathPayload,
});

export const physicsSubjectAdapter = buildAdapter({
  subject: "physics",
  themeTokens: {
    palette: "physics-lab",
    typography: "physics-sans",
    accent: "#1a7f64",
  },
  payloadBuilder: buildPhysicsPayload,
});

export const chemistrySubjectAdapter = buildAdapter({
  subject: "chemistry",
  themeTokens: {
    palette: "chemistry-reactive",
    typography: "chemistry-sans",
    accent: "#8a3b12",
  },
  payloadBuilder: buildChemistryPayload,
});

export const englishSubjectAdapter = buildAdapter({
  subject: "english",
  themeTokens: {
    palette: "english-vocab-card",
    typography: "english-serif",
    accent: "#ff8d7a",
  },
  payloadBuilder: buildEnglishPayload,
});
