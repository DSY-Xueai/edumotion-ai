export const estimateSceneDuration = (text: string) => {
  const base = 90;
  const bonus = Math.min(90, Math.ceil(text.length / 30) * 15);
  return base + bonus;
};
