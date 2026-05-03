import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/.worktrees/**", "**/node_modules/**", "**/out/**"],
    env: {
      TOPIC_WORKSPACE_ROOT: ".vitest/workspace/topics",
    },
  },
});
