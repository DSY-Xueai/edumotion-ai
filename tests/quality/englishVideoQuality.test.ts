import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkEnglishVideoQuality } from "../../src/lib/quality/checkEnglishVideoQuality";
import { runCli } from "../helpers/runCli";

const writeJson = async (targetPath: string, value: unknown) => {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, JSON.stringify(value, null, 2), "utf8");
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
    await writeJson(path.join(topicRoot, "audio", "manifest.json"), baseAudioManifest);
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
