# High School STEM Course Video System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a topic-driven production system that uses shared production contracts plus independent math, physics, and chemistry visual systems to generate reviewed, voiced, subtitled, and rendered textbook knowledge-point videos.

**Architecture:** First freeze the shared production kernel: curriculum, workspace, research, draft, review, audio, subtitle, rendering contracts, provider wiring, and pipeline orchestration. Then implement three independent subject adapters and Remotion visual systems in parallel under `src/subjects/`, and finally integrate them back into the unified CLI, batch, resume, doctor, and end-to-end production flow.

**Tech Stack:** TypeScript, Node.js, Remotion, React, Zod, Vitest, tsx, filesystem-backed topic workspaces, OpenAI-backed research/draft/TTS providers, ffmpeg-compatible audio artifacts

---

## File Structure

### Shared kernel files

- Create: `src/lib/research/schema.ts`
- Create: `src/lib/research/researchProvider.ts`
- Create: `src/lib/research/saveResearch.ts`
- Create: `src/lib/research/readResearch.ts`
- Create: `src/lib/research/runResearch.ts`
- Create: `src/lib/draft/schema.ts`
- Create: `src/lib/draft/draftProvider.ts`
- Create: `src/lib/draft/saveDraft.ts`
- Create: `src/lib/draft/readDraft.ts`
- Create: `src/lib/draft/generateDraft.ts`
- Create: `src/lib/review/schema.ts`
- Create: `src/lib/review/saveApprovedLesson.ts`
- Create: `src/lib/review/readApprovedLesson.ts`
- Create: `src/lib/review/approveDraft.ts`
- Create: `src/lib/audio/schema.ts`
- Create: `src/lib/audio/ttsProvider.ts`
- Create: `src/lib/audio/generateSegmentAudio.ts`
- Create: `src/lib/audio/buildSubtitleTrack.ts`
- Create: `src/lib/rendering/schema.ts`
- Create: `src/lib/rendering/subjectAdapter.ts`
- Create: `src/lib/rendering/buildRenderPackage.ts`
- Create: `src/lib/providers/config.ts`
- Create: `src/lib/providers/createResearchProvider.ts`
- Create: `src/lib/providers/createDraftProvider.ts`
- Create: `src/lib/providers/createTtsProvider.ts`
- Create: `src/lib/pipeline/runTopicToDraft.ts`
- Create: `src/lib/pipeline/runApprovedToRender.ts`
- Create: `src/lib/pipeline/resumeTopic.ts`
- Create: `src/lib/pipeline/runBatch.ts`
- Create: `src/lib/pipeline/getSubjectAdapter.ts`

### CLI files

- Modify: `package.json`
- Create: `src/cli/commands/research.ts`
- Create: `src/cli/commands/draft.ts`
- Create: `src/cli/commands/review.ts`
- Create: `src/cli/commands/produce.ts`
- Create: `src/cli/commands/pipeline.ts`
- Create: `src/cli/commands/batch.ts`
- Create: `src/cli/commands/doctor.ts`
- Modify: `src/cli/index.ts`

### Subject visual systems

- Create: `src/subjects/math/schema.ts`
- Create: `src/subjects/math/theme.ts`
- Create: `src/subjects/math/sceneMapper.ts`
- Create: `src/subjects/math/scenes/*`
- Create: `src/subjects/physics/schema.ts`
- Create: `src/subjects/physics/theme.ts`
- Create: `src/subjects/physics/sceneMapper.ts`
- Create: `src/subjects/physics/scenes/*`
- Create: `src/subjects/chemistry/schema.ts`
- Create: `src/subjects/chemistry/theme.ts`
- Create: `src/subjects/chemistry/sceneMapper.ts`
- Create: `src/subjects/chemistry/scenes/*`
- Modify: `src/compositions/AutoVideoComposition.tsx`
- Modify: `src/Root.tsx`
- Modify: `src/lib/schema.ts`

### Curriculum and sample data

- Create: `curriculum/pep-2019/math/index.json`
- Create: `curriculum/pep-2019/physics/index.json`
- Create: `curriculum/pep-2019/chemistry/index.json`
- Modify: `curriculum/pep-2019/index.json`

### Tests

- Create: `tests/research/researchPersistence.test.ts`
- Create: `tests/research/runResearch.test.ts`
- Create: `tests/draft/generateDraft.test.ts`
- Create: `tests/review/approveDraft.test.ts`
- Create: `tests/audio/buildSubtitleTrack.test.ts`
- Create: `tests/rendering/buildRenderPackage.test.ts`
- Create: `tests/rendering/subjectAdapterRegistry.test.ts`
- Create: `tests/rendering/autoVideoComposition.test.tsx`
- Create: `tests/cli/productionCommands.test.ts`
- Create: `tests/pipeline/runTopicToDraft.test.ts`
- Create: `tests/pipeline/runApprovedToRender.test.ts`
- Create: `tests/pipeline/resumeTopic.test.ts`
- Create: `tests/pipeline/runBatch.test.ts`
- Create: `tests/providers/providerConfig.test.ts`
- Create: `tests/e2e/topicProductionFlow.test.ts`

### Docs

- Modify: `README.md`
- Modify: `Course.md`

---

### Task 1: Freeze shared production contracts

**Files:**
- Create: `src/lib/research/schema.ts`
- Create: `src/lib/draft/schema.ts`
- Create: `src/lib/review/schema.ts`
- Create: `src/lib/audio/schema.ts`
- Create: `src/lib/rendering/schema.ts`
- Create: `src/lib/rendering/subjectAdapter.ts`
- Test: `tests/rendering/subjectAdapterRegistry.test.ts`

- [ ] **Step 1: Write the failing shared-contract tests**

```ts
import { describe, expect, it } from "vitest";
import { lessonDraftSchema } from "../../src/lib/draft/schema";
import { renderPackageSchema } from "../../src/lib/rendering/schema";

describe("shared production contracts", () => {
  it("accepts a subject-aware lesson draft", () => {
    const result = lessonDraftSchema.safeParse({
      topicId: "math-b1-ch1-sec1-topic-001",
      subject: "math",
      toneProfile: "clear-serious",
      durationTargetSec: 75,
      hook: "为什么香蕉不能放进偶数集合？",
      summary: "集合概念入门",
      scriptSegments: [{ id: "seg-1", kind: "hook", text: "先看一个分类问题。" }],
      storyboardScenes: [{ id: "scene-1", type: "hook", segmentIds: ["seg-1"], durationSec: 8 }],
      subtitleDraft: [{ id: "sub-1", segmentId: "seg-1", text: "先看一个分类问题。" }],
      visualPlan: ["突出集合归属判断"],
      qaNotes: [],
    });

    expect(result.success).toBe(true);
  });

  it("accepts a render package with subject-specific scenes behind a shared envelope", () => {
    const result = renderPackageSchema.safeParse({
      meta: {
        topicId: "math-b1-ch1-sec1-topic-001",
        subject: "math",
        aspectRatio: "9:16",
      },
      subject: "math",
      themeTokens: { palette: "math-clean", typography: "math-serif" },
      audioTracks: [{ id: "narration", file: "audio/narration.mp3" }],
      subtitleTrack: { topicId: "math-b1-ch1-sec1-topic-001", subject: "math", cues: [] },
      scenes: [{ id: "scene-1", kind: "hook", component: "math/hook", durationInFrames: 120, payload: { title: "集合的概念" } }],
      durationInFrames: 120,
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/rendering/subjectAdapterRegistry.test.ts`

Expected: FAIL with module-not-found errors for draft/rendering contract files.

- [ ] **Step 3: Write the minimal shared contract implementation**

```ts
// src/lib/rendering/subjectAdapter.ts
import { z } from "zod";

export const subjectSchema = z.enum(["math", "physics", "chemistry"]);

export interface SubjectAdapter {
  subject: z.infer<typeof subjectSchema>;
  createStoryboardScenes(input: {
    topicId: string;
    approvedScript: Array<{ id: string; kind: string; text: string }>;
  }): Array<{
    id: string;
    type: string;
    segmentIds: string[];
    durationSec: number;
  }>;
  buildRenderScenes(input: {
    topicId: string;
    subtitleTrack: { cues: Array<{ id: string; text: string; startMs: number; endMs: number }> };
    audioTrackFile: string;
  }): Array<{
    id: string;
    kind: string;
    component: string;
    durationInFrames: number;
    payload: Record<string, unknown>;
  }>;
  themeTokens(): Record<string, string>;
}
```
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/rendering/subjectAdapterRegistry.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/research/schema.ts src/lib/draft/schema.ts src/lib/review/schema.ts src/lib/audio/schema.ts src/lib/rendering/schema.ts src/lib/rendering/subjectAdapter.ts tests/rendering/subjectAdapterRegistry.test.ts
git commit -m "feat: freeze shared production contracts"
```

### Task 2: Add research, draft, and review persistence

**Files:**
- Create: `src/lib/research/researchProvider.ts`
- Create: `src/lib/research/saveResearch.ts`
- Create: `src/lib/research/readResearch.ts`
- Create: `src/lib/research/runResearch.ts`
- Create: `src/lib/draft/draftProvider.ts`
- Create: `src/lib/draft/saveDraft.ts`
- Create: `src/lib/draft/readDraft.ts`
- Create: `src/lib/draft/generateDraft.ts`
- Create: `src/lib/review/saveApprovedLesson.ts`
- Create: `src/lib/review/readApprovedLesson.ts`
- Create: `src/lib/review/approveDraft.ts`
- Test: `tests/research/researchPersistence.test.ts`
- Test: `tests/research/runResearch.test.ts`
- Test: `tests/draft/generateDraft.test.ts`
- Test: `tests/review/approveDraft.test.ts`

- [ ] **Step 1: Write the failing persistence and runner tests**

```ts
import { describe, expect, it } from "vitest";
import { runResearch } from "../../src/lib/research/runResearch";
import { readResearch } from "../../src/lib/research/readResearch";

describe("runResearch", () => {
  it("stores topic research with sources", async () => {
    await runResearch({
      topicId: "math-b1-ch1-sec1-topic-001",
      subject: "math",
      provider: {
        researchTopic: async () => ({
          canonicalTitle: "集合的概念",
          scope: "topic",
          definitions: ["研究对象组成的整体"],
          formulas: [],
          principles: ["确定性", "互异性"],
          examples: ["自然数集合"],
          misconceptions: ["凭感觉归类"],
          prerequisites: [],
          nextConnections: ["集合间的关系"],
          visualizationHints: ["强调属于与不属于符号"],
          sources: [{ title: "Source", url: "https://example.com", sourceType: "official", publisher: "Example", retrievedAt: "2026-04-27", quoteOrSummary: "summary" }],
        }),
      },
    });

    const research = await readResearch("math-b1-ch1-sec1-topic-001");
    expect(research.subject).toBe("math");
    expect(research.sources).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/research/researchPersistence.test.ts tests/research/runResearch.test.ts tests/draft/generateDraft.test.ts tests/review/approveDraft.test.ts`

Expected: FAIL because the persistence and provider files do not exist.

- [ ] **Step 3: Write the minimal persistence implementation**

```ts
// src/lib/research/saveResearch.ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getTopicWorkspace } from "../workspace/getTopicWorkspace";
import { knowledgeResearchSchema, type KnowledgeResearch } from "./schema";

export const saveResearch = async (research: KnowledgeResearch) => {
  const parsed = knowledgeResearchSchema.parse(research);
  const { researchDir } = getTopicWorkspace(parsed.topicId);
  const outFile = path.join(researchDir, "research.json");

  await mkdir(researchDir, { recursive: true });
  await writeFile(outFile, JSON.stringify(parsed, null, 2), "utf8");
  return parsed;
};
```
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/research/researchPersistence.test.ts tests/research/runResearch.test.ts tests/draft/generateDraft.test.ts tests/review/approveDraft.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/research src/lib/draft src/lib/review tests/research tests/draft tests/review
git commit -m "feat: add research draft and review persistence"
```

### Task 3: Add real TTS timing and subtitle contracts

**Files:**
- Create: `src/lib/audio/ttsProvider.ts`
- Create: `src/lib/audio/generateSegmentAudio.ts`
- Create: `src/lib/audio/buildSubtitleTrack.ts`
- Test: `tests/audio/buildSubtitleTrack.test.ts`

- [ ] **Step 1: Write the failing audio timing tests**

```ts
import { describe, expect, it } from "vitest";
import { buildSubtitleTrack } from "../../src/lib/audio/buildSubtitleTrack";

describe("buildSubtitleTrack", () => {
  it("creates absolute subtitle cues from timed chunks", async () => {
    const track = await buildSubtitleTrack({
      topicId: "math-b1-ch1-sec1-topic-001",
      subject: "math",
      segments: [
        {
          segmentId: "seg-1",
          startMs: 0,
          endMs: 1800,
          chunks: [{ text: "先看一个分类问题。", startMs: 0, endMs: 1800 }],
        },
      ],
    });

    expect(track.cues[0]?.text).toBe("先看一个分类问题。");
    expect(track.cues[0]?.startMs).toBe(0);
    expect(track.cues[0]?.endMs).toBe(1800);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/audio/buildSubtitleTrack.test.ts`

Expected: FAIL because audio timing helpers do not exist.

- [ ] **Step 3: Write the minimal audio timing implementation**

```ts
// src/lib/audio/buildSubtitleTrack.ts
export const buildSubtitleTrack = async (input: {
  topicId: string;
  subject: "math" | "physics" | "chemistry";
  segments: Array<{
    segmentId: string;
    startMs: number;
    endMs: number;
    chunks: Array<{ text: string; startMs: number; endMs: number }>;
  }>;
}) => ({
  topicId: input.topicId,
  subject: input.subject,
  cues: input.segments.flatMap((segment) =>
    segment.chunks.map((chunk, index) => ({
      id: `${segment.segmentId}-${index}`,
      text: chunk.text,
      startMs: segment.startMs + chunk.startMs,
      endMs: segment.startMs + chunk.endMs,
    })),
  ),
});
```
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/audio/buildSubtitleTrack.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio tests/audio
git commit -m "feat: add tts timing and subtitle contracts"
```

### Task 4: Add provider configuration and real provider factories

**Files:**
- Create: `src/lib/providers/config.ts`
- Create: `src/lib/providers/createResearchProvider.ts`
- Create: `src/lib/providers/createDraftProvider.ts`
- Create: `src/lib/providers/createTtsProvider.ts`
- Test: `tests/providers/providerConfig.test.ts`

- [ ] **Step 1: Write the failing provider configuration tests**

```ts
import { describe, expect, it } from "vitest";
import { readProviderConfig } from "../../src/lib/providers/config";

describe("readProviderConfig", () => {
  it("requires an API key for real providers", () => {
    expect(() => readProviderConfig({ OPENAI_API_KEY: "" })).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/providers/providerConfig.test.ts`

Expected: FAIL because provider config files do not exist.

- [ ] **Step 3: Write the minimal provider config layer**

```ts
// src/lib/providers/config.ts
import { z } from "zod";

const providerEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  RESEARCH_MODEL: z.string().min(1).default("gpt-5"),
  DRAFT_MODEL: z.string().min(1).default("gpt-5"),
  TTS_MODEL: z.string().min(1).default("gpt-4o-mini-tts"),
  TTS_VOICE: z.string().min(1).default("alloy"),
});

export const readProviderConfig = (env: Record<string, string | undefined>) =>
  providerEnvSchema.parse(env);
```
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/providers/providerConfig.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/providers tests/providers
git commit -m "feat: add real provider configuration"
```

### Task 5: Build shared produce pipeline and CLI

**Files:**
- Create: `src/lib/pipeline/runTopicToDraft.ts`
- Create: `src/lib/pipeline/runApprovedToRender.ts`
- Create: `src/lib/pipeline/resumeTopic.ts`
- Create: `src/lib/pipeline/runBatch.ts`
- Create: `src/lib/pipeline/getSubjectAdapter.ts`
- Create: `src/cli/commands/research.ts`
- Create: `src/cli/commands/draft.ts`
- Create: `src/cli/commands/review.ts`
- Create: `src/cli/commands/produce.ts`
- Create: `src/cli/commands/pipeline.ts`
- Create: `src/cli/commands/batch.ts`
- Create: `src/cli/commands/doctor.ts`
- Modify: `src/cli/index.ts`
- Test: `tests/pipeline/runTopicToDraft.test.ts`
- Test: `tests/pipeline/runApprovedToRender.test.ts`
- Test: `tests/pipeline/resumeTopic.test.ts`
- Test: `tests/pipeline/runBatch.test.ts`
- Test: `tests/cli/productionCommands.test.ts`

- [ ] **Step 1: Write the failing pipeline and CLI tests**

```ts
import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/runCli";

describe("production cli", () => {
  it("prints topic status after draft generation", async () => {
    const result = await runCli(["pipeline", "topic-to-draft", "--topic-id", "math-b1-ch1-sec1-topic-001"]);
    expect(result.stdout).toContain("pending_review");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/pipeline/runTopicToDraft.test.ts tests/pipeline/runApprovedToRender.test.ts tests/pipeline/resumeTopic.test.ts tests/pipeline/runBatch.test.ts tests/cli/productionCommands.test.ts`

Expected: FAIL because the pipeline and CLI files do not exist.

- [ ] **Step 3: Write the minimal pipeline orchestration**

```ts
// src/lib/pipeline/runTopicToDraft.ts
export const runTopicToDraft = async ({ topicId }: { topicId: string }) => {
  const research = await runResearch({ topicId, subject: "math", provider: createResearchProvider() });
  await writeTopicManifest({ topicId, status: "researched", updatedAt: new Date().toISOString() });
  await generateDraft({ topicId, subject: research.subject, research, provider: createDraftProvider() });
  await writeTopicManifest({ topicId, status: "pending_review", updatedAt: new Date().toISOString() });
};
```
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/pipeline/runTopicToDraft.test.ts tests/pipeline/runApprovedToRender.test.ts tests/pipeline/resumeTopic.test.ts tests/pipeline/runBatch.test.ts tests/cli/productionCommands.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline src/cli/commands src/cli/index.ts tests/pipeline tests/cli
git commit -m "feat: add shared production pipeline and cli"
```

### Task 6: Implement the math visual system

**Files:**
- Create: `src/subjects/math/schema.ts`
- Create: `src/subjects/math/theme.ts`
- Create: `src/subjects/math/sceneMapper.ts`
- Create: `src/subjects/math/scenes/MathHookScene.tsx`
- Create: `src/subjects/math/scenes/MathDefinitionScene.tsx`
- Create: `src/subjects/math/scenes/MathRuleScene.tsx`
- Create: `src/subjects/math/scenes/MathGraphScene.tsx`
- Create: `src/subjects/math/scenes/MathPitfallScene.tsx`
- Create: `src/subjects/math/scenes/MathWrapScene.tsx`
- Test: `tests/rendering/buildRenderPackage.test.ts`

- [ ] **Step 1: Write the failing math visual-system tests**

```ts
import { describe, expect, it } from "vitest";
import { getSubjectAdapter } from "../../src/lib/pipeline/getSubjectAdapter";

describe("math subject adapter", () => {
  it("maps approved content into math render scenes", () => {
    const adapter = getSubjectAdapter("math");
    const scenes = adapter.buildRenderScenes({
      topicId: "math-b1-ch1-sec1-topic-001",
      subtitleTrack: { cues: [] },
      audioTrackFile: "audio/narration.mp3",
    });

    expect(scenes[0]?.component.startsWith("math/")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/rendering/buildRenderPackage.test.ts`

Expected: FAIL because the math visual system files do not exist.

- [ ] **Step 3: Write the minimal math subject adapter and scenes**

```ts
// src/subjects/math/sceneMapper.ts
import type { SubjectAdapter } from "../../lib/rendering/subjectAdapter";

export const mathSubjectAdapter: SubjectAdapter = {
  subject: "math",
  createStoryboardScenes: ({ approvedScript }) =>
    approvedScript.map((segment, index) => ({
      id: `math-scene-${index + 1}`,
      type: index === 0 ? "hook" : "definition",
      segmentIds: [segment.id],
      durationSec: 8,
    })),
  buildRenderScenes: ({ topicId, audioTrackFile }) => [
    {
      id: `${topicId}-hook`,
      kind: "hook",
      component: "math/hook",
      durationInFrames: 120,
      payload: { audioTrackFile, title: "集合的概念" },
    },
  ],
  themeTokens: () => ({
    palette: "math-clean",
    typography: "math-serif",
  }),
};
```
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/rendering/buildRenderPackage.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/subjects/math tests/rendering/buildRenderPackage.test.ts
git commit -m "feat: add math visual system"
```

### Task 7: Implement the physics visual system

**Files:**
- Create: `src/subjects/physics/schema.ts`
- Create: `src/subjects/physics/theme.ts`
- Create: `src/subjects/physics/sceneMapper.ts`
- Create: `src/subjects/physics/scenes/*`
- Test: `tests/rendering/buildRenderPackage.test.ts`

- [ ] **Step 1: Write the failing physics visual-system tests**

```ts
import { describe, expect, it } from "vitest";
import { getSubjectAdapter } from "../../src/lib/pipeline/getSubjectAdapter";

describe("physics subject adapter", () => {
  it("maps approved content into physics render scenes", () => {
    const adapter = getSubjectAdapter("physics");
    const scenes = adapter.buildRenderScenes({
      topicId: "physics-b1-ch1-sec1-topic-001",
      subtitleTrack: { cues: [] },
      audioTrackFile: "audio/narration.mp3",
    });

    expect(scenes[0]?.component.startsWith("physics/")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/rendering/buildRenderPackage.test.ts`

Expected: FAIL because the physics visual system files do not exist.

- [ ] **Step 3: Write the minimal physics subject adapter and scenes**

```ts
// src/subjects/physics/sceneMapper.ts
import type { SubjectAdapter } from "../../lib/rendering/subjectAdapter";

export const physicsSubjectAdapter: SubjectAdapter = {
  subject: "physics",
  createStoryboardScenes: ({ approvedScript }) =>
    approvedScript.map((segment, index) => ({
      id: `physics-scene-${index + 1}`,
      type: index === 0 ? "hook" : "phenomenon",
      segmentIds: [segment.id],
      durationSec: 8,
    })),
  buildRenderScenes: ({ topicId, audioTrackFile }) => [
    {
      id: `${topicId}-hook`,
      kind: "hook",
      component: "physics/hook",
      durationInFrames: 120,
      payload: { audioTrackFile, title: "匀变速直线运动" },
    },
  ],
  themeTokens: () => ({
    palette: "physics-lab",
    typography: "physics-sans",
  }),
};
```
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/rendering/buildRenderPackage.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/subjects/physics tests/rendering/buildRenderPackage.test.ts
git commit -m "feat: add physics visual system"
```

### Task 8: Implement the chemistry visual system

**Files:**
- Create: `src/subjects/chemistry/schema.ts`
- Create: `src/subjects/chemistry/theme.ts`
- Create: `src/subjects/chemistry/sceneMapper.ts`
- Create: `src/subjects/chemistry/scenes/*`
- Test: `tests/rendering/buildRenderPackage.test.ts`

- [ ] **Step 1: Write the failing chemistry visual-system tests**

```ts
import { describe, expect, it } from "vitest";
import { getSubjectAdapter } from "../../src/lib/pipeline/getSubjectAdapter";

describe("chemistry subject adapter", () => {
  it("maps approved content into chemistry render scenes", () => {
    const adapter = getSubjectAdapter("chemistry");
    const scenes = adapter.buildRenderScenes({
      topicId: "chemistry-b1-ch1-sec1-topic-001",
      subtitleTrack: { cues: [] },
      audioTrackFile: "audio/narration.mp3",
    });

    expect(scenes[0]?.component.startsWith("chemistry/")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/rendering/buildRenderPackage.test.ts`

Expected: FAIL because the chemistry visual system files do not exist.

- [ ] **Step 3: Write the minimal chemistry subject adapter and scenes**

```ts
// src/subjects/chemistry/sceneMapper.ts
import type { SubjectAdapter } from "../../lib/rendering/subjectAdapter";

export const chemistrySubjectAdapter: SubjectAdapter = {
  subject: "chemistry",
  createStoryboardScenes: ({ approvedScript }) =>
    approvedScript.map((segment, index) => ({
      id: `chem-scene-${index + 1}`,
      type: index === 0 ? "hook" : "observation",
      segmentIds: [segment.id],
      durationSec: 8,
    })),
  buildRenderScenes: ({ topicId, audioTrackFile }) => [
    {
      id: `${topicId}-hook`,
      kind: "hook",
      component: "chemistry/hook",
      durationInFrames: 120,
      payload: { audioTrackFile, title: "氧化还原反应" },
    },
  ],
  themeTokens: () => ({
    palette: "chemistry-reactive",
    typography: "chemistry-sans",
  }),
};
```
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/rendering/buildRenderPackage.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/subjects/chemistry tests/rendering/buildRenderPackage.test.ts
git commit -m "feat: add chemistry visual system"
```

### Task 9: Integrate subject systems into Remotion

**Files:**
- Modify: `src/compositions/AutoVideoComposition.tsx`
- Modify: `src/Root.tsx`
- Modify: `src/lib/schema.ts`
- Test: `tests/rendering/autoVideoComposition.test.tsx`

- [ ] **Step 1: Write the failing composition integration tests**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AutoVideoComposition } from "../../src/compositions/AutoVideoComposition";

describe("AutoVideoComposition", () => {
  it("renders subject-specific scene components from a shared render package", () => {
    const html = renderToStaticMarkup(
      <AutoVideoComposition
        meta={{ topicId: "math-b1-ch1-sec1-topic-001", subject: "math", aspectRatio: "9:16" }}
        subject="math"
        themeTokens={{ palette: "math-clean", typography: "math-serif" }}
        audioTracks={[]}
        subtitleTrack={{ topicId: "math-b1-ch1-sec1-topic-001", subject: "math", cues: [] }}
        scenes={[{ id: "scene-1", kind: "hook", component: "math/hook", durationInFrames: 120, payload: { title: "集合的概念" } }]}
        durationInFrames={120}
      />,
    );

    expect(html).toContain("集合的概念");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/rendering/autoVideoComposition.test.tsx`

Expected: FAIL because the composition still expects the old generic schema.

- [ ] **Step 3: Write the minimal composition switch**

```tsx
// src/compositions/AutoVideoComposition.tsx
export const AutoVideoComposition = ({ scenes }: RenderPackage) => {
  return (
    <AbsoluteFill>
      {scenes.map((scene) => {
        if (scene.component === "math/hook") {
          return <MathHookScene key={scene.id} payload={scene.payload} />;
        }
        if (scene.component === "physics/hook") {
          return <PhysicsHookScene key={scene.id} payload={scene.payload} />;
        }
        return <ChemistryHookScene key={scene.id} payload={scene.payload} />;
      })}
    </AbsoluteFill>
  );
};
```
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/rendering/autoVideoComposition.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/compositions src/Root.tsx src/lib/schema.ts tests/rendering/autoVideoComposition.test.tsx
git commit -m "feat: integrate subject visual systems into remotion"
```

### Task 10: Produce three formal samples and complete the first end-to-end workflow

**Files:**
- Create: `tests/e2e/topicProductionFlow.test.ts`
- Modify: `README.md`
- Modify: `Course.md`

- [ ] **Step 1: Write the failing end-to-end workflow test**

```ts
import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/runCli";

describe("topic production flow", () => {
  it("runs a math topic from draft generation to rendered artifact", async () => {
    await runCli(["pipeline", "topic-to-draft", "--topic-id", "math-b1-ch1-sec1-topic-001"]);
    await runCli(["review", "approve", "--topic-id", "math-b1-ch1-sec1-topic-001"]);
    await runCli(["produce", "render", "--topic-id", "math-b1-ch1-sec1-topic-001"]);

    const result = await runCli(["topic", "status", "--topic-id", "math-b1-ch1-sec1-topic-001"]);
    expect(result.stdout).toContain("rendered");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/e2e/topicProductionFlow.test.ts`

Expected: FAIL until the whole CLI workflow is connected.

- [ ] **Step 3: Implement missing glue and render sample topics**

```md
## Formal Sample Workflow

```bash
npm run cli -- pipeline topic-to-draft --topic-id math-b1-ch1-sec1-topic-001
npm run cli -- review approve --topic-id math-b1-ch1-sec1-topic-001
npm run cli -- produce render --topic-id math-b1-ch1-sec1-topic-001
```
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS

Run: `npm run lint:types`

Expected: no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add README.md Course.md tests/e2e
git commit -m "feat: complete formal sample workflow"
```

### Task 11: Continue beyond stage one to finish the complete project

**Files:**
- Modify: `curriculum/pep-2019/*`
- Modify: `src/lib/pipeline/*`
- Modify: `src/lib/providers/*`
- Modify: `src/cli/commands/*`
- Modify: `README.md`
- Modify: `Course.md`

- [ ] **Step 1: Expand curriculum coverage**

Run: `npm run cli -- curriculum list --subject math`

Expected: visible curriculum gaps to fill for math, physics, and chemistry.

- [ ] **Step 2: Add production reliability features**

Implement:

- topic status reporting
- targeted retry support
- failure manifests
- doctor checks for environment/provider readiness

- [ ] **Step 3: Add batch and resume operator flow**

Implement:

- range production
- status-based filtering
- failed-only reruns
- resume from `approved`, `tts_generated`, and `subtitle_aligned`

- [ ] **Step 4: Run full verification**

Run: `npm test`

Expected: PASS

Run: `npm run lint:types`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add curriculum src README.md Course.md
git commit -m "feat: complete full course production system"
```

---

## Self-Review Checklist

- Spec coverage:
  - Shared production kernel: covered by Tasks 1-5.
  - Math / physics / chemistry independent visual systems: covered by Tasks 6-9.
  - Formal sample quality path: covered by Task 10.
  - Continue-to-completion path: covered by Task 11.

- Placeholder scan:
  - The only intentionally broad task is Task 11 because it represents the post-stage-one continuation to full completion; it still enumerates the exact responsibility areas that must be finished before claiming the project complete.

- Type consistency:
  - All subject-specific systems must conform to the same `SubjectAdapter`, `SubtitleTrack`, and `RenderPackage` contracts.
