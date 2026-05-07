import type { RenderPackage, RenderPackageScene } from "../../lib/rendering/schema";

export type VisualModule =
  | "hero-focus"
  | "concept-map"
  | "formula-board"
  | "process-flow"
  | "compare-board"
  | "reflection-ray"
  | "motion-diagram"
  | "optics-ray"
  | "vocabulary-card"
  | "particle-lab";

const hasArrayContent = (value: unknown) => Array.isArray(value) && value.length > 0;

const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;

const flattenText = (value: unknown): string[] => {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenText);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(flattenText);
  }

  return [];
};

const payloadText = (scene: RenderPackageScene) =>
  flattenText({
    kind: scene.kind,
    ...scene.payload,
  }).join(" ");

const hasAnyKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()));

const looksLikeFormula = (value: unknown) =>
  typeof value === "string" &&
  /[=<>+\-*/^]|[∈∉⊂⊆⊃⊇∪∩√∑∫≤≥≈≠]|\\frac|\\sqrt/.test(value);

const opticsKeywords = [
  "光",
  "反射",
  "折射",
  "入射",
  "法线",
  "折射角",
  "入射角",
  "介质",
  "水面",
  "空气",
  "玻璃",
  "sin i",
  "sin r",
  "snell",
  "refraction",
];

const circularMotionKeywords = [
  "圆周",
  "圆轨迹",
  "圆运动",
  "切向",
  "向心",
  "周期",
  "角速度",
  "2πr",
  "2蟺r",
  "centripetal",
  "circular motion",
];

const chemistryReactionKeywords = [
  "反应",
  "离子",
  "沉淀",
  "氧化",
  "还原",
  "电子",
  "生成",
  "燃烧",
  "化合",
  "分解",
  "置换",
  "复分解",
  "reaction",
  "ion",
  "precipitate",
  "oxidation",
  "reduction",
];

const looksLikeChemicalEquation = (value: unknown) =>
  typeof value === "string" &&
  /(?:[A-Z][a-z]?\d*){2,}|[+＋].*(?:→|->|=)|(?:→|->|=).*[+＋]/.test(value);

export const selectVisualModule = ({
  subject,
  scene,
}: {
  subject: RenderPackage["subject"];
  scene: RenderPackageScene;
}): VisualModule => {
  const payload = scene.payload;
  const text = payloadText(scene);

  if (
    subject === "english" &&
    (hasText(payload.word) || hasText(payload.phonetic) || hasText(payload.meaning))
  ) {
    return "vocabulary-card";
  }

  if (subject === "physics" && hasAnyKeyword(text, ["反射", "镜面反射", "平面镜"])) {
    return "reflection-ray";
  }

  if (
    subject === "chemistry" &&
    (hasAnyKeyword(text, chemistryReactionKeywords) ||
      looksLikeChemicalEquation(payload.reactionLine))
  ) {
    return "particle-lab";
  }

  if (
    subject === "physics" &&
    hasAnyKeyword(text, opticsKeywords)
  ) {
    return "optics-ray";
  }

  if (
    subject === "physics" &&
    hasAnyKeyword(text, circularMotionKeywords) &&
    (hasText(payload.lawCard) ||
      hasArrayContent(payload.variableCards) ||
      scene.kind === "graph")
  ) {
    return "motion-diagram";
  }

  if (hasText(payload.lawCard) || looksLikeFormula(payload.boardExpression)) {
    return "formula-board";
  }

  if (hasArrayContent(payload.processSteps) || hasArrayContent(payload.labNotes)) {
    return "process-flow";
  }

  if (
    scene.kind === "compare" ||
    scene.kind === "pitfall" ||
    hasText(payload.misconceptionNote) ||
    hasText(payload.compareFocus)
  ) {
    return "compare-board";
  }

  if (
    subject === "math" ||
    hasArrayContent(payload.keyPoints) ||
    hasArrayContent(payload.exampleChips)
  ) {
    return "concept-map";
  }

  return "hero-focus";
};
