import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildEnglishWordbank } from "../src/lib/curriculum/englishWordbank";

const SOURCES = [
  {
    sourceLevel: "CET4" as const,
    fileName: "3-CET4-顺序.json",
    url: "https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/3-CET4-%E9%A1%BA%E5%BA%8F.json",
  },
  {
    sourceLevel: "CET6" as const,
    fileName: "4-CET6-顺序.json",
    url: "https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/4-CET6-%E9%A1%BA%E5%BA%8F.json",
  },
];

type SourceWord = {
  word?: unknown;
  translations?: unknown;
};

type SourceTranslation = {
  translation?: unknown;
  type?: unknown;
};

const normalizeSourceEntries = (entries: SourceWord[]) =>
  entries
    .map((entry) => {
      const word = typeof entry.word === "string" ? entry.word.trim() : "";
      const translations = Array.isArray(entry.translations)
        ? (entry.translations as SourceTranslation[])
        : [];
      const firstTranslation = translations.find(
        (translation) => typeof translation.translation === "string",
      );
      const partOfSpeech =
        typeof firstTranslation?.type === "string"
          ? `${firstTranslation.type.trim()}.`.replace(/\.+$/, ".")
          : "";
      const meaningLines = translations
        .map((translation) =>
          typeof translation.translation === "string"
            ? translation.translation.trim()
            : "",
        )
        .filter(Boolean);
      const meaning = meaningLines.join("；");

      if (!word || !meaning) {
        return "";
      }

      return `${word} ${partOfSpeech}${meaning}`;
    })
    .filter(Boolean)
    .join("\n");

const fetchSourceContent = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as SourceWord[];

  if (!Array.isArray(payload)) {
    throw new Error(`Unexpected English word source payload: ${url}`);
  }

  return normalizeSourceEntries(payload);
};

const main = async () => {
  const sources = [];

  for (const source of SOURCES) {
    const content = await fetchSourceContent(source.url);
    sources.push({
      ...source,
      content,
    });
  }

  const wordbank = buildEnglishWordbank(sources);
  const outputDirectory = path.join(
    process.cwd(),
    "curriculum",
    "pep-2019",
    "english",
  );

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, "wordbank.json"),
    JSON.stringify(wordbank, null, 2),
    "utf8",
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
