import { existsSync } from "node:fs";
import { open } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import type { ProviderConfig } from "./config";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const parseBaseUrl = (value: string) => {
  const parsed = new URL(value);

  return {
    host: parsed.hostname,
    port: Number(parsed.port || "8020"),
    origin: trimTrailingSlash(parsed.origin),
  };
};

const resolvePythonExecutable = async () => {
  const candidates = [
    path.join(process.cwd(), ".venv-qwen", "Scripts", "python.exe"),
    path.join(process.cwd(), ".venv-qwen", "Scripts", "python"),
    "python",
  ];

  return candidates.find((candidate) => candidate === "python" || existsSync(candidate)) ?? "python";
};

const waitForHealth = async (baseUrl: string, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${trimTrailingSlash(baseUrl)}/health`);

      if (response.ok) {
        const payload = (await response.json()) as {
          status?: unknown;
          modelType?: unknown;
        };

        if (payload.status === "ok" && payload.modelType === "base") {
          return;
        }
      }
    } catch {
      // Keep waiting for the local server to finish loading.
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(`Timed out waiting for Qwen TTS clone server at ${baseUrl}`);
};

let autoStartPromise: Promise<void> | undefined;

export const ensureQwenTtsCloneServer = async (config: ProviderConfig) => {
  if (!config.QWEN_TTS_AUTO_START) {
    return;
  }

  const baseUrl = trimTrailingSlash(config.QWEN_TTS_BASE_URL);

  try {
    const response = await fetch(`${baseUrl}/health`);

    if (response.ok) {
      const payload = (await response.json()) as {
        status?: unknown;
        modelType?: unknown;
      };

      if (payload.status === "ok" && payload.modelType === "base") {
        return;
      }

      if (payload.status === "ok") {
        throw new Error(
          `Qwen TTS endpoint at ${baseUrl} is already running but is not the Base clone server. Stop the existing process or point QWEN_TTS_BASE_URL to a free port.`,
        );
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("not the Base clone server")) {
      throw error;
    }
  }

  if (!autoStartPromise) {
    autoStartPromise = (async () => {
      const { host, port } = parseBaseUrl(baseUrl);
      const python = await resolvePythonExecutable();
      const serverScript = path.join(
        process.cwd(),
        "tools",
        "qwen_tts_server",
        "server.py",
      );
      const stdoutPath = path.join(process.cwd(), ".qwen-auto-start.stdout.log");
      const stderrPath = path.join(process.cwd(), ".qwen-auto-start.stderr.log");
      const stdoutHandle = await open(stdoutPath, "a");
      const stderrHandle = await open(stderrPath, "a");

      const args = [
        serverScript,
        "--model-dir",
        config.QWEN_TTS_AUTO_START_MODEL_DIR,
        "--host",
        host,
        "--port",
        String(port),
        "--device-map",
        config.QWEN_TTS_AUTO_START_DEVICE_MAP,
        "--dtype",
        config.QWEN_TTS_AUTO_START_DTYPE,
        "--ref-audio",
        path.isAbsolute(config.QWEN_TTS_AUTO_START_REF_AUDIO)
          ? config.QWEN_TTS_AUTO_START_REF_AUDIO
          : path.join(process.cwd(), config.QWEN_TTS_AUTO_START_REF_AUDIO),
      ];

      if (config.QWEN_TTS_AUTO_START_REF_TEXT && !config.QWEN_TTS_AUTO_START_X_VECTOR_ONLY_MODE) {
        args.push("--ref-text", config.QWEN_TTS_AUTO_START_REF_TEXT);
      }

      if (config.QWEN_TTS_AUTO_START_X_VECTOR_ONLY_MODE) {
        args.push("--x-vector-only-mode");
      }

      const child = spawn(python, args, {
        cwd: process.cwd(),
        detached: true,
        env: {
          ...process.env,
          PYTHONPATH: [
            process.cwd(),
            process.env.PYTHONPATH,
          ].filter(Boolean).join(path.delimiter),
        },
        stdio: ["ignore", stdoutHandle.fd, stderrHandle.fd],
      });
      child.unref();

      await stdoutHandle.close();
      await stderrHandle.close();

      await waitForHealth(baseUrl, 20 * 60 * 1000);
    })().finally(() => {
      autoStartPromise = undefined;
    });
  }

  await autoStartPromise;
  return;
};
