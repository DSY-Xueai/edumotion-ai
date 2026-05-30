const compactText = (text: string) => Array.from(text.replace(/\s+/gu, ""));

const pureEnglishWordPattern = /^[A-Za-z][A-Za-z'-]*$/u;

export const estimateMinimumSpeechDurationMs = ({
  text,
  kind,
}: {
  text: string;
  kind?: string;
}) => {
  const compact = compactText(text.trim());

  if (compact.length === 0) {
    return 0;
  }

  if (kind === "pronunciation" || pureEnglishWordPattern.test(text.trim())) {
    return Math.max(500, Math.round(compact.length * 70 + 300));
  }

  return Math.max(900, Math.round(compact.length * 95 + 600));
};

export const isSpeechTimingTooShort = ({
  text,
  kind,
  durationMs,
}: {
  text: string;
  kind?: string;
  durationMs: number;
}) => durationMs < estimateMinimumSpeechDurationMs({ text, kind });
