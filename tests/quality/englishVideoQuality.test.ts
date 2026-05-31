import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkEnglishVideoQuality } from "../../src/lib/quality/checkEnglishVideoQuality";
import { runCli } from "../helpers/runCli";

const execFileAsync = promisify(execFile);

const writeJson = async (targetPath: string, value: unknown) => {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, JSON.stringify(value, null, 2), "utf8");
};

const createToneWav = ({
  durationMs = 1000,
  amplitude = 9000,
  silentRangesMs = [],
}: {
  durationMs?: number;
  amplitude?: number;
  silentRangesMs?: Array<{ startMs: number; endMs: number }>;
}) => {
  const sampleRate = 16000;
  const bytesPerSample = 2;
  const sampleCount = Math.max(1, Math.round((durationMs / 1000) * sampleRate));
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;
  const writeString = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset, value.charCodeAt(index));
      offset += 1;
    }
  };

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * bytesPerSample, true);
  offset += 4;
  view.setUint16(offset, bytesPerSample, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const sampleMs = (sampleIndex / sampleRate) * 1000;
    const silent = silentRangesMs.some(
      (range) => sampleMs >= range.startMs && sampleMs < range.endMs,
    );
    view.setInt16(
      offset,
      silent
        ? 0
        : Math.round(
            Math.sin((2 * Math.PI * 220 * sampleIndex) / sampleRate) * amplitude,
          ),
      true,
    );
    offset += 2;
  }

  return new Uint8Array(buffer);
};

const baseApprovedLesson = {
  topicId: "english-word-quality",
  subject: "english",
  version: 1,
  approvedAt: "2026-05-12T00:00:00.000Z",
  reviewNotes: [],
  approvedScript: [
    { id: "seg-1", kind: "hook", text: "一秒钟记一个单词。" },
    { id: "seg-2", kind: "compare", text: "这个故事可以套任何单词。" },
  ],
  approvedStoryboard: [
    {
      id: "scene-1",
      type: "definition",
      segmentIds: ["seg-1", "seg-2"],
      durationSec: 20,
    },
  ],
  sourceSummary: {
    canonicalTitle: "abide",
    phonetic: "",
    definitions: ["忍受；遵守"],
    formulas: [],
    principles: ["v."],
    examples: [],
    misconceptions: [],
    prerequisites: [],
    nextConnections: [],
    visualizationHints: [],
    sources: [],
  },
};

const baseAudioManifest = {
  topicId: "english-word-quality",
  version: 1,
  ttsProvider: "qwen-local",
  generatedAt: "2026-05-12T00:00:00.000Z",
  segments: [
    {
      segmentId: "seg-1",
      kind: "hook",
      text: "一秒钟记一个单词。",
      audioPath: "audio/seg-1.wav",
      durationMs: 2000,
      chunks: [{ text: "一秒钟记一个单词。", startMs: 0, endMs: 2000 }],
    },
    {
      segmentId: "seg-2",
      kind: "compare",
      text: "这个故事可以套任何单词。",
      audioPath: "audio/seg-2.wav",
      durationMs: 7000,
      chunks: [{ text: "这个故事可以套任何单词。", startMs: 0, endMs: 7000 }],
    },
  ],
  subtitleTrack: {
    cues: [
      {
        id: "seg-1:1",
        segmentId: "seg-1",
        text: "一秒钟记一个单词。",
        startMs: 0,
        endMs: 2000,
      },
      {
        id: "seg-2:1",
        segmentId: "seg-2",
        text: "这个故事可以套任何单词。",
        startMs: 2000,
        endMs: 9000,
      },
    ],
  },
  totalDurationMs: 9000,
};

const baseRenderPackage = {
  topicId: "english-word-quality",
  lessonVersion: 1,
  canonicalTitle: "abide",
  approvedAt: "2026-05-12T00:00:00.000Z",
  generatedAt: "2026-05-12T00:00:00.000Z",
  totalDurationMs: 31000,
  meta: {
    topicId: "english-word-quality",
    subject: "english",
    aspectRatio: "9:16",
  },
  subject: "english",
  themeTokens: {
    palette: "english-vocab-card",
    typography: "english-serif",
    accent: "#ff8d7a",
  },
  audioTracks: [
    {
      id: "seg-1",
      file: "generated/english-word-quality/audio/seg-1.wav",
      sourceFile: "workspace/test/audio/seg-1.wav",
      startMs: 0,
      endMs: 2000,
      durationMs: 2000,
    },
  ],
  subtitleTrack: {
    topicId: "english-word-quality",
    subject: "english",
    cues: baseAudioManifest.subtitleTrack.cues,
  },
  scenes: [
    {
      id: "scene-1",
      kind: "definition",
      component: "english/definition",
      durationInFrames: 930,
      payload: {
        word: "abide",
        meaning: "忍受；遵守",
      },
    },
  ],
  durationInFrames: 930,
};

describe("checkEnglishVideoQuality", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("reports mock audio, long subtitles, long duration, and meaning-detached mnemonic copy", async () => {
    const workspaceRoot = path.join(process.cwd(), ".tmp-quality-test");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", workspaceRoot);
    vi.stubEnv("TTS_PROVIDER", "mock");

    const topicRoot = path.join(workspaceRoot, "english-word-quality");
    await writeJson(path.join(topicRoot, "approved", "lesson.json"), baseApprovedLesson);
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), {
      ...baseAudioManifest,
      ttsProvider: "mock",
    });
    await writeJson(path.join(topicRoot, "render", "render-package.json"), baseRenderPackage);

    const result = await checkEnglishVideoQuality({
      topicId: "english-word-quality",
      inspectMedia: false,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "audio-provider", ok: false }),
        expect.objectContaining({ id: "duration", ok: false }),
        expect.objectContaining({ id: "subtitle-cue-duration", ok: false }),
        expect.objectContaining({ id: "mnemonic-meaning", ok: false }),
        expect.objectContaining({ id: "word-entrance-cue", ok: false }),
      ]),
    );
  });

  it("rejects weak mnemonic scenes that do not logically prove the word meaning", async () => {
    const workspaceRoot = path.join(process.cwd(), ".tmp-quality-weak-mnemonic");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", workspaceRoot);
    vi.stubEnv("TTS_PROVIDER", "qwen-local");

    const topicRoot = path.join(workspaceRoot, "english-word-quality");
    await writeJson(path.join(topicRoot, "approved", "lesson.json"), {
      ...baseApprovedLesson,
      approvedScript: [
        { id: "seg-1", kind: "hook", text: "一秒钟记一个单词。" },
        {
          id: "seg-2",
          kind: "definition",
          text: "今天要记的单词是 abandonment，意思是：放弃。",
        },
        { id: "seg-3", kind: "compare", text: "门口那堆纸箱没人再碰，" },
        { id: "seg-4", kind: "pitfall", text: "不再继续，就是放弃，" },
        { id: "seg-5", kind: "pronunciation", text: "abandonment" },
        { id: "seg-6", kind: "wrap", text: "所以：abandonment，指的是放弃。" },
      ],
      sourceSummary: {
        ...baseApprovedLesson.sourceSummary,
        canonicalTitle: "abandonment",
        definitions: ["放弃"],
        principles: ["n."],
      },
    });
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), {
      ...baseAudioManifest,
      subtitleTrack: {
        cues: [
          {
            id: "seg-2:1",
            segmentId: "seg-2",
            text: "今天要记的单词是 abandonment，意思是：放弃。",
            startMs: 0,
            endMs: 3000,
          },
        ],
      },
      totalDurationMs: 20000,
    });
    await writeJson(path.join(topicRoot, "render", "render-package.json"), {
      ...baseRenderPackage,
      canonicalTitle: "abandonment",
      totalDurationMs: 20000,
      subtitleTrack: {
        ...baseRenderPackage.subtitleTrack,
        cues: [
          {
            id: "seg-2:1",
            segmentId: "seg-2",
            text: "今天要记的单词是 abandonment，意思是：放弃。",
            startMs: 0,
            endMs: 3000,
          },
        ],
      },
      scenes: [
        {
          ...baseRenderPackage.scenes[0],
          payload: {
            ...baseRenderPackage.scenes[0].payload,
            word: "abandonment",
            meaning: "放弃",
            segmentIds: ["seg-2"],
            subtitleCues: [
              {
                id: "seg-2:1",
                segmentId: "seg-2",
                text: "今天要记的单词是 abandonment，意思是：放弃。",
                startMs: 0,
                endMs: 3000,
              },
            ],
          },
        },
      ],
    });

    const result = await checkEnglishVideoQuality({
      topicId: "english-word-quality",
      inspectMedia: false,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "mnemonic-grounding", ok: false }),
      ]),
    );
  });

  it("rejects generic picture copy even when it repeats the word meaning", async () => {
    const workspaceRoot = path.join(process.cwd(), ".tmp-quality-generic-mnemonic");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", workspaceRoot);
    vi.stubEnv("TTS_PROVIDER", "qwen-local");

    const topicRoot = path.join(workspaceRoot, "english-word-quality");
    await writeJson(path.join(topicRoot, "approved", "lesson.json"), {
      ...baseApprovedLesson,
      approvedScript: [
        { id: "seg-1", kind: "hook", text: "一秒钟记一个单词。" },
        {
          id: "seg-2",
          kind: "definition",
          text: "今天要记的单词是 abnormal，意思是：不正常的；变态的。",
        },
        { id: "seg-3", kind: "compare", text: "怎么记 不正常的、变态的？一个清晰的画面闪过眼前，" },
        { id: "seg-4", kind: "pitfall", text: "它就对应着不正常的、变态的，" },
        { id: "seg-5", kind: "pronunciation", text: "abnormal" },
        { id: "seg-6", kind: "wrap", text: "所以：abnormal，就是不正常的、变态的。" },
      ],
      sourceSummary: {
        ...baseApprovedLesson.sourceSummary,
        canonicalTitle: "abnormal",
        phonetic: "/æˈbnɔrməl/",
        definitions: ["不正常的；变态的", "反常的， 异常的"],
        principles: ["adj."],
      },
    });
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), {
      ...baseAudioManifest,
      subtitleTrack: {
        cues: [
          {
            id: "seg-2:1",
            segmentId: "seg-2",
            text: "今天要记的单词是 abnormal，意思是：不正常的；变态的。",
            startMs: 0,
            endMs: 3000,
          },
        ],
      },
      totalDurationMs: 20000,
    });
    await writeJson(path.join(topicRoot, "render", "render-package.json"), {
      ...baseRenderPackage,
      canonicalTitle: "abnormal",
      totalDurationMs: 20000,
      subtitleTrack: {
        ...baseRenderPackage.subtitleTrack,
        cues: [
          {
            id: "seg-2:1",
            segmentId: "seg-2",
            text: "今天要记的单词是 abnormal，意思是：不正常的；变态的。",
            startMs: 0,
            endMs: 3000,
          },
        ],
      },
      scenes: [
        {
          ...baseRenderPackage.scenes[0],
          payload: {
            ...baseRenderPackage.scenes[0].payload,
            word: "abnormal",
            phonetic: "/æˈbnɔrməl/",
            meaning: "不正常的；变态的",
            segmentIds: ["seg-2"],
            subtitleCues: [
              {
                id: "seg-2:1",
                segmentId: "seg-2",
                text: "今天要记的单词是 abnormal，意思是：不正常的；变态的。",
                startMs: 0,
                endMs: 3000,
              },
            ],
          },
        },
      ],
    });

    const result = await checkEnglishVideoQuality({
      topicId: "english-word-quality",
      inspectMedia: false,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "mnemonic-grounding", ok: false }),
      ]),
    );
  });

  it("requires mnemonic copy to keep the primary displayed meaning", async () => {
    const workspaceRoot = path.join(process.cwd(), ".tmp-quality-meaning-mismatch");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", workspaceRoot);
    vi.stubEnv("TTS_PROVIDER", "qwen-local");

    const topicRoot = path.join(workspaceRoot, "english-word-quality");
    await writeJson(path.join(topicRoot, "approved", "lesson.json"), {
      ...baseApprovedLesson,
      approvedScript: [
        { id: "seg-1", kind: "hook", text: "一秒钟记一个单词。" },
        {
          id: "seg-2",
          kind: "definition",
          text: "今天要记的单词是 abnormal，意思是：不正常的；变态的。",
        },
        { id: "seg-3", kind: "compare", text: "正常体温大约三十六七度，体温计突然显示八十度还说健康，" },
        { id: "seg-4", kind: "pitfall", text: "这种明显偏离正常范围的情况，就是不正常的、反常的，" },
        { id: "seg-5", kind: "pronunciation", text: "abnormal" },
        { id: "seg-6", kind: "wrap", text: "所以：abnormal，就是不正常的、反常的。" },
      ],
      sourceSummary: {
        ...baseApprovedLesson.sourceSummary,
        canonicalTitle: "abnormal",
        phonetic: "/æˈbnɔrməl/",
        definitions: ["不正常的；变态的", "反常的， 异常的"],
        principles: ["adj."],
      },
    });
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), {
      ...baseAudioManifest,
      totalDurationMs: 20000,
    });
    await writeJson(path.join(topicRoot, "render", "render-package.json"), {
      ...baseRenderPackage,
      canonicalTitle: "abnormal",
      totalDurationMs: 20000,
      scenes: [
        {
          ...baseRenderPackage.scenes[0],
          payload: {
            ...baseRenderPackage.scenes[0].payload,
            word: "abnormal",
            phonetic: "/æˈbnɔrməl/",
            meaning: "不正常的；变态的",
          },
        },
      ],
    });

    const result = await checkEnglishVideoQuality({
      topicId: "english-word-quality",
      inspectMedia: false,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "mnemonic-meaning", ok: false }),
      ]),
    );
  });

  it("rejects English render packages without a visible phonetic cue", async () => {
    const workspaceRoot = path.join(process.cwd(), ".tmp-quality-missing-phonetic");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", workspaceRoot);
    vi.stubEnv("TTS_PROVIDER", "qwen-local");

    const topicRoot = path.join(workspaceRoot, "english-word-quality");
    await writeJson(path.join(topicRoot, "approved", "lesson.json"), {
      ...baseApprovedLesson,
      approvedScript: [
        { id: "seg-1", kind: "hook", text: "一秒钟记一个单词。" },
        { id: "seg-2", kind: "definition", text: "今天要记的单词是 abbreviation，意思是：缩写。" },
        { id: "seg-3", kind: "compare", text: "一个长词被缩短成几个字母，" },
        { id: "seg-4", kind: "pitfall", text: "这种缩短后的形式，就是缩写，" },
        { id: "seg-5", kind: "pronunciation", text: "abbreviation" },
        { id: "seg-6", kind: "wrap", text: "所以：abbreviation，指的是缩写。" },
      ],
      sourceSummary: {
        ...baseApprovedLesson.sourceSummary,
        canonicalTitle: "abbreviation",
        phonetic: "",
        definitions: ["缩写"],
        principles: ["n."],
      },
    });
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), {
      ...baseAudioManifest,
      subtitleTrack: {
        cues: [
          {
            id: "seg-2:1",
            segmentId: "seg-2",
            text: "今天要记的单词是 abbreviation，意思是：缩写。",
            startMs: 0,
            endMs: 3000,
          },
        ],
      },
      totalDurationMs: 20000,
    });
    await writeJson(path.join(topicRoot, "render", "render-package.json"), {
      ...baseRenderPackage,
      canonicalTitle: "abbreviation",
      totalDurationMs: 20000,
      subtitleTrack: {
        ...baseRenderPackage.subtitleTrack,
        cues: [
          {
            id: "seg-2:1",
            segmentId: "seg-2",
            text: "今天要记的单词是 abbreviation，意思是：缩写。",
            startMs: 0,
            endMs: 3000,
          },
        ],
      },
      scenes: [
        {
          ...baseRenderPackage.scenes[0],
          payload: {
            ...baseRenderPackage.scenes[0].payload,
            word: "abbreviation",
            phonetic: "",
            meaning: "缩写",
            segmentIds: ["seg-2"],
            subtitleCues: [
              {
                id: "seg-2:1",
                segmentId: "seg-2",
                text: "今天要记的单词是 abbreviation，意思是：缩写。",
                startMs: 0,
                endMs: 3000,
              },
            ],
          },
        },
      ],
    });

    const result = await checkEnglishVideoQuality({
      topicId: "english-word-quality",
      inspectMedia: false,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "phonetic", ok: false }),
      ]),
    );
  });

  it("rejects subtitle timing that is too short to speak the full script line", async () => {
    const workspaceRoot = path.join(process.cwd(), ".tmp-quality-fast-timing");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", workspaceRoot);

    const topicRoot = path.join(workspaceRoot, "english-word-quality");
    await writeJson(path.join(topicRoot, "approved", "lesson.json"), {
      ...baseApprovedLesson,
      approvedScript: [
        {
          id: "seg-1",
          kind: "definition",
          text: "今天要记的单词是 absence，意思是：缺席，不存在，缺乏。",
        },
      ],
      approvedStoryboard: [
        { id: "scene-1", type: "definition", segmentIds: ["seg-1"], durationSec: 3 },
      ],
      sourceSummary: {
        ...baseApprovedLesson.sourceSummary,
        canonicalTitle: "absence",
        phonetic: "/ˈæbsəns/",
        definitions: ["缺席", "不存在", "缺乏"],
      },
    });
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), {
      ...baseAudioManifest,
      segments: [
        {
          segmentId: "seg-1",
          kind: "definition",
          text: "今天要记的单词是 absence，意思是：缺席，不存在，缺乏。",
          audioPath: "audio/seg-1.wav",
          durationMs: 1600,
          chunks: [
            {
              text: "今天要记的单词是 absence，意思是：缺席，不存在，缺乏。",
              startMs: 0,
              endMs: 1600,
            },
          ],
        },
      ],
      subtitleTrack: {
        cues: [
          {
            id: "seg-1:1",
            segmentId: "seg-1",
            text: "今天要记的单词是 absence，意思是：缺席，不存在，缺乏。",
            startMs: 0,
            endMs: 1600,
          },
        ],
      },
      totalDurationMs: 1600,
    });
    await writeJson(path.join(topicRoot, "render", "render-package.json"), {
      ...baseRenderPackage,
      canonicalTitle: "absence",
      totalDurationMs: 1600,
      subtitleTrack: {
        ...baseRenderPackage.subtitleTrack,
        cues: [
          {
            id: "seg-1:1",
            segmentId: "seg-1",
            text: "今天要记的单词是 absence，意思是：缺席，不存在，缺乏。",
            startMs: 0,
            endMs: 1600,
          },
        ],
      },
      scenes: [
        {
          ...baseRenderPackage.scenes[0],
          payload: {
            word: "absence",
            phonetic: "/ˈæbsəns/",
            meaning: "缺席",
            segmentIds: ["seg-1"],
            subtitleCues: [
              {
                id: "seg-1:1",
                segmentId: "seg-1",
                text: "今天要记的单词是 absence，意思是：缺席，不存在，缺乏。",
                startMs: 0,
                endMs: 1600,
              },
            ],
          },
        },
      ],
      durationInFrames: 48,
    });

    const result = await checkEnglishVideoQuality({
      topicId: "english-word-quality",
      inspectMedia: false,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "audio-text-timing", ok: false }),
      ]),
    );
  });

  it("rejects literal Unicode escape text in approved render payloads", async () => {
    const workspaceRoot = path.join(process.cwd(), ".tmp-quality-copy-encoding");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", workspaceRoot);

    const topicRoot = path.join(workspaceRoot, "english-word-quality");
    await writeJson(path.join(topicRoot, "approved", "lesson.json"), {
      ...baseApprovedLesson,
      approvedScript: [
        { id: "seg-1", kind: "definition", text: "今天要记的单词是 above，意思是：在上方。" },
        { id: "seg-2", kind: "wrap", text: "记住 above：位\\u7f6在上方。" },
      ],
      sourceSummary: {
        ...baseApprovedLesson.sourceSummary,
        canonicalTitle: "above",
        phonetic: "/əˈbʌv/",
        definitions: ["在上方"],
      },
    });
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), baseAudioManifest);
    await writeJson(path.join(topicRoot, "render", "render-package.json"), {
      ...baseRenderPackage,
      canonicalTitle: "above",
      totalDurationMs: 9000,
      scenes: [
        {
          ...baseRenderPackage.scenes[0],
          payload: {
            word: "above",
            phonetic: "/əˈbʌv/",
            meaning: "在上方",
            subtitleCues: [
              {
                id: "seg-2:1",
                segmentId: "seg-2",
                text: "记住 above：位\\u7f6在上方。",
                startMs: 0,
                endMs: 2000,
              },
            ],
          },
        },
      ],
    });

    const result = await checkEnglishVideoQuality({
      topicId: "english-word-quality",
      inspectMedia: false,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "copy-encoding", ok: false }),
      ]),
    );
  });

  it("fails closed when visual quality inspection cannot inspect rendered frames", async () => {
    const workspaceRoot = path.join(process.cwd(), ".tmp-quality-visual-fail");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", workspaceRoot);
    vi.stubEnv("TTS_PROVIDER", "qwen-local");

    const topicRoot = path.join(workspaceRoot, "english-word-quality");
    await writeJson(path.join(topicRoot, "approved", "lesson.json"), {
      ...baseApprovedLesson,
      approvedScript: [
        { id: "seg-1", kind: "hook", text: "一秒钟记一个单词。" },
        {
          id: "seg-2",
          kind: "definition",
          text: "今天要记的单词是 aboard，意思是：上船。",
        },
        {
          id: "seg-3",
          kind: "compare",
          text: "人从岸边跨上船，脚已经站到甲板里。",
        },
        { id: "seg-4", kind: "wrap", text: "所以：aboard，就是上船。" },
      ],
      sourceSummary: {
        ...baseApprovedLesson.sourceSummary,
        canonicalTitle: "aboard",
        phonetic: "/əˈbɔrd/",
        definitions: ["上船"],
      },
    });
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), {
      ...baseAudioManifest,
      totalDurationMs: 20000,
    });
    await writeJson(path.join(topicRoot, "render", "render-package.json"), {
      ...baseRenderPackage,
      canonicalTitle: "aboard",
      totalDurationMs: 20000,
      scenes: [
        {
          ...baseRenderPackage.scenes[0],
          payload: {
            word: "aboard",
            phonetic: "/əˈbɔrd/",
            subtitleCues: [
              { text: "今天要记的单词是 aboard，意思是：上船。" },
            ],
          },
        },
      ],
    });

    const result = await checkEnglishVideoQuality({
      topicId: "english-word-quality",
      inspectMedia: true,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "visual-media-readable", ok: false }),
      ]),
    );
  });

  it("rejects real audio segments that are technically present but too quiet to use", async () => {
    const workspaceRoot = path.join(process.cwd(), ".tmp-quality-quiet-audio");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", workspaceRoot);

    const topicRoot = path.join(workspaceRoot, "english-word-quality");
    await writeJson(path.join(topicRoot, "approved", "lesson.json"), {
      ...baseApprovedLesson,
      sourceSummary: {
        ...baseApprovedLesson.sourceSummary,
        phonetic: "/əˈbaɪd/",
      },
    });
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), {
      ...baseAudioManifest,
      segments: [
        {
          ...baseAudioManifest.segments[0],
          audioPath: "audio/seg-1.wav",
        },
        {
          ...baseAudioManifest.segments[1],
          audioPath: "audio/seg-2.wav",
        },
      ],
    });
    await writeFile(
      path.join(topicRoot, "audio", "seg-1.wav"),
      createToneWav({ durationMs: 2000, amplitude: 9000 }),
    );
    await writeFile(
      path.join(topicRoot, "audio", "seg-2.wav"),
      createToneWav({ durationMs: 7000, amplitude: 900 }),
    );
    await writeJson(path.join(topicRoot, "render", "render-package.json"), {
      ...baseRenderPackage,
      totalDurationMs: 9000,
      scenes: [
        {
          ...baseRenderPackage.scenes[0],
          payload: {
            word: "abide",
            phonetic: "/əˈbaɪd/",
            subtitleCues: baseRenderPackage.subtitleTrack.cues,
          },
        },
      ],
    });

    const result = await checkEnglishVideoQuality({
      topicId: "english-word-quality",
      inspectMedia: true,
    });

    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "audio-segment-quality", ok: false }),
      ]),
    );
  });

  it("rejects real audio segments that start with silence before narration", async () => {
    const workspaceRoot = path.join(process.cwd(), ".tmp-quality-leading-silence");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", workspaceRoot);

    const topicRoot = path.join(workspaceRoot, "english-word-quality");
    await writeJson(path.join(topicRoot, "approved", "lesson.json"), {
      ...baseApprovedLesson,
      sourceSummary: {
        ...baseApprovedLesson.sourceSummary,
        phonetic: "/əˈbaɪd/",
      },
    });
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), {
      ...baseAudioManifest,
      segments: [
        {
          ...baseAudioManifest.segments[0],
          audioPath: "audio/seg-1.wav",
          durationMs: 3000,
          chunks: [{ text: "一秒钟记一个单词。", startMs: 0, endMs: 3000 }],
        },
      ],
      subtitleTrack: {
        cues: [
          {
            id: "seg-1:1",
            segmentId: "seg-1",
            text: "一秒钟记一个单词。",
            startMs: 0,
            endMs: 3000,
          },
        ],
      },
      totalDurationMs: 3000,
    });
    await writeFile(
      path.join(topicRoot, "audio", "seg-1.wav"),
      createToneWav({
        durationMs: 3000,
        amplitude: 9000,
        silentRangesMs: [{ startMs: 0, endMs: 1000 }],
      }),
    );
    await writeJson(path.join(topicRoot, "render", "render-package.json"), {
      ...baseRenderPackage,
      totalDurationMs: 3000,
      subtitleTrack: {
        ...baseRenderPackage.subtitleTrack,
        cues: [
          {
            id: "seg-1:1",
            segmentId: "seg-1",
            text: "一秒钟记一个单词。",
            startMs: 0,
            endMs: 3000,
          },
        ],
      },
      scenes: [
        {
          ...baseRenderPackage.scenes[0],
          payload: {
            word: "abide",
            phonetic: "/əˈbaɪd/",
            subtitleCues: [
              {
                id: "seg-1:1",
                segmentId: "seg-1",
                text: "一秒钟记一个单词。",
                startMs: 0,
                endMs: 3000,
              },
            ],
          },
        },
      ],
      durationInFrames: 90,
    });

    const result = await checkEnglishVideoQuality({
      topicId: "english-word-quality",
      inspectMedia: true,
    });

    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "audio-segment-quality", ok: false }),
      ]),
    );
  });

  it("rejects subtitle cue windows that contain silent gaps inside the rendered video", async () => {
    const workspaceRoot = path.join(process.cwd(), ".tmp-quality-cue-gap");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", workspaceRoot);
    vi.stubEnv("ASR_WHISPER_COMMAND", "missing-whisper-for-cue-gap-test");

    const topicRoot = path.join(workspaceRoot, "english-word-quality");
    const audioPath = path.join(topicRoot, "audio", "seg-1.wav");
    const videoPath = path.join(topicRoot, "render", "video.mp4");
    await writeJson(path.join(topicRoot, "approved", "lesson.json"), {
      ...baseApprovedLesson,
      sourceSummary: {
        ...baseApprovedLesson.sourceSummary,
        phonetic: "/əˈbaɪd/",
      },
    });
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), {
      ...baseAudioManifest,
      segments: [
        {
          ...baseAudioManifest.segments[0],
          audioPath: "audio/seg-1.wav",
          durationMs: 3000,
          chunks: [{ text: "一秒钟记一个单词。", startMs: 0, endMs: 3000 }],
        },
      ],
      subtitleTrack: {
        cues: [
          {
            id: "seg-1:1",
            segmentId: "seg-1",
            text: "一秒钟记一个单词。",
            startMs: 0,
            endMs: 3000,
          },
        ],
      },
      totalDurationMs: 3000,
    });
    await writeFile(
      audioPath,
      createToneWav({
        durationMs: 3000,
        amplitude: 9000,
        silentRangesMs: [{ startMs: 1000, endMs: 2000 }],
      }),
    );
    await mkdir(path.dirname(videoPath), { recursive: true });
    await execFileAsync("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=white:s=1080x1920:r=30:d=3",
      "-i",
      audioPath,
      "-shortest",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      videoPath,
    ]);
    await writeJson(path.join(topicRoot, "render", "render-package.json"), {
      ...baseRenderPackage,
      totalDurationMs: 3000,
      subtitleTrack: {
        ...baseRenderPackage.subtitleTrack,
        cues: [
          {
            id: "seg-1:1",
            segmentId: "seg-1",
            text: "一秒钟记一个单词。",
            startMs: 0,
            endMs: 3000,
          },
        ],
      },
      scenes: [
        {
          ...baseRenderPackage.scenes[0],
          payload: {
            word: "abide",
            phonetic: "/əˈbaɪd/",
            subtitleCues: [
              {
                id: "seg-1:1",
                segmentId: "seg-1",
                text: "一秒钟记一个单词。",
                startMs: 0,
                endMs: 3000,
              },
            ],
          },
        },
      ],
      durationInFrames: 90,
    });

    const result = await checkEnglishVideoQuality({
      topicId: "english-word-quality",
      inspectMedia: true,
    });

    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "video-cue-volume", ok: false }),
      ]),
    );
  });

  it("exposes the quality check through the CLI", async () => {
    const workspaceRoot = path.join(process.cwd(), ".tmp-quality-cli");
    const topicRoot = path.join(workspaceRoot, "english-word-quality");
    await writeJson(path.join(topicRoot, "approved", "lesson.json"), {
      ...baseApprovedLesson,
      approvedScript: [
        { id: "seg-1", kind: "hook", text: "一秒钟记一个单词。" },
        { id: "seg-2", kind: "compare", text: "遇到不舒服的规则，你先忍住，再照着要求做。" },
        { id: "seg-3", kind: "wrap", text: "abide，就是忍受并遵守。" },
      ],
      sourceSummary: {
        ...baseApprovedLesson.sourceSummary,
        phonetic: "/əˈbaɪd/",
        formulas: ["/əˈbaɪd/"],
      },
    });
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), {
      ...baseAudioManifest,
      subtitleTrack: {
        cues: [
          {
            id: "seg-1:1",
            segmentId: "seg-1",
            text: "一秒钟记一个单词。",
            startMs: 0,
            endMs: 2000,
          },
          {
            id: "seg-2:1",
            segmentId: "seg-2",
            text: "所以：abide，就是忍受并遵守。",
            startMs: 2000,
            endMs: 5000,
          },
        ],
      },
      totalDurationMs: 20000,
    });
    await writeJson(path.join(topicRoot, "render", "render-package.json"), {
      ...baseRenderPackage,
      totalDurationMs: 20000,
      subtitleTrack: {
        ...baseRenderPackage.subtitleTrack,
        cues: [
          {
            id: "seg-1:1",
            segmentId: "seg-1",
            text: "一秒钟记一个单词。",
            startMs: 0,
            endMs: 2000,
          },
          {
            id: "seg-2:1",
            segmentId: "seg-2",
            text: "所以：abide，就是忍受并遵守。",
            startMs: 2000,
            endMs: 5000,
          },
        ],
      },
      scenes: [
        {
          ...baseRenderPackage.scenes[0],
          payload: {
            ...baseRenderPackage.scenes[0].payload,
            phonetic: "/əˈbaɪd/",
            segmentIds: ["seg-1", "seg-2"],
            subtitleCues: [
              {
                id: "seg-1:1",
                segmentId: "seg-1",
                text: "一秒钟记一个单词。",
                startMs: 0,
                endMs: 2000,
              },
              {
                id: "seg-2:1",
                segmentId: "seg-2",
                text: "所以：abide，就是忍受并遵守。",
                startMs: 2000,
                endMs: 5000,
              },
            ],
          },
        },
      ],
    });

    const result = await runCli(
      ["quality", "english", "--topic-id", "english-word-quality", "--skip-media"],
      {
        TOPIC_WORKSPACE_ROOT: workspaceRoot,
        TTS_PROVIDER: "qwen-local",
      },
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(
      expect.objectContaining({
        topicId: "english-word-quality",
        ok: true,
      }),
    );
  });
});
