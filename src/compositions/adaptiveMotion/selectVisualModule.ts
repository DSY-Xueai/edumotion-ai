import type { RenderPackage, RenderPackageScene } from "../../lib/rendering/schema";

export type VisualModule =
  | "hero-focus"
  | "concept-map"
  | "formula-board"
  | "process-flow"
  | "compare-board"
  | "motion-diagram"
  | "particle-lab";

const hasArrayContent = (value: unknown) => Array.isArray(value) && value.length > 0;

const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;

export const selectVisualModule = ({
  subject,
  scene,
}: {
  subject: RenderPackage["subject"];
  scene: RenderPackageScene;
}): VisualModule => {
  const payload = scene.payload;

  if (
    subject === "chemistry" &&
    (hasText(payload.reactionLine) || hasArrayContent(payload.particleLabels))
  ) {
    return "particle-lab";
  }

  if (
    subject === "physics" &&
    (hasText(payload.lawCard) ||
      hasArrayContent(payload.variableCards) ||
      scene.kind === "graph")
  ) {
    return "motion-diagram";
  }

  if (hasText(payload.boardExpression) || hasText(payload.lawCard)) {
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
