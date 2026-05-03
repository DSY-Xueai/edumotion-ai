import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AutoVideoComposition } from "../src/compositions/AutoVideoComposition";
import type { RenderPackage } from "../src/lib/rendering/schema";

vi.mock("remotion", () => {
  return {
    AbsoluteFill: ({
      children,
      ...props
    }: {
      children: ReactNode;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
    Sequence: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Audio: ({ src }: { src: string }) => <audio data-src={src} />,
    Img: ({ src }: { src: string }) => <img src={src} alt="" />,
    Easing: {
      bezier: () => (value: number) => value,
    },
    useCurrentFrame: () => 12,
    useVideoConfig: () => ({ fps: 30 }),
    interpolate: () => 1,
    staticFile: (value: string) => `/static/${value}`,
  };
});

describe("AutoVideoComposition", () => {
  it("renders subject-specific scene content from a shared render package", () => {
    const spec: RenderPackage = {
      topicId: "topic-1",
      lessonVersion: 1,
      canonicalTitle: "Sets",
      approvedAt: "2026-04-26T00:00:00.000Z",
      generatedAt: "2026-04-26T00:00:00.000Z",
      totalDurationMs: 3000,
      meta: {
        topicId: "topic-1",
        subject: "math",
        aspectRatio: "9:16",
      },
      subject: "math",
      themeTokens: {
        palette: "math-clean",
        typography: "math-serif",
        accent: "#1f4b99",
      },
      audioTracks: [
        {
          id: "seg-1",
          file: "generated/topic-1/audio/topic-1-seg-1.wav",
          sourceFile: "workspace/topics/topic-1/audio/topic-1-seg-1.wav",
          startMs: 0,
          endMs: 3000,
          durationMs: 3000,
        },
      ],
      subtitleTrack: {
        topicId: "topic-1",
        subject: "math",
        cues: [
          {
            id: "cue-1",
            segmentId: "seg-1",
            text: "Start with the question.",
            startMs: 0,
            endMs: 3000,
          },
        ],
      },
      scenes: [
        {
          id: "scene-1",
          kind: "hook",
          component: "math/hook",
          durationInFrames: 90,
          payload: {
            title: "Sets",
            narration: "Start with the question.",
          },
        },
        {
          id: "scene-2",
          kind: "definition",
          component: "math/definition",
          durationInFrames: 180,
          payload: {
            title: "Sets",
            narration: "A set is a well-defined collection.",
          },
        },
      ],
      durationInFrames: 270,
    };

    const html = renderToStaticMarkup(<AutoVideoComposition {...spec} />);

    expect(html).toContain("Sets");
    expect(html).toContain("Start with the question.");
    expect(html).toContain("A set is a well-defined collection.");
    expect(html).toContain("/static/generated/topic-1/audio/topic-1-seg-1.wav");
    expect(html).toContain("cue-1");
    expect(html).toContain('data-motion-lab-subject="math"');
    expect(html).toContain('data-visual-module="concept-map"');
  });
});
