import { describe, expect, it } from "vitest";
import { renderPackageSchema } from "../../src/lib/schema";
import { buildRenderPackage } from "../../src/lib/rendering/buildRenderPackage";
import { getTopicWorkspace } from "../../src/lib/workspace/getTopicWorkspace";

describe("buildRenderPackage", () => {
  it("builds a typed render package from approved lesson content and audio artifacts", () => {
    const renderPackage = buildRenderPackage({
      approvedLesson: {
        topicId: "topic-1",
        subject: "math",
        version: 3,
        approvedAt: "2026-04-26T11:00:00.000Z",
        reviewNotes: ["approved for render"],
        approvedScript: [
          { id: "seg-hook", kind: "hook", text: "Why does order not matter?" },
          {
            id: "seg-definition",
            kind: "definition",
            text: "A set is a well-defined collection.",
          },
          { id: "seg-wrap", kind: "wrap", text: "That is the core idea." },
        ],
        approvedStoryboard: [
          {
            id: "scene-1",
            type: "hook",
            segmentIds: ["seg-hook"],
            durationSec: 5,
          },
          {
            id: "scene-2",
            type: "definition",
            segmentIds: ["seg-definition"],
            durationSec: 8,
          },
          {
            id: "scene-3",
            type: "wrap",
            segmentIds: ["seg-wrap"],
            durationSec: 4,
          },
        ],
        sourceSummary: {
          canonicalTitle: "Sets",
          definitions: ["A set is a well-defined collection."],
          formulas: [],
          principles: ["Order does not matter."],
          examples: ["{1,2,3}"],
          misconceptions: ["Repeated elements change the set."],
          prerequisites: [],
          nextConnections: ["Relations between sets."],
          visualizationHints: ["Use braces around elements."],
          sources: [
            {
              title: "Textbook",
              url: "https://example.com/textbook",
              sourceType: "official",
              publisher: "PEP",
              retrievedAt: "2026-04-26",
              quoteOrSummary: "Sets collect distinct objects.",
            },
          ],
        },
      },
      audioManifest: {
        topicId: "topic-1",
        version: 1,
        generatedAt: "2026-04-26T12:00:00.000Z",
        totalDurationMs: 4200,
        segments: [
          {
            segmentId: "seg-hook",
            kind: "hook",
            text: "Why does order not matter?",
            audioPath: "audio/seg-hook.mp3",
            durationMs: 1000,
            chunks: [{ text: "Why does order not matter?", startMs: 0, endMs: 1000 }],
          },
          {
            segmentId: "seg-definition",
            kind: "definition",
            text: "A set is a well-defined collection.",
            audioPath: "audio/seg-definition.mp3",
            durationMs: 2200,
            chunks: [
              {
                text: "A set is a well-defined collection.",
                startMs: 0,
                endMs: 2200,
              },
            ],
          },
          {
            segmentId: "seg-wrap",
            kind: "wrap",
            text: "That is the core idea.",
            audioPath: "audio/seg-wrap.mp3",
            durationMs: 1000,
            chunks: [{ text: "That is the core idea.", startMs: 0, endMs: 1000 }],
          },
        ],
        subtitleTrack: {
          cues: [
            {
              id: "seg-hook:1",
              segmentId: "seg-hook",
              text: "Why does order not matter?",
              startMs: 0,
              endMs: 1000,
            },
            {
              id: "seg-definition:1",
              segmentId: "seg-definition",
              text: "A set is a well-defined collection.",
              startMs: 1000,
              endMs: 3200,
            },
            {
              id: "seg-wrap:1",
              segmentId: "seg-wrap",
              text: "That is the core idea.",
              startMs: 3200,
              endMs: 4200,
            },
          ],
        },
      },
    });

    expect(renderPackageSchema.parse(renderPackage)).toEqual(renderPackage);
    expect(renderPackage).toMatchObject({
      meta: {
        topicId: "topic-1",
        subject: "math",
        aspectRatio: "9:16",
      },
      subject: "math",
      themeTokens: {
        palette: expect.any(String),
      },
      audioTracks: expect.arrayContaining([
        expect.objectContaining({
          id: "seg-hook",
          file: "generated/topic-1/audio/seg-hook.mp3",
          sourceFile: `${getTopicWorkspace("topic-1")}\\audio\\seg-hook.mp3`,
          startMs: 0,
          endMs: 1000,
          durationMs: 1000,
        }),
      ]),
      subtitleTrack: {
        cues: [
          expect.objectContaining({ id: "seg-hook:1" }),
          expect.objectContaining({ id: "seg-definition:1" }),
          expect.objectContaining({ id: "seg-wrap:1" }),
        ],
      },
    });
    expect(renderPackage.scenes.map((scene) => scene.component)).toEqual([
      "math/hook",
      "math/definition",
      "math/wrap",
    ]);
    expect(renderPackage.audioTracks).toHaveLength(3);
  });
});
