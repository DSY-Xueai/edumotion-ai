import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type MinimalRenderPackage = {
  canonicalTitle: string;
  scenes: Array<{
    kind: string;
    payload: Record<string, unknown>;
    [key: string]: unknown;
  }>;
};

type VisualCheck = {
  id: string;
  ok: boolean;
  message: string;
  details?: unknown;
};

const payloadText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(payloadText).join("\n");
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(payloadText).join("\n");
  }

  return "";
};

export const checkEnglishVisualQuality = async ({
  videoPath,
  renderPackage,
}: {
  videoPath: string;
  renderPackage: MinimalRenderPackage;
}) => {
  const checks: VisualCheck[] = [];

  try {
    await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-i",
      videoPath,
      "-vf",
      "blackframe=amount=98:threshold=32",
      "-an",
      "-f",
      "null",
      "NUL",
    ]);
    checks.push({
      id: "visual-media-readable",
      ok: true,
      message: "Video frames can be inspected by ffmpeg.",
    });
  } catch (error) {
    checks.push({
      id: "visual-media-readable",
      ok: false,
      message: "Unable to inspect video frames.",
      details: error instanceof Error ? error.message : String(error),
    });
  }

  const definitionScenes = renderPackage.scenes.filter(
    (scene) => scene.kind === "definition",
  );
  const word = renderPackage.canonicalTitle.toLowerCase();
  const hasWordPayload = definitionScenes.some((scene) =>
    payloadText(scene.payload).toLowerCase().includes(word),
  );

  checks.push({
    id: "visual-word-payload",
    ok: hasWordPayload,
    message: hasWordPayload
      ? "Definition visual payload contains the target word."
      : "Definition visual payload does not contain the target word.",
  });

  const hasSubtitlePayload = definitionScenes.some((scene) =>
    /subtitleCues/u.test(JSON.stringify(scene.payload)),
  );

  checks.push({
    id: "visual-subtitle-payload",
    ok: hasSubtitlePayload,
    message: hasSubtitlePayload
      ? "Definition visual payload carries subtitle cues."
      : "Definition visual payload is missing subtitle cues.",
  });

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
};
