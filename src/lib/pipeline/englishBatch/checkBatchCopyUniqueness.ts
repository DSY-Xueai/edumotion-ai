type ScriptSegment = { kind: string; text: string };

const normalized = (value: string) =>
  value
    .replace(/\s+/gu, "")
    .replace(/[，。！？；：,.!?;:]/gu, "")
    .trim();

const comparableText = (segments: ScriptSegment[]) =>
  segments
    .filter(
      (segment) =>
        !["hook", "definition", "pronunciation"].includes(segment.kind),
    )
    .map((segment) => normalized(segment.text))
    .filter(Boolean);

const jaccard = (left: string, right: string) => {
  const leftSet = new Set(Array.from(left));
  const rightSet = new Set(Array.from(right));
  const intersection = Array.from(leftSet).filter((item) =>
    rightSet.has(item),
  ).length;
  const union = new Set([...leftSet, ...rightSet]).size;

  return union === 0 ? 0 : intersection / union;
};

export const checkBatchCopyUniqueness = ({
  topicId,
  approvedScript,
  passedScripts,
}: {
  topicId: string;
  approvedScript: ScriptSegment[];
  passedScripts: Array<{ topicId: string; approvedScript: ScriptSegment[] }>;
}) => {
  const currentParts = comparableText(approvedScript);
  const currentJoined = currentParts.join("");

  for (const passed of passedScripts) {
    const passedParts = comparableText(passed.approvedScript);

    for (const part of currentParts) {
      if (part.length >= 8 && passedParts.includes(part)) {
        return {
          ok: false,
          stage: "duplicate_copy" as const,
          reason: `${topicId} reuses mnemonic copy from ${passed.topicId}.`,
          matchedTopicId: passed.topicId,
        };
      }
    }

    const similarity = jaccard(currentJoined, passedParts.join(""));
    if (similarity >= 0.82) {
      return {
        ok: false,
        stage: "duplicate_copy" as const,
        reason: `${topicId} has high copy similarity with ${passed.topicId}.`,
        matchedTopicId: passed.topicId,
      };
    }
  }

  return { ok: true as const };
};
