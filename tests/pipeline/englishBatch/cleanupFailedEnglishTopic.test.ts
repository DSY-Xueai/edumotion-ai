import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { cleanupFailedEnglishTopic } from "../../../src/lib/pipeline/englishBatch/cleanupFailedEnglishTopic";

const exists = async (filePath: string) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

describe("cleanupFailedEnglishTopic", () => {
  it("removes failed artifacts and keeps manifest/report files outside topic output", async () => {
    const root = path.join(process.cwd(), ".tmp-cleanup-failed-topic");
    vi.stubEnv("TOPIC_WORKSPACE_ROOT", root);
    vi.stubEnv("TOPIC_WORKSPACE_DATE", "2026-05-28");

    const topicRoot = path.join(
      root,
      "2026-05-28",
      "01",
      "english-word-00013",
    );
    await mkdir(path.join(topicRoot, "draft"), { recursive: true });
    await mkdir(path.join(topicRoot, "approved"), { recursive: true });
    await mkdir(path.join(topicRoot, "audio"), { recursive: true });
    await mkdir(path.join(topicRoot, "render"), { recursive: true });
    await writeFile(path.join(topicRoot, "draft", "lesson.json"), "{}");
    await writeFile(path.join(topicRoot, "approved", "lesson.json"), "{}");
    await writeFile(path.join(topicRoot, "audio", "seg.wav"), "audio");
    await writeFile(path.join(topicRoot, "render", "video.mp4"), "video");

    const publicAudio = path.join(
      process.cwd(),
      "public",
      "generated",
      "english-word-00013",
      "audio",
    );
    await mkdir(publicAudio, { recursive: true });
    await writeFile(path.join(publicAudio, "seg.wav"), "audio");

    await cleanupFailedEnglishTopic("english-word-00013");

    expect(await exists(path.join(topicRoot, "draft", "lesson.json"))).toBe(
      false,
    );
    expect(await exists(path.join(topicRoot, "approved", "lesson.json"))).toBe(
      false,
    );
    expect(await exists(path.join(topicRoot, "audio", "seg.wav"))).toBe(false);
    expect(await exists(path.join(topicRoot, "render", "video.mp4"))).toBe(
      false,
    );
    expect(await exists(path.join(publicAudio, "seg.wav"))).toBe(false);
  });
});
