import { env } from "./util.mjs";

const DEFAULT_CHANNELS = ["default-primary"];

function parseModelList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export const RESEARCH_MODELS = (() => {
  const configured = parseModelList(env("OPENAI_COMPAT_RESEARCH_FALLBACK_MODELS"));
  if (configured.length) return configured;
  const primary = String(env("OPENAI_COMPAT_MODEL") || "").trim();
  return primary ? [primary] : [];
})();

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
      label: "统一模型（cn 路径）",
      hostname: host,
      channelOrder: [...DEFAULT_CHANNELS],
      researchModels: [...RESEARCH_MODELS]
    };
  }
  if (isIntl) {
    return {
      mode: "international",
      label: "统一模型（intl 路径）",
      hostname: host,
      channelOrder: [...DEFAULT_CHANNELS],
      researchModels: [...RESEARCH_MODELS]
    };
  }
  return {
    mode: "auto",
    label: "统一模型",
    hostname: host,
    channelOrder: [...DEFAULT_CHANNELS],
    researchModels: [...RESEARCH_MODELS]
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
