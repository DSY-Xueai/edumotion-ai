import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { saveDraft } from "../../src/lib/draft/saveDraft";
import { generateSegmentAudio } from "../../src/lib/audio/generateSegmentAudio";
import { saveResearch } from "../../src/lib/research/saveResearch";
import { approveDraft } from "../../src/lib/review/approveDraft";
import { getTopicWorkspace } from "../../src/lib/workspace/getTopicWorkspace";
import { readTopicManifest } from "../../src/lib/workspace/readTopicManifest";

describe("generateSegmentAudio", () => {
  it("stores synthesized segment audio and subtitle alignment data under the topic workspace", async () => {
    const topicId = "audio-topic-001";
    const generatedAt = "2026-04-26T10:00:00.000Z";
    const synthesizedSegments: string[] = [];

    await saveResearch({
      topicId,
      scope: "topic",
      canonicalTitle: "集合的含义",
      definitions: ["把确定对象组成的整体看作一个集合。"],
      formulas: [],
      principles: ["元素是否属于集合需要明确判断。"],
      examples: ["小于 5 的自然数组成的集合。"],
      misconceptions: ["集合里的元素可以重复计数。"],
      prerequisites: [],
      nextConnections: ["集合之间的关系。"],
      visualizationHints: ["使用花括号包住元素。"],
      sources: [
        {
          title: "教材",
          url: "https://example.com/textbook",
          sourceType: "official",
          publisher: "PEP",
          retrievedAt: "2026-04-26",
          quoteOrSummary: "集合是一组确定对象的整体。",
        },
      ],
    });

    await saveDraft({
      topicId,
      toneProfile: "clear",
      durationTargetSec: 60,
      hook: "先别急着背定义。",
      summary: "理解集合和元素。",
      scriptSegments: [
        { id: "seg-1", kind: "hook", text: "先别急着背定义。" },
        { id: "seg-2", kind: "definition", text: "集合是确定对象组成的整体。" },
      ],
      storyboardScenes: [
        {
          id: "scene-1",
          type: "hook",
          segmentIds: ["seg-1"],
          durationSec: 8,
        },
        {
          id: "scene-2",
          type: "definition",
          segmentIds: ["seg-2"],
          durationSec: 12,
        },
      ],
      subtitleDraft: [
        { id: "sub-1", segmentId: "seg-1", text: "先别急着背定义。" },
        { id: "sub-2", segmentId: "seg-2", text: "集合是确定对象组成的整体。" },
      ],
      visualPlan: ["花括号高亮元素。"],
      qaNotes: [],
    });

    await approveDraft({
      topicId,
      approvedAt: "2026-04-26T09:55:00.000Z",
      reviewNotes: ["脚本可以进入音频阶段。"],
    });

    const manifest = await generateSegmentAudio({
      topicId,
      generatedAt,
      provider: {
        name: "mock",
        synthesizeSegment: async ({ segment }) => {
          synthesizedSegments.push(segment.id);

          if (segment.id === "seg-1") {
            return {
              audioFile: {
                extension: "mp3",
                data: Buffer.from("seg-1-audio"),
              },
              durationMs: 1200,
              chunks: [
                { text: "先别急着", startMs: 0, endMs: 500 },
                { text: "背定义。", startMs: 500, endMs: 1200 },
              ],
            };
          }

          return {
            audioFile: {
              extension: "mp3",
              data: Buffer.from("seg-2-audio"),
            },
            durationMs: 800,
            chunks: [{ text: "集合是确定对象组成的整体。", startMs: 0, endMs: 800 }],
          };
        },
      },
    });

    const storedManifest = JSON.parse(
      await readFile(
        path.join(
          getTopicWorkspace(topicId),
          "audio",
          "manifest.json",
        ),
        "utf8",
      ),
    );
    const topicManifest = await readTopicManifest(topicId);

    expect(synthesizedSegments).toEqual(["seg-1", "seg-2"]);
    expect(manifest.generatedAt).toBe(generatedAt);
    expect(manifest.totalDurationMs).toBe(2000);
    expect(manifest.segments).toEqual([
      expect.objectContaining({
        segmentId: "seg-1",
        kind: "hook",
        audioPath: "audio/seg-1.mp3",
        durationMs: 1200,
      }),
      expect.objectContaining({
        segmentId: "seg-2",
        kind: "definition",
        audioPath: "audio/seg-2.mp3",
        durationMs: 800,
      }),
    ]);
    expect(manifest.subtitleTrack.cues).toEqual([
      {
        id: "seg-1:1",
        segmentId: "seg-1",
        text: "先别急着",
        startMs: 0,
        endMs: 500,
      },
      {
        id: "seg-1:2",
        segmentId: "seg-1",
        text: "背定义。",
        startMs: 500,
        endMs: 1200,
      },
      {
        id: "seg-2:1",
        segmentId: "seg-2",
        text: "集合是确定对象组成的整体。",
        startMs: 1200,
        endMs: 2000,
      },
    ]);
    expect(storedManifest).toEqual(manifest);
    expect(topicManifest.status).toBe("subtitle_aligned");
    expect(topicManifest.updatedAt).toBe(generatedAt);
    await expect(
      access(
        path.join(
          getTopicWorkspace(topicId),
          "audio",
          "seg-1.mp3",
        ),
      ),
    ).resolves.toBeUndefined();
    await expect(
      access(
        path.join(
          getTopicWorkspace(topicId),
          "audio",
          "seg-2.mp3",
        ),
      ),
    ).resolves.toBeUndefined();
  });

  it("uses batch synthesis when the provider supports it", async () => {
    const topicId = "audio-topic-batch-001";

    await saveResearch({
      topicId,
      scope: "topic",
      canonicalTitle: "平抛运动",
      definitions: ["平抛运动可以分解。"],
      formulas: [],
      principles: ["水平匀速，竖直自由落体。"],
      examples: ["小球水平飞出。"],
      misconceptions: [],
      prerequisites: [],
      nextConnections: [],
      visualizationHints: [],
      sources: [
        {
          title: "教材",
          url: "https://example.com/textbook",
          sourceType: "official",
          publisher: "PEP",
          retrievedAt: "2026-05-04",
          quoteOrSummary: "平抛运动。",
        },
      ],
    });

    await saveDraft({
      topicId,
      toneProfile: "clear",
      durationTargetSec: 20,
      hook: "先看现象。",
      summary: "平抛运动。",
      scriptSegments: [
        { id: "seg-1", kind: "hook", text: "先看现象。" },
        { id: "seg-2", kind: "rule", text: "水平匀速。" },
      ],
      storyboardScenes: [
        { id: "scene-1", type: "hook", segmentIds: ["seg-1"], durationSec: 4 },
        { id: "scene-2", type: "rule", segmentIds: ["seg-2"], durationSec: 4 },
      ],
      subtitleDraft: [
        { id: "sub-1", segmentId: "seg-1", text: "先看现象。" },
        { id: "sub-2", segmentId: "seg-2", text: "水平匀速。" },
      ],
      visualPlan: [],
      qaNotes: [],
    });

    await approveDraft({
      topicId,
      approvedAt: "2026-05-04T00:00:00.000Z",
      reviewNotes: [],
    });

    const singleCalls: string[] = [];
    const batchCalls: string[][] = [];
    const manifest = await generateSegmentAudio({
      topicId,
      provider: {
        name: "mock",
        synthesizeSegment: async ({ segment }) => {
          singleCalls.push(segment.id);
          throw new Error("single synthesis should not be used");
        },
        synthesizeSegments: async ({ segments }) => {
          batchCalls.push(segments.map((segment) => segment.id));
          return segments.map((segment, index) => ({
            audioFile: {
              extension: "wav",
              data: Buffer.from(`audio-${segment.id}`),
            },
            durationMs: index === 0 ? 1000 : 1200,
            chunks: [{ text: segment.text, startMs: 0, endMs: index === 0 ? 1000 : 1200 }],
          }));
        },
      },
    });

    expect(singleCalls).toEqual([]);
    expect(batchCalls).toEqual([["seg-1", "seg-2"]]);
    expect(manifest.subtitleTrack.cues).toEqual([
      {
        id: "seg-1:1",
        segmentId: "seg-1",
        text: "先看现象。",
        startMs: 0,
        endMs: 1000,
      },
      {
        id: "seg-2:1",
        segmentId: "seg-2",
        text: "水平匀速。",
        startMs: 1000,
        endMs: 2200,
      },
    ]);
  });
});
