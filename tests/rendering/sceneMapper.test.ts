import { describe, expect, it } from "vitest";
import { mapScenesForRender } from "../../src/lib/rendering/sceneMapper";

describe("mapScenesForRender", () => {
  it("maps approved storyboard scenes into timed render scenes", () => {
    const scenes = mapScenesForRender({
      approvedScript: [
        { id: "seg-hook", kind: "hook", text: "Start with the question." },
        {
          id: "seg-definition",
          kind: "definition",
          text: "A set is a well-defined collection.",
        },
        {
          id: "seg-rule",
          kind: "rule",
          text: "Element order does not matter.",
        },
      ],
      approvedStoryboard: [
        {
          id: "scene-1",
          type: "hook",
          segmentIds: ["seg-hook"],
          durationSec: 6,
        },
        {
          id: "scene-2",
          type: "definition",
          segmentIds: ["seg-definition", "seg-rule"],
          durationSec: 10,
        },
      ],
      audioManifest: {
        topicId: "topic-1",
        version: 1,
        ttsProvider: "mock",
        generatedAt: "2026-04-26T12:00:00.000Z",
        totalDurationMs: 3500,
        segments: [
          {
            segmentId: "seg-hook",
            kind: "hook",
            text: "Start with the question.",
            audioPath: "audio/seg-hook.mp3",
            durationMs: 1000,
            chunks: [{ text: "Start with the question.", startMs: 0, endMs: 1000 }],
          },
          {
            segmentId: "seg-definition",
            kind: "definition",
            text: "A set is a well-defined collection.",
            audioPath: "audio/seg-definition.mp3",
            durationMs: 1500,
            chunks: [
              {
                text: "A set is a well-defined collection.",
                startMs: 0,
                endMs: 1500,
              },
            ],
          },
          {
            segmentId: "seg-rule",
            kind: "rule",
            text: "Element order does not matter.",
            audioPath: "audio/seg-rule.mp3",
            durationMs: 1000,
            chunks: [
              {
                text: "Element order does not matter.",
                startMs: 0,
                endMs: 1000,
              },
            ],
          },
        ],
        subtitleTrack: {
          cues: [
            {
              id: "seg-hook:1",
              segmentId: "seg-hook",
              text: "Start with the question.",
              startMs: 0,
              endMs: 1000,
            },
            {
              id: "seg-definition:1",
              segmentId: "seg-definition",
              text: "A set is a well-defined collection.",
              startMs: 1000,
              endMs: 2500,
            },
            {
              id: "seg-rule:1",
              segmentId: "seg-rule",
              text: "Element order does not matter.",
              startMs: 2500,
              endMs: 3500,
            },
          ],
        },
      },
    });

    expect(scenes).toEqual([
      {
        id: "scene-1",
        type: "hook",
        segmentIds: ["seg-hook"],
        narration: "Start with the question.",
        startMs: 0,
        endMs: 1000,
        durationMs: 1000,
        targetDurationMs: 6000,
        segments: [
          {
            id: "seg-hook",
            kind: "hook",
            text: "Start with the question.",
            audioPath: "audio/seg-hook.mp3",
            durationMs: 1000,
            startMs: 0,
            endMs: 1000,
          },
        ],
        subtitleCues: [
          {
            id: "seg-hook:1",
            segmentId: "seg-hook",
            text: "Start with the question.",
            startMs: 0,
            endMs: 1000,
          },
        ],
      },
      {
        id: "scene-2",
        type: "definition",
        segmentIds: ["seg-definition", "seg-rule"],
        narration:
          "A set is a well-defined collection. Element order does not matter.",
        startMs: 1000,
        endMs: 3500,
        durationMs: 2500,
        targetDurationMs: 10000,
        segments: [
          {
            id: "seg-definition",
            kind: "definition",
            text: "A set is a well-defined collection.",
            audioPath: "audio/seg-definition.mp3",
            durationMs: 1500,
            startMs: 1000,
            endMs: 2500,
          },
          {
            id: "seg-rule",
            kind: "rule",
            text: "Element order does not matter.",
            audioPath: "audio/seg-rule.mp3",
            durationMs: 1000,
            startMs: 2500,
            endMs: 3500,
          },
        ],
        subtitleCues: [
          {
            id: "seg-definition:1",
            segmentId: "seg-definition",
            text: "A set is a well-defined collection.",
            startMs: 1000,
            endMs: 2500,
          },
          {
            id: "seg-rule:1",
            segmentId: "seg-rule",
            text: "Element order does not matter.",
            startMs: 2500,
            endMs: 3500,
          },
        ],
      },
    ]);
  });

  it("throws when a storyboard scene references a segment without render artifacts", () => {
    expect(() =>
      mapScenesForRender({
        approvedScript: [{ id: "seg-hook", kind: "hook", text: "Start here." }],
        approvedStoryboard: [
          {
            id: "scene-1",
            type: "hook",
            segmentIds: ["seg-hook", "seg-missing"],
            durationSec: 5,
          },
        ],
        audioManifest: {
          topicId: "topic-1",
          version: 1,
          ttsProvider: "mock",
          generatedAt: "2026-04-26T12:00:00.000Z",
          totalDurationMs: 800,
          segments: [
            {
              segmentId: "seg-hook",
              kind: "hook",
              text: "Start here.",
              audioPath: "audio/seg-hook.mp3",
              durationMs: 800,
              chunks: [{ text: "Start here.", startMs: 0, endMs: 800 }],
            },
          ],
          subtitleTrack: {
            cues: [
              {
                id: "seg-hook:1",
                segmentId: "seg-hook",
                text: "Start here.",
                startMs: 0,
                endMs: 800,
              },
            ],
          },
        },
      }),
    ).toThrowError('Missing render segment data for "seg-missing".');
  });
});
