import { spawn } from "node:child_process";
import path from "node:path";

type CliResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export const runCli = async (
  args: string[],
  envOverrides: Record<string, string> = {},
): Promise<CliResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
        "src/cli/index.ts",
        ...args,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, ...envOverrides },
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 1,
      });
    });
  });
