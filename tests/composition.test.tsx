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
    Sequence: ({
      children,
      premountFor,
    }: {
      children: ReactNode;
      premountFor?: number;
    }) => <div data-premount-for={premountFor}>{children}</div>,
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

  it("renders refraction scenes with an optics-specific visual instead of the circular motion diagram", () => {
    const spec: RenderPackage = {
      topicId: "physics-b2-ch7-topic-001",
      lessonVersion: 1,
      canonicalTitle: "光的折射原理",
      approvedAt: "2026-05-04T00:00:00.000Z",
      generatedAt: "2026-05-04T00:00:00.000Z",
      totalDurationMs: 3000,
      meta: {
        topicId: "physics-b2-ch7-topic-001",
        subject: "physics",
        aspectRatio: "9:16",
      },
      subject: "physics",
      themeTokens: {
        palette: "physics-lab",
        typography: "physics-sans",
        accent: "#1a7f64",
      },
      audioTracks: [
        {
          id: "seg-1",
          file: "generated/physics-b2-ch7-topic-001/audio/seg-1.wav",
          sourceFile: "workspace/topics/physics-b2-ch7-topic-001/audio/seg-1.wav",
          startMs: 0,
          endMs: 3000,
          durationMs: 3000,
        },
      ],
      subtitleTrack: {
        topicId: "physics-b2-ch7-topic-001",
        subject: "physics",
        cues: [
          {
            id: "cue-1",
            segmentId: "seg-1",
            text: "光从空气斜射入水中会发生折射。",
            startMs: 0,
            endMs: 3000,
          },
        ],
      },
      scenes: [
        {
          id: "scene-1",
          kind: "graph",
          component: "physics/graph",
          durationInFrames: 90,
          payload: {
            title: "光的折射原理",
            narration: "画界面、法线、入射光线和折射光线。",
            lawCard: "n1 sin i = n2 sin r",
            processSteps: ["先画界面", "再画法线", "最后画入射光线和折射光线"],
            observationNote: "用空气和水的分界面、法线、入射光线、折射光线构成主画面。",
          },
        },
      ],
      durationInFrames: 90,
    };

    const html = renderToStaticMarkup(<AutoVideoComposition {...spec} />);

    expect(html).toContain('data-visual-module="optics-ray"');
    expect(html).toContain("光路折射");
    expect(html).toContain("入射光线");
    expect(html).toContain("折射光线");
  });

  it("renders english vocabulary scenes with the centered word visual", () => {
    const spec: RenderPackage = {
      topicId: "english-word-00042",
      lessonVersion: 1,
      canonicalTitle: "morose",
      approvedAt: "2026-05-07T00:00:00.000Z",
      generatedAt: "2026-05-07T00:00:00.000Z",
      totalDurationMs: 3000,
      meta: {
        topicId: "english-word-00042",
        subject: "english",
        aspectRatio: "9:16",
      },
      subject: "english",
      themeTokens: {
        palette: "english-vocab-card",
        typography: "english-serif",
        accent: "#ff8d7a",
      },
      audioTracks: [],
      subtitleTrack: {
        topicId: "english-word-00042",
        subject: "english",
        cues: [
          {
            id: "cue-english-1",
            segmentId: "seg-english-1",
            text: "一秒钟记一个单词。",
            startMs: 0,
            endMs: 1200,
          },
        ],
      },
      scenes: [
        {
          id: "scene-english",
          kind: "hook",
          component: "english/hook",
          durationInFrames: 90,
          payload: {
            title: "morose",
            narration: "先看单词，再看音标、词性和记忆口诀。",
            word: "morose",
            phonetic: "/məˈrəʊs/",
            partOfSpeech: "adj.",
            meaning: "郁闷的",
            mnemonic: "巧记：mo + rose = morose",
            wordChunks: ["mo", "rose"],
          },
        },
      ],
      durationInFrames: 90,
    };

    const html = renderToStaticMarkup(<AutoVideoComposition {...spec} />);

    expect(html).toContain('data-motion-lab-subject="english"');
    expect(html).toContain('data-visual-module="vocabulary-card"');
    expect(html).toContain('data-english-template="dopamine-vocab"');
    expect(html).toContain('data-english-background="dopamine-study"');
    expect(html).toContain('data-english-accent="highlighter-swish"');
    expect(html).toContain('data-english-card-layer="mint-shadow"');
    expect(html).toContain('data-english-card-layer="butter-shadow"');
    expect(html).not.toContain('data-english-template="chalkboard-vocab"');
    expect(html).not.toContain('data-english-icon="lightbulb"');
    expect(html).not.toContain('data-english-icon="graduate-star"');
    expect(html).not.toContain("ENGLISH VOCAB");
    expect(html).not.toContain("Daily Word");
    expect(html).toContain("morose");
    expect(html).toContain("/məˈrəʊs/");
    expect(html).toContain("郁闷的");
    expect(html).toContain("cue-english-1");
    expect(html).toContain("一秒钟记一个单词。");
    expect(html).not.toContain("adj.");
    expect(html).not.toContain("巧记");
  });

  it("does not premount audio sequences because premounting causes overlapping narration", () => {
    const spec: RenderPackage = {
      topicId: "topic-audio",
      lessonVersion: 1,
      canonicalTitle: "Audio Timing",
      approvedAt: "2026-05-04T00:00:00.000Z",
      generatedAt: "2026-05-04T00:00:00.000Z",
      totalDurationMs: 2000,
      meta: {
        topicId: "topic-audio",
        subject: "physics",
        aspectRatio: "9:16",
      },
      subject: "physics",
      themeTokens: {
        palette: "physics-lab",
        typography: "physics-sans",
        accent: "#1a7f64",
      },
      audioTracks: [
        {
          id: "seg-1",
          file: "generated/topic-audio/audio/seg-1.wav",
          sourceFile: "workspace/topic-audio/audio/seg-1.wav",
          startMs: 0,
          endMs: 1000,
          durationMs: 1000,
        },
        {
          id: "seg-2",
          file: "generated/topic-audio/audio/seg-2.wav",
          sourceFile: "workspace/topic-audio/audio/seg-2.wav",
          startMs: 1000,
          endMs: 2000,
          durationMs: 1000,
        },
      ],
      subtitleTrack: {
        topicId: "topic-audio",
        subject: "physics",
        cues: [],
      },
      scenes: [
        {
          id: "scene-1",
          kind: "hook",
          component: "physics/hook",
          durationInFrames: 60,
          payload: {
            title: "Audio Timing",
            narration: "第一段。",
          },
        },
      ],
      durationInFrames: 60,
    };

    const html = renderToStaticMarkup(<AutoVideoComposition {...spec} />);

    expect(html).toContain(
      '<div><audio data-src="/static/generated/topic-audio/audio/seg-1.wav"></audio></div>',
    );
    expect(html).toContain(
      '<div><audio data-src="/static/generated/topic-audio/audio/seg-2.wav"></audio></div>',
    );
    expect(html).not.toContain(
      '<div data-premount-for="30"><audio data-src="/static/generated/topic-audio/audio/seg-1.wav"></audio></div>',
    );
  });

  it("renders object variable cards as readable label and meaning text", () => {
    const spec: RenderPackage = {
      topicId: "physics-b2-ch8-topic-001",
      lessonVersion: 1,
      canonicalTitle: "电磁感应",
      approvedAt: "2026-05-04T00:00:00.000Z",
      generatedAt: "2026-05-04T00:00:00.000Z",
      totalDurationMs: 3000,
      meta: {
        topicId: "physics-b2-ch8-topic-001",
        subject: "physics",
        aspectRatio: "9:16",
      },
      subject: "physics",
      themeTokens: {
        palette: "physics-lab",
        typography: "physics-sans",
        accent: "#1a7f64",
      },
      audioTracks: [
        {
          id: "seg-1",
          file: "generated/physics-b2-ch8-topic-001/audio/seg-1.wav",
          sourceFile: "workspace/topics/physics-b2-ch8-topic-001/audio/seg-1.wav",
          startMs: 0,
          endMs: 3000,
          durationMs: 3000,
        },
      ],
      subtitleTrack: {
        topicId: "physics-b2-ch8-topic-001",
        subject: "physics",
        cues: [],
      },
      scenes: [
        {
          id: "scene-1",
          kind: "rule",
          component: "physics/rule",
          durationInFrames: 90,
          payload: {
            title: "电磁感应",
            narration: "磁通量变化越快，感应效果越明显。",
            lawCard: "E = -N ΔΦ/Δt",
            variableCards: [
              { label: "E", meaning: "感应电动势" },
              { label: "N", meaning: "线圈匝数" },
            ],
          },
        },
      ],
      durationInFrames: 90,
    };

    const html = renderToStaticMarkup(<AutoVideoComposition {...spec} />);

    expect(html).toContain("E：感应电动势");
    expect(html).toContain("N：线圈匝数");
    expect(html).not.toContain("[object Object]");
  });
});
