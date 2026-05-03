import { describe, expect, it } from "vitest";
import { getSubjectAdapter } from "../../src/lib/pipeline/getSubjectAdapter";

describe("getSubjectAdapter", () => {
  it("returns a math adapter with a math visual system id", () => {
    const adapter = getSubjectAdapter("math");

    expect(adapter.subject).toBe("math");
    expect(adapter.visualSystemId).toBe("math");
  });

  it("returns a physics adapter with a physics visual system id", () => {
    const adapter = getSubjectAdapter("physics");

    expect(adapter.subject).toBe("physics");
    expect(adapter.visualSystemId).toBe("physics");
  });

  it("returns a chemistry adapter with a chemistry visual system id", () => {
    const adapter = getSubjectAdapter("chemistry");

    expect(adapter.subject).toBe("chemistry");
    expect(adapter.visualSystemId).toBe("chemistry");
  });

  it("builds math scene payloads with board-ready knowledge cues", () => {
    const adapter = getSubjectAdapter("math");

    const scene = adapter.mapScene({
      canonicalTitle: "集合的概念",
      sourceSummary: {
        canonicalTitle: "集合的概念",
        definitions: ["一般地，指定的某些对象的全体称为一个集合。"],
        formulas: ["A={1,2,3}"],
        principles: ["集合中的元素是确定的、互异的、无序的。"],
        examples: ["{1,2,3} 与 {3,2,1} 表示同一个集合。"],
        misconceptions: ["元素重复会得到新的集合。"],
        prerequisites: ["自然数与对象分类的基础经验。"],
        nextConnections: ["后续会进入元素与集合的关系。"],
        visualizationHints: ["用大括号和元素卡片表示集合。"],
        sources: [],
      },
      scene: {
        id: "scene-1",
        type: "definition",
        segmentIds: ["seg-1"],
        narration: "集合是研究一类对象整体的基本方式。",
        startMs: 0,
        endMs: 2400,
        durationMs: 2400,
        targetDurationMs: 3000,
        segments: [],
        subtitleCues: [],
      },
    });

    expect(scene.component).toBe("math/definition");
    expect(scene.payload).toMatchObject({
      boardTitle: "集合表达",
      boardExpression: "A={1,2,3}",
      keyPoints: expect.arrayContaining([
        "一般地，指定的某些对象的全体称为一个集合。",
        "集合中的元素是确定的、互异的、无序的。",
      ]),
    });
  });

  it("builds physics scene payloads with variable and law cards", () => {
    const adapter = getSubjectAdapter("physics");

    const scene = adapter.mapScene({
      canonicalTitle: "牛顿第二定律",
      sourceSummary: {
        canonicalTitle: "牛顿第二定律",
        definitions: ["物体的加速度跟它所受的合力成正比。"],
        formulas: ["F=ma"],
        principles: ["合力方向决定加速度方向。"],
        examples: ["小车在拉力作用下加速前进。"],
        misconceptions: ["速度方向就是受力方向。"],
        prerequisites: ["力与运动的初步概念。"],
        nextConnections: ["受力分析与动力学应用。"],
        visualizationHints: ["用箭头和变量条表示受力关系。"],
        sources: [],
      },
      scene: {
        id: "scene-2",
        type: "process",
        segmentIds: ["seg-2"],
        narration: "先看合力，再判断加速度方向和大小。",
        startMs: 0,
        endMs: 2800,
        durationMs: 2800,
        targetDurationMs: 3200,
        segments: [],
        subtitleCues: [],
      },
    });

    expect(scene.component).toBe("physics/process");
    expect(scene.payload).toMatchObject({
      lawCard: "F=ma",
      variableCards: expect.arrayContaining([
        expect.objectContaining({ label: "F", meaning: expect.any(String) }),
        expect.objectContaining({ label: "a", meaning: expect.any(String) }),
      ]),
      processSteps: expect.arrayContaining([
        expect.stringContaining("合力"),
        expect.stringContaining("加速度"),
      ]),
    });
  });

  it("builds chemistry scene payloads with reaction and lab cues", () => {
    const adapter = getSubjectAdapter("chemistry");

    const scene = adapter.mapScene({
      canonicalTitle: "氧化还原反应的特征",
      sourceSummary: {
        canonicalTitle: "氧化还原反应的特征",
        definitions: ["有电子转移的反应属于氧化还原反应。"],
        formulas: ["2H₂ + O₂ → 2H₂O"],
        principles: ["反应前后原子守恒，电子在微观上转移。"],
        examples: ["氢气在氧气中燃烧生成水。"],
        misconceptions: ["只有出现氧才算氧化还原。"],
        prerequisites: ["化学反应与化学方程式基础。"],
        nextConnections: ["氧化剂、还原剂与电子守恒。"],
        visualizationHints: ["用反应箭头和粒子排布展示变化。"],
        sources: [],
      },
      scene: {
        id: "scene-3",
        type: "compare",
        segmentIds: ["seg-3"],
        narration: "宏观看现象，微观看电子转移。",
        startMs: 0,
        endMs: 2600,
        durationMs: 2600,
        targetDurationMs: 3000,
        segments: [],
        subtitleCues: [],
      },
    });

    expect(scene.component).toBe("chemistry/compare");
    expect(scene.payload).toMatchObject({
      reactionLine: "2H₂ + O₂ → 2H₂O",
      labNotes: expect.arrayContaining([
        expect.stringContaining("原子守恒"),
        expect.stringContaining("电子"),
      ]),
      particleLabels: expect.arrayContaining(["反应前", "反应后"]),
    });
  });
});
