import { describe, expect, it } from "vitest";
import {
  getStatusForRevisionAction,
  revisionActionInputSchema,
  revisionActionSchema,
} from "../../src/lib/review/revisionActions";

describe("revision action contract", () => {
  it("accepts approve, regenerate, and edit actions", () => {
    const approve = revisionActionInputSchema.parse({
      action: "approve",
      reviewNotes: ["内容通过"],
    });
    const regenerate = revisionActionInputSchema.parse({
      action: "regenerate",
      reviewNotes: ["重写 hook 段"],
    });
    const edit = revisionActionInputSchema.parse({
      action: "edit",
      reviewNotes: ["保留结构，只修正文案"],
    });

    expect(approve.action).toBe("approve");
    expect(regenerate.action).toBe("regenerate");
    expect(edit.action).toBe("edit");
  });

  it("maps review actions to workflow statuses", () => {
    expect(getStatusForRevisionAction("approve")).toBe("approved");
    expect(getStatusForRevisionAction("regenerate")).toBe(
      "revision_requested",
    );
    expect(getStatusForRevisionAction("edit")).toBe("revision_requested");
  });

  it("rejects unknown actions", () => {
    expect(() => revisionActionSchema.parse("ship")).toThrow();
  });
});
