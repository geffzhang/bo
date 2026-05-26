import { clip, env } from "./util.mjs";
import { normalizeRuntimeMode } from "./runtime-mode.mjs";

const DEFAULT_BASE_URL = "https://api.siliconflow.com/v1";

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeModel(value) {
  return String(value || "").trim();
}

function configuredEntries(names, normalizeValue) {
  const out = [];
  for (const name of names) {
    const value = normalizeValue(env(name));
    if (!value) continue;
    out.push({ name, value });
  }
  return out;
}

function configuredModelList(fallback, ...names) {
  for (const name of names) {
    const raw = env(name);
    if (!raw) continue;
    const rows = String(raw)
      .split(/[\n,]/)
      .map((item) => normalizeModel(item))
      .filter(Boolean);
    if (rows.length) return rows;
  }
  return fallback;
}

function conflictInfo(entries) {
  if (entries.length <= 1) {
    return {
      hasConflict: false,
      selected: entries[0] ? `env:${entries[0].name}` : "default",
      overridden: [],
    };
  }

  return {
    hasConflict: true,
    selected: `env:${entries[0].name}`,
    overridden: entries.slice(1).map((item) => `env:${item.name}`),
  };
}

function channelBaseUrlInfo(channel) {
  const names = ["OPENAI_COMPAT_BASE_URL"];
  const entries = configuredEntries(names, normalizeBaseUrl);

  if (entries[0]) {
    const selected = entries[0];
    return {
      value: selected.value,
      source: `env:${selected.name}`,
      conflict: conflictInfo(entries),
    };
  }

  return { value: DEFAULT_BASE_URL, source: "default:global", conflict: conflictInfo(entries) };
}

function channelModelInfo(channel) {
  const entries = configuredEntries(channel.modelEnvNames || [], normalizeModel);
  if (entries[0]) {
    const selected = entries[0];
    return {
      value: selected.value,
      source: `env:${selected.name}`,
      conflict: conflictInfo(entries),
    };
  }
  return {
    value: channel.defaultModel,
    source: `default:${channel.name}`,
    conflict: conflictInfo(entries),
  };
}

function resolveChannel(channel) {
  const base = channelBaseUrlInfo(channel);
  const model = channelModelInfo(channel);
  return {
    ...channel,
    baseUrl: base.value,
    baseUrlSource: base.source,
    model: model.value,
    modelSource: model.source,
    resolvedFrom: {
      baseUrl: base.source,
      model: model.source,
    },
    conflicts: {
      hasConflicts: base.conflict.hasConflict || model.conflict.hasConflict,
      baseUrl: base.conflict,
      model: model.conflict,
    },
  };
}

const CHANNELS = [
  {
    scope: "intl",
    name: "international-primary",
    defaultModel: "deepseek-ai/DeepSeek-V4-Pro",
    modelEnvNames: ["OPENAI_COMPAT_MODEL"],
    keyEnv: "OPENAI_COMPAT_API_KEY"
  },
  {
    scope: "intl",
    name: "international-secondary",
    defaultModel: "deepseek-ai/DeepSeek-V4-Pro",
    modelEnvNames: ["OPENAI_COMPAT_MODEL"],
    keyEnv: "OPENAI_COMPAT_API_KEY"
  },
  {
    scope: "cn",
    name: "china-primary",
    defaultModel: "Pro/deepseek-ai/DeepSeek-V3.2",
    modelEnvNames: ["OPENAI_COMPAT_MODEL"],
    keyEnv: "OPENAI_COMPAT_API_KEY"
  },
  {
    scope: "cn",
    name: "china-secondary",
    defaultModel: "Pro/deepseek-ai/DeepSeek-V3.2",
    modelEnvNames: ["OPENAI_COMPAT_MODEL"],
    keyEnv: "OPENAI_COMPAT_API_KEY"
  }
];

export function channelsForRuntime(runtimeMode) {
  normalizeRuntimeMode(runtimeMode);
  return [...CHANNELS];
}

export function configuredChannels(runtimeMode) {
  return channelsForRuntime(runtimeMode).map((rawChannel, index) => {
    const channel = resolveChannel(rawChannel);
    return {
      ...channel,
      priority: index + 1,
      configured: Boolean(env(channel.keyEnv))
    };
  });
}

export function channelConfigWarnings(runtimeMode, preparedChannels) {
  const channels = Array.isArray(preparedChannels) ? preparedChannels : configuredChannels(runtimeMode);
  const warnings = [];
  const warnedMissingApiKeyEnvs = new Set();
  for (const channel of channels) {
    if (!channel.configured && !warnedMissingApiKeyEnvs.has(channel.keyEnv)) {
      warnedMissingApiKeyEnvs.add(channel.keyEnv);
      warnings.push({
        type: "api-key-missing",
        scope: channel.scope || "global",
        channel: channel.name,
        envName: channel.keyEnv,
        message: `缺少 API Key：${channel.keyEnv}`
      });
    }

    if (channel.conflicts?.baseUrl?.hasConflict) {
      warnings.push({
        type: "base-url-conflict",
        scope: channel.scope || "global",
        channel: channel.name,
        selected: channel.conflicts.baseUrl.selected,
        overridden: channel.conflicts.baseUrl.overridden || [],
        message: `Base URL 配置冲突，当前使用 ${channel.conflicts.baseUrl.selected}`
      });
    }

    if (channel.conflicts?.model?.hasConflict) {
      warnings.push({
        type: "model-conflict",
        scope: channel.scope || "global",
        channel: channel.name,
        selected: channel.conflicts.model.selected,
        overridden: channel.conflicts.model.overridden || [],
        message: `模型配置冲突，当前使用 ${channel.conflicts.model.selected}`
      });
    }
  }

  return warnings;
}

let modelCatalogCache;

async function fetchModelCatalog(channel, timeoutMs = 20000) {
  const apiKey = env(channel.keyEnv);
  if (!apiKey) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${channel.baseUrl}/models`, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: "application/json"
      },
      signal: controller.signal
    });
    if (!response.ok) return [];
    const payload = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    return rows
      .map((item) => (typeof item === "string" ? item : item?.id || item?.name || ""))
      .filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function rankResearchModel(id) {
  const value = String(id || "").toLowerCase();
  const preferred = [
    "deepseek-ai/deepseek-v4-pro",
    "moonshotai/kimi-k2.6",
    "pro/moonshotai/kimi-k2.6",
    "zai-org/glm-5.1",
    "pro/zai-org/glm-5.1",
    "qwen/qwen3.5-397b-a17b",
    "qwen/qwen3.5-122b-a10b",
    "minimaxai/minimax-m2.5",
    "pro/minimaxai/minimax-m2.5",
    "zai-org/glm-5",
    "pro/zai-org/glm-5",
    "qwen/qwen3.6-35b-a3b",
    "qwen/qwen3.6-27b",
    "deepseek-ai/deepseek-v3.2",
    "pro/deepseek-ai/deepseek-v3.2"
  ];
  const preferredIndex = preferred.findIndex((item) => value === item);
  if (preferredIndex >= 0) return 1000 - preferredIndex;

  let score = 0;
  if (value.includes("qwen")) score += 35;
  if (value.includes("glm") || value.includes("zai")) score += 34;
  if (value.includes("kimi") || value.includes("moonshot")) score += 30;
  if (value.includes("minimax")) score += 26;
  if (value.includes("deepseek")) score += 20;
  if (value.includes("reason") || value.includes("thinking") || value.includes("qwq")) score += 18;
  if (value.includes("pro") || value.includes("plus") || value.includes("max")) score += 8;
  const size = value.match(/(?:^|[-_])(\d+)b(?:[-_]|$)/)?.[1];
  if (size) score += Math.min(Number(size), 120) / 3;
  if (value.includes("397b")) score += 80;
  if (value.includes("122b")) score += 45;
  if (value.includes("35b") || value.includes("32b")) score += 16;
  if (value.includes("7b") || value.includes("8b") || value.includes("9b")) score -= 30;
  if (value.includes("vl") || value.includes("embedding") || value.includes("rerank")) score -= 140;
  if (value.includes("image") || value.includes("ocr") || value.includes("captioner")) score -= 140;
  if (value.includes("omni") || value.includes("coder") || value.includes("lora") || value.includes("flash")) score -= 50;
  return score;
}

export async function discoverResearchModels(limit = 6, runtimeMode) {
  if (modelCatalogCache) return modelCatalogCache.slice(0, limit);

  const discovered = [];
  for (const channel of configuredChannels(runtimeMode)) {
    const models = await fetchModelCatalog(channel);
    for (const id of models) {
      const score = rankResearchModel(id);
      if (score > 0) discovered.push({ id, score });
    }
  }

  const preferredFallback = configuredModelList(
    [
      "deepseek-ai/DeepSeek-V4-Pro",
      "zai-org/GLM-5.1",
      "Qwen/Qwen3.6-35B-A3B",
      "moonshotai/Kimi-K2.6",
      "Qwen/Qwen3-235B-A22B",
      "Qwen/QwQ-32B",
      "MiniMaxAI/MiniMax-M1"
    ],
    "OPENAI_COMPAT_RESEARCH_FALLBACK_MODELS"
  );

  const ranked = discovered
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((item) => item.id);

  const seenBase = new Set();
  modelCatalogCache = [];
  for (const id of [...ranked, ...preferredFallback]) {
    const baseId = id.toLowerCase().replace(/^pro\//, "");
    if (seenBase.has(baseId)) continue;
    seenBase.add(baseId);
    modelCatalogCache.push(id);
  }
  return modelCatalogCache.slice(0, limit);
}

function modelsForChannel(channel, options) {
  if (options.model) return [options.model];
  if (Array.isArray(options.models) && options.models.length) return options.models;
  return [channel.model];
}

export async function callModel(messages, options = {}) {
  const errors = [];
  const timeoutMs = options.timeoutMs ?? 120000;
  const allowedChannels = Array.isArray(options.channelNames) && options.channelNames.length ? new Set(options.channelNames) : null;

  function formatModelError(channelName, modelName, error) {
    const rawName = String(error?.name || "");
    const rawMessage = String(error?.message || error || "未知错误");
    const lowered = `${rawName} ${rawMessage}`.toLowerCase();
    if (lowered.includes("abort")) {
      return `${channelName}/${modelName}: timeout after ${timeoutMs}ms`;
    }
    return `${channelName}/${modelName}: ${rawMessage}`;
  }

  for (const channel of configuredChannels(options.runtimeMode)) {
    if (allowedChannels && !allowedChannels.has(channel.name)) continue;
    const apiKey = env(channel.keyEnv);
    if (!apiKey) continue;
    const models = modelsForChannel(channel, options);
    const baseUrl = channel.baseUrl;

    for (const model of models) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: options.temperature ?? 0.25,
            max_tokens: options.maxTokens ?? 12000
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const text = await response.text();
          errors.push(`${channel.name}/${model}: HTTP ${response.status} ${clip(text, 300)}`);
          continue;
        }

        const payload = await response.json();
        const content = payload?.choices?.[0]?.message?.content;
        if (!content) {
          errors.push(`${channel.name}/${model}: empty response`);
          continue;
        }
        return {
          content,
          model,
          channel: channel.name
        };
      } catch (error) {
        errors.push(formatModelError(channel.name, model, error));
      } finally {
        clearTimeout(timer);
      }
    }
  }

  throw new Error(errors.length ? errors.join("\n") : "没有可用的硅基流动密钥");
}

export function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("模型返回为空");
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      return JSON.parse(fenced[1]);
    }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("模型返回不是可解析的JSON");
  }
}
