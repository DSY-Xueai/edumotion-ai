import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import { access, mkdir, rm } from "node:fs/promises";
import { getTopicWorkspace } from "../../src/lib/workspace/getTopicWorkspace";
import { readTopicManifest } from "../../src/lib/workspace/readTopicManifest";
import { writeTopicManifest } from "../../src/lib/workspace/writeTopicManifest";

describe("topic manifest", () => {
  afterEach(async () => {
    process.env.TOPIC_WORKSPACE_ROOT = ".vitest/workspace/topics";
    delete process.env.TOPIC_WORKSPACE_DATE;
    await rm(".vitest/workspace/videos-date-test", {
      recursive: true,
      force: true,
    });
  });

  it("persists and reloads topic status", async () => {
    const manifest = {
      topicId: "math-b1-ch1-topic-001",
      status: "not_started" as const,
      updatedAt: "2026-04-26T00:00:00.000Z",
    };

    await writeTopicManifest(manifest);
    const loaded = await readTopicManifest("math-b1-ch1-topic-001");

    expect(loaded.status).toBe("not_started");
    expect(loaded.updatedAt).toBe("2026-04-26T00:00:00.000Z");
    await expect(
      access(
        path.join(
          getTopicWorkspace("math-b1-ch1-topic-001"),
          "manifest.json",
        ),
      ),
    ).resolves.toBeUndefined();
  });

  it("uses an isolated workspace root when TOPIC_WORKSPACE_ROOT is set", () => {
    process.env.TOPIC_WORKSPACE_ROOT = ".vitest/workspace/topics";

    expect(getTopicWorkspace("topic-isolated-001")).toContain(
      path.join(".vitest", "workspace", "topics"),
    );
  });

  it("stores new topics under the configured date and first daily sequence", () => {
    process.env.TOPIC_WORKSPACE_ROOT = ".vitest/workspace/videos-date-test";
    process.env.TOPIC_WORKSPACE_DATE = "2026-5-4";

    expect(getTopicWorkspace("math-topic-date-001")).toBe(
      path.resolve(
        ".vitest",
        "workspace",
        "videos-date-test",
        "2026-5-4",
        "01",
        "math-topic-date-001",
      ),
    );
  });

  it("reuses an existing topic archive and increments the next topic sequence", async () => {
    process.env.TOPIC_WORKSPACE_ROOT = ".vitest/workspace/videos-date-test";
    process.env.TOPIC_WORKSPACE_DATE = "2026-5-4";

    const firstTopicWorkspace = getTopicWorkspace("math-topic-date-001");
    await mkdir(firstTopicWorkspace, { recursive: true });

    expect(getTopicWorkspace("math-topic-date-001")).toBe(firstTopicWorkspace);
    expect(getTopicWorkspace("physics-topic-date-002")).toBe(
      path.resolve(
        ".vitest",
        "workspace",
        "videos-date-test",
        "2026-5-4",
        "02",
        "physics-topic-date-002",
      ),
    );
  });
});
