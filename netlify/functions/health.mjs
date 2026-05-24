import { configuredChannels } from "../lib/ai.mjs";
import { json } from "../lib/http.mjs";
import { runtimeModeFromRequest } from "../lib/runtime-mode.mjs";

export default async function handler(request) {
  const runtimeMode = runtimeModeFromRequest(request);
  return json({
    ok: true,
    runtimeMode: {
      mode: runtimeMode.mode,
      label: runtimeMode.label,
      hostname: runtimeMode.hostname
    },
    channels: configuredChannels(runtimeMode).map(({ name, model, configured, priority }) => ({ name, model, configured, priority }))
  });
}
