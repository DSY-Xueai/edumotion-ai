import { access } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { saveDraft } from "../../src/lib/draft/saveDraft";
import { saveResearch } from "../../src/lib/research/saveResearch";
import { approveDraft } from "../../src/lib/review/approveDraft";
import { readApprovedLesson } from "../../src/lib/review/readApprovedLesson";
import { getTopicWorkspace } from "../../src/lib/workspace/getTopicWorkspace";
import { readTopicManifest } from "../../src/lib/workspace/readTopicManifest";

describe("approveDraft", () => {
  it("freezes approved script, storyboard, and source summary into the approved workspace", async () => {
    const topicId = "review-topic-approve-001";
    const approvedAt = "2026-04-26T08:00:00.000Z";

    await saveResearch({
      topicId,
      scope: "topic",
      canonicalTitle: "集合的含义",
      definitions: ["确定对象组成的整体"],
      formulas: [],
      principles: ["元素与集合的从属关系"],
      examples: ["小于 5 的自然数组成的集合"],
      misconceptions: ["集合里的元素可以重复计数"],
      prerequisites: [],
      nextConnections: ["集合间关系"],
      visualizationHints: ["用花括号包裹元素"],
      sources: [
        {
          title: "教材",
          url: "https://example.com/textbook",
          sourceType: "official",
          publisher: "PEP",
          retrievedAt: "2026-04-26",
          quoteOrSummary: "集合是一些确定对象的总体。",
        },
      ],
    });

    await saveDraft({
      topicId,
      toneProfile: "clear",
      durationTargetSec: 75,
      hook: "先别急着背定义。",
      summary: "认识集合的基本含义。",
      scriptSegments: [
        { id: "seg-1", kind: "hook", text: "先别急着背定义。" },
        { id: "seg-2", kind: "definition", text: "集合是确定对象的整体。" },
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
        { id: "sub-2", segmentId: "seg-2", text: "集合是确定对象的整体。" },
      ],
      visualPlan: ["花括号高亮"],
      qaNotes: [],
    });

    const approved = await approveDraft({
      topicId,
      approvedAt,
      reviewNotes: ["定义表述可直接进入后续阶段。"],
    });

    await saveDraft({
      topicId,
      toneProfile: "clear",
      durationTargetSec: 75,
      hook: "这个版本不该覆盖已审批脚本。",
      summary: "修改后的草稿摘要。",
      scriptSegments: [
        {
          id: "seg-1",
          kind: "hook",
          text: "这个版本不该覆盖已审批脚本。",
        },
      ],
      storyboardScenes: [
        {
          id: "scene-1",
          type: "hook",
          segmentIds: ["seg-1"],
          durationSec: 8,
        },
      ],
      subtitleDraft: [
        {
          id: "sub-1",
          segmentId: "seg-1",
          text: "这个版本不该覆盖已审批脚本。",
        },
      ],
      visualPlan: ["替换后的可视化"],
      qaNotes: ["should not affect approved snapshot"],
    });

    const stored = await readApprovedLesson(topicId);
    const manifest = await readTopicManifest(topicId);

    expect(approved.version).toBe(1);
    expect(approved.approvedAt).toBe(approvedAt);
    expect(approved.reviewNotes).toEqual(["定义表述可直接进入后续阶段。"]);
    expect(approved.approvedScript).toHaveLength(2);
    expect(approved.approvedScript[0]?.text).toBe("先别急着背定义。");
    expect(approved.approvedStoryboard[1]?.type).toBe("definition");
    expect(approved.sourceSummary.canonicalTitle).toBe("集合的含义");
    expect(stored).toEqual(approved);
    expect(stored.approvedScript[0]?.text).toBe("先别急着背定义。");
    expect(manifest.status).toBe("approved");
    expect(manifest.updatedAt).toBe(approvedAt);
    await expect(
      access(
        path.join(
          getTopicWorkspace(topicId),
          "approved",
          "lesson.json",
        ),
      ),
    ).resolves.toBeUndefined();
  });
});
