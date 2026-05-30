import { describe, expect, it } from "vitest";
import { checkBatchCopyUniqueness } from "../../../src/lib/pipeline/englishBatch/checkBatchCopyUniqueness";

const script = (word: string, story: string) => [
  { id: `${word}-hook`, kind: "hook", text: "一秒钟记一个单词。" },
  {
    id: `${word}-definition`,
    kind: "definition",
    text: `今天要记的单词是 ${word}，意思是：测试。`,
  },
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
