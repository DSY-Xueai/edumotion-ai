import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/runCli";

const mockEnv = {
  OPENAI_API_KEY: "dummy-key",
  PIPELINE_PROVIDER_MODE: "mock",
  RENDER_OUTPUT_MODE: "mock",
};

describe("topic production flow", () => {
  it("runs a topic from research to rendered artifact", async () => {
    const topicId = "math-b1-ch1-topic-001";

    expect((await runCli(["research", "run", "--topic-id", topicId], mockEnv)).exitCode).toBe(0);
    expect((await runCli(["draft", "generate", "--topic-id", topicId], mockEnv)).exitCode).toBe(0);
    expect((
      await runCli(
      ["review", "--topic-id", topicId, "--action", "approve", "--note", "pass"],
      mockEnv,
    )).exitCode).toBe(0);
    const blockedRender = await runCli(
      ["produce", "render", "--topic-id", topicId],
      mockEnv,
    );
    expect(blockedRender.exitCode).toBe(1);
    expect(blockedRender.stderr).toContain("Mock TTS is active");

    expect((
      await runCli(
        ["produce", "render", "--topic-id", topicId, "--allow-mock-audio"],
        mockEnv,
      )
    ).exitCode).toBe(0);

    const result = await runCli(["topic", "status", "--topic-id", topicId], mockEnv);

    expect(result.stdout).toContain("rendered");
  }, 15000);
});
