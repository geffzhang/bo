const INTL_CHANNELS = ["international-primary", "international-secondary"];
const CN_CHANNELS = ["china-primary", "china-secondary"];

export const INTL_RESEARCH_MODELS = [
  "deepseek-ai/DeepSeek-V4-Flash",
  "deepseek-ai/DeepSeek-V4-Pro",
  "zai-org/GLM-5.1",
  "Qwen/Qwen3.6-35B-A3B",
  "moonshotai/Kimi-K2.6"
];
export const CN_RESEARCH_MODELS = [
  "Pro/deepseek-ai/DeepSeek-V3.2",
  "Pro/zai-org/GLM-5.1",
  "Qwen/Qwen3.6-35B-A3B",
  "Pro/moonshotai/Kimi-K2.6"
];

function cleanHost(hostname = "") {
  return String(hostname || "")
    .split(",")[0]
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase();
}

export function runtimeModeFromHostname(hostname = "") {
  const host = cleanHost(hostname);
  const first = host.split(".")[0] || "";
  const isCn = first === "cn" || first.endsWith("-cn");
  const isIntl = first === "intl" || first.endsWith("-intl");
  if (isCn) {
    return {
      mode: "china",
      label: "国内优先",
      hostname: host,
      channelOrder: [...CN_CHANNELS, ...INTL_CHANNELS],
      researchModels: [...CN_RESEARCH_MODELS, ...INTL_RESEARCH_MODELS]
    };
  }
  if (isIntl) {
    return {
      mode: "international",
      label: "国际优先",
      hostname: host,
      channelOrder: [...INTL_CHANNELS, ...CN_CHANNELS],
      researchModels: [...INTL_RESEARCH_MODELS, ...CN_RESEARCH_MODELS]
    };
  }
  return {
    mode: "auto",
    label: "国际优先｜失败自动切国内",
    hostname: host,
    channelOrder: [...INTL_CHANNELS, ...CN_CHANNELS],
    researchModels: [...INTL_RESEARCH_MODELS, ...CN_RESEARCH_MODELS]
  };
}

function modeFromPath(pathname = "") {
  const first = String(pathname || "")
    .split("/")
    .filter(Boolean)[0]
    ?.toLowerCase();
  if (/^(cn|china|domestic)$/.test(first || "")) return "china";
  if (/^(intl|international)$/.test(first || "")) return "international";
  return "";
}

export function runtimeModeFromRequest(request) {
  let parsedUrl = null;
  try {
    parsedUrl = new URL(request.url);
  } catch {
    parsedUrl = null;
  }
  const urlHost = parsedUrl?.host || "";
  const explicitMode = parsedUrl?.searchParams.get("mode") || request.headers.get("x-nb-bo-runtime-mode") || "";
  if (/^(cn|china|domestic)$/i.test(explicitMode)) return runtimeModeFromHostname("cn.local");
  if (/^(intl|international)$/i.test(explicitMode)) return runtimeModeFromHostname("intl.local");
  const pathMode = modeFromPath(parsedUrl?.pathname || "");
  if (pathMode === "china") return runtimeModeFromHostname("cn.local");
  if (pathMode === "international") return runtimeModeFromHostname("intl.local");
  const referer = request.headers.get("referer") || "";
  try {
    const refererMode = modeFromPath(new URL(referer).pathname);
    if (refererMode === "china") return runtimeModeFromHostname("cn.local");
    if (refererMode === "international") return runtimeModeFromHostname("intl.local");
  } catch {
    // Ignore malformed referer values.
  }
  const forwardedHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.headers.get("x-original-host") ||
    urlHost;
  return runtimeModeFromHostname(forwardedHost);
}

export function normalizeRuntimeMode(value) {
  if (value && typeof value === "object" && Array.isArray(value.channelOrder)) return value;
  if (typeof value === "string") {
    if (value === "china") return runtimeModeFromHostname("cn.local");
    if (value === "international") return runtimeModeFromHostname("intl.local");
  }
  return runtimeModeFromHostname("");
}
