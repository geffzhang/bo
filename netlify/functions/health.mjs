import { channelConfigWarnings, configuredChannels } from "../lib/ai.mjs";
import { json } from "../lib/http.mjs";
import { runtimeModeFromRequest } from "../lib/runtime-mode.mjs";
import { getStorageBackendStatus } from "../lib/store.mjs";

export default async function handler(request) {
  const runtimeMode = runtimeModeFromRequest(request);
  const channels = configuredChannels(runtimeMode);
  const configWarnings = channelConfigWarnings(runtimeMode, channels);
  const storage = await getStorageBackendStatus();
  return json({
    ok: true,
    runtimeMode: {
      mode: runtimeMode.mode,
      label: runtimeMode.label,
      hostname: runtimeMode.hostname
    },
    channels: channels.map(
      ({ name, scope, baseUrl, baseUrlSource, model, modelSource, resolvedFrom, conflicts, configured, priority }) => ({
      name,
      scope,
      baseUrl,
      baseUrlSource,
      model,
      modelSource,
      resolvedFrom,
      conflicts,
      configured,
      priority
    })
    ),
    configWarnings,
    storage
  });
}
