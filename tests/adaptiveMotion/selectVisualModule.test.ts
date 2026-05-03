import { describe, expect, it } from "vitest";
import { selectVisualModule } from "../../src/compositions/adaptiveMotion/selectVisualModule";
import type { RenderPackageScene } from "../../src/lib/rendering/schema";

const scene = (
  payload: RenderPackageScene["payload"],
  kind = "graph",
  componentSubject = "physics",
): RenderPackageScene => ({
  id: "scene-1",
  kind,
  component: `${componentSubject}/${kind}`,
  durationInFrames: 300,
  payload,
});

describe("selectVisualModule", () => {
  it("routes refraction scenes to an optics ray diagram instead of reusing circular motion visuals", () => {
    expect(
      selectVisualModule({
        subject: "physics",
        scene: scene({
          title: "光的折射原理",
          narration: "光从空气斜射入水中，折射光线向法线偏折。",
          lawCard: "n1 sin i = n2 sin r",
          processSteps: ["先画界面", "再画法线", "最后画入射光线和折射光线"],
          observationNote: "用空气和水的分界面、法线、入射光线、折射光线构成主画面。",
        }),
      }),
    ).toBe("optics-ray");
  });

  it("keeps circular motion scenes on the motion diagram", () => {
    expect(
      selectVisualModule({
        subject: "physics",
        scene: scene({
          title: "匀速圆周运动",
          narration: "速度方向沿圆轨迹切线不断变化。",
          lawCard: "v=2πr/T",
          processSteps: ["画圆轨迹", "标出切向速度", "标出向心加速度"],
        }),
      }),
    ).toBe("motion-diagram");
  });

  it("does not reuse the circular motion diagram for general mechanics formulas", () => {
    expect(
      selectVisualModule({
        subject: "physics",
        scene: scene({
          title: "牛顿第二定律",
          narration: "物体的加速度跟它受到的合外力成正比。",
          lawCard: "F=ma",
          processSteps: ["分析受力", "确定合力", "判断加速度"],
          observationNote: "用力和加速度方向建立因果关系。",
        }, "rule"),
      }),
    ).toBe("formula-board");
  });

  it("does not force every math topic with a title-like board expression into the formula board", () => {
    expect(
      selectVisualModule({
        subject: "math",
        scene: scene({
          title: "函数单调性",
          narration: "单调性描述函数值随自变量变化的趋势。",
          boardExpression: "函数单调性",
          keyPoints: ["增函数", "减函数", "区间"],
        }, "definition", "math"),
      }),
    ).toBe("concept-map");
  });

  it("does not force chemistry classification topics into the particle lab", () => {
    expect(
      selectVisualModule({
        subject: "chemistry",
        scene: scene({
          title: "物质的分类",
          narration: "先按组成和性质对物质分类，再建立类别之间的关系。",
          reactionLine: "物质 -> 纯净物 / 混合物",
          particleLabels: ["类别", "性质"],
          labNotes: ["按组成分类", "按性质比较", "建立分类树"],
          compareFocus: "分类是为了更快判断物质的性质。",
        }, "compare", "chemistry"),
      }),
    ).toBe("process-flow");
  });
});
