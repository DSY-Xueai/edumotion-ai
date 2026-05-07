import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { CurriculumEdition, TopicNode } from "./schema";

export const englishSourceLevelSchema = z.enum(["CET4", "CET6"]);

export const englishWordSourceLineSchema = z.object({
  sourceLevel: englishSourceLevelSchema,
  rawLine: z.string().min(1),
  phonetic: z.string().default(""),
  partOfSpeech: z.string().default(""),
  meaning: z.string().default(""),
});

export const englishWordbankEntrySchema = z.object({
  id: z.string().min(1),
  word: z.string().min(1),
  normalizedWord: z.string().min(1),
  phonetic: z.string().default(""),
  partOfSpeech: z.string().default(""),
  meaningLines: z.array(z.string()),
  sourceLevels: z.array(englishSourceLevelSchema).min(1),
  sourceLines: z.array(englishWordSourceLineSchema).min(1),
});

export const englishWordbankSchema = z.object({
  edition: z.string().min(1),
  generatedAt: z.string().min(1),
  sourceFiles: z.array(
    z.object({
      sourceLevel: englishSourceLevelSchema,
      fileName: z.string().min(1),
      url: z.string().url(),
    }),
  ),
  entries: z.array(englishWordbankEntrySchema).min(1),
});

export type EnglishSourceLevel = z.infer<typeof englishSourceLevelSchema>;
export type EnglishWordSourceLine = z.infer<typeof englishWordSourceLineSchema>;
export type EnglishWordbankEntry = z.infer<typeof englishWordbankEntrySchema>;
export type EnglishWordbank = z.infer<typeof englishWordbankSchema>;

type RawEnglishSource = {
  sourceLevel: EnglishSourceLevel;
  content: string;
  url: string;
  fileName: string;
};

const workspaceRelativePath = (...segments: string[]) =>
  path.join(process.cwd(), ...segments);

const normalizeWord = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const englishWordbankPath = () =>
  workspaceRelativePath("curriculum", "pep-2019", "english", "wordbank.json");

export const readEnglishWordbank = async (): Promise<EnglishWordbank> => {
  const rawContent = await readFile(englishWordbankPath(), "utf8");
  return englishWordbankSchema.parse(JSON.parse(rawContent));
};

const parseSourceLine = (line: string) => {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  if (/^(大学英语|[A-Z]\b|\(|\d+词)/.test(trimmed)) {
    return null;
  }

  const bracketMatch = trimmed.match(/^(.*?)\s*\[(.*?)\]\s*(.*)$/);
  const noBracketMatch = trimmed.match(/^(.+?)\s+([a-z.]+)\s*(.*)$/i);
  const fallbackParts = trimmed.split(/\s+/);
  const word = (
    bracketMatch?.[1] ??
    noBracketMatch?.[1] ??
    fallbackParts[0] ??
    trimmed
  ).trim();
  const phonetic = (bracketMatch?.[2] ?? "").trim();

  if (!word) {
    return null;
  }

  let parsedRest = (bracketMatch?.[3] ?? noBracketMatch?.[3] ?? "").trim();
  let partOfSpeech = (noBracketMatch?.[2] ?? "").trim();

  if (!parsedRest) {
    partOfSpeech = fallbackParts.length > 1 ? fallbackParts[1] : partOfSpeech;
    parsedRest = fallbackParts.slice(2).join(" ").trim();
  }

  const posMatch = parsedRest.match(/^([a-z.]+)\s*(.*)$/i);
  if (!partOfSpeech) {
    partOfSpeech = (posMatch?.[1] ?? "").trim();
  }

  const meaning = ((posMatch?.[2] ?? parsedRest).trim() || parsedRest || word).trim();

  return {
    word,
    phonetic,
    partOfSpeech,
    meaning,
  };
};

const mergeMeaningLines = (left: string[], right: string[]) =>
  Array.from(new Set([...left, ...right].map((value) => value.trim()).filter(Boolean)));

export const buildEnglishWordbank = (sources: RawEnglishSource[]): EnglishWordbank => {
  const merged = new Map<
    string,
    {
      word: string;
      normalizedWord: string;
      phonetic: string;
      partOfSpeech: string;
      meaningLines: string[];
      sourceLevels: EnglishSourceLevel[];
      sourceLines: EnglishWordSourceLine[];
    }
  >();

  for (const source of sources) {
    const lines = source.content.split(/\r?\n/);

    for (const line of lines) {
      const parsed = parseSourceLine(line);

      if (!parsed) {
        continue;
      }

      const normalizedWord = normalizeEnglishWord(parsed.word);
      const existing = merged.get(normalizedWord);
      const sourceLine: EnglishWordSourceLine = {
        sourceLevel: source.sourceLevel,
        rawLine: line.trim(),
        phonetic: parsed.phonetic,
        partOfSpeech: parsed.partOfSpeech,
        meaning: parsed.meaning,
      };

      if (!existing) {
        merged.set(normalizedWord, {
          word: parsed.word,
          normalizedWord,
          phonetic: parsed.phonetic,
          partOfSpeech: parsed.partOfSpeech,
          meaningLines: [parsed.meaning],
          sourceLevels: [source.sourceLevel],
          sourceLines: [sourceLine],
        });
        continue;
      }

      existing.word = existing.word.length <= parsed.word.length ? existing.word : parsed.word;
      existing.phonetic = existing.phonetic || parsed.phonetic;
      existing.partOfSpeech = existing.partOfSpeech || parsed.partOfSpeech;
      existing.meaningLines = mergeMeaningLines(existing.meaningLines, [parsed.meaning]);
      existing.sourceLevels = Array.from(
        new Set([...existing.sourceLevels, source.sourceLevel]),
      );
      existing.sourceLines.push(sourceLine);
    }
  }

  const entries = Array.from(merged.values())
    .sort((left, right) =>
      left.word.localeCompare(right.word, "en", {
        sensitivity: "base",
        numeric: true,
      }),
    )
    .map((entry, index) => ({
      id: `english-word-${String(index + 1).padStart(5, "0")}`,
      ...entry,
    }));

  return englishWordbankSchema.parse({
    edition: "pep-2019",
    generatedAt: new Date().toISOString(),
    sourceFiles: sources.map((source) => ({
      sourceLevel: source.sourceLevel,
      fileName: source.fileName,
      url: source.url,
    })),
    entries,
  });
};

export const buildEnglishTopicNodes = (
  wordbank: EnglishWordbank,
): TopicNode[] => {
  const sortedEntries = [...wordbank.entries].sort((left, right) =>
    left.word.localeCompare(right.word, "en", {
      sensitivity: "base",
      numeric: true,
    }),
  );

  return sortedEntries.map((entry, index, entries) => ({
    id: entry.id,
    subject: "english" as const,
    edition: "pep-2019" as CurriculumEdition,
    volume: "cet",
    chapter: "vocabulary",
    section: "merged",
    title: entry.word,
    nodeType: "topic",
    parentId: "english-cet-vocabulary-section-001",
    prevTopicId: entries[index - 1]?.id,
    nextTopicId: entries[index + 1]?.id,
    orderIndex: index,
  }));
};

export const normalizeEnglishWord = normalizeWord;
