const topicPattern = /^english-word-(\d{5})$/u;

const parseTopicNumber = (topicId: string) => {
  const match = topicId.match(topicPattern);

  if (!match) {
    throw new Error(`Invalid English topic id: ${topicId}`);
  }

  return Number(match[1]);
};

const formatTopicId = (value: number) =>
  `english-word-${String(value).padStart(5, "0")}`;

export const resolveEnglishBatchTopics = ({
  from,
  to,
  topicIds = [],
}: {
  from?: string;
  to?: string;
  topicIds?: string[];
}) => {
  const hasRange = Boolean(from || to);
  const hasList = topicIds.length > 0;

  if (hasRange && hasList) {
    throw new Error("Use either --from/--to or --topic-id, not both.");
  }

  if (hasList) {
    const seen = new Set<string>();

    return topicIds.map((topicId) => {
      parseTopicNumber(topicId);
      if (seen.has(topicId)) {
        throw new Error(`Duplicate topic id: ${topicId}`);
      }
      seen.add(topicId);
      return topicId;
    });
  }

  if (!from || !to) {
    throw new Error("Missing --from/--to or --topic-id.");
  }

  const start = parseTopicNumber(from);
  const end = parseTopicNumber(to);

  if (start > end) {
    throw new Error("--from must be before or equal to to.");
  }

  return Array.from({ length: end - start + 1 }, (_, index) =>
    formatTopicId(start + index),
  );
};
