import { probeRuntimeProvider } from "../../lib/providers/probeRuntimeProvider";

export const handleProviderAction = async (action: string, args: string[]) => {
  if (action !== "probe") {
    throw new Error(`Unknown provider action: ${action}`);
  }

  const includeTts = args.includes("--include-tts");
  const result = await probeRuntimeProvider({ includeTts });
  console.log(JSON.stringify(result, null, 2));
};
