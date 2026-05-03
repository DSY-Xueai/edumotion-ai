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

const firstText = (values: string[], fallback: string) =>
  values.find((value) => value.trim().length > 0) ?? fallback;

const takeDistinct = (values: string[], limit = 3) =>
  Array.from(new Set(values.filter((value) => value.trim().length > 0))).slice(0, limit);

const physicsMeaningMap: Record<string, string> = {
  F: "合力",
  m: "质量",
  a: "加速度",
  v: "速度",
  t: "时间",
  s: "位移",
  p: "压强",
  I: "电流",
  U: "电压",
  R: "电阻",
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
  boardTitle: "集合表达",
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
    "注意区分对象整体与单个元素。",
  ),
  nextHint: firstText(
    sourceSummary.nextConnections,
    "继续关注条件、关系和图像之间的联系。",
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
      "先看受力方向，再判断变量联动。",
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
  particleLabels: ["反应前", "反应后"],
  labNotes: takeDistinct([
    ...sourceSummary.principles,
    ...sourceSummary.misconceptions,
    ...sourceSummary.visualizationHints,
  ]),
  compareFocus: firstText(
    sourceSummary.definitions,
    "既要看宏观现象，也要看微观粒子变化。",
  ),
});

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
