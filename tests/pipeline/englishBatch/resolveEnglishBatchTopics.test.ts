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

  it("rejects duplicate explicit topic ids", () => {
    expect(() =>
      resolveEnglishBatchTopics({
        topicIds: ["english-word-00013", "english-word-00013"],
      }),
    ).toThrow(/Duplicate topic id/u);
  });

  it("rejects invalid topic id formats", () => {
    expect(() =>
      resolveEnglishBatchTopics({
        topicIds: ["word-00013"],
      }),
    ).toThrow(/Invalid English topic id/u);

    expect(() =>
      resolveEnglishBatchTopics({
        topicIds: ["english-word-13"],
      }),
    ).toThrow(/Invalid English topic id/u);
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

  it("rejects missing topic input", () => {
    expect(() => resolveEnglishBatchTopics({})).toThrow(
      /Missing --from\/--to or --topic-id/u,
    );
  });

  it("rejects a range with only from", () => {
    expect(() =>
      resolveEnglishBatchTopics({
        from: "english-word-00013",
      }),
    ).toThrow(/Missing --from\/--to or --topic-id/u);
  });

  it("rejects a range with only to", () => {
    expect(() =>
      resolveEnglishBatchTopics({
        to: "english-word-00013",
      }),
    ).toThrow(/Missing --from\/--to or --topic-id/u);
  });

  it("expands a single-item range", () => {
    expect(
      resolveEnglishBatchTopics({
        from: "english-word-00013",
        to: "english-word-00013",
      }),
    ).toEqual(["english-word-00013"]);
  });
});
