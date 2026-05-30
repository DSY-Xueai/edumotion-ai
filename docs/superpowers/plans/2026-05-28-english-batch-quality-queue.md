# English Batch Quality Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a formal English batch queue that takes an explicit topic range or topic list and produces a requested number of quality-passed English videos while recording and cleaning failed attempts.

**Architecture:** Keep the existing `batch run` command unchanged and add a new `batch english` path. The new code lives under `src/lib/pipeline/englishBatch/` with small focused modules for input parsing, manifest persistence, copy duplication checks, failure cleanup, visual checks, and queue orchestration.

**Tech Stack:** TypeScript, Node.js fs/path APIs, Vitest, existing CLI command dispatcher, existing English `quality` command, ffmpeg/ffprobe for media checks, Remotion render pipeline.

---

## File Structure

- Create `src/lib/pipeline/englishBatch/schema.ts`: zod schemas and types for queue input, attempts, statuses, reports, and persisted manifest.
- Create `src/lib/pipeline/englishBatch/resolveEnglishBatchTopics.ts`: converts `--from/--to` or repeated `--topic-id` values into ordered topic ids.
- Create `src/lib/pipeline/englishBatch/checkBatchCopyUniqueness.ts`: compares the current approved script against already passed scripts in this batch.
- Create `src/lib/pipeline/englishBatch/cleanupFailedEnglishTopic.ts`: removes failed topic artifacts while leaving the batch report.
- Create `src/lib/quality/checkEnglishVisualQuality.ts`: extracts frames and performs deterministic visual sanity checks.
- Create `src/lib/pipeline/englishBatch/runEnglishBatchQueue.ts`: orchestrates serial attempts, one retry, quality gates, cleanup, and final report.
- Modify `src/cli/commands/batch.ts`: add `batch english` argument parsing and call the queue.
- Modify `src/lib/quality/checkEnglishVideoQuality.ts`: include visual quality checks when media inspection is enabled.
- Test `tests/pipeline/englishBatch/*.test.ts`: focused unit tests for range parsing, duplicate detection, cleanup, and queue behavior.
- Test `tests/quality/englishVisualQuality.test.ts`: media-level visual checks with generated tiny videos or mocked `execFile`.
- Modify `Course.md`: concise project status update after implementation.

## Task 1: Batch Schemas

**Files:**
- Create: `src/lib/pipeline/englishBatch/schema.ts`
- Test: `tests/pipeline/englishBatch/schema.test.ts`

- [ ] **Step 1: Write the failing schema test**

```ts
import { describe, expect, it } from "vitest";
import {
  englishBatchInputSchema,
  englishBatchManifestSchema,
} from "../../../src/lib/pipeline/englishBatch/schema";

describe("english batch schemas", () => {
  it("accepts explicit topic ids with a target count", () => {
    expect(
      englishBatchInputSchema.parse({
        topicIds: ["english-word-00013", "english-word-00014"],
        targetPassed: 2,
      }),
    ).toEqual({
      topicIds: ["english-word-00013", "english-word-00014"],
      targetPassed: 2,
    });
  });

  it("rejects target count larger than the explicit input count", () => {
    expect(() =>
      englishBatchInputSchema.parse({
        topicIds: ["english-word-00013"],
        targetPassed: 2,
      }),
    ).toThrow(/targetPassed cannot exceed topicIds length/u);
  });

  it("stores failed attempts with stage and reason", () => {
    const manifest = englishBatchManifestSchema.parse({
      id: "english-batch-2026-05-28",
      createdAt: "2026-05-28T00:00:00.000Z",
      updatedAt: "2026-05-28T00:00:00.000Z",
      targetPassed: 1,
      inputTopicIds: ["english-word-00013"],
      passedTopicIds: [],
      failedTopics: [
        {
          topicId: "english-word-00013",
          word: "abortion",
          finalStatus: "failed",
          attempts: [
            {
              attempt: 1,
              stage: "draft_quality",
              reason: "Mnemonic copy does not explain the meaning.",
              failedCheckIds: ["mnemonic-meaning"],
              at: "2026-05-28T00:01:00.000Z",
            },
          ],
        },
      ],
      unprocessedTopicIds: [],
    });

    expect(manifest.failedTopics[0]?.attempts[0]?.stage).toBe("draft_quality");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/pipeline/englishBatch/schema.test.ts`

Expected: FAIL because `src/lib/pipeline/englishBatch/schema.ts` does not exist.

- [ ] **Step 3: Implement schemas**

Create `src/lib/pipeline/englishBatch/schema.ts`:

```ts
import { z } from "zod";

export const englishBatchFailureStageSchema = z.enum([
  "draft_quality",
  "duplicate_copy",
  "audio_quality",
  "render_quality",
  "visual_quality",
  "environment",
]);

export const englishBatchTopicStatusSchema = z.enum([
  "queued",
  "attempting",
  "retrying",
  "passed",
  "retry_passed",
  "failed",
  "skipped",
]);

export const englishBatchInputSchema = z
  .object({
    topicIds: z.array(z.string().regex(/^english-word-\d{5}$/u)).min(1),
    targetPassed: z.number().int().positive(),
  })
  .superRefine((input, ctx) => {
    const uniqueTopicIds = new Set(input.topicIds);

    if (uniqueTopicIds.size !== input.topicIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["topicIds"],
        message: "topicIds must be unique",
      });
    }

    if (input.targetPassed > input.topicIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetPassed"],
        message: "targetPassed cannot exceed topicIds length",
      });
    }
  });

export const englishBatchAttemptSchema = z.object({
  attempt: z.literal(1).or(z.literal(2)),
  stage: englishBatchFailureStageSchema,
  reason: z.string().min(1),
  failedCheckIds: z.array(z.string().min(1)),
  at: z.string().min(1),
});

export const englishBatchFailedTopicSchema = z.object({
  topicId: z.string().min(1),
  word: z.string().min(1),
  finalStatus: z.literal("failed"),
  attempts: z.array(englishBatchAttemptSchema).min(1).max(2),
});

export const englishBatchManifestSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  targetPassed: z.number().int().positive(),
  inputTopicIds: z.array(z.string().min(1)).min(1),
  passedTopicIds: z.array(z.string().min(1)),
  retryPassedTopicIds: z.array(z.string().min(1)).default([]),
  failedTopics: z.array(englishBatchFailedTopicSchema),
  unprocessedTopicIds: z.array(z.string().min(1)),
});

export type EnglishBatchFailureStage = z.infer<typeof englishBatchFailureStageSchema>;
export type EnglishBatchAttempt = z.infer<typeof englishBatchAttemptSchema>;
export type EnglishBatchFailedTopic = z.infer<typeof englishBatchFailedTopicSchema>;
export type EnglishBatchManifest = z.infer<typeof englishBatchManifestSchema>;
export type EnglishBatchInput = z.infer<typeof englishBatchInputSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/pipeline/englishBatch/schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

Do not commit automatically. Ask the user whether to commit this checkpoint. If confirmed:

```bash
git add src/lib/pipeline/englishBatch/schema.ts tests/pipeline/englishBatch/schema.test.ts
git commit -m "feat: add english batch queue schemas"
```

## Task 2: Explicit Topic Range Parsing

**Files:**
- Create: `src/lib/pipeline/englishBatch/resolveEnglishBatchTopics.ts`
- Test: `tests/pipeline/englishBatch/resolveEnglishBatchTopics.test.ts`

- [ ] **Step 1: Write failing range parser tests**

```ts
import { describe, expect, it } from "vitest";
import { resolveEnglishBatchTopics } from "../../../src/lib/pipeline/englishBatch/resolveEnglishBatchTopics";

describe("resolveEnglishBatchTopics", () => {
  it("expands a closed english-word range", () => {
    expect(
      resolveEnglishBatchTopics({
        from: "english-word-00013",
        to: "english-word-00016",
      }),
    ).toEqual([
      "english-word-00013",
      "english-word-00014",
      "english-word-00015",
      "english-word-00016",
    ]);
  });

  it("keeps an explicit list in user order", () => {
    expect(
      resolveEnglishBatchTopics({
        topicIds: ["english-word-00015", "english-word-00013"],
      }),
    ).toEqual(["english-word-00015", "english-word-00013"]);
  });

  it("rejects mixed range and explicit list input", () => {
    expect(() =>
      resolveEnglishBatchTopics({
        from: "english-word-00013",
        to: "english-word-00014",
        topicIds: ["english-word-00015"],
      }),
    ).toThrow(/Use either --from\/--to or --topic-id/u);
  });

  it("rejects reversed ranges", () => {
    expect(() =>
      resolveEnglishBatchTopics({
        from: "english-word-00016",
        to: "english-word-00013",
      }),
    ).toThrow(/from must be before or equal to to/u);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/pipeline/englishBatch/resolveEnglishBatchTopics.test.ts`

Expected: FAIL because resolver does not exist.

- [ ] **Step 3: Implement the resolver**

```ts
const topicPattern = /^english-word-(\d{5})$/u;

const parseTopicNumber = (topicId: string) => {
  const match = topicId.match(topicPattern);

  if (!match) {
    throw new Error(`Invalid English topic id: ${topicId}`);
  }

  return Number(match[1]);
};

const formatTopicId = (value: number) =>
  `english-word-${String(value).padStart(5, "0")}`;

export const resolveEnglishBatchTopics = ({
  from,
  to,
  topicIds = [],
}: {
  from?: string;
  to?: string;
  topicIds?: string[];
}) => {
  const hasRange = Boolean(from || to);
  const hasList = topicIds.length > 0;

  if (hasRange && hasList) {
    throw new Error("Use either --from/--to or --topic-id, not both.");
  }

  if (hasList) {
    const seen = new Set<string>();

    return topicIds.map((topicId) => {
      parseTopicNumber(topicId);
      if (seen.has(topicId)) {
        throw new Error(`Duplicate topic id: ${topicId}`);
      }
      seen.add(topicId);
      return topicId;
    });
  }

  if (!from || !to) {
    throw new Error("Missing --from/--to or --topic-id.");
  }

  const start = parseTopicNumber(from);
  const end = parseTopicNumber(to);

  if (start > end) {
    throw new Error("--from must be before or equal to --to.");
  }

  return Array.from({ length: end - start + 1 }, (_, index) =>
    formatTopicId(start + index),
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/pipeline/englishBatch/resolveEnglishBatchTopics.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

Ask before committing. If confirmed:

```bash
git add src/lib/pipeline/englishBatch/resolveEnglishBatchTopics.ts tests/pipeline/englishBatch/resolveEnglishBatchTopics.test.ts
git commit -m "feat: parse english batch topic ranges"
```

## Task 3: Batch Copy Uniqueness Gate

**Files:**
- Create: `src/lib/pipeline/englishBatch/checkBatchCopyUniqueness.ts`
- Test: `tests/pipeline/englishBatch/checkBatchCopyUniqueness.test.ts`

- [ ] **Step 1: Write failing duplicate-copy tests**

```ts
import { describe, expect, it } from "vitest";
import { checkBatchCopyUniqueness } from "../../../src/lib/pipeline/englishBatch/checkBatchCopyUniqueness";

const script = (word: string, story: string) => [
  { id: `${word}-hook`, kind: "hook", text: "一秒钟记一个单词。" },
  { id: `${word}-definition`, kind: "definition", text: `今天要记的单词是 ${word}，意思是：测试。` },
  { id: `${word}-mnemonic`, kind: "compare", text: story },
  { id: `${word}-wrap`, kind: "wrap", text: `所以：${word}，就是测试。` },
];

describe("checkBatchCopyUniqueness", () => {
  it("allows shared opening cadence but rejects repeated mnemonic copy", () => {
    const result = checkBatchCopyUniqueness({
      topicId: "english-word-00014",
      approvedScript: script("able", "别人做不了的事，你轻松就拿下了。"),
      passedScripts: [
        {
          topicId: "english-word-00013",
          approvedScript: script("ability", "别人做不了的事，你轻松就拿下了。"),
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/reuses mnemonic copy/u);
  });

  it("allows fresh word-specific mnemonic copy", () => {
    const result = checkBatchCopyUniqueness({
      topicId: "english-word-00015",
      approvedScript: script("aboard", "人从岸边跨上船，脚已经站到甲板里。"),
      passedScripts: [
        {
          topicId: "english-word-00013",
          approvedScript: script("ability", "别人做不了的事，你轻松就拿下了。"),
        },
      ],
    });

    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/pipeline/englishBatch/checkBatchCopyUniqueness.test.ts`

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement copy uniqueness**

```ts
type ScriptSegment = { kind: string; text: string };

const normalized = (value: string) =>
  value
    .replace(/\s+/gu, "")
    .replace(/[，。！？；：,.!?;:]/gu, "")
    .trim();

const comparableText = (segments: ScriptSegment[]) =>
  segments
    .filter((segment) => !["hook", "definition", "pronunciation"].includes(segment.kind))
    .map((segment) => normalized(segment.text))
    .filter(Boolean);

const jaccard = (left: string, right: string) => {
  const leftSet = new Set(Array.from(left));
  const rightSet = new Set(Array.from(right));
  const intersection = Array.from(leftSet).filter((item) => rightSet.has(item)).length;
  const union = new Set([...leftSet, ...rightSet]).size;

  return union === 0 ? 0 : intersection / union;
};

export const checkBatchCopyUniqueness = ({
  topicId,
  approvedScript,
  passedScripts,
}: {
  topicId: string;
  approvedScript: ScriptSegment[];
  passedScripts: Array<{ topicId: string; approvedScript: ScriptSegment[] }>;
}) => {
  const currentParts = comparableText(approvedScript);
  const currentJoined = currentParts.join("");

  for (const passed of passedScripts) {
    const passedParts = comparableText(passed.approvedScript);

    for (const part of currentParts) {
      if (part.length >= 8 && passedParts.includes(part)) {
        return {
          ok: false,
          stage: "duplicate_copy" as const,
          reason: `${topicId} reuses mnemonic copy from ${passed.topicId}.`,
          matchedTopicId: passed.topicId,
        };
      }
    }

    const similarity = jaccard(currentJoined, passedParts.join(""));
    if (similarity >= 0.82) {
      return {
        ok: false,
        stage: "duplicate_copy" as const,
        reason: `${topicId} has high copy similarity with ${passed.topicId}.`,
        matchedTopicId: passed.topicId,
      };
    }
  }

  return { ok: true as const };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/pipeline/englishBatch/checkBatchCopyUniqueness.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

Ask before committing. If confirmed:

```bash
git add src/lib/pipeline/englishBatch/checkBatchCopyUniqueness.ts tests/pipeline/englishBatch/checkBatchCopyUniqueness.test.ts
git commit -m "feat: add english batch copy uniqueness gate"
```

## Task 4: Failed Topic Cleanup

**Files:**
- Create: `src/lib/pipeline/englishBatch/cleanupFailedEnglishTopic.ts`
- Test: `tests/pipeline/englishBatch/cleanupFailedEnglishTopic.test.ts`

- [ ] **Step 1: Write failing cleanup test**

```ts
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { cleanupFailedEnglishTopic } from "../../../src/lib/pipeline/englishBatch/cleanupFailedEnglishTopic";

const exists = async (filePath: string) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

describe("cleanupFailedEnglishTopic", () => {
  it("removes failed artifacts and keeps manifest/report files outside topic output", async () => {
    const root = path.join(process.cwd(), ".tmp-cleanup-failed-topic");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", root);
    vi.stubEnv("TOPIC_WORKSPACE_DATE", "2026-05-28");

    const topicRoot = path.join(root, "2026-05-28", "01", "english-word-00013");
    await mkdir(path.join(topicRoot, "draft"), { recursive: true });
    await mkdir(path.join(topicRoot, "approved"), { recursive: true });
    await mkdir(path.join(topicRoot, "audio"), { recursive: true });
    await mkdir(path.join(topicRoot, "render"), { recursive: true });
    await writeFile(path.join(topicRoot, "draft", "lesson.json"), "{}");
    await writeFile(path.join(topicRoot, "approved", "lesson.json"), "{}");
    await writeFile(path.join(topicRoot, "audio", "seg.wav"), "audio");
    await writeFile(path.join(topicRoot, "render", "video.mp4"), "video");

    const publicAudio = path.join(process.cwd(), "public", "generated", "english-word-00013", "audio");
    await mkdir(publicAudio, { recursive: true });
    await writeFile(path.join(publicAudio, "seg.wav"), "audio");

    await cleanupFailedEnglishTopic("english-word-00013");

    expect(await exists(path.join(topicRoot, "draft", "lesson.json"))).toBe(false);
    expect(await exists(path.join(topicRoot, "approved", "lesson.json"))).toBe(false);
    expect(await exists(path.join(topicRoot, "audio", "seg.wav"))).toBe(false);
    expect(await exists(path.join(topicRoot, "render", "video.mp4"))).toBe(false);
    expect(await exists(path.join(publicAudio, "seg.wav"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/pipeline/englishBatch/cleanupFailedEnglishTopic.test.ts`

Expected: FAIL because cleanup module does not exist.

- [ ] **Step 3: Implement cleanup**

```ts
import { rm } from "node:fs/promises";
import path from "node:path";
import { getTopicWorkspace } from "../../workspace/getTopicWorkspace";

const removeIfExists = async (targetPath: string) => {
  await rm(targetPath, { recursive: true, force: true });
};

export const cleanupFailedEnglishTopic = async (topicId: string) => {
  const workspace = getTopicWorkspace(topicId);

  await Promise.all([
    removeIfExists(path.join(workspace, "draft", "lesson.json")),
    removeIfExists(path.join(workspace, "approved", "lesson.json")),
    removeIfExists(path.join(workspace, "audio")),
    removeIfExists(path.join(workspace, "render", "video.mp4")),
    removeIfExists(path.join(workspace, "render", "render-package.json")),
    removeIfExists(path.join(process.cwd(), "public", "generated", topicId, "audio")),
  ]);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/pipeline/englishBatch/cleanupFailedEnglishTopic.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

Ask before committing. If confirmed:

```bash
git add src/lib/pipeline/englishBatch/cleanupFailedEnglishTopic.ts tests/pipeline/englishBatch/cleanupFailedEnglishTopic.test.ts
git commit -m "feat: clean failed english batch artifacts"
```

## Task 5: Visual Quality Check

**Files:**
- Create: `src/lib/quality/checkEnglishVisualQuality.ts`
- Test: `tests/quality/englishVisualQuality.test.ts`

- [ ] **Step 1: Write failing visual quality tests with mocked media probes**

```ts
import { execFile } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { checkEnglishVisualQuality } from "../../src/lib/quality/checkEnglishVisualQuality";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

const mockedExecFile = vi.mocked(execFile);

describe("checkEnglishVisualQuality", () => {
  it("passes when ffmpeg blackframe output has no black frames and render package carries word cues", async () => {
    mockedExecFile.mockImplementation((_bin, _args, callback) => {
      callback?.(null, "", "");
      return {} as ReturnType<typeof execFile>;
    });

    const result = await checkEnglishVisualQuality({
      videoPath: "video.mp4",
      renderPackage: {
        canonicalTitle: "aboard",
        scenes: [
          {
            id: "scene-definition",
            kind: "definition",
            component: "english/definition",
            durationInFrames: 600,
            payload: {
              word: "aboard",
              subtitleCues: [{ text: "今天要记的单词是 aboard，意思是：上船。" }],
            },
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
  });

  it("fails closed when ffmpeg inspection errors", async () => {
    mockedExecFile.mockImplementation((_bin, _args, callback) => {
      callback?.(new Error("ffmpeg failed"), "", "");
      return {} as ReturnType<typeof execFile>;
    });

    const result = await checkEnglishVisualQuality({
      videoPath: "video.mp4",
      renderPackage: {
        canonicalTitle: "aboard",
        scenes: [],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.checks[0]?.id).toBe("visual-media-readable");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/quality/englishVisualQuality.test.ts`

Expected: FAIL because visual quality module does not exist.

- [ ] **Step 3: Implement visual quality checks**

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type MinimalRenderPackage = {
  canonicalTitle: string;
  scenes: Array<{
    kind: string;
    payload: Record<string, unknown>;
  }>;
};

type VisualCheck = {
  id: string;
  ok: boolean;
  message: string;
  details?: unknown;
};

const payloadText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(payloadText).join("\n");
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(payloadText).join("\n");
  }

  return "";
};

export const checkEnglishVisualQuality = async ({
  videoPath,
  renderPackage,
}: {
  videoPath: string;
  renderPackage: MinimalRenderPackage;
}) => {
  const checks: VisualCheck[] = [];

  try {
    await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-i",
      videoPath,
      "-vf",
      "blackframe=amount=98:threshold=32",
      "-an",
      "-f",
      "null",
      "NUL",
    ]);
    checks.push({
      id: "visual-media-readable",
      ok: true,
      message: "Video frames can be inspected by ffmpeg.",
    });
  } catch (error) {
    checks.push({
      id: "visual-media-readable",
      ok: false,
      message: "Unable to inspect video frames.",
      details: error instanceof Error ? error.message : String(error),
    });
  }

  const definitionScenes = renderPackage.scenes.filter(
    (scene) => scene.kind === "definition",
  );
  const word = renderPackage.canonicalTitle.toLowerCase();
  const hasWordPayload = definitionScenes.some((scene) =>
    payloadText(scene.payload).toLowerCase().includes(word),
  );

  checks.push({
    id: "visual-word-payload",
    ok: hasWordPayload,
    message: hasWordPayload
      ? "Definition visual payload contains the target word."
      : "Definition visual payload does not contain the target word.",
  });

  const hasSubtitlePayload = definitionScenes.some((scene) =>
    /subtitleCues/u.test(JSON.stringify(scene.payload)),
  );

  checks.push({
    id: "visual-subtitle-payload",
    ok: hasSubtitlePayload,
    message: hasSubtitlePayload
      ? "Definition visual payload carries subtitle cues."
      : "Definition visual payload is missing subtitle cues.",
  });

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/quality/englishVisualQuality.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

Ask before committing. If confirmed:

```bash
git add src/lib/quality/checkEnglishVisualQuality.ts tests/quality/englishVisualQuality.test.ts
git commit -m "feat: add english visual quality checks"
```

## Task 6: Integrate Visual Check Into English Quality

**Files:**
- Modify: `src/lib/quality/checkEnglishVideoQuality.ts`
- Test: `tests/quality/englishVideoQuality.test.ts`

- [ ] **Step 1: Add failing quality integration test**

Add this test to `tests/quality/englishVideoQuality.test.ts`:

```ts
it("fails closed when visual quality inspection cannot inspect rendered frames", async () => {
  const workspaceRoot = path.join(process.cwd(), ".tmp-quality-visual-fail");
  vi.stubEnv("TOPIC_WORKSPACE_ROOT", workspaceRoot);
  vi.stubEnv("TTS_PROVIDER", "qwen-local");

  const topicRoot = path.join(workspaceRoot, "english-word-quality");
  await writeJson(path.join(topicRoot, "approved", "lesson.json"), {
    ...baseApprovedLesson,
    approvedScript: [
      { id: "seg-1", kind: "hook", text: "一秒钟记一个单词。" },
      { id: "seg-2", kind: "definition", text: "今天要记的单词是 aboard，意思是：上船。" },
      { id: "seg-3", kind: "compare", text: "人从岸边跨上船，脚已经站到甲板里。" },
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
          subtitleCues: [{ text: "今天要记的单词是 aboard，意思是：上船。" }],
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/quality/englishVideoQuality.test.ts`

Expected: FAIL because `checkEnglishVideoQuality` does not include visual checks yet.

- [ ] **Step 3: Call visual check from English quality**

In `src/lib/quality/checkEnglishVideoQuality.ts`, import and call:

```ts
import { checkEnglishVisualQuality } from "./checkEnglishVisualQuality";
```

Inside the `if (inspectMedia)` block, after volume checks:

```ts
    const visualResult = await checkEnglishVisualQuality({
      videoPath,
      renderPackage,
    });
    checks.push(...visualResult.checks);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/quality/englishVideoQuality.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

Ask before committing. If confirmed:

```bash
git add src/lib/quality/checkEnglishVideoQuality.ts src/lib/quality/checkEnglishVisualQuality.ts tests/quality/englishVideoQuality.test.ts tests/quality/englishVisualQuality.test.ts
git commit -m "feat: gate english quality on visual checks"
```

## Task 7: English Batch Queue Runner

**Files:**
- Create: `src/lib/pipeline/englishBatch/runEnglishBatchQueue.ts`
- Test: `tests/pipeline/englishBatch/runEnglishBatchQueue.test.ts`

- [ ] **Step 1: Write failing queue behavior test with injected dependencies**

```ts
import { describe, expect, it, vi } from "vitest";
import { runEnglishBatchQueue } from "../../../src/lib/pipeline/englishBatch/runEnglishBatchQueue";

describe("runEnglishBatchQueue", () => {
  it("continues after a failed topic and stops when target passed count is reached", async () => {
    const cleanupFailedTopic = vi.fn();
    const result = await runEnglishBatchQueue({
      topicIds: ["english-word-00013", "english-word-00014", "english-word-00015"],
      targetPassed: 2,
      now: () => "2026-05-28T00:00:00.000Z",
      getWord: (topicId) => ({
        "english-word-00013": "abortion",
        "english-word-00014": "aboard",
        "english-word-00015": "abolish",
      })[topicId] ?? topicId,
      runAttempt: async ({ topicId, attempt }) => {
        if (topicId === "english-word-00013") {
          return {
            ok: false,
            stage: "draft_quality",
            reason: attempt === 1 ? "weak mnemonic" : "still weak mnemonic",
            failedCheckIds: ["mnemonic-meaning"],
            approvedScript: [],
          };
        }

        return {
          ok: true,
          approvedScript: [
            { id: `${topicId}-seg-compare`, kind: "compare", text: `${topicId} fresh story` },
          ],
        };
      },
      cleanupFailedTopic,
      writeManifest: async () => undefined,
    });

    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.passedTopics).toEqual(["english-word-00014", "english-word-00015"]);
    expect(cleanupFailedTopic).toHaveBeenCalledWith("english-word-00013");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/pipeline/englishBatch/runEnglishBatchQueue.test.ts`

Expected: FAIL because runner does not exist.

- [ ] **Step 3: Implement injectable queue runner**

Create the runner with dependency injection so the orchestration is testable without real OpenAI/TTS/render:

```ts
import type { EnglishBatchAttempt, EnglishBatchFailureStage } from "./schema";
import { englishBatchInputSchema } from "./schema";

type ScriptSegment = { id: string; kind: string; text: string };

type AttemptResult =
  | {
      ok: true;
      approvedScript: ScriptSegment[];
    }
  | {
      ok: false;
      stage: EnglishBatchFailureStage;
      reason: string;
      failedCheckIds: string[];
      approvedScript: ScriptSegment[];
    };

export const runEnglishBatchQueue = async ({
  topicIds,
  targetPassed,
  now = () => new Date().toISOString(),
  getWord,
  runAttempt,
  cleanupFailedTopic,
  writeManifest,
}: {
  topicIds: string[];
  targetPassed: number;
  now?: () => string;
  getWord: (topicId: string) => string;
  runAttempt: (input: {
    topicId: string;
    attempt: 1 | 2;
    previousFailure?: EnglishBatchAttempt;
    passedScripts: Array<{ topicId: string; approvedScript: ScriptSegment[] }>;
  }) => Promise<AttemptResult>;
  cleanupFailedTopic: (topicId: string) => Promise<void>;
  writeManifest: (manifest: unknown) => Promise<void>;
}) => {
  englishBatchInputSchema.parse({ topicIds, targetPassed });

  const passedTopics: string[] = [];
  const retryPassedTopics: string[] = [];
  const failedTopics: Array<{
    topicId: string;
    word: string;
    finalStatus: "failed";
    attempts: EnglishBatchAttempt[];
  }> = [];
  const passedScripts: Array<{ topicId: string; approvedScript: ScriptSegment[] }> = [];

  for (const topicId of topicIds) {
    if (passedTopics.length >= targetPassed) {
      break;
    }

    const attempts: EnglishBatchAttempt[] = [];
    let passed = false;

    for (const attempt of [1, 2] as const) {
      const result = await runAttempt({
        topicId,
        attempt,
        previousFailure: attempts[attempts.length - 1],
        passedScripts,
      });

      if (result.ok) {
        passedTopics.push(topicId);
        if (attempt === 2) {
          retryPassedTopics.push(topicId);
        }
        passedScripts.push({ topicId, approvedScript: result.approvedScript });
        passed = true;
        break;
      }

      attempts.push({
        attempt,
        stage: result.stage,
        reason: result.reason,
        failedCheckIds: result.failedCheckIds,
        at: now(),
      });
    }

    if (!passed) {
      failedTopics.push({
        topicId,
        word: getWord(topicId),
        finalStatus: "failed",
        attempts,
      });
      await cleanupFailedTopic(topicId);
    }

    await writeManifest({
      id: `english-batch-${now().slice(0, 10)}`,
      createdAt: now(),
      updatedAt: now(),
      targetPassed,
      inputTopicIds: topicIds,
      passedTopicIds: passedTopics,
      retryPassedTopicIds: retryPassedTopics,
      failedTopics,
      unprocessedTopicIds: topicIds.slice(topicIds.indexOf(topicId) + 1),
    });
  }

  return {
    targetPassed,
    passed: passedTopics.length,
    firstAttemptPassed: passedTopics.length - retryPassedTopics.length,
    retryPassed: retryPassedTopics.length,
    failed: failedTopics.length,
    unprocessed: Math.max(0, topicIds.length - passedTopics.length - failedTopics.length),
    passedTopics,
    retryPassedTopics,
    failedTopics,
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/pipeline/englishBatch/runEnglishBatchQueue.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

Ask before committing. If confirmed:

```bash
git add src/lib/pipeline/englishBatch/runEnglishBatchQueue.ts tests/pipeline/englishBatch/runEnglishBatchQueue.test.ts
git commit -m "feat: add english batch queue runner"
```

## Task 8: Real Attempt Adapter

**Files:**
- Modify: `src/lib/pipeline/englishBatch/runEnglishBatchQueue.ts`
- Test: `tests/pipeline/englishBatch/runEnglishBatchQueue.integration.test.ts`

- [ ] **Step 1: Write failing integration-style test with mocked pipeline functions**

Use `vi.mock` for:

- `src/lib/pipeline/runTopicToDraft`
- `src/lib/review/approveDraft`
- `src/lib/pipeline/runApprovedToRender`
- `src/lib/quality/checkEnglishVideoQuality`
- `src/lib/review/readApprovedLesson`

Test expected behavior:

```ts
expect(runTopicToDraft).toHaveBeenCalledWith({
  topicId: "english-word-00013",
});
expect(approveDraft).toHaveBeenCalledWith({
  topicId: "english-word-00013",
  reviewNotes: ["auto-approved by english batch quality queue"],
});
expect(runApprovedToRender).toHaveBeenCalledWith({
  topicId: "english-word-00013",
  allowMockAudio: false,
});
expect(checkEnglishVideoQuality).toHaveBeenCalledWith({
  topicId: "english-word-00013",
  inspectMedia: true,
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/pipeline/englishBatch/runEnglishBatchQueue.integration.test.ts`

Expected: FAIL because real adapter is not wired.

- [ ] **Step 3: Add default real dependencies**

Add a `runEnglishBatchQueueWithDefaults` export that:

1. Reads word metadata from `readEnglishWordbank()`.
2. Calls `runTopicToDraft({ topicId })`.
3. Calls `approveDraft({ topicId, reviewNotes: ["auto-approved by english batch quality queue"] })`.
4. Calls `runApprovedToRender({ topicId, allowMockAudio: false })`.
5. Calls `checkEnglishVideoQuality({ topicId, inspectMedia: true })`.
6. Calls `checkBatchCopyUniqueness` against previously passed scripts.
7. Converts the first failed quality check into an attempt failure.
8. Calls `cleanupFailedEnglishTopic(topicId)` after two failed attempts.

Use this failure mapping:

```ts
const stageForCheckId = (checkId: string) => {
  if (checkId.startsWith("visual-")) {
    return "visual_quality" as const;
  }
  if (checkId.startsWith("audio") || checkId.startsWith("video") || checkId === "audio-provider") {
    return "audio_quality" as const;
  }
  if (checkId === "duration" || checkId === "subtitle-cue-duration" || checkId === "audio-manifest") {
    return "render_quality" as const;
  }
  return "draft_quality" as const;
};
```

- [ ] **Step 4: Run integration test**

Run: `npm test -- tests/pipeline/englishBatch/runEnglishBatchQueue.integration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

Ask before committing. If confirmed:

```bash
git add src/lib/pipeline/englishBatch/runEnglishBatchQueue.ts tests/pipeline/englishBatch/runEnglishBatchQueue.integration.test.ts
git commit -m "feat: wire english batch queue to production pipeline"
```

## Task 9: CLI Entry

**Files:**
- Modify: `src/cli/commands/batch.ts`
- Test: `tests/cli/englishBatchCommand.test.ts`

- [ ] **Step 1: Write failing CLI tests**

```ts
import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/runCli";

describe("batch english command", () => {
  it("rejects missing target", async () => {
    const result = await runCli(["batch", "english", "--from", "english-word-00013", "--to", "english-word-00014"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Missing --target/u);
  });

  it("rejects target larger than explicit range", async () => {
    const result = await runCli([
      "batch",
      "english",
      "--from",
      "english-word-00013",
      "--to",
      "english-word-00014",
      "--target",
      "3",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/targetPassed cannot exceed topicIds length/u);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli/englishBatchCommand.test.ts`

Expected: FAIL because `batch english` is unknown.

- [ ] **Step 3: Add CLI parsing**

Modify `src/cli/commands/batch.ts`:

```ts
import { resolveEnglishBatchTopics } from "../../lib/pipeline/englishBatch/resolveEnglishBatchTopics";
import { runEnglishBatchQueueWithDefaults } from "../../lib/pipeline/englishBatch/runEnglishBatchQueue";
```

Add helpers:

```ts
const readOption = (args: string[], name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const readPositiveIntegerOption = (args: string[], name: string) => {
  const raw = readOption(args, name);

  if (!raw) {
    throw new Error(`Missing ${name}`);
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
};
```

Inside `handleBatchAction` before existing branches:

```ts
  if (action === "english") {
    const topicIds = resolveEnglishBatchTopics({
      from: readOption(args, "--from"),
      to: readOption(args, "--to"),
      topicIds: readOptions(args, "--topic-id"),
    });
    const targetPassed = readPositiveIntegerOption(args, "--target");
    const report = await runEnglishBatchQueueWithDefaults({
      topicIds,
      targetPassed,
    });

    console.log(JSON.stringify(report, null, 2));

    if (report.passed < targetPassed) {
      process.exitCode = 1;
    }

    return;
  }
```

- [ ] **Step 4: Run CLI tests**

Run: `npm test -- tests/cli/englishBatchCommand.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit checkpoint**

Ask before committing. If confirmed:

```bash
git add src/cli/commands/batch.ts tests/cli/englishBatchCommand.test.ts
git commit -m "feat: add english batch CLI"
```

## Task 10: Full Verification and Course.md

**Files:**
- Modify: `Course.md`

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- tests/pipeline/englishBatch tests/quality/englishVisualQuality.test.ts tests/quality/englishVideoQuality.test.ts tests/cli/englishBatchCommand.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full regression**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run type check**

Run:

```bash
npm run lint:types
```

Expected: PASS.

- [ ] **Step 4: Update Course.md**

Add a short entry covering:

- Current status: formal English batch quality queue added.
- This round changed: explicit range/list input, serial queue, one targeted retry, fail-closed gates, failed artifact cleanup, batch report.
- Key files: new `src/lib/pipeline/englishBatch/*`, `src/lib/quality/checkEnglishVisualQuality.ts`, `src/cli/commands/batch.ts`.
- Run entry: `npm run cli -- batch english --from <topic-id> --to <topic-id> --target <n>`.
- Notes: production still requires real TTS and full quality gate; failed topics are cleaned and must be regenerated manually later.

- [ ] **Step 5: Check git status**

Run:

```bash
git status --short
```

Expected: only intended implementation files, tests, docs, and `Course.md` are changed. Do not revert pre-existing unrelated changes.

- [ ] **Step 6: Propose commit**

If the worktree contains only suitable changes or if unrelated pre-existing changes can be excluded, ask the user whether to commit. If confirmed:

```bash
git add src/lib/pipeline/englishBatch src/lib/quality/checkEnglishVisualQuality.ts src/lib/quality/checkEnglishVideoQuality.ts src/cli/commands/batch.ts tests/pipeline/englishBatch tests/quality/englishVisualQuality.test.ts tests/quality/englishVideoQuality.test.ts tests/cli/englishBatchCommand.test.ts Course.md docs/superpowers/specs/2026-05-28-english-batch-quality-queue-design.md docs/superpowers/plans/2026-05-28-english-batch-quality-queue.md
git commit -m "feat: add english batch quality queue"
```

## Self-Review

- Spec coverage: explicit range/list input is covered by Task 2 and Task 9; serial queue and one retry are covered by Task 7; failure cleanup is covered by Task 4; copy duplication gate is covered by Task 3; media/visual quality gates are covered by Task 5 and Task 6; final report and manifest shape are covered by Task 1 and Task 7; `Course.md` update is covered by Task 10.
- Placeholder scan: no task uses unresolved placeholder language or unspecified “add tests” wording.
- Type consistency: `EnglishBatchFailureStage`, `EnglishBatchAttempt`, `targetPassed`, `passedTopicIds`, `retryPassedTopicIds`, and `failedTopics` names are used consistently across schema, runner, and CLI tasks.
