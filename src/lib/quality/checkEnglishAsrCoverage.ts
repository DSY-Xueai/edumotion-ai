import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { SubtitleCue } from "../audio/schema";
import type { RenderPackage } from "../rendering/schema";

const execFileAsync = promisify(execFile);
const minimumTranscriptLength = 8;
const minimumTimelineCoverageRatio = 0.8;

export type AsrTranscriptSegment = {
  startMs: number;
  endMs: number;
  text: string;
};

export type AsrTranscript = {
  text: string;
  segments: AsrTranscriptSegment[];
};

type AsrCoverageDetails = {
  reason?: "empty-transcript" | "missing-target-word" | "low-timeline-coverage";
  targetWord: string;
  hasTargetWord: boolean;
  transcriptLength: number;
  coveredDurationMs: number;
  subtitleDurationMs: number;
  coverageRatio: number;
  minimumCoverageRatio: number;
};

const normalizedTextLength = (text: string) => text.replace(/\s/gu, "").length;

const hasTargetWord = ({ text, word }: { text: string; word: string }) => {
  const target = word.toLowerCase().replace(/[^a-z]/gu, "");

  if (!target) {
    return true;
  }

  const transcriptWords = Array.from(
    text.toLowerCase().matchAll(/[a-z]+/gu),
    (match) => match[0],
  );

  return transcriptWords.includes(target);
};

const mergeIntervals = (intervals: Array<{ startMs: number; endMs: number }>) => {
  const sorted = intervals
    .filter((interval) => interval.endMs > interval.startMs)
    .sort((left, right) => left.startMs - right.startMs);
  const merged: Array<{ startMs: number; endMs: number }> = [];

  for (const interval of sorted) {
    const previous = merged[merged.length - 1];

    if (!previous || interval.startMs > previous.endMs) {
      merged.push({ ...interval });
    } else {
      previous.endMs = Math.max(previous.endMs, interval.endMs);
    }
  }

  return merged;
};

const coveredCueDurationMs = ({
  cues,
  segments,
}: {
  cues: SubtitleCue[];
  segments: AsrTranscriptSegment[];
}) => {
  const intervals = cues.flatMap((cue) =>
    segments.map((segment) => ({
      startMs: Math.max(cue.startMs, segment.startMs),
      endMs: Math.min(cue.endMs, segment.endMs),
    })),
  );

  return mergeIntervals(intervals).reduce(
    (total, interval) => total + interval.endMs - interval.startMs,
    0,
  );
};

export const checkAsrTranscriptCoverage = ({
  canonicalTitle,
  cues,
  transcript,
}: {
  canonicalTitle: string;
  cues: SubtitleCue[];
  transcript: AsrTranscript;
}) => {
  const transcriptLength = normalizedTextLength(transcript.text);
  const subtitleDurationMs = cues.reduce(
    (total, cue) => total + cue.endMs - cue.startMs,
    0,
  );
  const coveredDurationMs = coveredCueDurationMs({
    cues,
    segments: transcript.segments.filter((segment) => normalizedTextLength(segment.text) > 0),
  });
  const coverageRatio =
    subtitleDurationMs > 0 ? coveredDurationMs / subtitleDurationMs : 1;
  const targetWord = canonicalTitle.toLowerCase();
  const targetWordFound = hasTargetWord({ text: transcript.text, word: targetWord });
  const details: AsrCoverageDetails = {
    targetWord,
    hasTargetWord: targetWordFound,
    transcriptLength,
    coveredDurationMs,
    subtitleDurationMs,
    coverageRatio,
    minimumCoverageRatio: minimumTimelineCoverageRatio,
  };

  if (transcriptLength < minimumTranscriptLength) {
    return {
      ok: false,
      details: { ...details, reason: "empty-transcript" as const },
    };
  }

  if (!targetWordFound) {
    return {
      ok: false,
      details: { ...details, reason: "missing-target-word" as const },
    };
  }

  if (coverageRatio < minimumTimelineCoverageRatio) {
    return {
      ok: false,
      details: { ...details, reason: "low-timeline-coverage" as const },
    };
  }

  return {
    ok: true,
    details,
  };
};

const readWhisperJson = async (jsonPath: string): Promise<AsrTranscript> => {
  const parsed = JSON.parse(await readFile(jsonPath, "utf8")) as {
    text?: unknown;
    segments?: Array<{ start?: unknown; end?: unknown; text?: unknown }>;
  };

  return {
    text: typeof parsed.text === "string" ? parsed.text : "",
    segments: (parsed.segments ?? [])
      .map((segment) => ({
        startMs: Math.round(Number(segment.start) * 1000),
        endMs: Math.round(Number(segment.end) * 1000),
        text: typeof segment.text === "string" ? segment.text : "",
      }))
      .filter(
        (segment) =>
          Number.isFinite(segment.startMs) &&
          Number.isFinite(segment.endMs) &&
          segment.endMs > segment.startMs,
      ),
  };
};

export const transcribeVideoWithWhisper = async (
  videoPath: string,
): Promise<AsrTranscript> => {
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "remotion-asr-"));
  const command = process.env.ASR_WHISPER_COMMAND ?? "whisper";
  const model = process.env.ASR_WHISPER_MODEL ?? "small";
  const timeoutMs = Number(process.env.ASR_WHISPER_TIMEOUT_MS ?? "180000");

  try {
    await execFileAsync(
      command,
      [
        videoPath,
        "--model",
        model,
        "--language",
        "Chinese",
        "--output_format",
        "json",
        "--output_dir",
        outputDirectory,
        "--fp16",
        "False",
      ],
      {
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
        },
        maxBuffer: 10 * 1024 * 1024,
        timeout: Number.isFinite(timeoutMs) ? timeoutMs : 180000,
      },
    );

    return await readWhisperJson(
      path.join(outputDirectory, `${path.basename(videoPath, path.extname(videoPath))}.json`),
    );
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
};

export const checkEnglishAsrCoverage = async ({
  videoPath,
  renderPackage,
}: {
  videoPath: string;
  renderPackage: RenderPackage;
}) => {
  try {
    const transcript = await transcribeVideoWithWhisper(videoPath);
    const coverage = checkAsrTranscriptCoverage({
      canonicalTitle: renderPackage.canonicalTitle,
      cues: renderPackage.subtitleTrack.cues,
      transcript,
    });

    return {
      id: "asr-transcript-coverage",
      ok: coverage.ok,
      message: coverage.ok
        ? "ASR transcript contains the target English word and enough spoken timeline coverage."
        : "ASR transcript is missing the target English word or enough spoken timeline coverage.",
      details: coverage.details,
    };
  } catch (error) {
    return {
      id: "asr-transcript-coverage",
      ok: false,
      message: "Unable to run ASR transcript coverage check.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
};
