import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const getTopicWorkspaceRoot = () => {
  const configuredRoot = process.env.TOPIC_WORKSPACE_ROOT;

  if (!configuredRoot) {
    return path.join(process.cwd(), "workspace", "videos");
  }

  return path.isAbsolute(configuredRoot)
    ? configuredRoot
    : path.join(process.cwd(), configuredRoot);
};

const getWorkspaceDate = () => {
  const configuredDate = process.env.TOPIC_WORKSPACE_DATE?.trim();

  if (configuredDate) {
    return configuredDate;
  }

  const now = new Date();

  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
};

const isDirectory = (targetPath: string) => {
  try {
    return statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
};

const findExistingTopicWorkspace = (root: string, topicId: string) => {
  if (!existsSync(root)) {
    return undefined;
  }

  const legacyWorkspace = path.join(root, topicId);
  if (isDirectory(legacyWorkspace)) {
    return legacyWorkspace;
  }

  for (const dateEntry of readdirSync(root, { withFileTypes: true })) {
    if (!dateEntry.isDirectory()) {
      continue;
    }

    const dateDirectory = path.join(root, dateEntry.name);

    for (const sequenceEntry of readdirSync(dateDirectory, {
      withFileTypes: true,
    })) {
      if (!sequenceEntry.isDirectory()) {
        continue;
      }

      const topicWorkspace = path.join(
        dateDirectory,
        sequenceEntry.name,
        topicId,
      );

      if (isDirectory(topicWorkspace)) {
        return topicWorkspace;
      }
    }
  }

  return undefined;
};

const getNextSequence = (dateDirectory: string) => {
  if (!existsSync(dateDirectory)) {
    return "01";
  }

  const maxSequence = readdirSync(dateDirectory, { withFileTypes: true }).reduce(
    (max, entry) => {
      if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) {
        return max;
      }

      return Math.max(max, Number(entry.name));
    },
    0,
  );

  return String(maxSequence + 1).padStart(2, "0");
};

export const getTopicWorkspace = (topicId: string) => {
  const root = getTopicWorkspaceRoot();
  const existingWorkspace = findExistingTopicWorkspace(root, topicId);

  if (existingWorkspace) {
    return existingWorkspace;
  }

  const dateDirectory = path.join(root, getWorkspaceDate());

  return path.join(dateDirectory, getNextSequence(dateDirectory), topicId);
};
