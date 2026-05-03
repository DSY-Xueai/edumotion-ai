import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/runCli";

describe("provider command", () => {
  it("reports a healthy mock provider probe without requiring network access", async () => {
    const result = await runCli(["provider", "probe"], {
      PIPELINE_PROVIDER_MODE: "mock",
      RENDER_OUTPUT_MODE: "real",
      OPENAI_API_KEY: "",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"providerMode": "mock"');
    expect(result.stdout).toContain('"healthy": true');
    expect(result.stdout).toContain('"structuredOutput": "mock-ready"');
  });
});
