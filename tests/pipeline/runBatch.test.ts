import { describe, expect, it } from "vitest";
import { readTopicManifest } from "../../src/lib/workspace/readTopicManifest";
import { runBatch } from "../../src/lib/pipeline/runBatch";

describe("runBatch", () => {
  it("processes multiple topics without throwing", async () => {
    process.env.OPENAI_API_KEY = "dummy-key";
    process.env.PIPELINE_PROVIDER_MODE = "mock";
    await runBatch({
      topicIds: ["math-b1-ch1-topic-001", "math-b1-ch1-topic-002"],
      allowMockAudio: true,
    });

    const first = await readTopicManifest("math-b1-ch1-topic-001");
    const second = await readTopicManifest("math-b1-ch1-topic-002");

    expect(first.status).toBeTruthy();
    expect(second.status).toBeTruthy();
  });
});
