import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/runCli";

describe("batch english command", () => {
  it("rejects missing target", async () => {
    const result = await runCli([
      "batch",
      "english",
      "--from",
      "english-word-00013",
      "--to",
      "english-word-00014",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Missing --target/u);
  });

  it("rejects target larger than explicit range", async () => {
    const result = await runCli([
      "batch",
      "english",
      "--from",
      "english-word-00013",
      "--to",
      "english-word-00014",
      "--target",
      "3",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/targetPassed cannot exceed topicIds length/u);
  });
});
