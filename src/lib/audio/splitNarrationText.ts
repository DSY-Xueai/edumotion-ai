const sentenceEndPattern = /[。！？!?；;]/;
const softBreakPattern = /[，,、：:]/;

const pushIfNotEmpty = (parts: string[], value: string) => {
  const trimmed = value.trim();

  if (trimmed) {
    parts.push(trimmed);
  }
};

export const splitNarrationText = (text: string): string[] => {
  const sentenceParts: string[] = [];
  let current = "";

  for (const char of text.trim()) {
    current += char;

    if (sentenceEndPattern.test(char) || char === "\n") {
      pushIfNotEmpty(sentenceParts, current);
      current = "";
    }
  }

  pushIfNotEmpty(sentenceParts, current);

  return sentenceParts.flatMap((part) => {
    if (part.length <= 32) {
      return [part];
    }

    const shortParts: string[] = [];
    let shortPart = "";

    for (const char of part) {
      shortPart += char;

      if (softBreakPattern.test(char) && shortPart.trim().length >= 10) {
        pushIfNotEmpty(shortParts, shortPart);
        shortPart = "";
      }
    }

    pushIfNotEmpty(shortParts, shortPart);

    return shortParts.length > 0 ? shortParts : [part];
  });
};
