import path from "node:path";
import { inspectProviderConfig } from "../../lib/providers/config";
import { getPreferredBrowserExecutable } from "../../lib/rendering/getPreferredBrowserExecutable";
import { getTopicWorkspaceRoot } from "../../lib/workspace/getTopicWorkspace";

export const handleDoctor = async () => {
  const config = inspectProviderConfig();
  const browserExecutable = await getPreferredBrowserExecutable();
  const workspaceRoot = getTopicWorkspaceRoot();
  const publicGeneratedRoot = path.join(process.cwd(), "public", "generated");

  console.log(
    JSON.stringify(
      {
        ok: true,
        providerMode: config.providerMode,
        renderMode: config.renderMode,
        ttsProvider: config.ttsProvider,
        effectiveTtsMode: config.effectiveTtsMode,
        mockAudioFallbackActive: config.mockAudioFallbackActive,
        ttsVoice: config.ttsVoice,
        openaiBaseUrl: config.openaiBaseUrl,
        requiresApiKey: config.requiresApiKey,
        apiKeyConfigured: config.apiKeyConfigured,
        browserExecutableFound: Boolean(browserExecutable),
        browserExecutable,
        workspaceRoot,
        publicGeneratedRoot,
        legacyRenderEntryRetired: true,
        runtimeNote: config.requiresApiKey
          ? "This project needs a runtime provider key only when you want the CLI to call a real model by itself."
          : "Current mode does not require a runtime provider key.",
        audioNote: config.mockAudioFallbackActive
          ? "Current settings will generate placeholder tone audio unless you enable real OpenAI TTS or explicitly allow mock audio for testing."
          : config.requiresApiKey && !config.apiKeyConfigured
            ? "Real narration mode is configured, but audio generation is blocked until OPENAI_API_KEY is set."
            : "Current settings are ready to generate spoken narration audio.",
      },
      null,
      2,
    ),
  );
};
