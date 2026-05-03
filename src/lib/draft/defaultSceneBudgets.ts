import type { StoryboardSceneType } from "./schema";

export type SceneBudgetMap = Record<StoryboardSceneType, number>;

export const defaultSceneBudgets: SceneBudgetMap = {
  hook: 12,
  definition: 14,
  rule: 10,
  compare: 10,
  process: 12,
  graph: 10,
  pitfall: 8,
  wrap: 8,
};
