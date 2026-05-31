import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { estimateMinimumSpeechDurationMs } from "../audio/estimateSpeechTiming";
import { audioManifestSchema } from "../audio/schema";
import { renderPackageSchema, type RenderPackage } from "../rendering/schema";
import { approvedLessonSchema } from "../review/schema";
import { getTopicWorkspace } from "../workspace/getTopicWorkspace";
import { checkEnglishAsrCoverage } from "./checkEnglishAsrCoverage";
import { checkEnglishVisualQuality } from "./checkEnglishVisualQuality";

const execFileAsync = promisify(execFile);
const minimumUsableMaxVolumeDb = -24;
const audioWindowMs = 1000;
const leadingAudioWindowMs = 800;

export type EnglishQualityCheck = {
  id: string;
  ok: boolean;
  message: string;
  details?: unknown;
};

export type EnglishQualityResult = {
  topicId: string;
  ok: boolean;
  checks: EnglishQualityCheck[];
};

const readJson = async <T>(filePath: string, parse: (value: unknown) => T) => {
  const raw = await readFile(filePath, "utf8");

  return parse(JSON.parse(raw));
};

const meaningTokens = (definitions: string[]) =>
  definitions
    .join("；")
    .split(/[；;，,、\s]+/u)
    .map((token) => token.replace(/[。.!！?？：:]/gu, "").trim())
    .filter((token) => token.length >= 2);

const primaryMeaningTokens = (definitions: string[]) =>
  (definitions[0] ?? "")
    .split(/[；;，,、\s]+/u)
    .map((token) => token.replace(/[。.!！?？：:]/gu, "").trim())
    .filter((token) => token.length >= 2)
    .slice(0, 2);

const hasMeaningAnchors = ({
  scriptText,
  definitions,
}: {
  scriptText: string;
  definitions: string[];
}) => {
  const tokens = meaningTokens(definitions);

  if (tokens.length === 0) {
    return true;
  }

  return tokens.some((token) => scriptText.includes(token));
};

const hasExplanatoryCopy = ({
  scriptText,
  definitions,
}: {
  scriptText: string;
  definitions: string[];
}) => {
  const tokens = meaningTokens(definitions);
  const matchedCount = tokens.filter((token) => scriptText.includes(token)).length;
  const hasConnector = /就是|所以|意思是|想到|抓住|等于|=/u.test(scriptText);

  return matchedCount >= Math.min(2, tokens.length) || (matchedCount >= 1 && hasConnector);
};

const hasGroundedMnemonicCopy = ({
  scriptText,
  definitions,
}: {
  scriptText: string;
  definitions: string[];
}) => {
  const definitionText = definitions.join("；");

  if (/纸箱|没人再碰|没人碰|放在那里|搁置|旧东西|不再继续[，,、\s]*就是/u.test(scriptText)) {
    return false;
  }

  if (/先抓中文义项|不靠空想|这一轮只记.+核心意思|画面只服务|直接对上[：:，,]/mu.test(scriptText)) {
    return false;
  }

  if (/清晰的画面|对应着|脑子里立刻有一个场景|放进一个画面|画面里只有一件事|和一个画面焊在一起|那个画面就是/u.test(scriptText)) {
    return false;
  }

  if (/(放弃|丢弃|抛弃|舍弃)/u.test(definitionText)) {
    return /决定|主动|停掉|停止|终止|丢下不管|直接丢掉|不再负责|不再推进|不再承担|放弃这件事/u.test(
      scriptText,
    );
  }

  if (/(忍受|容忍|遵守|遵从|服从)/u.test(definitionText)) {
    return (
      /忍住|忍着|难受|不舒服/u.test(scriptText) &&
      /规则|规矩|要求|照做|遵守/u.test(scriptText)
    );
  }

  return true;
};

const mnemonicScriptText = (
  scriptSegments: Array<{ id: string; kind: string; text: string }>,
) =>
  scriptSegments
    .filter(
      (segment) =>
        !["hook", "definition", "pronunciation"].includes(segment.kind) &&
        !segment.id.endsWith("-seg-recap"),
    )
    .map((segment) => segment.text)
    .join("\n");

const stringValue = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const stringArrayValue = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => String(item)).filter((item) => item.trim().length > 0)
    : [];

const subtitleCueArrayValue = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is { segmentId: string; text: string; startMs: number; endMs: number } => {
          if (!item || typeof item !== "object") {
            return false;
          }

          const record = item as Record<string, unknown>;

          return (
            typeof record.segmentId === "string" &&
            typeof record.text === "string" &&
            typeof record.startMs === "number" &&
            typeof record.endMs === "number"
          );
        })
    : [];

const wordEntranceCueIssues = (renderPackage: RenderPackage) => {
  const definitionScenes = renderPackage.scenes.filter((scene) => scene.kind === "definition");

  if (definitionScenes.length === 0) {
    return [{ id: "missing-definition-scene", word: renderPackage.canonicalTitle }];
  }

  return definitionScenes.flatMap((scene) => {
    const word = stringValue(scene.payload.word) ?? renderPackage.canonicalTitle;
    const segmentIds = new Set(stringArrayValue(scene.payload.segmentIds));
    const payloadCues = subtitleCueArrayValue(scene.payload.subtitleCues);
    const sceneCues =
      payloadCues.length > 0
        ? payloadCues
        : renderPackage.subtitleTrack.cues.filter(
            (cue) => segmentIds.size === 0 || segmentIds.has(cue.segmentId),
          );
    const lowerWord = word.toLowerCase();
    const matchingCue = sceneCues.find((cue) =>
      cue.text.toLowerCase().includes(lowerWord),
    );

    if (matchingCue) {
      return [];
    }

    return [
      {
        id: scene.id,
        word,
        cueTexts: sceneCues.map((cue) => cue.text),
      },
    ];
  });
};

const phoneticIssues = ({
  approvedPhonetic,
  renderPackage,
}: {
  approvedPhonetic?: string;
  renderPackage: RenderPackage;
}) => {
  const issues: Array<{ id: string; reason: string }> = [];

  if (!stringValue(approvedPhonetic)) {
    issues.push({ id: "source-summary", reason: "Approved lesson source summary is missing phonetic." });
  }

  for (const scene of renderPackage.scenes) {
    if (!stringValue(scene.payload.phonetic)) {
      issues.push({ id: scene.id, reason: "Render scene payload is missing phonetic." });
    }
  }

  return issues;
};

const hasLiteralEscapeText = (value: unknown) =>
  /[\\](?:u[0-9a-fA-F]{2,6}|x[0-9a-fA-F]{2})/u.test(JSON.stringify(value));

const inspectAudioStream = async (videoPath: string) => {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a",
    "-show_entries",
    "stream=codec_type",
    "-of",
    "json",
    videoPath,
  ]);
  const parsed = JSON.parse(stdout) as { streams?: Array<{ codec_type?: string }> };

  return parsed.streams?.some((stream) => stream.codec_type === "audio") ?? false;
};

const inspectVolume = async (videoPath: string) => {
  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-i",
    videoPath,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "NUL",
  ]);
  const meanMatch = stderr.match(/mean_volume:\s*(-?\d+(?:\.\d+)?) dB/u);
  const maxMatch = stderr.match(/max_volume:\s*(-?\d+(?:\.\d+)?) dB/u);

  return {
    meanVolumeDb: meanMatch ? Number(meanMatch[1]) : undefined,
    maxVolumeDb: maxMatch ? Number(maxMatch[1]) : undefined,
  };
};

const inspectMediaWindowVolume = async ({
  mediaPath,
  startMs,
  durationMs,
}: {
  mediaPath: string;
  startMs: number;
  durationMs: number;
}) => {
  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-ss",
    (startMs / 1000).toFixed(3),
    "-t",
    (durationMs / 1000).toFixed(3),
    "-i",
    mediaPath,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "NUL",
  ]);
  const meanMatch = stderr.match(/mean_volume:\s*(-?\d+(?:\.\d+)?) dB/u);
  const maxMatch = stderr.match(/max_volume:\s*(-?\d+(?:\.\d+)?) dB/u);

  return {
    meanVolumeDb: meanMatch ? Number(meanMatch[1]) : undefined,
    maxVolumeDb: maxMatch ? Number(maxMatch[1]) : undefined,
  };
};

const volumeIsUsable = (maxVolumeDb: number | undefined) =>
  maxVolumeDb !== undefined &&
  Number.isFinite(maxVolumeDb) &&
  maxVolumeDb > minimumUsableMaxVolumeDb;

const cueWindows = ({
  startMs,
  endMs,
}: {
  startMs: number;
  endMs: number;
}) => {
  const windows: Array<{ startMs: number; durationMs: number }> = [];

  for (let currentMs = startMs; currentMs < endMs; currentMs += audioWindowMs) {
    const durationMs = Math.min(audioWindowMs, endMs - currentMs);

    if (durationMs >= 500) {
      windows.push({ startMs: currentMs, durationMs });
    }
  }

  return windows;
};

export const checkEnglishVideoQuality = async ({
  topicId,
  inspectMedia = true,
}: {
  topicId: string;
  inspectMedia?: boolean;
}): Promise<EnglishQualityResult> => {
  const workspace = getTopicWorkspace(topicId);
  const approvedLesson = await readJson(
    path.join(workspace, "approved", "lesson.json"),
    (value) => approvedLessonSchema.parse(value),
  );
  const audioManifest = await readJson(
    path.join(workspace, "audio", "manifest.json"),
    (value) => audioManifestSchema.parse(value),
  );
  const renderPackage = await readJson(
    path.join(workspace, "render", "render-package.json"),
    (value) => renderPackageSchema.parse(value),
  );
  const checks: EnglishQualityCheck[] = [];

  checks.push({
    id: "subject",
    ok: approvedLesson.subject === "english" && renderPackage.subject === "english",
    message: "Topic must be an English render package.",
    details: {
      approvedSubject: approvedLesson.subject,
      renderSubject: renderPackage.subject,
    },
  });

  checks.push({
    id: "audio-provider",
    ok: audioManifest.ttsProvider !== "mock",
    message:
      audioManifest.ttsProvider === "mock"
        ? "Mock audio is only allowed for tests or visual-only previews, not reviewable videos."
        : `Audio provider is ${audioManifest.ttsProvider}.`,
    details: {
      ttsProvider: audioManifest.ttsProvider,
    },
  });

  checks.push({
    id: "copy-encoding",
    ok: !hasLiteralEscapeText({
      approvedScript: approvedLesson.approvedScript,
      subtitleTrack: renderPackage.subtitleTrack,
      scenes: renderPackage.scenes,
    }),
    message: "Script, subtitles, and visual payload must not contain literal Unicode escape text.",
  });

  const missingPhonetics = phoneticIssues({
    approvedPhonetic: approvedLesson.sourceSummary.phonetic,
    renderPackage,
  });
  checks.push({
    id: "phonetic",
    ok: missingPhonetics.length === 0,
    message:
      missingPhonetics.length === 0
        ? "English word phonetic is present in the approved lesson and render payload."
        : "English word phonetic is missing, so the vocabulary card cannot show the pronunciation guide.",
    details: missingPhonetics,
  });

  checks.push({
    id: "duration",
    ok: renderPackage.totalDurationMs <= 30_000,
    message:
      renderPackage.totalDurationMs <= 30_000
        ? "Total duration is within the English short-video target."
        : "Total duration exceeds 30 seconds.",
    details: {
      totalDurationMs: renderPackage.totalDurationMs,
    },
  });

  const longCues = renderPackage.subtitleTrack.cues.filter(
    (cue) => cue.endMs - cue.startMs > 6000,
  );
  checks.push({
    id: "subtitle-cue-duration",
    ok: longCues.length === 0,
    message:
      longCues.length === 0
        ? "No subtitle cue stays longer than 6 seconds."
        : "One or more subtitle cues stay longer than 6 seconds.",
    details: longCues.map((cue) => ({
      id: cue.id,
      text: cue.text,
      durationMs: cue.endMs - cue.startMs,
    })),
  });

  const segmentKindById = new Map(
    audioManifest.segments.map((segment) => [segment.segmentId, segment.kind] as const),
  );
  const shortSpeechTimings = [
    ...audioManifest.segments
      .map((segment) => {
        const minimumDurationMs = estimateMinimumSpeechDurationMs({
          text: segment.text,
          kind: segment.kind,
        });

        return {
          id: segment.segmentId,
          scope: "segment",
          text: segment.text,
          durationMs: segment.durationMs,
          minimumDurationMs,
        };
      })
      .filter((item) => item.durationMs < item.minimumDurationMs),
    ...renderPackage.subtitleTrack.cues
      .map((cue) => {
        const kind = segmentKindById.get(cue.segmentId);
        const minimumDurationMs = estimateMinimumSpeechDurationMs({
          text: cue.text,
          kind,
        });

        return {
          id: cue.id,
          scope: "subtitle-cue",
          text: cue.text,
          durationMs: cue.endMs - cue.startMs,
          minimumDurationMs,
        };
      })
      .filter((item) => item.durationMs < item.minimumDurationMs),
  ];
  checks.push({
    id: "audio-text-timing",
    ok: shortSpeechTimings.length === 0,
    message:
      shortSpeechTimings.length === 0
        ? "Audio and subtitle timings are long enough for their script text."
        : "One or more audio/subtitle timings are too short for the script text, so narration may be cut off before the next line.",
    details: shortSpeechTimings,
  });

  const scriptText = mnemonicScriptText(approvedLesson.approvedScript);
  const primaryTokens = primaryMeaningTokens(approvedLesson.sourceSummary.definitions);
  const meaningOk =
    primaryTokens.every((token) => scriptText.includes(token)) &&
    hasMeaningAnchors({
      scriptText,
      definitions: approvedLesson.sourceSummary.definitions,
    }) &&
    hasExplanatoryCopy({
      scriptText,
      definitions: approvedLesson.sourceSummary.definitions,
    });
  checks.push({
    id: "mnemonic-meaning",
    ok: meaningOk,
    message: meaningOk
      ? "Mnemonic copy contains meaning anchors and explanatory guidance."
      : "Mnemonic copy does not clearly explain or guide the current word meaning.",
    details: {
      definitions: approvedLesson.sourceSummary.definitions,
      checkedText: scriptText,
    },
  });

  const groundingOk = hasGroundedMnemonicCopy({
    scriptText,
    definitions: approvedLesson.sourceSummary.definitions,
  });
  checks.push({
    id: "mnemonic-grounding",
    ok: groundingOk,
    message: groundingOk
      ? "Mnemonic copy uses a scene that logically supports the word meaning."
      : "Mnemonic copy uses a weak scene that does not logically support the word meaning.",
    details: {
      definitions: approvedLesson.sourceSummary.definitions,
      checkedText: scriptText,
    },
  });

  const entranceCueIssues = wordEntranceCueIssues(renderPackage);
  checks.push({
    id: "word-entrance-cue",
    ok: entranceCueIssues.length === 0,
    message:
      entranceCueIssues.length === 0
        ? "Definition scene has a subtitle cue containing the English word for roll-in timing."
        : "Definition scene is missing a subtitle cue containing the English word, so roll-in timing cannot align.",
    details: entranceCueIssues,
  });

  checks.push({
    id: "audio-manifest",
    ok: audioManifest.totalDurationMs === renderPackage.totalDurationMs,
    message:
      audioManifest.totalDurationMs === renderPackage.totalDurationMs
        ? "Audio manifest duration matches render package duration."
        : "Audio manifest duration differs from render package duration.",
    details: {
      audioManifestDurationMs: audioManifest.totalDurationMs,
      renderPackageDurationMs: renderPackage.totalDurationMs,
    },
  });

  if (inspectMedia) {
    const segmentIssues: Array<{ segmentId: string; audioPath: string; reason: string }> = [];
    for (const segment of audioManifest.segments) {
      const segmentAudioPath = path.join(workspace, segment.audioPath);
      try {
        const { stdout } = await execFileAsync("ffprobe", [
          "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", segmentAudioPath,
        ]);
        const actualDurationSec = Number(stdout.trim());
        if (!Number.isFinite(actualDurationSec) || actualDurationSec <= 0) {
          segmentIssues.push({ segmentId: segment.segmentId, audioPath: segment.audioPath, reason: "Audio file is empty or unreadable." });
          continue;
        }
        const actualDurationMs = Math.round(actualDurationSec * 1000);
        const expectedMs = segment.durationMs;
        if (expectedMs > 0 && Math.abs(actualDurationMs - expectedMs) > Math.max(expectedMs * 0.15, 200)) {
          segmentIssues.push({ segmentId: segment.segmentId, audioPath: segment.audioPath, reason: `Duration mismatch: expected ${expectedMs}ms, got ${actualDurationMs}ms.` });
        }
      } catch {
        segmentIssues.push({ segmentId: segment.segmentId, audioPath: segment.audioPath, reason: "Audio file cannot be decoded." });
        continue;
      }

      try {
        const { stderr } = await execFileAsync("ffmpeg", [
          "-hide_banner", "-i", segmentAudioPath, "-af", "volumedetect", "-f", "null", "NUL",
        ]);
        const maxMatch = stderr.match(/max_volume:\s*(-?\d+(?:\.\d+)?) dB/u);
        const maxVolumeDb = maxMatch ? Number(maxMatch[1]) : undefined;
        if (!volumeIsUsable(maxVolumeDb)) {
          segmentIssues.push({ segmentId: segment.segmentId, audioPath: segment.audioPath, reason: `Audio is too quiet or unreadable (max_volume: ${maxVolumeDb ?? "missing"} dB).` });
        }

        const leadingDurationMs = Math.min(leadingAudioWindowMs, segment.durationMs);
        const leadingVolume = await inspectMediaWindowVolume({
          mediaPath: segmentAudioPath,
          startMs: 0,
          durationMs: leadingDurationMs,
        });
        if (!volumeIsUsable(leadingVolume.maxVolumeDb)) {
          segmentIssues.push({
            segmentId: segment.segmentId,
            audioPath: segment.audioPath,
            reason: `Audio starts too quietly or silently (first ${leadingDurationMs}ms max_volume: ${leadingVolume.maxVolumeDb ?? "missing"} dB).`,
          });
        }
      } catch {
        segmentIssues.push({ segmentId: segment.segmentId, audioPath: segment.audioPath, reason: "Cannot measure audio volume." });
      }
    }
    checks.push({
      id: "audio-segment-quality",
      ok: segmentIssues.length === 0,
      message: segmentIssues.length === 0
        ? "Every TTS audio segment is decodable, audible, and duration-matched."
        : `${segmentIssues.length} audio segment(s) have playback issues.`,
      details: segmentIssues,
    });

    const videoPath = path.join(workspace, "render", "video.mp4");
    const visualResult = await checkEnglishVisualQuality({
      videoPath,
      renderPackage,
    });
    checks.push(...visualResult.checks);
    const videoFramesReadable =
      visualResult.checks.find((check) => check.id === "visual-media-readable")
        ?.ok === true;

    if (!videoFramesReadable) {
      return {
        topicId,
        ok: false,
        checks,
      };
    }

    try {
      const hasAudio = await inspectAudioStream(videoPath);
      checks.push({
        id: "video-audio-track",
        ok: hasAudio,
        message: hasAudio ? "Rendered video has an audio stream." : "Rendered video has no audio stream.",
      });
    } catch (error) {
      checks.push({
        id: "video-audio-track",
        ok: false,
        message: "Unable to inspect rendered video audio stream.",
        details: error instanceof Error ? error.message : String(error),
      });
    }

    const cueVolumeIssues = [];
    for (const cue of renderPackage.subtitleTrack.cues) {
      try {
        const durationMs = cue.endMs - cue.startMs;
        const volume = await inspectMediaWindowVolume({
          mediaPath: videoPath,
          startMs: cue.startMs,
          durationMs,
        });

        if (!volumeIsUsable(volume.maxVolumeDb)) {
          cueVolumeIssues.push({
            id: cue.id,
            text: cue.text,
            startMs: cue.startMs,
            endMs: cue.endMs,
            ...volume,
          });
        }

        for (const window of cueWindows({
          startMs: cue.startMs,
          endMs: cue.endMs,
        })) {
          const windowVolume = await inspectMediaWindowVolume({
            mediaPath: videoPath,
            startMs: window.startMs,
            durationMs: window.durationMs,
          });

          if (!volumeIsUsable(windowVolume.maxVolumeDb)) {
            cueVolumeIssues.push({
              id: cue.id,
              text: cue.text,
              startMs: window.startMs,
              endMs: window.startMs + window.durationMs,
              reason: "Subtitle cue has a quiet or silent internal audio window.",
              ...windowVolume,
            });
          }
        }
      } catch (error) {
        cueVolumeIssues.push({
          id: cue.id,
          text: cue.text,
          startMs: cue.startMs,
          endMs: cue.endMs,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
    checks.push({
      id: "video-cue-volume",
      ok: cueVolumeIssues.length === 0,
      message:
        cueVolumeIssues.length === 0
          ? "Every subtitle cue window in the rendered video has usable audio volume."
          : "One or more subtitle cue windows in the rendered video are too quiet or silent.",
      details: cueVolumeIssues,
    });

    try {
      const volume = await inspectVolume(videoPath);
      const ok =
        volume.maxVolumeDb !== undefined &&
        Number.isFinite(volume.maxVolumeDb) &&
        volume.maxVolumeDb > -45;
      checks.push({
        id: "video-volume",
        ok,
        message: ok ? "Rendered video audio is not near-silent." : "Rendered video audio is near-silent or unreadable.",
        details: volume,
      });
    } catch (error) {
      checks.push({
        id: "video-volume",
        ok: false,
        message: "Unable to inspect rendered video volume.",
        details: error instanceof Error ? error.message : String(error),
      });
    }

    checks.push(
      await checkEnglishAsrCoverage({
        videoPath,
        renderPackage,
      }),
    );
  }

  return {
    topicId,
    ok: checks.every((check) => check.ok),
    checks,
  };
};
