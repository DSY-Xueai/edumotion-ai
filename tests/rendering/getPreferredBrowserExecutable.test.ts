import { describe, expect, it } from "vitest";
import { getPreferredBrowserExecutable } from "../../src/lib/rendering/getPreferredBrowserExecutable";

describe("getPreferredBrowserExecutable", () => {
  it("returns the first available local browser path", async () => {
    const executable = await getPreferredBrowserExecutable({
      candidates: ["C:\\missing\\chrome.exe", "C:\\chrome\\chrome.exe"],
      pathExists: async (candidate) => candidate === "C:\\chrome\\chrome.exe",
    });

    expect(executable).toBe("C:\\chrome\\chrome.exe");
  });

  it("returns null when no local browser is available", async () => {
    const executable = await getPreferredBrowserExecutable({
      candidates: ["C:\\missing\\chrome.exe"],
      pathExists: async () => false,
    });

    expect(executable).toBeNull();
  });
});
