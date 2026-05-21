import { configuredChannels } from "../lib/ai.mjs";
import { json } from "../lib/http.mjs";

export default async function handler() {
  return json({
    ok: true,
    channels: configuredChannels().map(({ name, model, configured }) => ({ name, model, configured }))
  });
}
