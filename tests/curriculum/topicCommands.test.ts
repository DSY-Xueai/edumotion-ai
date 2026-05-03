import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/runCli";

describe("curriculum command", () => {
  it("lists topics for a subject and volume", async () => {
    const result = await runCli(["curriculum", "list", "--subject", "math"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("math");
  });

  it("lists topics for physics and chemistry too", async () => {
    const physics = await runCli(["curriculum", "list", "--subject", "physics"]);
    const chemistry = await runCli(["curriculum", "list", "--subject", "chemistry"]);

    expect(physics.exitCode).toBe(0);
    expect(physics.stdout).toContain("physics-b1-ch1-topic-001");
    expect(chemistry.exitCode).toBe(0);
    expect(chemistry.stdout).toContain("chemistry-b1-ch1-topic-001");
  });
});

describe("topic command", () => {
  it("finds the next topic from a current topic id", async () => {
    const result = await runCli([
      "topic",
      "next",
      "--topic-id",
      "math-b1-ch1-topic-001",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("nextTopicId");
  });
});
