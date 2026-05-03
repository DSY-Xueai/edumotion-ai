import { access } from "node:fs/promises";

const defaultCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

export const getPreferredBrowserExecutable = async ({
  candidates = defaultCandidates,
  pathExists = async (candidate: string) => {
    try {
      await access(candidate);
      return true;
    } catch {
      return false;
    }
  },
}: {
  candidates?: string[];
  pathExists?: (candidate: string) => Promise<boolean>;
} = {}): Promise<string | null> => {
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
};
