# Remotion Auto Video V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first version of a Remotion-based CLI that converts `txt` / `md` / `docx` plus optional images into standardized JSON and renders a `1080x1920` explainer video.

**Architecture:** Create a standalone Remotion TypeScript app with a strict pipeline split: `ingest -> parser -> normalizer -> renderer -> CLI`. The parser and normalizer own source-format handling, while Remotion consumes only normalized JSON scenes and assets.

**Tech Stack:** Node.js, TypeScript, React, Remotion, Zod, Vitest, Mammoth, fs-extra

---

## File Structure

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `remotion.config.ts`
- Create: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `src/Root.tsx`
- Create: `src/compositions/AutoVideoComposition.tsx`
- Create: `src/compositions/scenes/CoverScene.tsx`
- Create: `src/compositions/scenes/ImageTextScene.tsx`
- Create: `src/compositions/scenes/InfoScene.tsx`
- Create: `src/compositions/scenes/EndingScene.tsx`
- Create: `src/lib/schema.ts`
- Create: `src/lib/ingest/readSourceFile.ts`
- Create: `src/lib/parser/parseArticle.ts`
- Create: `src/lib/parser/extractTitle.ts`
- Create: `src/lib/normalizer/buildVideoSpec.ts`
- Create: `src/lib/normalizer/sceneTiming.ts`
- Create: `src/lib/pipeline/runPipeline.ts`
- Create: `src/cli/render.ts`
- Create: `tests/fixtures/article.txt`
- Create: `tests/fixtures/article.md`
- Create: `tests/fixtures/article.docx`
- Create: `tests/schema.test.ts`
- Create: `tests/parseArticle.test.ts`
- Create: `tests/buildVideoSpec.test.ts`
- Create: `tests/runPipeline.test.ts`
- Create: `README.md`
- Modify: `Course.md`

### Task 1: Scaffold the project and toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `remotion.config.ts`
- Create: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `src/Root.tsx`

- [ ] **Step 1: Write the failing bootstrap test**

```ts
// tests/schema.test.ts
import { describe, expect, it } from "vitest";
import { videoSpecSchema } from "../src/lib/schema";

describe("videoSpecSchema", () => {
  it("accepts a minimal cover-only video spec", () => {
    const result = videoSpecSchema.safeParse({
      meta: {
        title: "Test Title",
        aspectRatio: "9:16",
        theme: "editorial-bold",
        sourceFile: "tests/fixtures/article.txt",
      },
      assets: {
        images: [],
      },
      scenes: [
        {
          id: "scene-1",
          type: "cover",
          title: "Test Title",
          subtitle: "Intro",
          duration: 90,
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/schema.test.ts`

Expected: FAIL with `Cannot find module '../src/lib/schema'`

- [ ] **Step 3: Create the project manifest and basic config**

```json
{
  "name": "remotion-ai",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "remotion studio",
    "test": "vitest run",
    "render": "tsx src/cli/render.ts",
    "lint:types": "tsc --noEmit"
  },
  "dependencies": {
    "@remotion/cli": "^4.0.340",
    "@remotion/player": "^4.0.340",
    "fs-extra": "^11.3.0",
    "mammoth": "^1.9.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "remotion": "^4.0.340",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^24.0.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "tsx": "^4.19.4",
    "typescript": "^5.8.3",
    "vitest": "^3.1.2"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "tests", "remotion.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Add minimal app entry files**

```ts
// src/index.ts
import { registerRoot } from "remotion";
import { Root } from "./Root";

registerRoot(Root);
```

```tsx
// src/Root.tsx
import { Composition } from "remotion";
import { AutoVideoComposition } from "./compositions/AutoVideoComposition";
import type { VideoSpec } from "./lib/schema";

const defaultProps: VideoSpec = {
  meta: {
    title: "Demo Video",
    aspectRatio: "9:16",
    theme: "editorial-bold",
    sourceFile: "demo.txt",
  },
  assets: {
    images: [],
  },
  scenes: [
    {
      id: "scene-1",
      type: "cover",
      title: "Demo Video",
      subtitle: "Waiting for pipeline data",
      duration: 90,
    },
  ],
};

export const Root = () => {
  return (
    <Composition
      id="AutoVideo"
      component={AutoVideoComposition}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={90}
      defaultProps={defaultProps}
    />
  );
};
```

- [ ] **Step 5: Run tests and typecheck**

Run:
- `npm install`
- `npm test -- tests/schema.test.ts`
- `npm run lint:types`

Expected:
- install succeeds
- schema test still fails until Task 2
- typecheck passes for bootstrap files

- [ ] **Step 6: Commit scaffold**

```bash
git add package.json tsconfig.json remotion.config.ts vitest.config.ts src/index.ts src/Root.tsx tests/schema.test.ts
git commit -m "chore: scaffold remotion auto video project"
```

### Task 2: Define the standard JSON schema

**Files:**
- Create: `src/lib/schema.ts`
- Modify: `tests/schema.test.ts`

- [ ] **Step 1: Expand schema tests**

```ts
// tests/schema.test.ts
import { describe, expect, it } from "vitest";
import { videoSpecSchema } from "../src/lib/schema";

describe("videoSpecSchema", () => {
  it("accepts a minimal cover-only video spec", () => {
    const result = videoSpecSchema.safeParse({
      meta: {
        title: "Test Title",
        aspectRatio: "9:16",
        theme: "editorial-bold",
        sourceFile: "tests/fixtures/article.txt",
      },
      assets: {
        images: [],
      },
      scenes: [
        {
          id: "scene-1",
          type: "cover",
          title: "Test Title",
          subtitle: "Intro",
          duration: 90,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects scenes with non-positive duration", () => {
    const result = videoSpecSchema.safeParse({
      meta: {
        title: "Bad Title",
        aspectRatio: "9:16",
        theme: "editorial-bold",
        sourceFile: "tests/fixtures/article.txt",
      },
      assets: {
        images: [],
      },
      scenes: [
        {
          id: "scene-1",
          type: "cover",
          title: "Bad Title",
          subtitle: "Intro",
          duration: 0,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify new case fails**

Run: `npm test -- tests/schema.test.ts`

Expected: FAIL because `videoSpecSchema` is still undefined

- [ ] **Step 3: Implement the schema**

```ts
// src/lib/schema.ts
import { z } from "zod";

const aspectRatioSchema = z.literal("9:16");

const imageAssetSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  usage: z.enum(["cover", "body"]),
});

const coverSceneSchema = z.object({
  id: z.string().min(1),
  type: z.literal("cover"),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  duration: z.number().int().positive(),
});

const imageTextSceneSchema = z.object({
  id: z.string().min(1),
  type: z.literal("image-text"),
  heading: z.string().min(1),
  text: z.string().min(1),
  keywords: z.array(z.string().min(1)).default([]),
  imageId: z.string().min(1).optional(),
  duration: z.number().int().positive(),
});

const infoSceneSchema = z.object({
  id: z.string().min(1),
  type: z.literal("info"),
  heading: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
  duration: z.number().int().positive(),
});

const endingSceneSchema = z.object({
  id: z.string().min(1),
  type: z.literal("ending"),
  heading: z.string().min(1),
  text: z.string().min(1),
  duration: z.number().int().positive(),
});

export const sceneSchema = z.discriminatedUnion("type", [
  coverSceneSchema,
  imageTextSceneSchema,
  infoSceneSchema,
  endingSceneSchema,
]);

export const videoSpecSchema = z.object({
  meta: z.object({
    title: z.string().min(1),
    aspectRatio: aspectRatioSchema,
    theme: z.string().min(1),
    sourceFile: z.string().min(1),
  }),
  assets: z.object({
    images: z.array(imageAssetSchema),
  }),
  scenes: z.array(sceneSchema).min(1),
});

export type VideoSpec = z.infer<typeof videoSpecSchema>;
export type Scene = z.infer<typeof sceneSchema>;
```

- [ ] **Step 4: Run tests to verify schema passes**

Run:
- `npm test -- tests/schema.test.ts`
- `npm run lint:types`

Expected:
- both schema tests PASS
- typecheck PASS

- [ ] **Step 5: Commit schema**

```bash
git add src/lib/schema.ts tests/schema.test.ts
git commit -m "feat: define normalized video spec schema"
```

### Task 3: Implement source ingestion and article parsing

**Files:**
- Create: `src/lib/ingest/readSourceFile.ts`
- Create: `src/lib/parser/extractTitle.ts`
- Create: `src/lib/parser/parseArticle.ts`
- Create: `tests/fixtures/article.txt`
- Create: `tests/fixtures/article.md`
- Create: `tests/fixtures/article.docx`
- Create: `tests/parseArticle.test.ts`

- [ ] **Step 1: Write parser tests**

```ts
// tests/parseArticle.test.ts
import { describe, expect, it } from "vitest";
import { readSourceFile } from "../src/lib/ingest/readSourceFile";
import { parseArticle } from "../src/lib/parser/parseArticle";

describe("parseArticle", () => {
  it("reads txt and derives title plus paragraphs", async () => {
    const content = await readSourceFile("tests/fixtures/article.txt");
    const parsed = parseArticle({
      sourceFile: "tests/fixtures/article.txt",
      content,
    });

    expect(parsed.title).toBe("AI 让视频制作更高效");
    expect(parsed.paragraphs.length).toBeGreaterThan(1);
  });

  it("strips markdown heading markers", async () => {
    const content = await readSourceFile("tests/fixtures/article.md");
    const parsed = parseArticle({
      sourceFile: "tests/fixtures/article.md",
      content,
    });

    expect(parsed.title).toBe("AI 让视频制作更高效");
    expect(parsed.paragraphs[0]).not.toMatch(/^#/);
  });
});
```

- [ ] **Step 2: Run parser tests to verify they fail**

Run: `npm test -- tests/parseArticle.test.ts`

Expected: FAIL with `Cannot find module '../src/lib/ingest/readSourceFile'`

- [ ] **Step 3: Add fixtures and implement ingestion**

```ts
// src/lib/ingest/readSourceFile.ts
import { readFile } from "node:fs/promises";
import mammoth from "mammoth";

export const readSourceFile = async (filePath: string) => {
  if (filePath.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  return readFile(filePath, "utf8");
};
```

```ts
// src/lib/parser/extractTitle.ts
export const extractTitle = (blocks: string[]) => {
  return blocks[0]?.replace(/^#+\s*/, "").trim() || "Untitled Video";
};
```

```ts
// src/lib/parser/parseArticle.ts
import { extractTitle } from "./extractTitle";

export type ParsedArticle = {
  title: string;
  paragraphs: string[];
};

export const parseArticle = ({
  sourceFile,
  content,
}: {
  sourceFile: string;
  content: string;
}): ParsedArticle => {
  const blocks = content
    .split(/\r?\n\r?\n/)
    .map((block) => block.replace(/\r?\n/g, " ").trim())
    .filter(Boolean);

  const title = extractTitle(blocks);
  const paragraphs =
    sourceFile.endsWith(".md") && blocks[0]?.startsWith("#")
      ? blocks.slice(1)
      : blocks.slice(1).length > 0
        ? blocks.slice(1)
        : blocks;

  return { title, paragraphs };
};
```

- [ ] **Step 4: Run parser tests**

Run:
- `npm test -- tests/parseArticle.test.ts`
- `npm run lint:types`

Expected:
- parser tests PASS
- typecheck PASS

- [ ] **Step 5: Commit parser**

```bash
git add src/lib/ingest/readSourceFile.ts src/lib/parser/extractTitle.ts src/lib/parser/parseArticle.ts tests/fixtures/article.txt tests/fixtures/article.md tests/fixtures/article.docx tests/parseArticle.test.ts
git commit -m "feat: ingest and parse article sources"
```

### Task 4: Build the normalizer and scene generation rules

**Files:**
- Create: `src/lib/normalizer/sceneTiming.ts`
- Create: `src/lib/normalizer/buildVideoSpec.ts`
- Create: `tests/buildVideoSpec.test.ts`

- [ ] **Step 1: Write failing normalization tests**

```ts
// tests/buildVideoSpec.test.ts
import { describe, expect, it } from "vitest";
import { buildVideoSpec } from "../src/lib/normalizer/buildVideoSpec";

describe("buildVideoSpec", () => {
  it("creates cover, body, and ending scenes", () => {
    const spec = buildVideoSpec({
      sourceFile: "tests/fixtures/article.txt",
      title: "AI 让视频制作更高效",
      paragraphs: [
        "第一段内容主要说明自动化视频生成的价值。",
        "第二段内容说明配图不是强制要求，没有图时也能回退为信息卡。",
      ],
      images: [],
    });

    expect(spec.scenes[0].type).toBe("cover");
    expect(spec.scenes.at(-1)?.type).toBe("ending");
    expect(spec.scenes.length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to info scenes when there are no images", () => {
    const spec = buildVideoSpec({
      sourceFile: "tests/fixtures/article.txt",
      title: "AI 让视频制作更高效",
      paragraphs: ["没有配图时应该生成信息卡。"],
      images: [],
    });

    expect(spec.scenes.some((scene) => scene.type === "info")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/buildVideoSpec.test.ts`

Expected: FAIL with `Cannot find module '../src/lib/normalizer/buildVideoSpec'`

- [ ] **Step 3: Implement scene timing helper and normalizer**

```ts
// src/lib/normalizer/sceneTiming.ts
export const estimateSceneDuration = (text: string) => {
  const base = 90;
  const bonus = Math.min(90, Math.ceil(text.length / 30) * 15);
  return base + bonus;
};
```

```ts
// src/lib/normalizer/buildVideoSpec.ts
import { videoSpecSchema, type VideoSpec } from "../schema";
import { estimateSceneDuration } from "./sceneTiming";

export const buildVideoSpec = ({
  sourceFile,
  title,
  paragraphs,
  images,
}: {
  sourceFile: string;
  title: string;
  paragraphs: string[];
  images: Array<{ id: string; path: string; usage: "cover" | "body" }>;
}): VideoSpec => {
  const coverImage = images.find((image) => image.usage === "cover");
  const bodyImages = images.filter((image) => image.usage === "body");

  const bodyScenes = paragraphs.map((paragraph, index) => {
    const bodyImage = bodyImages[index];
    if (bodyImage) {
      return {
        id: `scene-${index + 2}`,
        type: "image-text" as const,
        heading: `重点 ${index + 1}`,
        text: paragraph.slice(0, 140),
        keywords: paragraph.split(/[，。；、\s]/).filter(Boolean).slice(0, 3),
        imageId: bodyImage.id,
        duration: estimateSceneDuration(paragraph),
      };
    }

    return {
      id: `scene-${index + 2}`,
      type: "info" as const,
      heading: `重点 ${index + 1}`,
      bullets: [paragraph.slice(0, 36), paragraph.slice(36, 72)].filter(Boolean),
      duration: estimateSceneDuration(paragraph),
    };
  });

  const spec = {
    meta: {
      title,
      aspectRatio: "9:16" as const,
      theme: "editorial-bold",
      sourceFile,
    },
    assets: {
      images: coverImage ? [coverImage, ...bodyImages] : bodyImages,
    },
    scenes: [
      {
        id: "scene-1",
        type: "cover" as const,
        title,
        subtitle: paragraphs[0]?.slice(0, 48) || "自动生成图文解说视频",
        duration: 90,
      },
      ...bodyScenes,
      {
        id: `scene-${bodyScenes.length + 2}`,
        type: "ending" as const,
        heading: "总结",
        text: paragraphs.at(-1)?.slice(0, 60) || "视频生成完成",
        duration: 75,
      },
    ],
  };

  return videoSpecSchema.parse(spec);
};
```

- [ ] **Step 4: Run normalization tests**

Run:
- `npm test -- tests/buildVideoSpec.test.ts`
- `npm run lint:types`

Expected:
- normalization tests PASS
- typecheck PASS

- [ ] **Step 5: Commit normalizer**

```bash
git add src/lib/normalizer/sceneTiming.ts src/lib/normalizer/buildVideoSpec.ts tests/buildVideoSpec.test.ts
git commit -m "feat: generate normalized video spec scenes"
```

### Task 5: Implement Remotion scene components and composition

**Files:**
- Create: `src/compositions/AutoVideoComposition.tsx`
- Create: `src/compositions/scenes/CoverScene.tsx`
- Create: `src/compositions/scenes/ImageTextScene.tsx`
- Create: `src/compositions/scenes/InfoScene.tsx`
- Create: `src/compositions/scenes/EndingScene.tsx`
- Modify: `src/Root.tsx`

- [ ] **Step 1: Write a failing composition smoke test**

```ts
// tests/runPipeline.test.ts
import { describe, expect, it } from "vitest";
import { buildVideoSpec } from "../src/lib/normalizer/buildVideoSpec";

describe("composition smoke test", () => {
  it("builds a spec that can be passed into the composition", () => {
    const spec = buildVideoSpec({
      sourceFile: "tests/fixtures/article.txt",
      title: "AI 让视频制作更高效",
      paragraphs: ["这是一段正文。", "这是第二段正文。"],
      images: [],
    });

    expect(spec.scenes.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement the composition and scene components**

```tsx
// src/compositions/AutoVideoComposition.tsx
import { AbsoluteFill, Img, Sequence, useCurrentFrame, interpolate } from "remotion";
import type { VideoSpec } from "../lib/schema";

export const AutoVideoComposition = ({ meta, assets, scenes }: VideoSpec) => {
  let start = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#f5efe6", color: "#111111", fontFamily: "Georgia, serif" }}>
      {scenes.map((scene) => {
        const from = start;
        start += scene.duration;

        return (
          <Sequence key={scene.id} from={from} durationInFrames={scene.duration}>
            {scene.type === "cover" ? <div>{scene.title}</div> : null}
            {scene.type === "image-text" ? (
              <div>
                <h1>{scene.heading}</h1>
                <p>{scene.text}</p>
                {scene.imageId ? (
                  <Img src={assets.images.find((image) => image.id === scene.imageId)?.path ?? ""} />
                ) : null}
              </div>
            ) : null}
            {scene.type === "info" ? (
              <div>
                <h1>{scene.heading}</h1>
                {scene.bullets.map((bullet) => (
                  <p key={bullet}>{bullet}</p>
                ))}
              </div>
            ) : null}
            {scene.type === "ending" ? (
              <div>
                <h1>{scene.heading}</h1>
                <p>{scene.text}</p>
              </div>
            ) : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Update root duration logic**

```tsx
// src/Root.tsx
import { Composition } from "remotion";
import { AutoVideoComposition } from "./compositions/AutoVideoComposition";
import type { VideoSpec } from "./lib/schema";

const defaultProps: VideoSpec = {
  meta: {
    title: "Demo Video",
    aspectRatio: "9:16",
    theme: "editorial-bold",
    sourceFile: "demo.txt",
  },
  assets: { images: [] },
  scenes: [
    { id: "scene-1", type: "cover", title: "Demo Video", subtitle: "Waiting for pipeline data", duration: 90 },
    { id: "scene-2", type: "ending", heading: "总结", text: "准备开始渲染", duration: 75 },
  ],
};

const calculateDuration = (props: VideoSpec) =>
  props.scenes.reduce((total, scene) => total + scene.duration, 0);

export const Root = () => {
  return (
    <Composition
      id="AutoVideo"
      component={AutoVideoComposition}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={calculateDuration(defaultProps)}
      defaultProps={defaultProps}
    />
  );
};
```

- [ ] **Step 4: Run tests and studio smoke check**

Run:
- `npm test -- tests/runPipeline.test.ts`
- `npm run lint:types`
- `npm run dev`

Expected:
- smoke test PASS
- typecheck PASS
- Remotion Studio opens with a basic vertical composition

- [ ] **Step 5: Commit renderer**

```bash
git add src/compositions src/Root.tsx tests/runPipeline.test.ts
git commit -m "feat: add vertical explainer video composition"
```

### Task 6: Implement the CLI pipeline and rendering entry

**Files:**
- Create: `src/lib/pipeline/runPipeline.ts`
- Create: `src/cli/render.ts`
- Modify: `tests/runPipeline.test.ts`
- Modify: `README.md`
- Modify: `Course.md`

- [ ] **Step 1: Expand integration tests**

```ts
// tests/runPipeline.test.ts
import { describe, expect, it } from "vitest";
import { runPipeline } from "../src/lib/pipeline/runPipeline";

describe("runPipeline", () => {
  it("returns a validated video spec for a txt article", async () => {
    const result = await runPipeline({
      sourceFile: "tests/fixtures/article.txt",
      imagePaths: [],
    });

    expect(result.meta.title).toBe("AI 让视频制作更高效");
    expect(result.scenes.length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/runPipeline.test.ts`

Expected: FAIL with `Cannot find module '../src/lib/pipeline/runPipeline'`

- [ ] **Step 3: Implement the pipeline function**

```ts
// src/lib/pipeline/runPipeline.ts
import path from "node:path";
import { readSourceFile } from "../ingest/readSourceFile";
import { parseArticle } from "../parser/parseArticle";
import { buildVideoSpec } from "../normalizer/buildVideoSpec";

export const runPipeline = async ({
  sourceFile,
  imagePaths,
}: {
  sourceFile: string;
  imagePaths: string[];
}) => {
  const content = await readSourceFile(sourceFile);
  const parsed = parseArticle({ sourceFile, content });

  const images = imagePaths.map((imagePath, index) => ({
    id: `img-${index + 1}`,
    path: path.resolve(imagePath),
    usage: index === 0 ? ("cover" as const) : ("body" as const),
  }));

  return buildVideoSpec({
    sourceFile,
    title: parsed.title,
    paragraphs: parsed.paragraphs,
    images,
  });
};
```

- [ ] **Step 4: Implement the CLI**

```ts
// src/cli/render.ts
import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { runPipeline } from "../lib/pipeline/runPipeline";

const args = process.argv.slice(2);
const sourceFile = args[0];
const outFile = args[1] ?? "out/video.mp4";
const imagePaths = args.slice(2);

if (!sourceFile) {
  throw new Error("Usage: npm run render -- <sourceFile> [outFile] [image1 image2 ...]");
}

const spec = await runPipeline({ sourceFile, imagePaths });
await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile("out/video-spec.json", JSON.stringify(spec, null, 2), "utf8");

const bundleLocation = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  webpackOverride: (config) => config,
});

const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: "AutoVideo",
  inputProps: spec,
});

await renderMedia({
  serveUrl: bundleLocation,
  composition,
  codec: "h264",
  outputLocation: outFile,
  inputProps: spec,
});
```

- [ ] **Step 5: Run integration verification**

Run:
- `npm test -- tests/runPipeline.test.ts`
- `npm run lint:types`
- `npm run render -- tests/fixtures/article.txt out/demo.mp4`

Expected:
- pipeline test PASS
- typecheck PASS
- `out/video-spec.json` and `out/demo.mp4` are created

- [ ] **Step 6: Commit pipeline**

```bash
git add src/lib/pipeline/runPipeline.ts src/cli/render.ts tests/runPipeline.test.ts README.md Course.md
git commit -m "feat: add end-to-end render pipeline"
```

### Task 7: Final docs and manual verification

**Files:**
- Modify: `README.md`
- Modify: `Course.md`

- [ ] **Step 1: Document usage**

```md
## Usage

### Render from text

```bash
npm run render -- tests/fixtures/article.txt out/article.mp4
```

### Render with optional images

```bash
npm run render -- tests/fixtures/article.txt out/article.mp4 assets/cover.jpg assets/body-1.jpg
```
```

- [ ] **Step 2: Run full verification**

Run:
- `npm test`
- `npm run lint:types`
- `npm run render -- tests/fixtures/article.md out/article-from-md.mp4`

Expected:
- all tests PASS
- typecheck PASS
- sample markdown render succeeds

- [ ] **Step 3: Commit final docs**

```bash
git add README.md Course.md
git commit -m "docs: document auto video v1 workflow"
```

## Spec Coverage Check

- Input formats `txt` / `md` / `docx`: covered by Task 3 and Task 6
- Standard JSON middle layer: covered by Task 2 and Task 4
- Optional images with no-image fallback: covered by Task 4 and Task 5
- Vertical `1080x1920` Remotion output: covered by Task 5 and Task 6
- Error boundaries and validation: covered by Task 2, Task 3, and Task 6
- Course synchronization and usage docs: covered by Task 6 and Task 7

## Self-Review

- Placeholder scan: no `TODO`, `TBD`, or deferred implementation markers remain in tasks
- Type consistency: `VideoSpec`, `runPipeline`, `buildVideoSpec`, and scene `type` values are consistent across tasks
- Scope check: plan is limited to first-version parsing, normalization, rendering, and docs; TTS, music, AI imagery, and auto-search remain out of scope
