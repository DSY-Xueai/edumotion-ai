import { describe, expect, it } from "vitest";
import { splitNarrationText } from "../../src/lib/audio/splitNarrationText";

describe("splitNarrationText", () => {
  it("splits compact English mnemonic questions at real soft breaks before TTS", () => {
    expect(splitNarrationText("怎么记 有能力的、出色的？")).toEqual([
      "怎么记 有能力的、",
      "出色的？",
    ]);
  });

  it("keeps short prefix phrases attached to the sentence", () => {
    expect(splitNarrationText("所以：able，就是有能力的、出色的。")).toEqual([
      "所以：able，就是有能力的、出色的。",
    ]);
  });
});
