import { callModel, discoverResearchModels, extractJson } from "./ai.mjs";
import { clip, env, uniqBy } from "./util.mjs";
import { evaluateSourceQuality, TOPIC_NAMES } from "./report-quality.mjs";

const SEARCH_RESULT_LIMIT = 8;
const READ_LIMIT = 60;
const RESCUE_READ_LIMIT = 30;
const SEARCH_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  accept: "text/html,text/plain,application/json;q=0.9,*/*;q=0.8"
};

function jinaHeaders(accept = "text/plain") {
  const headers = { accept, "user-agent": SEARCH_HEADERS["user-agent"] };
  if (env("JINA_API_KEY")) {
    headers.authorization = `Bearer ${env("JINA_API_KEY")}`;
  }
  return headers;
}

async function fetchText(url, timeoutMs = 30000, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...SEARCH_HEADERS,
        ...(options.jina ? jinaHeaders(options.accept || "text/plain") : {}),
        ...(options.headers || {})
      }
    });
    clearTimeout(timer);
    if (!response.ok) return "";
    return await response.text();
  } catch {
    clearTimeout(timer);
    return "";
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeUrl(value) {
  let url = decodeHtml(value).trim().replace(/[),.;，。]+$/g, "");
  if (url.startsWith("//")) url = `https:${url}`;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("duckduckgo.com") && parsed.pathname.startsWith("/l/")) {
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) url = decodeURIComponent(uddg);
    }
  } catch {
    return "";
  }
  return url;
}

function validUrl(value) {
  if (!/^https?:\/\//i.test(value)) return false;
  const lower = value.toLowerCase();
  if (lower.includes("jina.ai")) return false;
  if (lower.includes("javascript:")) return false;
  if (lower.includes("duckduckgo.com/l/")) return false;
  if (lower.includes("bing.com/search")) return false;
  if (lower.includes("baidu.com/s?")) return false;
  return true;
}

function cleanTitle(value, fallback = "资料来源") {
  return decodeHtml(value || fallback)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function parseSearchPayload(raw, query, topic, provider) {
  if (!raw) return [];
  let payload = raw;
  if (typeof raw === "string") {
    try {
      payload = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];

  return rows
    .map((row) => {
      const url = normalizeUrl(row.url || row.link || row.href || row.source);
      return {
        title: cleanTitle(row.title || row.name || url),
        url,
        snippet: clip(row.content || row.description || row.snippet || "", 700),
        query,
        topic,
        provider
      };
    })
    .filter((item) => validUrl(item.url));
}

function parseJinaSearchText(text, query, topic, provider) {
  const results = [];
  const value = String(text || "");

  const linkRe = /\[([^\]]{2,180})\]\((https?:\/\/[^)\s]+)\)/g;
  for (const match of value.matchAll(linkRe)) {
    const url = normalizeUrl(match[2]);
    if (validUrl(url)) {
      results.push({ title: cleanTitle(match[1], url), url, query, topic, provider });
    }
  }

  const blockRe = /(?:^|\n)Title:\s*([^\n]+)\n(?:URL Source|URL|Source):\s*(https?:\/\/[^\s]+)/gi;
  for (const match of value.matchAll(blockRe)) {
    const url = normalizeUrl(match[2]);
    if (validUrl(url)) {
      results.push({ title: cleanTitle(match[1], url), url, query, topic, provider });
    }
  }

  return uniqBy(results, (item) => item.url);
}

async function searchJina(query, limit, topic, timeoutMs = 30000) {
  if (!env("JINA_API_KEY")) return [];
  const urls = [
    `https://s.jina.ai/?q=${encodeURIComponent(query)}`,
    `https://s.jina.ai/${encodeURIComponent(query)}`
  ];
  const results = [];
  for (const url of urls) {
    const jsonText = await fetchText(url, timeoutMs, { accept: "application/json", jina: true });
    results.push(...parseSearchPayload(jsonText, query, topic, "jina"));
    if (results.length >= limit) break;

    const text = await fetchText(url, timeoutMs, { accept: "text/plain", jina: true });
    results.push(...parseJinaSearchText(text, query, topic, "jina"));
    if (results.length >= limit) break;
  }
  return uniqBy(results, (item) => item.url).slice(0, limit);
}

function parseDuckDuckGo(text, query, topic, provider) {
  const results = [];
  const value = String(text || "");
  const anchorRe = /<a[^>]+class=['"][^'"]*result-link[^'"]*['"][^>]+href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of value.matchAll(anchorRe)) {
    const url = normalizeUrl(match[1]);
    if (validUrl(url)) {
      results.push({ title: cleanTitle(match[2], url), url, query, topic, provider });
    }
  }
  const uddgRe = /href=['"]([^'"]*duckduckgo\.com\/l\/\?uddg=[^'"]+)['"][^>]*>([\s\S]{0,260}?)<\/a>/gi;
  for (const match of value.matchAll(uddgRe)) {
    const url = normalizeUrl(match[1]);
    if (validUrl(url)) {
      results.push({ title: cleanTitle(match[2], url), url, query, topic, provider });
    }
  }
  return uniqBy(results, (item) => item.url);
}

async function searchDuckDuckGo(query, limit, topic, timeoutMs = 30000) {
  const urls = [
    `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
    `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  ];
  const results = [];
  for (const url of urls) {
    const text = await fetchText(url, timeoutMs);
    results.push(...parseDuckDuckGo(text, query, topic, url.includes("lite") ? "duckduckgo-lite" : "duckduckgo-html"));
    if (results.length >= limit) break;
  }
  return uniqBy(results, (item) => item.url).slice(0, limit);
}

function parseBing(text, query, topic) {
  const results = [];
  const value = String(text || "");
  const blockRe = /<li class="b_algo"[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of value.matchAll(blockRe)) {
    const url = normalizeUrl(match[1]);
    if (validUrl(url)) {
      results.push({ title: cleanTitle(match[2], url), url, query, topic, provider: "bing" });
    }
  }
  return uniqBy(results, (item) => item.url);
}

async function searchBing(query, limit, topic, timeoutMs = 30000) {
  const text = await fetchText(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, timeoutMs);
  return parseBing(text, query, topic).slice(0, limit);
}

export async function searchWeb(query, limit = SEARCH_RESULT_LIMIT, topic = "通用检索", timeoutMs = 30000) {
  const providers = [searchJina, searchDuckDuckGo, searchBing];
  const settled = await Promise.allSettled(providers.map((provider) => provider(query, limit, topic, timeoutMs)));
  const results = settled.flatMap((item) => (item.status === "fulfilled" ? item.value : []));
  return uniqBy(results, (item) => item.url).slice(0, limit);
}

export async function readSource(url) {
  const safeUrl = normalizeUrl(url);
  if (!validUrl(safeUrl)) return "";

  let text = await fetchText(`https://r.jina.ai/${safeUrl}`, 45000, { accept: "text/plain", jina: true });
  if (!text || text.length < 200) {
    text = await fetchText("https://r.jina.ai/", 45000, {
      method: "POST",
      accept: "text/plain",
      jina: true,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `url=${encodeURIComponent(safeUrl)}`
    });
  }
  return clip(text, 9000);
}

function websiteDomain(company) {
  try {
    const website = company.website || arr(company.sourceUrls)[0] || "";
    if (!website) return "";
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function modelResearchModels() {
  const configured = String(env("SILICONFLOW_RESEARCH_MODELS") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (configured.length) return configured.slice(0, 6);
  return await discoverResearchModels(6);
}

function buildResearchPlan(company) {
  const name = company.standardName || company.name || company.query;
  const region = company.region || "";
  const industry = company.industry || "";
  const aiNeeds = String(company.aiNeeds || company.userContext?.aiNeeds || "").trim();
  const domain = websiteDomain(company);
  const site = domain ? `site:${domain}` : name;

  const local = [name, region, "工厂 园区 产能 产品 客户 研发 测试"].filter(Boolean).join(" ");
  const subject = [name, region, "工商 注册资本 参保人数 专利 软件著作权"].filter(Boolean).join(" ");

  return [
    { topic: "企业主体与本地信息", query: `${name} 官网 公司简介 产品 客户 业务`, limit: 8 },
    { topic: "企业主体与本地信息", query: local, limit: 8 },
    { topic: "企业主体与本地信息", query: subject, limit: 8 },
    { topic: "企业主体与本地信息", query: `${site} ${region} news press release plant factory`, limit: 8 },

    { topic: "经营规模与财务", query: `${name} 年报 财报 营收 利润 现金流 客户集中度`, limit: 8 },
    { topic: "经营规模与财务", query: `${name} annual report revenue margin cash flow customers China`, limit: 8 },
    { topic: "经营规模与财务", query: `${site} annual report results guidance investor relations`, limit: 8 },

    { topic: "产品客户与市场压力", query: `${name} 产品线 主机厂 客户 供应商 项目 量产`, limit: 8 },
    { topic: "产品客户与市场压力", query: `${name} new energy electric drive inverter thermal turbo customer project`, limit: 8 },
    { topic: "产品客户与市场压力", query: `${industry} 行业报告 市场 压力 质量 交付 成本`, limit: 8 },

    { topic: "数字化与AI线索", query: `${name} 数字化 AI 智能制造 MES ERP PLM QMS APS`, limit: 8 },
    { topic: "数字化与AI线索", query: `${name} digital transformation AI agent copilot MES ERP PLM QMS case`, limit: 8 },
    { topic: "数字化与AI线索", query: `${name} SAP DELMIA Apriso Andonix Microsoft Copilot 制造`, limit: 8 },
    { topic: "数字化与AI线索", query: `${name} 招聘 IT 数据 工业互联网 质量 工艺 设备`, limit: 8 },
    aiNeeds ? { topic: "数字化与AI线索", query: `${name} ${aiNeeds} AI 智能体 解决方案 案例 需求 场景`, limit: 10 } : null,

    { topic: "痛点证据与方案机会", query: `${name} 质量追溯 设备故障 工艺知识 排产 交付 返工`, limit: 8 },
    { topic: "痛点证据与方案机会", query: `${name} IATF 16949 audit traceability quality supplier delivery`, limit: 8 },
    { topic: "痛点证据与方案机会", query: `${name} ESG 网络安全 数据安全 AI 风险 供应链 风险`, limit: 8 }
  ].filter((item) => item?.query?.trim().length > 4);
}

function seedSources(company) {
  const seeds = [];
  if (company.website) {
    seeds.push({
      title: `${company.standardName || company.name || "企业"}官网`,
      url: company.website,
      query: "候选主体官网",
      topic: "企业主体与本地信息",
      provider: "seed"
    });
  }
  for (const url of arr(company.sourceUrls)) {
    seeds.push({
      title: "主体核对来源",
      url,
      query: "候选主体核对来源",
      topic: "企业主体与本地信息",
      provider: "seed"
    });
  }
  return seeds.map((item) => ({ ...item, url: normalizeUrl(item.url) })).filter((item) => validUrl(item.url));
}

function buildRescuePlan(company, missingTopics = []) {
  const name = company.standardName || company.name || company.query;
  const region = company.region || "";
  const industry = company.industry || "";
  const aiNeeds = String(company.aiNeeds || company.userContext?.aiNeeds || "").trim();
  const topics = missingTopics.length ? missingTopics : TOPIC_NAMES;
  return topics.flatMap((topic) => [
    {
      topic,
      query: `${name} ${region} ${topic} 官方 新闻 年报 案例 报告`,
      limit: 10
    },
    {
      topic,
      query: `${name} ${industry} ${topic} digital AI annual report press release case`,
      limit: 10
    },
    aiNeeds
      ? {
          topic,
          query: `${name} ${aiNeeds} ${topic} AI 智能体 数字化 需求 场景`,
          limit: 10
        }
      : null
  ].filter(Boolean));
}

function priorityScore(item) {
  const text = `${item.title} ${item.url} ${item.query} ${item.topic}`.toLowerCase();
  let score = 0;
  if (text.includes("official") || text.includes("官网") || text.includes("newsroom") || text.includes("press")) score += 30;
  if (text.includes("annual") || text.includes("report") || text.includes("results") || text.includes("sec.gov") || text.includes("investor")) score += 28;
  if (text.includes("工商") || text.includes("专利") || text.includes("软件著作权") || text.includes("supplier")) score += 18;
  if (text.includes("digital") || text.includes("ai") || text.includes("mes") || text.includes("erp") || text.includes("plm") || text.includes("qms")) score += 15;
  if (text.includes("宁波") || text.includes("ningbo") || text.includes("factory") || text.includes("plant")) score += 14;
  if (text.includes(".pdf")) score += 6;
  if (text.includes("google.") || text.includes("bing.") || text.includes("baidu.")) score -= 30;
  return score;
}

function confidenceForUrl(url) {
  const value = String(url).toLowerCase();
  if (value.includes(".gov") || value.includes("sec.gov") || value.includes("hkex") || value.includes("sse.com") || value.includes("szse.cn")) return "高";
  if (value.includes("annual") || value.includes("report") || value.includes("ir.") || value.includes("investor")) return "高";
  if (value.includes("newsroom") || value.includes("press") || value.includes("official") || value.includes("www.")) return "中高";
  return "中";
}

async function expandPlanWithModels(company, existingSources = []) {
  const name = company.standardName || company.name || company.query;
  const messages = [
    {
      role: "system",
      content: "你是企业公开资料检索规划助手。只返回严格 JSON。不要编造事实；候选 URL 只是待验证线索。"
    },
    {
      role: "user",
      content: `请为企业“${name}”扩展公开资料检索计划。目标是找到官网、年报/投资者关系、新闻稿、本地公司信息、数字化/AI/招聘、质量交付或行业压力资料。

企业信息：
${JSON.stringify(company, null, 2)}

已经找到的 URL：
${JSON.stringify(existingSources.slice(0, 20).map((item) => ({ title: item.title, url: item.url, topic: item.topic })), null, 2)}

返回 JSON：
{
  "queries": [{"topic":"${TOPIC_NAMES.join(" / ")} 中的一个","query":"搜索词","reason":"为什么搜"}],
  "candidateUrls": [{"topic":"${TOPIC_NAMES.join(" / ")} 中的一个","url":"https://...","title":"候选来源","reason":"为什么可能有用"}]
}

要求：
1. queries 12-20 条，中英文混合，覆盖本地主体、经营财务、产品客户、数字化AI、痛点机会。
2. candidateUrls 只放你较有把握存在的官网、投资者关系、新闻稿、公开年报、权威资料页；不确定就少放。
3. URL 只是线索，系统会逐一验证，可为空。`
    }
  ];

  const outputs = [];
  const models = await modelResearchModels();
  for (const model of models) {
    try {
      const answer = await callModel(messages, { model, temperature: 0.1, maxTokens: 5000, timeoutMs: 90000 });
      outputs.push({ model: answer.model, parsed: extractJson(answer.content) });
    } catch {
      // Ignore model expansion failures; deterministic search still runs.
    }
  }

  const queries = [];
  const candidateUrls = [];
  for (const output of outputs) {
    for (const item of arr(output.parsed?.queries)) {
      if (item?.query && item?.topic) queries.push({ topic: item.topic, query: item.query, limit: 8, provider: `model:${output.model}` });
    }
    for (const item of arr(output.parsed?.candidateUrls)) {
      const url = normalizeUrl(item?.url);
      if (validUrl(url)) {
        candidateUrls.push({
          title: cleanTitle(item.title || url),
          url,
          query: item.reason || "模型扩展候选 URL",
          topic: TOPIC_NAMES.includes(item.topic) ? item.topic : "企业主体与本地信息",
          provider: `model:${output.model}`
        });
      }
    }
  }

  return {
    queries: uniqBy(queries.filter((item) => TOPIC_NAMES.includes(item.topic)), (item) => `${item.topic}|${item.query}`).slice(0, 24),
    candidateUrls: uniqBy(candidateUrls, (item) => item.url).slice(0, 24),
    modelCount: outputs.length
  };
}

export function buildQueries(company) {
  return buildResearchPlan(company).map((item) => item.query);
}

export async function collectSources(company, onProgress = async () => {}) {
  const plan = buildResearchPlan(company);
  const found = [...seedSources(company)];

  for (let i = 0; i < plan.length; i += 1) {
    const item = plan[i];
    const results = await searchWeb(item.query, item.limit, item.topic);
    found.push(...results);
    const uniqueFound = uniqBy(found, (source) => source.url).length;
    await onProgress(20 + Math.round(((i + 1) / plan.length) * 16), `资料检索：${item.topic}`, {
      detail: `第 ${i + 1}/${plan.length} 组：${clip(item.query, 64)}；已发现 ${uniqueFound} 个候选来源。`,
      foundCount: uniqueFound
    });
  }

  const expanded = await expandPlanWithModels(company, uniqBy(found, (item) => item.url));
  found.push(...expanded.candidateUrls);
  await onProgress(38, "检索词扩展", {
    detail: expanded.modelCount
      ? `已用 ${expanded.modelCount} 个模型扩展 ${expanded.queries.length} 组检索词和 ${expanded.candidateUrls.length} 个候选 URL。`
      : "未启用或未成功调用模型扩展，继续使用搜索引擎结果。",
    foundCount: uniqBy(found, (source) => source.url).length
  });

  for (let i = 0; i < expanded.queries.length; i += 1) {
    const item = expanded.queries[i];
    const results = await searchWeb(item.query, item.limit, item.topic);
    found.push(...results);
    const uniqueFound = uniqBy(found, (source) => source.url).length;
    await onProgress(39 + Math.round(((i + 1) / Math.max(expanded.queries.length, 1)) * 10), `扩展检索：${item.topic}`, {
      detail: `第 ${i + 1}/${expanded.queries.length} 组：${clip(item.query, 64)}；已发现 ${uniqueFound} 个候选来源。`,
      foundCount: uniqueFound
    });
  }

  const candidates = uniqBy(found, (item) => item.url)
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, READ_LIMIT);

  const sources = [];
  for (let i = 0; i < candidates.length; i += 1) {
    const item = candidates[i];
    const text = await readSource(item.url);
    sources.push({
      ...item,
      text: clip(text, 7000),
      readable: Boolean(text && text.length > 200),
      confidence: confidenceForUrl(item.url)
    });
    const readableCount = sources.filter((source) => source.readable).length;
    await onProgress(50 + Math.round(((i + 1) / Math.max(candidates.length, 1)) * 10), `网页读取：${item.topic || "资料来源"}`, {
      detail: `第 ${i + 1}/${candidates.length} 个：${clip(item.title, 54)}；可读来源 ${readableCount} 个。`,
      foundCount: candidates.length,
      sourceCount: readableCount
    });
  }

  let quality = evaluateSourceQuality(sources);
  if (quality.qualityLevel !== "formal") {
    const rescueFound = [];
    const rescuePlan = buildRescuePlan(company, quality.missingTopics).slice(0, 10);
    await onProgress(61, "补充检索", {
      detail: `当前来源质量为${quality.qualityLabel}，开始围绕缺口主题补充检索。`,
      sourceCount: quality.readableSourceCount,
      foundCount: quality.verifiedSourceCount
    });

    const rescueExpanded = await expandPlanWithModels(
      { ...company, sourceGaps: quality.missingTopics, sourceQuality: quality.qualityLabel },
      sources
    );
    rescueFound.push(...rescueExpanded.candidateUrls);

    for (let i = 0; i < rescuePlan.length; i += 1) {
      const item = rescuePlan[i];
      const results = await searchWeb(item.query, item.limit, item.topic);
      rescueFound.push(...results);
      await onProgress(62 + Math.round(((i + 1) / Math.max(rescuePlan.length, 1)) * 3), `补充检索：${item.topic}`, {
        detail: `第 ${i + 1}/${rescuePlan.length} 组：${clip(item.query, 64)}`,
        foundCount: uniqBy([...found, ...rescueFound], (source) => source.url).length
      });
    }

    const rescueQueries = rescueExpanded.queries.slice(0, 12);
    for (let i = 0; i < rescueQueries.length; i += 1) {
      const item = rescueQueries[i];
      const results = await searchWeb(item.query, item.limit, item.topic);
      rescueFound.push(...results);
      await onProgress(66 + Math.round(((i + 1) / Math.max(rescueQueries.length, 1)) * 3), `多模型补充：${item.topic}`, {
        detail: `第 ${i + 1}/${rescueQueries.length} 组：${clip(item.query, 64)}`,
        foundCount: uniqBy([...found, ...rescueFound], (source) => source.url).length
      });
    }

    const seen = new Set(sources.map((source) => source.url));
    const rescueCandidates = uniqBy(rescueFound, (item) => item.url)
      .filter((item) => !seen.has(item.url))
      .sort((a, b) => priorityScore(b) - priorityScore(a))
      .slice(0, RESCUE_READ_LIMIT);

    for (let i = 0; i < rescueCandidates.length; i += 1) {
      const item = rescueCandidates[i];
      const text = await readSource(item.url);
      sources.push({
        ...item,
        text: clip(text, 7000),
        readable: Boolean(text && text.length > 200),
        confidence: confidenceForUrl(item.url)
      });
      quality = evaluateSourceQuality(sources);
      await onProgress(70 + Math.round(((i + 1) / Math.max(rescueCandidates.length, 1)) * 8), `补充读取：${item.topic || "资料来源"}`, {
        detail: `第 ${i + 1}/${rescueCandidates.length} 个：${clip(item.title, 54)}；可校验来源 ${quality.verifiedSourceCount} 个，可读来源 ${quality.readableSourceCount} 个。`,
        foundCount: quality.verifiedSourceCount,
        sourceCount: quality.readableSourceCount
      });
      if (quality.qualityLevel === "formal") break;
    }
  }

  return uniqBy(sources, (source) => source.url);
}

export async function resolveCandidates(query, region = "", industry = "") {
  const results = await searchWeb(`${query} ${region} ${industry} 官网 工商 公司简介`, 10, "企业主体与本地信息", 7000);
  const evidence = results.map((item) => `${item.title} ${item.url}`).join("\n");
  const messages = [
    {
      role: "system",
      content: "你是企业主体核对助手。只返回 JSON，不要解释。"
    },
    {
      role: "user",
      content: `根据用户输入和搜索线索，给出 2-5 个可能企业主体。字段：candidates 数组，每项含 name, standardName, region, industry, website, confidence(0-100), reason, sourceUrls 数组。用户输入：${query}\n地区：${region}\n行业：${industry}\n搜索线索：\n${evidence}`
    }
  ];
  try {
    const answer = await callModel(messages, { maxTokens: 1800, temperature: 0.1, timeoutMs: 8000 });
    const parsed = extractJson(answer.content);
    const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    if (candidates.length) return { candidates, model: answer.model, channel: answer.channel };
  } catch {
    // Fall through to deterministic fallback.
  }

  return {
    candidates: [
      {
        name: query,
        standardName: query,
        region,
        industry,
        website: results[0]?.url || "",
        confidence: results.length ? 70 : 55,
        reason: results.length ? "已根据公开搜索结果形成候选主体。" : "未能完成模型核对，先按输入名称作为候选主体。",
        sourceUrls: results.slice(0, 5).map((item) => item.url)
      }
    ],
    model: results.length ? "search-fallback" : "fallback",
    channel: results.length ? "search-fallback" : "fallback"
  };
}
