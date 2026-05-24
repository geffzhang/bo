import { callModel, extractJson } from "./ai.mjs";
import { ChevronDown, CircleAlert, Trophy } from "lucide";
import { clip } from "./util.mjs";
import { buildOpportunityRating } from "./opportunity-rating.mjs";
import { TOPIC_NAMES, cleanUrl, formatQualityWarnings, isHttpUrl, normalizeReportSources } from "./report-quality.mjs";

function e(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const staticIcons = { ChevronDown, CircleAlert, Trophy };

function icon(name, className = "icon") {
  const node = staticIcons[name];
  if (!node) return "";
  const children = node
    .map(([tag, attrs]) => {
      const attrText = Object.entries(attrs || {})
        .map(([key, value]) => `${key}="${e(value)}"`)
        .join(" ");
      return `<${tag} ${attrText}></${tag}>`;
    })
    .join("");
  return `<svg class="${e(className)}" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${children}</svg>`;
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function formatDuration(ms) {
  const value = Number(ms || 0);
  if (!Number.isFinite(value) || value <= 0) return "-";
  const totalSeconds = Math.round(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}小时${rest}分钟` : `${hours}小时`;
  }
  if (minutes > 0) return `${minutes}分${seconds}秒`;
  return `${seconds}秒`;
}

function normalizeNumericToken(raw = "") {
  const text = String(raw || "").replace(/，/g, ",").replace(/\s+/g, "");
  const match = text.match(/[-负－]?\d[\d,]*(?:\.\d{1,2})?/);
  return match ? match[0].replace(/^负/, "-").replace(/^－/, "-").replace(/,/g, "") : "";
}

function formatMetricValue(value, label = "") {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const compact = raw.replace(/[,，\s]/g, "");
  const metricLabel = String(label || "");
  const expectsPercent = /毛利率|负债率|占比|比例|率/.test(metricLabel);
  const expectsPeople = /员工|人数|人员/.test(metricLabel);
  const expectsMoney = /收入|营收|净销售|销售额|利润|净利|现金流|投入|费用|资产|负债|金额|成本/.test(metricLabel);
  const expectsRevenue = /收入|营收|净销售|销售额/.test(metricLabel);
  const token = normalizeNumericToken(compact);
  const num = Number(token || compact.replace(/(亿元|万元|千元|百万元|元|人|%)/g, ""));
  if (!Number.isFinite(num)) return raw;
  const pretty = (n) => n.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  if (expectsPercent || (/%$/.test(compact) && !/利润|收入|现金流|投入|费用|资产|负债|客户/.test(metricLabel))) return `${pretty(num)}%`;
  if (expectsPeople || /人$/.test(compact)) return `${Math.round(num).toLocaleString("zh-CN")}人`;
  if (/亿元/.test(compact)) return `${pretty(num)}亿元`;
  if (/万元/.test(compact)) return Math.abs(num) >= 10000 ? `${pretty(num / 10000)}亿元` : `${pretty(num)}万元`;
  if (/元/.test(compact) || Math.abs(num) >= 100000) return Math.abs(num) >= 100000000 ? `${pretty(num / 100000000)}亿元` : `${pretty(num / 10000)}万元`;
  if (expectsMoney) {
    if (Math.abs(num) >= 10000) return `${pretty(num / 10000)}亿元`;
    if (expectsRevenue && Math.abs(num) < 1000) return `${pretty(num)}亿元`;
    if (Math.abs(num) >= 1000) return `${pretty(num)}万元`;
    if (Math.abs(num) < 100 && String(token).includes(".")) return `${pretty(num)}亿元`;
    return `${pretty(num)}万元`;
  }
  return raw;
}

function list(items) {
  const values = arr(items);
  return values.length ? `<ul>${values.map((item) => `<li>${e(item)}</li>`).join("")}</ul>` : `<p class="muted">待确认</p>`;
}

function sourceId(source, index) {
  return Number(source?.sourceId || source?.id || index + 1);
}

function normalizeSourceIdList(item) {
  return arr(item?.sourceIds || item?.sources || item?.evidenceSourceIds)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .slice(0, 4);
}

function annualEvidenceOf(item) {
  const page = Number(item?.annualPage || item?.page || item?.annualReportPage || 0);
  if (!Number.isFinite(page) || page <= 0) return null;
  return {
    page,
    title: item?.annualFileName || "用户上传年报",
    excerpt: item?.evidenceExcerpt || item?.context || item?.note || "",
    confidence: "高",
    sourceType: "用户上传年报"
  };
}

function evidenceLinks(item, sources = []) {
  const ids = normalizeSourceIdList(item);
  const annual = annualEvidenceOf(item);
  if (!ids.length && !annual) return "";
  const sourceMap = new Map(arr(sources).map((source, index) => [sourceId(source, index), source]));
  const matched = ids.map((id) => ({ id, source: sourceMap.get(id) })).filter((row) => row.source && isHttpUrl(row.source.url));
  if (!matched.length && !annual) return "";
  const badges = [
    ...matched.map((row) => `<span class="evidence-badge">[${e(row.id)}]</span>`),
    annual ? `<span class="evidence-badge annual">[年报P${e(annual.page)}]</span>` : ""
  ].join("");
  return `<details class="evidence-links">
    <summary>${badges}</summary>
    <div>
      ${annual ? `<div class="evidence-item"><b>年报P${e(annual.page)}.</b> ${e(annual.title)}<small>${e([annual.sourceType, annual.confidence].filter(Boolean).join("｜"))}</small>${annual.excerpt ? `<em>${e(clip(annual.excerpt, 180))}</em>` : ""}</div>` : ""}
      ${matched
        .map(({ id, source }) => {
          const url = cleanUrl(source.url);
          const meta = [source.sourceType, source.domain, source.confidence].filter(Boolean).join("｜");
          const support = source.relevanceReason || source.usedFor || source.query || "";
          const excerpt = source.evidenceExcerpt || source.text || source.snippet || "";
          return `<a href="${e(url)}" target="_blank" rel="noreferrer"><b>${e(id)}.</b> ${e(source.title || source.domain || "资料来源")}${meta ? `<small>${e(meta)}</small>` : ""}${support ? `<small>支撑：${e(support)}</small>` : ""}${excerpt ? `<em>${e(clip(excerpt, 180))}</em>` : ""}</a>`;
        })
        .join("")}
    </div>
  </details>`;
}

function cardGrid(items, className = "card", sources = []) {
  return (
    arr(items)
      .map((item) => `<article class="${className}"><h3>${e(item.title)}</h3>${evidenceLinks(item, sources)}<p>${e(item.body || item.summary || item.insight)}</p></article>`)
      .join("") || `<article class="${className}"><h3>待补充</h3><p>当前来源不足，需补充客户信息后再判断。</p></article>`
  );
}

function evidenceCards(items, sources = []) {
  return (
    arr(items)
      .map(
        (item) => `<article class="profile-card"><h3>${e(item.title)}</h3>${evidenceLinks(item, sources)}
          <div class="label">依据</div>${list(item.facts)}
          <div class="label">判断</div><p>${e(item.insight)}</p>
          ${arr(item.toConfirm).length ? `<div class="label">待确认</div>${list(item.toConfirm)}` : ""}
        </article>`
      )
      .join("") || `<article class="profile-card"><h3>待确认</h3><p>当前来源不足以形成稳定判断。</p></article>`
  );
}

function metricCards(items, sources = []) {
  return (
    arr(items)
      .map((item) => `<div class="metric"><b>${e(item.label)}</b><strong>${e(formatMetricValue(item.value, item.label))}</strong>${evidenceLinks(item, sources)}<span>${e(item.note)}</span></div>`)
      .join("") || `<div class="metric"><b>指标</b><strong>待确认</strong><span>公开来源不足。</span></div>`
  );
}

function painCards(items, sources = []) {
  return (
    arr(items)
      .map(
        (item) => `<article class="pain-card"><h3>${e(item.title)}</h3>${evidenceLinks(item, sources)}
          <div class="label">依据</div><p>${e(item.sourceBasis)}</p>
          <div class="label">判断</div><p>${e(item.reasoning)}</p>
          <div class="label">待确认</div>${list(item.validationSignals)}
          <div class="entry">${e(item.aiEntry)}</div>
        </article>`
      )
      .join("") || `<article class="pain-card"><h3>暂不生成痛点判断</h3><p>来源不足时不输出经营痛点，避免把行业常识写成客户事实。</p></article>`
  );
}

function solutionCards(items, sources = []) {
  return (
    arr(items)
      .map(
        (item) => `<article class="solution-card"><span class="tag">${e(item.priority)}</span><h3>${e(item.title)}</h3>${evidenceLinks(item, sources)}
          <div class="label">依据</div><p>${e(item.why)}</p>
          <div class="label">做法</div><small>${e(item.how)}</small>
        </article>`
      )
      .join("") || `<article class="solution-card"><span class="tag">待定</span><h3>不建议直接承诺方案</h3><p>需先补齐客户场景与数据边界。</p></article>`
  );
}

function sourceRows(items) {
  const rows = arr(items)
    .filter((item) => isHttpUrl(item.url))
    .map((item, index) => {
      const url = cleanUrl(item.url);
      const meta = [item.sourceType, item.domain, item.relevanceReason].filter(Boolean).join("｜");
      return `<tr><td><b>${e(sourceId(item, index))}.</b> ${e(item.title)}${meta ? `<br><small>${e(meta)}</small>` : ""}</td><td>${e(item.usedFor || item.query || item.topic || "")}</td><td>${e(item.confidence || "")}</td><td><a href="${e(url)}" target="_blank" rel="noreferrer">${e(item.domain || "来源链接")}</a></td></tr>`;
    })
    .join("");
  return rows || `<tr><td colspan="4">本次未读取到可校验的公开来源，建议补充关键词后重新生成。</td></tr>`;
}

function buildSourcePack(sources, max = 36, textLimit = 2600) {
  return normalizeReportSources(sources, max).map((source, index) => ({
    id: index + 1,
    title: source.title,
    url: source.url,
    confidence: source.confidence,
    topic: source.topic,
    query: source.query,
    sourceType: source.sourceType,
    relevanceReason: source.relevanceReason,
    domain: source.domain,
    text: clip(source.text, textLimit)
  }));
}

function uniqModelUsage(items) {
  const seen = new Set();
  return arr(items)
    .filter((item) => item?.model)
    .map((item) => ({ model: String(item.model || ""), channel: String(item.channel || ""), purpose: String(item.purpose || "模型分析") }))
    .filter((item) => {
      const key = `${item.channel}|${item.model}|${item.purpose}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function modelDisplay(report) {
  const names = Array.from(new Set([...arr(report.usedModels).map((item) => item?.model).filter(Boolean), report.modelName].filter(Boolean)));
  return names.join(" / ") || "未调用模型";
}

function sourceDisplay(report) {
  const count = Number(report.verifiedSourceCount ?? report.sourceCount ?? 0);
  return report.annualReportEvidence ? `${count} 条外部链接 + 年报` : `${count} 条`;
}

const REQUIRED_FINANCIAL_METRICS = ["营业收入", "归母净利润", "扣非净利润", "毛利率", "经营现金流", "资产负债率", "研发投入", "员工数量", "前五大客户/客户集中度"];

function financeMetricFromText(text, label, patterns) {
  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);
    if (match?.[1]) {
      return {
        label,
        value: match[1].replace(/[；。\n\r]+$/g, "").trim(),
        note: "来自财务硬来源的结构化公开信息。"
      };
    }
  }
  return null;
}

function extractedFinancialMetrics(financeSources) {
  const text = financeSources.map((source) => source.text || "").join("\n");
  return [
    financeMetricFromText(text, "营业收入", [/营业收入[：:]\s*([^；。\n]+)/]),
    financeMetricFromText(text, "归母净利润", [/归母净利润[：:]\s*([^；。\n]+)/]),
    financeMetricFromText(text, "扣非净利润", [/扣非净利润[：:]\s*([^；。\n]+)/]),
    financeMetricFromText(text, "毛利率", [/毛利率[：:]\s*([^；。\n]+)/]),
    financeMetricFromText(text, "经营现金流", [/经营现金流净额[：:]\s*([^；。\n]+)/, /经营现金流[：:]\s*([^；。\n]+)/]),
    financeMetricFromText(text, "资产负债率", [/资产负债率[：:]\s*([^；。\n]+)/]),
    financeMetricFromText(text, "总资产/总负债", [/总资产[：:]\s*([^；。\n]+；总负债[：:]\s*[^；。\n]+)/]),
    financeMetricFromText(text, "研发投入", [/研发投入[：:]\s*([^；。\n]+)/]),
    financeMetricFromText(text, "员工数量", [/员工数量[：:]\s*([^；。\n]+)/]),
    financeMetricFromText(text, "前五大客户/客户集中度", [/前五大客户\/客户集中度[：:]\s*([^；。\n]+)/])
  ].filter(Boolean);
}

function annualReportMetrics(company = {}) {
  const metrics = company.annualReportEvidence?.metrics || company.annualReportSummary?.metrics || [];
  return arr(metrics).map((item) => ({
    label: item.label || item.name || "年报指标",
    value: item.value || "未在上传年报中取得",
    note: `用户上传年报${item.page ? `第 ${item.page} 页` : ""}指标，需按客户最终披露口径核对。`,
    annualPage: item.page,
    annualFileName: company.annualReportEvidence?.fileName || company.annualReportSummary?.fileName || "用户上传年报",
    evidenceExcerpt: item.context || ""
  }));
}

function removeAnnualReportDownloadPrompts(report, company = {}) {
  if (!company.annualReportEvidence && !report.annualReportEvidence) return report;
  const blocked = /下载.*年报|补充.*年报|获取.*年报|最新.*年报|年报.*下载/;
  const filterItems = (items) => arr(items).filter((item) => !blocked.test(String(item || "")));
  return {
    ...report,
    requirements: {
      ...(report.requirements || {}),
      preMeeting: filterItems(report.requirements?.preMeeting),
      onSite: filterItems(report.requirements?.onSite)
    }
  };
}

function ensureFinancialMetrics(report, sources, company) {
  const stockCode = company.stockCode || String(company.aiNeeds || "").match(/(?<!\d)(?:60|68|00|30|83|87|43|92)\d{4}(?!\d)/)?.[0] || "";
  const financeSources = normalizeReportSources(sources, 80).filter((source) => source.topic === TOPIC_NAMES[1] || source.sourceType === "财务硬来源");
  const sourceNames = financeSources.slice(0, 5).map((source) => source.domain || source.title || source.url).filter(Boolean);
  const existing = arr(report.customerInsights?.metrics);
  const extracted = [...annualReportMetrics(company), ...extractedFinancialMetrics(financeSources)];
  const metricKey = (label = "") => {
    const text = String(label || "");
    if (/营业|收入|净销售/.test(text)) return "营业收入";
    if (/归母|归属.*净利润/.test(text)) return "归母净利润";
    if (/扣非|非经常性损益/.test(text)) return "扣非净利润";
    if (/毛利/.test(text)) return "毛利率";
    if (/现金流/.test(text)) return "经营现金流";
    if (/资产负债|负债率/.test(text)) return "资产负债率";
    if (/研发/.test(text)) return "研发投入";
    if (/员工|人数/.test(text)) return "员工数量";
    if (/客户/.test(text)) return "前五大客户/客户集中度";
    return text || "其他指标";
  };
  const hasMetricIn = (items, label) => {
    const key = metricKey(label);
    return items.some((item) => metricKey(item.label || item.note || "") === key);
  };
  const mergedExisting = [
    ...extracted,
    ...existing.filter((item) => !hasMetricIn(extracted, item.label))
  ];
  const hasMetric = (label) => hasMetricIn(mergedExisting, label);
  const missing = REQUIRED_FINANCIAL_METRICS.filter((label) => !hasMetric(label));
  if (!missing.length && mergedExisting.length === existing.length) return removeAnnualReportDownloadPrompts(report, company);
  const hasAnnual = Boolean(company.annualReportEvidence || company.annualReportSummary);
  const note = hasAnnual
    ? "已接入用户上传年报；该指标未被自动抽取，建议按年报页码或财务表人工核对。"
    : financeSources.length
    ? `已采集财务硬来源${sourceNames.length ? `：${sourceNames.join("、")}` : ""}；当前模型未自动抽取该指标，需打开财务来源核验具体数值。`
    : `已尝试按${stockCode ? `股票代码 ${stockCode}、` : ""}年报/公告/F10 财务来源检索，但未获得可读财务硬来源，需人工补充年报或财报链接。`;
  return removeAnnualReportDownloadPrompts({
    ...report,
    customerInsights: {
      ...(report.customerInsights || {}),
      metrics: [
        ...mergedExisting,
        ...missing.map((label) => ({
          label,
          value: hasAnnual ? "上传年报中待人工核对" : financeSources.length ? "已采集来源，待核验数值" : "未取得可读财务硬来源",
          note
        }))
      ]
    },
    financialSourceStatus: {
      stockCode,
      attempted: true,
      hardSourceCount: financeSources.length,
      hardSources: financeSources.slice(0, 8).map((source) => ({ title: source.title, url: source.url, domain: source.domain || "" })),
      missingMetrics: missing
    }
  }, company);
}

const QUICK_CARD_TITLES = ["客户是谁", "客户卖什么", "有没有钱", "先切哪里"];
const CONCLUSION_TITLES = ["一句话判断", "优先切入", "核心依据", "主要风险", "下一步建议"];

function textFromCard(card = {}) {
  return String(card.body || card.summary || card.insight || arr(card.facts).join("；") || "").trim();
}

function firstUseful(items, fallback = "") {
  return arr(items).map(textFromCard).find(Boolean) || fallback;
}


function splitChineseSentences(text = "") {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[\u3002\uff1b;])\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickSentence(text, patterns = [], fallback = "") {
  const sentences = splitChineseSentences(text);
  for (const pattern of patterns) {
    const found = sentences.find((item) => pattern.test(item));
    if (found) return found;
  }
  return fallback || sentences[0] || String(text || "").trim();
}

function deriveQuickBody(title = "", text = "", fallback = "") {
  const value = String(text || "").trim();
  if (!value) return fallback;
  if (title.includes("\u5ba2\u6237\u662f\u8c01")) return pickSentence(value, [/\u4e00\u7ea7\u4f9b\u5e94\u5546|\u6574\u8f66\u5382|\u5ba2\u6237\u662f|\u4f01\u4e1a|\u516c\u53f8/], fallback);
  if (title.includes("\u5ba2\u6237\u5356\u4ec0\u4e48")) { const m=value.match(/(?:\u4e3b\u8981\u4ea7\u54c1(?:\u4e3a|\u5305\u62ec)?|\u4ea7\u54c1\u4e3a)([^\u3002\uff1b;]+)/); return m ? `\u4e3b\u8981\u4ea7\u54c1\u4e3a${m[1]}\u3002` : pickSentence(value, [/\u4e3b\u8981\u4ea7\u54c1|\u4ea7\u54c1\u4e3a|\u4ea7\u54c1\u7ebf|\u4e1a\u52a1|\u9500\u552e/], fallback); }
  if (title.includes("\u6709\u6ca1\u6709\u94b1")) return pickSentence(value, [/\u8425\u6536|\u6536\u5165|\u51c0\u5229\u6da6|\u5229\u6da6|\u73b0\u91d1\u6d41|\u7814\u53d1\u6295\u5165|\u8d22\u52a1/], fallback);
  if (title.includes("\u5148\u5207\u54ea\u91cc")) return pickSentence(value, [/\u5efa\u8bae|\u4f18\u5148|\u5207\u5165|\u751f\u4ea7|\u8d28\u91cf|\u4f9b\u5e94\u94fe|\u7814\u53d1/], fallback);
  return value;
}

function deriveConclusionBody(title = "", text = "", fallback = "") {
  const value = String(text || fallback || "").replace(/\s+/g, " ").trim();
  if (!value) return fallback;
  const patterns = title.includes("\u4e00\u53e5\u8bdd\u5224\u65ad")
    ? [/(?:\u5224\u65ad[\uff1a:])?[^\u3002\uff1b;]*(?:\u516c\u53f8|\u4f01\u4e1a|\u5ba2\u6237|\u4f9b\u5e94\u5546)[^\u3002\uff1b;]*[\u3002\uff1b;]?/]
    : title.includes("\u4f18\u5148\u5207\u5165")
      ? [/\u4f18\u5148[^\u3002\uff1b;]*[\u3002\uff1b;]?/, /\u5efa\u8bae\u4ece[^\u3002\uff1b;]*[\u3002\uff1b;]?/]
      : title.includes("\u6838\u5fc3\u4f9d\u636e")
        ? [/\u6838\u5fc3\u4f9d\u636e[^\u3002\uff1b;]*[\u3002\uff1b;]?/, /\u4f9d\u636e[^\u3002\uff1b;]*[\u3002\uff1b;]?/]
        : title.includes("\u4e3b\u8981\u98ce\u9669")
          ? [/\u4e3b\u8981\u98ce\u9669[^\u3002\uff1b;]*[\u3002\uff1b;]?/, /\u98ce\u9669[^\u3002\uff1b;]*[\u3002\uff1b;]?/]
          : [/\u4e0b\u4e00\u6b65\u5efa\u8bae[^\u3002\uff1b;]*[\u3002\uff1b;]?/, /\u4e0b\u4e00\u6b65[^\u3002\uff1b;]*[\u3002\uff1b;]?/];
  for (const pattern of patterns) {
    const found = value.match(pattern)?.[0]?.trim();
    if (found && found.length >= 6) return found;
  }
  return pickSentence(value, [], fallback);
}

function normalizeQuickCards(report = {}) {
  const existing = arr(report.quickCards);
  const byTitle = new Map();
  for (const card of existing) {
    const title = String(card.title || "");
    for (const key of QUICK_CARD_TITLES) {
      if (title.includes(key) && !byTitle.has(key)) byTitle.set(key, card);
    }
  }
  const metrics = arr(report.customerInsights?.metrics).slice(0, 4);
  const metricText = metrics.length
    ? metrics.map((item) => `${item.label}${item.value ? ` ${formatMetricValue(item.value, item.label)}` : ""}`).join("；")
    : "公开财务数据仍需结合年报、工商和客户访谈继续核对。";
  const fallback = {
    "客户是谁": {
      title: "客户是谁",
      body: firstUseful(report.customerInsights?.localCards, `${report.standardName || report.companyName || "目标客户"}，需先确认本次拜访主体、工厂与集团关系。`),
      insight: "关键信息：先确认主体、区域、参会角色和是否为真实采购/试点对象。"
    },
    "客户卖什么": {
      title: "客户卖什么",
      body: firstUseful(report.customerInsights?.groupCards, "公开来源尚不足以稳定判断产品线，需要结合官网、展会、招聘和现场沟通补齐。"),
      insight: "关键信息：产品与客户结构决定 AI 切入点应落在质量、研发、交付或营销中的哪一端。"
    },
    "有没有钱": {
      title: "有没有钱",
      body: metricText,
      insight: "关键信息：预算能力不只看营收，还要看利润、现金流、研发投入和是否有明确项目触发。"
    },
    "先切哪里": {
      title: "先切哪里",
      body: arr(report.solutions)[0]?.title || arr(report.pains)[0]?.aiEntry || "先从可验证的小场景切入，避免直接承诺重系统改造。",
      insight: arr(report.solutions)[0]?.why || "关键信息：优先选择客户能提供样例、能现场验证、能快速解释价值的场景。"
    }
  };
  return QUICK_CARD_TITLES.map((title) => {
    const source = byTitle.get(title) || fallback[title];
    return {
      title,
      body: deriveQuickBody(title, textFromCard(source), fallback[title].body),
      insight: source.insight || fallback[title].insight || "",
      sourceIds: source.sourceIds || source.sources || source.evidenceSourceIds || []
    };
  });
}

function normalizeConclusions(report = {}) {
  const existing = arr(report.conclusions);
  const byTitle = new Map();
  for (const card of existing) {
    const title = String(card.title || "");
    for (const key of CONCLUSION_TITLES) {
      if (title.includes(key) && !byTitle.has(key)) byTitle.set(key, card);
    }
  }
  const firstConclusion = existing[0] || {};
  const firstSolution = arr(report.solutions)[0] || {};
  const firstPain = arr(report.pains)[0] || {};
  const warnings = arr(report.qualityWarnings).slice(0, 2).join("；");
  const fallback = {
    "一句话判断": textFromCard(firstConclusion) || `${report.standardName || report.companyName || "该客户"}具备会前研究价值，但仍需把公开信息与现场输入分开。`,
    "优先切入": firstSolution.title ? `${firstSolution.title}：${firstSolution.why || firstSolution.how || "建议围绕客户可提供样例的场景推进。"}` : firstPain.aiEntry || "优先从质量、研发知识、设备/工艺、交付协同中选择一个可验证场景。",
    "核心依据": firstUseful(report.customerInsights?.localCards) || firstUseful(report.customerInsights?.groupCards) || "当前依据来自已审计公开来源、用户上传年报和客户补充线索。",
    "主要风险": warnings ? warnings : arr(report.missingTopics).length ? `仍需补齐：${arr(report.missingTopics).join("、")}` : "主要风险在于需求未确认、系统边界不清和数据授权不明确。",
    "下一步建议": arr(report.requirements?.onSite)[0] || arr(report.requirements?.preMeeting)[0] || "下一步先确认参会角色、业务线、TOP痛点、系统现状和可用样例。"
  };
  return CONCLUSION_TITLES.map((title) => {
    const source = byTitle.get(title);
    return {
      title,
      body: deriveConclusionBody(title, source ? textFromCard(source) : "", fallback[title]),
      sourceIds: source?.sourceIds || source?.sources || source?.evidenceSourceIds || firstConclusion.sourceIds || []
    };
  });
}

function sanitizeRequirements(report = {}) {
  const rewrite = (item = "") =>
    String(item || "")
      .replace(/^通过公开渠道了解其当前使用的核心ERP、MES系统供应商及大致上线年限。?$/, "现场确认当前 ERP、MES、PLM、QMS 等系统使用情况、上线年限、供应商和数据导出边界。")
      .replace(/^查询客户注册资本、参保人数、营收区间等工商基础规模信息.*$/, "现场确认注册资本、人员规模、营收区间等基础经营口径与公开工商信息是否一致。")
      .replace(/^尝试查找客户在Alibaba国际站或其他B2B平台是否存续.*$/, "现场确认客户主要获客渠道、外贸平台使用情况和线上询盘转化压力。");
  return {
    ...report,
    requirements: {
      ...(report.requirements || {}),
      preMeeting: arr(report.requirements?.preMeeting).map(rewrite).filter(Boolean),
      onSite: arr(report.requirements?.onSite).map(rewrite).filter(Boolean)
    }
  };
}

function valueFromAnnualContext(item = {}) {
  const label = String(item.label || "");
  const context = String(item.context || item.evidenceExcerpt || "");
  if (!context) return item.value;
  const derived = annualMetricValueFromContext(label, context);
  return derived || item.value;
}

function annualMetricValueFromContext(label = "", context = "") {
  const metricLabel = String(label || "");
  if (!context) return "";
  const compact = context.replace(/\s+/g, "");
  const cny = (raw) => formatMetricValue(`${String(raw || "").replace(/[，,]/g, "")}元`, metricLabel);
  const wan = (raw) => formatMetricValue(`${String(raw || "").replace(/[，,]/g, "")}万元`, metricLabel);
  let match = null;
  if (/营业|收入|净销售/.test(metricLabel)) {
    match = compact.match(/营业收入([-\d,，]+(?:\.\d{2})?)/);
    if (match?.[1]) return cny(match[1]);
  }
  if (/归母|归属.*净利润/.test(metricLabel)) {
    match = compact.match(/归属于上市公司股东的净利润([-\d,，]+(?:\.\d{2})?)/) || compact.match(/归母净利润([-\d,，]+(?:\.\d{2})?)/);
    if (match?.[1]) return cny(match[1]);
  }
  if (/扣非|非经常性损益/.test(metricLabel)) {
    match = compact.match(/扣除非经常性损益的净利润([-\d,，]+(?:\.\d{2})?)/) || compact.match(/扣非净利润([-\d,，]+(?:\.\d{2})?)/);
    if (match?.[1]) return cny(match[1]);
  }
  if (/现金流/.test(metricLabel)) {
    match = compact.match(/经营活动产生的现金流量净额([-\d,，]+(?:\.\d{2})?)/) || compact.match(/经营现金流量净额([-\d,，]+(?:\.\d{2})?)/);
    if (match?.[1]) return cny(match[1]);
  }
  if (/研发/.test(metricLabel)) {
    match = compact.match(/研发费用([-\d,，]+(?:\.\d{1,2})?)万元/) || compact.match(/研发投入(?:金额)?([-\d,，]+(?:\.\d{1,2})?)万元/);
    if (match?.[1]) return wan(match[1]);
  }
  if (/员工|人数/.test(metricLabel)) {
    match = compact.match(/在职员工的数量合计(\d[\d,，]*)/) || compact.match(/合计(\d[\d,，]*)/);
    if (match?.[1]) return `${String(match[1]).replace(/[，,]/g, "")}人`;
  }
  if (/毛利|负债率|比例|占比|率/.test(metricLabel)) {
    const escaped = metricLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    match = compact.match(new RegExp(`${escaped}[^\\d-]{0,20}([-\\d.]+%)`));
    if (match?.[1]) return match[1];
  }
  return "";
}

function annualContexts(report = {}) {
  const out = [];
  const push = (item = {}, fallbackTitle = "") => {
    const context = String(item.context || item.evidenceExcerpt || item.excerpt || "");
    if (!context) return;
    out.push({
      context,
      page: item.page || item.annualPage || 0,
      annualFileName: item.annualFileName || report.annualReportEvidence?.fileName || "用户上传年报",
      evidenceExcerpt: context,
      note: fallbackTitle || item.title || item.label || "用户上传年报"
    });
  };
  for (const item of arr(report.annualReportEvidence?.metrics)) push(item);
  for (const item of arr(report.annualReportEvidence?.sections)) push(item, item.title);
  for (const item of arr(report.customerInsights?.metrics)) push(item);
  return out;
}

function annualMetricKey(label = "") {
  const text = String(label || "");
  if (/营业|收入|净销售/.test(text)) return "营业收入";
  if (/归母|归属.*净利润/.test(text)) return "归母净利润";
  if (/扣非|非经常性损益/.test(text)) return "扣非净利润";
  if (/毛利/.test(text)) return "毛利率";
  if (/现金流/.test(text)) return "经营现金流";
  if (/资产负债|负债率/.test(text)) return "资产负债率";
  if (/研发/.test(text)) return "研发投入";
  if (/员工|人数|职工/.test(text)) return "员工数量";
  return text;
}

function derivedAnnualMetricMap(report = {}) {
  const contexts = annualContexts(report);
  const labels = ["营业收入", "归母净利润", "扣非净利润", "毛利率", "经营现金流", "研发投入", "员工数量"];
  const map = new Map();
  for (const label of labels) {
    for (const context of contexts) {
      const value = annualMetricValueFromContext(label, context.context);
      if (!value) continue;
      map.set(label, {
        label,
        value,
        note: `用户上传年报${context.page ? `第 ${context.page} 页` : ""}指标，需按客户最终披露口径核对。`,
        annualPage: context.page,
        annualFileName: context.annualFileName,
        evidenceExcerpt: context.evidenceExcerpt
      });
      break;
    }
  }
  return map;
}

function repairFinancialMetricsFromAnnual(report = {}, metrics = []) {
  const derived = derivedAnnualMetricMap(report);
  if (!derived.size) return metrics;
  const used = new Set();
  const repaired = arr(metrics).map((item) => {
    const key = annualMetricKey(item.label);
    const replacement = derived.get(key);
    if (!replacement) return repairAnnualMetric(item);
    used.add(key);
    return {
      ...item,
      ...replacement,
      label: item.label || replacement.label,
      page: replacement.annualPage || item.page,
      context: replacement.evidenceExcerpt || item.context
    };
  });
  for (const [key, item] of derived.entries()) {
    if (!used.has(key)) repaired.push(item);
  }
  return repaired;
}

function repairAnnualMetric(item = {}) {
  const label = String(item.label || "");
  const value = String(item.value || "");
  const repaired = valueFromAnnualContext(item);
  if (repaired && repaired !== value) return { ...item, value: repaired };
  if (/归母|归属.*净利润/.test(label) && /比例|现金红利|派发|分红/.test(String(item.context || item.evidenceExcerpt || ""))) {
    return { ...item, value: "上传年报中待人工核对" };
  }
  if (/研发/.test(label) && /万元/.test(String(item.context || item.evidenceExcerpt || "")) && /元$/.test(value) && !/万元$/.test(value)) {
    const num = value.match(/[-\d.]+/)?.[0];
    if (num) return { ...item, value: `${num}万元` };
  }
  if (/员工|人数/.test(label) && /^20\d{2}人$/.test(value)) {
    const fixed = valueFromAnnualContext(item);
    return { ...item, value: fixed && fixed !== value ? fixed : "上传年报中待人工核对" };
  }
  return item;
}

export function normalizeReportShape(report = {}) {
  const normalized = sanitizeRequirements(report);
  const annualReportEvidence = normalized.annualReportEvidence
    ? {
        ...normalized.annualReportEvidence,
        metrics: repairFinancialMetricsFromAnnual(normalized, arr(normalized.annualReportEvidence.metrics))
      }
    : normalized.annualReportEvidence;
  const fixedNormalized = {
    ...normalized,
    annualReportEvidence,
    customerInsights: {
      ...(normalized.customerInsights || {}),
      metrics: repairFinancialMetricsFromAnnual(
        { ...normalized, annualReportEvidence },
        arr(normalized.customerInsights?.metrics)
      )
    }
  };
  return {
    ...fixedNormalized,
    annualReportEvidence,
    quickCards: normalizeQuickCards(fixedNormalized),
    conclusions: normalizeConclusions(fixedNormalized),
    customerInsights: {
      ...(fixedNormalized.customerInsights || {}),
      localCards: arr(fixedNormalized.customerInsights?.localCards),
      groupCards: arr(fixedNormalized.customerInsights?.groupCards),
      metrics: arr(fixedNormalized.customerInsights?.metrics),
      digitalCards: arr(fixedNormalized.customerInsights?.digitalCards)
    }
  };
}

async function analyzeTopic(company, topic, sources) {
  const topicSources = sources.filter((source) => source.topic === topic || source.query?.includes(topic));
  const pack = buildSourcePack(topicSources.length ? topicSources : sources, 12, 3200);
  if (!pack.length) {
    return { topic, facts: [], metrics: [], implications: [], painSignals: [], uncertainties: ["未读取到可校验来源，需重新检索或人工补充。"], sourceIds: [] };
  }
  const financeInstruction =
    topic === TOPIC_NAMES[1]
      ? `经营规模与财务主题强制要求：metrics 必须优先提取营业收入/净销售额、净利润或归母净利润、毛利率或经营利润率、经营现金流、资产负债率或总资产负债、研发投入、员工规模、客户集中度。若来源没有对应财务数据，保留该指标并写“未在已读取公开来源中取得”。`
      : "";
  const messages = [
    {
      role: "system",
      content: "你是售前客户研究分析师。只返回严格 JSON，不要 Markdown。所有判断必须基于给定来源；无法确认就写待确认。"
    },
    {
      role: "user",
      content: `请针对主题“${topic}”提取可用于商机判断的证据，写给一线会前准备使用，避免空话。${financeInstruction}
企业信息：${JSON.stringify(company, null, 2)}
来源：${JSON.stringify(pack, null, 2)}
返回 JSON：
{
  "topic": "${topic}",
  "facts": [{"claim":"可核验事实或第三方线索","sourceIds":[1,2],"confidence":"公开信息/第三方线索/合理推断/待确认"}],
  "metrics": [{"label":"指标","value":"数值或区间","sourceIds":[1],"note":"说明"}],
  "implications": [{"title":"关键信息","body":"这说明客户可能处于什么经营压力或机会中","sourceIds":[1]}],
  "painSignals": [{"title":"潜在痛点","basis":"依据","validationSignals":["现场可确认的指标口径"],"aiEntry":"AI切入方向","sourceIds":[1]}],
  "uncertainties": ["必须现场确认或会前补齐的信息"],
  "sourceIds": [1,2,3]
}`
    }
  ];
  try {
    const answer = await callModel(messages, { runtimeMode: company.runtimeMode, temperature: 0.1, maxTokens: 5000, timeoutMs: 150000 });
    return { ...extractJson(answer.content), _modelName: answer.model, _modelChannel: answer.channel };
  } catch (error) {
    return {
      topic,
      facts: [],
      metrics: [],
      implications: [],
      painSignals: [],
      uncertainties: [`${topic} 分析失败：${error?.message || String(error)}`],
      sourceIds: []
    };
  }
}

function finalPrompt(company, sourcePack, topicBriefs, quality) {
  const aiNeeds = String(company.aiNeeds || company.userContext?.aiNeeds || "").trim();
  const qualityInstruction =
    quality.qualityLevel === "limited"
      ? "本次来源较少，仅生成有限资料版。所有结论必须写成会前参考或待确认判断；不得输出强结论。"
      : quality.qualityLevel === "brief"
        ? "本次来源达到简版报告门槛但不足正式报告门槛。所有未被来源支撑的内容放入待确认，不得写成确定事实。"
        : "本次来源达到正式报告门槛。仍需标注公开信息、第三方线索、合理推断与待确认边界。";

  return `请基于“分主题证据摘要”和“可校验来源清单”生成深度商机挖掘报告 JSON。报告给一线会前准备使用，核心是讲清楚：客户是谁、本地主体信息、经营压力、数字化/AI基础、潜在痛点、我方机会与前置要求。
质量约束：${qualityInstruction}
硬性要求：
1. 语言直接、专业、可外发；不要出现内部保护、责任归因、渠道身份标签或先免费验证等不适合外发的表达。
2. 不把推断写成事实；使用“公开信息、第三方线索、合理推断、待确认”表达置信边界。
3. 经营痛点必须写依据来源，不能只写行业常识。
4. 研究结论必须是多卡片，不要大段文字。
5. 客户画像必须分成多框：主体与股权/区域、产品与客户、经营规模与财务、数字化与AI、组织与决策、潜在采购约束。
6. 不要生成 sources 字段。来源由系统用真实 URL 补入；但所有关键结论、画像卡片、财务指标、痛点和方案必须尽量带 sourceIds，用于在正文旁展示证据链接。
7. 用户输入的 AI 需求属于“用户提供线索”，优先用于调整切入方向和现场确认问题，但不得写成公开事实。
8. customerInsights.metrics 必须先呈现财务硬指标：营业收入/净销售额、净利润或归母净利润、毛利率或经营利润率、经营现金流、资产负债率或总资产负债、研发投入、员工规模、客户集中度。若来源没有对应数据，value 写“未在已读取公开来源中取得”。
9. 若企业信息包含 stockCode 或来源包含“财务硬来源”，必须优先使用财务硬来源抽取指标；不得笼统写“公开来源未采集到财务数据”，必须说明已查来源与缺失原因。
10. 若企业信息包含 annualReportEvidence，必须把它作为用户上传年报证据使用，优先级高于第三方网页；引用时写“用户上传年报”并保留页码或章节。
11. 若已包含 annualReportEvidence，requirements 里不得再写“下载/补充/获取最新年报”；只能写“核对年报第几页指标口径”或“确认业务口径”。
12. requirements 里不要要求一线“通过公开渠道查询 ERP/MES/PLM 供应商、工商、招聘、官网、B2B 平台”等本系统应检索的事项；如果公开检索没有结果，写成“现场确认”问题。
13. quickCards 必须严格返回 4 个对象，标题分别为：客户是谁、客户卖什么、有没有钱、先切哪里。
14. conclusions 必须严格返回 5 个对象，标题分别为：一句话判断、优先切入、核心依据、主要风险、下一步建议。

企业信息：${JSON.stringify(company, null, 2)}
用户已掌握的 AI 需求线索：${aiNeeds || "无"}
分主题证据摘要：${JSON.stringify(topicBriefs, null, 2)}
可校验来源清单：${JSON.stringify(sourcePack.map(({ text, ...source }) => source), null, 2)}

必须返回以下 JSON：
{
  "standardName": "企业标准名",
  "aliases": ["别名"],
  "region": "地区",
  "industry": "行业",
  "quickCards": [
    {"title":"客户是谁","body":"短句","insight":"关键信息","sourceIds":[1]},
    {"title":"客户卖什么","body":"短句","insight":"关键信息","sourceIds":[1]},
    {"title":"有没有钱","body":"短句","insight":"关键信息","sourceIds":[1]},
    {"title":"先切哪里","body":"短句","insight":"关键信息","sourceIds":[1]}
  ],
  "conclusions": [
    {"title":"一句话判断","body":"结论内容","sourceIds":[1,2]},
    {"title":"优先切入","body":"结论内容","sourceIds":[1,2]},
    {"title":"核心依据","body":"结论内容","sourceIds":[1,2]},
    {"title":"主要风险","body":"结论内容","sourceIds":[1,2]},
    {"title":"下一步建议","body":"结论内容","sourceIds":[1,2]}
  ],
  "customerInsights": {
    "localCards": [{"title":"主体与股权/区域","facts":["依据"],"insight":"判断","toConfirm":["待确认"],"sourceIds":[1]}],
    "groupCards": [{"title":"产品与客户/集团与行业背景","facts":["依据"],"insight":"判断","toConfirm":["待确认"],"sourceIds":[2]}],
    "metrics": [{"label":"指标","value":"数值","note":"说明和来源口径","sourceIds":[3]}],
    "digitalCards": [{"title":"数字化与AI/组织与决策/潜在采购约束","facts":["依据"],"insight":"判断","toConfirm":["待确认"],"sourceIds":[4]}]
  },
  "pains": [{"title":"经营痛点","sourceBasis":"具体来源和依据","reasoning":"痛点推导","validationSignals":["现场可确认的指标口径"],"aiEntry":"AI切入方向","sourceIds":[1,2]}],
  "solutions": [{"priority":"P1/P2/P0","title":"方案","why":"优先级理由","how":"做法","sourceIds":[1,2]}],
  "requirements": {"preMeeting":["会前尽量了解"],"onSite":["现场顺势探问"]},
  "keywords": ["用于模糊搜索的关键词"]
}`;
}

export async function generateStructuredReport(company, sources, quality, onProgress = async () => {}) {
  const sourcePack = buildSourcePack(sources, 36, 2600);
  const topicBriefs = [];
  const usedModels = uniqModelUsage(sources.usedModels || []);
  const analysisLabels = ["企业画像", "财务指标", "市场与客户", "数字化与AI", "痛点机会"];
  for (let i = 0; i < TOPIC_NAMES.length; i += 1) {
    const topic = TOPIC_NAMES[i];
    const label = analysisLabels[i] || topic;
    await onProgress(80 + Math.round((i / TOPIC_NAMES.length) * 10), `模型分析：${label}`, {
      phaseKey: "analysis",
      detail: `正在调用模型整理“${topic}”证据，可能需要 1-3 分钟。`,
      sourceCount: sourcePack.length,
      qualityLevel: quality.qualityLevel,
      completed: i,
      total: TOPIC_NAMES.length
    });
    const brief = await analyzeTopic(company, topic, sources);
    if (brief?._modelName) usedModels.push({ model: brief._modelName, channel: brief._modelChannel, purpose: `证据整理：${topic}` });
    await onProgress(82 + Math.round((i / TOPIC_NAMES.length) * 9), `模型分析：${label}`, {
      phaseKey: "analysis",
      detail: `已完成“${topic}”证据整理，继续处理下一组主题。`,
      sourceCount: sourcePack.length,
      qualityLevel: quality.qualityLevel,
      completed: i + 1,
      total: TOPIC_NAMES.length,
      currentModel: brief?._modelName ? `${brief._modelName}（${brief._modelChannel || "默认通道"}）` : ""
    });
    topicBriefs.push(brief);
  }
  await onProgress(92, "模型分析：最终校验", {
    phaseKey: "analysis",
    detail: "正在把分主题证据整合为客户认知、财务指标、痛点、方案建议和前置要求。",
    sourceCount: sourcePack.length,
    qualityLevel: quality.qualityLevel
  });
  const answer = await callModel(
    [
      { role: "system", content: "你是售前技术的首席客户研究与解决方案顾问。只返回严格 JSON，不要 Markdown，不要解释。" },
      { role: "user", content: finalPrompt(company, sourcePack, topicBriefs, quality) }
    ],
    { runtimeMode: company.runtimeMode, temperature: 0.15, maxTokens: 16000, timeoutMs: 220000 }
  );
  usedModels.push({ model: answer.model, channel: answer.channel, purpose: "报告整合" });
  await onProgress(95, "模型分析：报告整合完成", {
    phaseKey: "analysis",
    detail: "报告结构化整合完成，正在进入最终保存和渲染。",
    sourceCount: sourcePack.length,
    qualityLevel: quality.qualityLevel,
    currentModel: `${answer.model}（${answer.channel}）`
  });
  const parsed = normalizeReportShape(ensureFinancialMetrics(extractJson(answer.content), sources, company));
  const finalUsedModels = uniqModelUsage(usedModels);
  return {
    ...parsed,
    sourceBriefs: topicBriefs,
    sources: normalizeReportSources(sources, 32).map(({ text, readable, ...source }, index) => ({
      sourceId: index + 1,
      ...source,
      usedFor: source.usedFor || source.topic || source.query || "公开信息核验"
    })),
    modelName: answer.model,
    modelChannel: answer.channel,
    usedModels: finalUsedModels,
    modelDisplay: modelDisplay({ ...parsed, modelName: answer.model, usedModels: finalUsedModels })
  };
}

function isDfmInput(input) {
  return /DFM|可制造性|研发|工艺评审|设计制造|研发需要/i.test(String(input || ""));
}

function supplementCard(input) {
  return {
    title: "用户提供线索",
    facts: [input],
    insight: "该信息来自会前补充，不作为公开事实；可用于调整现场探问重点和方案优先级。",
    toConfirm: ["客户是否已明确 DFM/可制造性评审的业务目标、输入资料、评审流程和责任部门。"]
  };
}

function applyUserSupplementHints(report, userInput) {
  const input = String(userInput || "").trim();
  const next = {
    ...report,
    userSupplementInsights: [...arr(report.userSupplementInsights), supplementCard(input)],
    changeSummary: ["已新增“用户补充线索”模块。"],
    updatedSections: ["用户补充线索"]
  };
  if (isDfmInput(input)) {
    next.changeSummary.push("已强化研发 DFM/可制造性评审相关痛点、方案和现场确认问题。");
    next.updatedSections.push("研究结论", "经营痛点", "初步方案", "前置要求");
    next.conclusions = [
      { title: "补充线索", body: "客户已提出研发侧 DFM 能力诉求，建议把交流重点从泛 AI 介绍收敛到“研发知识沉淀、可制造性评审、工艺经验复用”的可验证场景。" },
      ...arr(next.conclusions).filter((item) => item.title !== "补充线索")
    ].slice(0, 6);
    next.customerInsights = {
      ...(next.customerInsights || {}),
      digitalCards: [
        supplementCard("客户提出研发需要 DFM 能力，可能涉及可制造性评审、工艺知识复用、设计问题闭环和跨部门协同。"),
        ...arr(next.customerInsights?.digitalCards)
      ].slice(0, 6)
    };
    next.pains = [
      {
        title: "研发 DFM 与工艺知识复用",
        sourceBasis: "用户提供线索：客户提出研发需要 DFM 能力；待现场确认其设计评审、工艺评审、问题闭环和知识库现状。",
        reasoning: "若研发阶段缺少结构化 DFM 规则和历史问题复用，容易在设计转制造、试制、量产导入中产生返工、沟通成本和经验依赖。",
        validationSignals: ["是否已有 DFM 检查清单/规则库", "设计评审问题是否能结构化沉淀", "研发、工艺、质量之间的问题闭环周期", "历史问题是否能按产品/零件/工艺快速检索"],
        aiEntry: "研发 DFM 知识助手：把设计规范、工艺经验、质量问题和历史评审记录沉淀为可问答、可追溯、可复用的规则与建议。"
      },
      ...arr(next.pains).filter((item) => !/DFM|可制造性|研发/.test(`${item.title}${item.aiEntry}`))
    ].slice(0, 6);
    next.solutions = [
      {
        priority: "P1",
        title: "研发 DFM 知识助手",
        why: "客户已直接提出 DFM 能力诉求，属于比泛办公 AI 更明确的业务切入点。",
        how: "先确认 DFM 资料范围、历史问题样例、评审流程和责任部门，再评估知识库问答、规则检索、评审清单生成和问题闭环辅助。"
      },
      ...arr(next.solutions).filter((item) => !/DFM|可制造性|研发/.test(`${item.title}${item.how}`))
    ].slice(0, 5);
    next.requirements = {
      ...(next.requirements || {}),
      preMeeting: [
        "DFM 需求由哪个部门提出：研发、工艺、质量、制造工程还是管理层。",
        "是否有可脱敏的 DFM 清单、设计规范、历史评审问题、工艺问题和返工案例。",
        ...arr(next.requirements?.preMeeting)
      ].slice(0, 10),
      onSite: [
        "现场确认 DFM 的业务目标：减少设计返工、缩短评审周期、复用工艺经验，还是支撑新人上手。",
        "确认 DFM 规则是否需要与 PLM/MES/QMS 或文档库集成。",
        ...arr(next.requirements?.onSite)
      ].slice(0, 10)
    };
    next.keywords = Array.from(new Set([...arr(next.keywords), "DFM", "可制造性评审", "研发知识库", "工艺知识复用", "设计问题闭环"]));
  }
  next.changeSummary = Array.from(new Set(next.changeSummary));
  next.updatedSections = Array.from(new Set(next.updatedSections));
  return normalizeReportShape(next);
}

export async function improveStructuredReport(report, userInput) {
  const safeReport = { ...report, html: undefined };
  const messages = [
    {
      role: "system",
      content: "你是售前客户研究与解决方案顾问。只返回严格 JSON，不要 Markdown。用户补充内容必须标为“用户提供线索”或“待确认”，不得伪装成公开事实。"
    },
    {
      role: "user",
      content: `请基于当前商机报告和用户补充信息，完善报告结构。用于一线会前准备，语言直接、专业、可外发。
硬性要求：
1. 不要新增或编造来源，不要生成 sources 字段。
2. 必须返回 changeSummary、updatedSections、userSupplementInsights。
3. 用户补充信息必须影响至少一个结论、一个痛点/方案或一个前置问题。
4. 如果补充信息涉及 DFM/可制造性/研发/工艺评审，必须新增或强化“研发 DFM 知识助手/可制造性评审/工艺知识复用”相关内容。
5. 保持原有 JSON 字段结构。
用户补充信息：${userInput}
当前报告：${JSON.stringify(safeReport, null, 2)}`
    }
  ];
  let answer;
  let parsed;
  try {
    answer = await callModel(messages, { runtimeMode: report.runtimeMode, temperature: 0.12, maxTokens: 16000, timeoutMs: 220000 });
    parsed = extractJson(answer.content);
  } catch (error) {
    answer = { model: "local-supplement-rule", channel: "local", content: "" };
    parsed = {
      changeSummary: [`模型完善暂时失败，已先根据补充信息生成规则化更新：${error.message}`],
      updatedSections: ["用户补充线索"]
    };
  }
  const now = new Date().toISOString();
  const usedModels = uniqModelUsage([...(report.usedModels || []), { model: answer.model, channel: answer.channel, purpose: "补充信息完善" }]);
  const merged = {
    ...report,
    ...parsed,
    reportId: report.reportId,
    companyName: report.companyName,
    companyKey: report.companyKey,
    generatedAt: report.generatedAt,
    updatedAt: now,
    durationMs: report.durationMs,
    sources: report.sources || [],
    sourceCount: report.sourceCount,
    rawSourceCount: report.rawSourceCount,
    verifiedSourceCount: report.verifiedSourceCount,
    readableSourceCount: report.readableSourceCount,
    topicCoverageCount: report.topicCoverageCount,
    coveredTopics: report.coveredTopics,
    missingTopics: report.missingTopics,
    qualityLevel: report.qualityLevel,
    qualityLabel: report.qualityLabel,
    qualityWarnings: report.qualityWarnings || [],
    userSupplements: [...arr(report.userSupplements), { at: now, text: userInput }],
    modelName: answer.model,
    modelChannel: `${answer.channel}/refine`,
    usedModels,
    modelDisplay: modelDisplay({ ...report, ...parsed, modelName: answer.model, usedModels })
  };
  return applyUserSupplementHints(merged, userInput);
}

function ratingOf(report) {
  return report.opportunityRating || buildOpportunityRating(report);
}

function ratingClass(rating) {
  if (rating.status !== "rated") return "rating-not-rated";
  return `rating-${String(rating.grade || "D").toLowerCase()}`;
}

function ratingTitle(rating) {
  if (rating.status !== "rated") return "暂不评级";
  return `${rating.priorityLevel || rating.label}｜${rating.score}分｜置信度${rating.confidenceLabel || "-"}(${rating.confidenceScore ?? "-"}分)`;
}

function ratingPanel(report) {
  const rating = ratingOf(report);
  const guidance =
    rating.status === "rated"
      ? `<div class="rating-guidance">
          <article>
            <b>售前投入建议</b>
            <p>${e(rating.presalesAdvice || rating.nextAction || "先确认客户真实需求和下一步动作。")}</p>
          </article>
          <article>
            <b>下一步成立条件</b>
            <ul>${arr(rating.qualificationConditions).map((item) => `<li>${e(item)}</li>`).join("") || "<li>确认客户主体、参会角色、业务场景和数据边界。</li>"}</ul>
          </article>
          <article>
            <b>暂缓/降级信号</b>
            <ul>${arr(rating.disqualificationSignals).map((item) => `<li>${e(item)}</li>`).join("") || "<li>没有明确业务场景、推进人或下一步动作。</li>"}</ul>
          </article>
          <article>
            <b>资源边界</b>
            <p>${e(rating.resourceBoundary || "定制方案、报价和POC范围需在关键输入确认后再进入。")}</p>
          </article>
        </div>`
      : "";
  const details =
    rating.status === "rated"
      ? `<div class="rating-detail">
          <div class="rating-dim-grid">
            ${arr(rating.dimensions)
              .map(
                (item) => `<article class="rating-dim">
                  <div class="rating-dim-head"><b>${e(item.title)}</b><strong>${e(item.score)}分</strong></div>
                  <div class="rating-bar"><i style="width:${Math.max(0, Math.min(Number(item.score) || 0, 100))}%"></i></div>
                  ${arr(item.evidence).length ? `<p><b>依据</b>${e(arr(item.evidence).join("；"))}</p>` : ""}
                  ${arr(item.deductions).length ? `<p><b>限制</b>${e(arr(item.deductions).join("；"))}</p>` : ""}
                  ${arr(item.questions).length ? `<p><b>待确认</b>${e(arr(item.questions).join("；"))}</p>` : ""}
                </article>`
              )
              .join("")}
          </div>
          ${arr(rating.riskFlags).length ? `<div class="risk-tags">${arr(rating.riskFlags).map((item) => `<span>${e(item)}</span>`).join("")}</div>` : ""}
          ${guidance}
        </div>`
      : `<div class="rating-detail"><p>${e(rating.notRatedReason || "公开信息不足，暂不评级。")}</p></div>`;
  return `<details class="rating-card ${e(ratingClass(rating))}">
    <summary>
      <div class="rating-score">
        ${icon(rating.status === "rated" ? "Trophy" : "CircleAlert")}
        <b>${e(ratingTitle(rating))}</b>
        <span>${e(rating.summary || rating.notRatedReason || "公开信息不足")}</span>
      </div>
      <div class="rating-toggle">${icon("ChevronDown")}查看评估理由</div>
    </summary>
    ${details}
  </details>`;
}

function qualityBanner(report) {
  const warnings = formatQualityWarnings(report.qualityWarnings || []);
  const title =
    report.qualityLevel === "diagnostic"
      ? "证据不足，仅生成检索诊断"
      : report.qualityLevel === "limited"
        ? "资料有限，仅供会前参考"
        : report.qualityLevel === "brief"
          ? "来源偏少，建议谨慎使用"
          : "来源达到正式报告门槛";
  return `<div class="quality-banner quality-${e(report.qualityLevel || "formal")}">
    <b>${e(title)}</b>
    <span>质量：${e(report.qualityLabel || "正式报告")}｜来源 ${e(sourceDisplay(report))}｜可读来源 ${e(report.readableSourceCount ?? 0)} 条｜主题覆盖 ${e(report.topicCoverageCount ?? 0)} 类</span>
    ${warnings.length ? `<ul>${warnings.map((item) => `<li>${e(item)}</li>`).join("")}</ul>` : ""}
  </div>`;
}

function annualReportPanel(report) {
  const evidence = report.annualReportEvidence;
  if (!evidence) return "";
  const metrics = arr(evidence.metrics).slice(0, 9);
  const sections = arr(evidence.sections).slice(0, 6);
  return `<details class="annual-panel">
    <summary><h2>年报提取信息</h2><span>展开核对自动提取的财务、人员和章节证据</span></summary>
    <div class="annual-summary">
      <div><b>${e(evidence.fileName || "用户上传年报")}</b><span>${e(evidence.pageCount || "-")} 页｜可读文字 ${e(evidence.textLength || 0)} 字｜证据优先级：用户上传资料</span></div>
      <p>年报只作为会前证据包使用，自动提取结果建议与原 PDF 表格核对。</p>
    </div>
    ${metrics.length ? `<div class="metric-grid annual-metrics">${metrics.map((item) => `<div class="metric"><b>${e(item.label)}</b><strong>${e(formatMetricValue(item.value, item.label))}</strong>${evidenceLinks({ annualPage: item.page, evidenceExcerpt: item.context, annualFileName: evidence.fileName }, [])}<span>用户上传年报${item.page ? `第 ${e(item.page)} 页` : ""}，建议按原 PDF 表格核对口径。</span></div>`).join("")}</div>` : ""}
    ${sections.length ? `<div class="grid two">${sections.map((item) => `<article class="card"><h3>${e(item.title)}</h3><p>${e(item.excerpt)}</p><small>页码：${e(item.page)}</small></article>`).join("")}</div>` : ""}
  </details>`;
}

function userSupplementSection(report) {
  const cards = arr(report.userSupplementInsights);
  if (!cards.length) return "";
  return `<section><h2>用户补充线索</h2><div class="grid two">${evidenceCards(cards)}</div></section>`;
}

function renderDiagnosticSections(report) {
  const diagnosis = report.diagnosis || {};
  return `
    <section><h2>1. 检索诊断</h2>${cardGrid(report.conclusions)}</section>
    <section><h2>2. 未达门槛原因</h2>
      <div class="grid two">
        <article class="card"><h3>已覆盖主题</h3>${list(diagnosis.coveredTopics)}</article>
        <article class="card"><h3>缺少主题</h3>${list(diagnosis.missingTopics)}</article>
      </div>
    </section>
    <section><h2>3. 建议补充信息</h2>
      <div class="require-grid">
        <article class="card"><h3>会前尽量了解</h3>${list(report.requirements?.preMeeting)}</article>
        <article class="card"><h3>现场顺势探问</h3>${list(report.requirements?.onSite)}</article>
      </div>
    </section>`;
}

function renderNormalSections(report) {
  const sources = report.sources || [];
  return `
    <section><h2>1. 研究结论</h2><div class="grid">${cardGrid(report.conclusions, "card", sources)}</div></section>
    ${userSupplementSection(report)}
    <section>
      <h2>2. 客户画像</h2>
      <h3>2.1 主体与股权/区域</h3><div class="grid two">${evidenceCards(report.customerInsights?.localCards, sources)}</div>
      <h3>2.2 产品与客户/行业背景</h3><div class="grid two">${evidenceCards(report.customerInsights?.groupCards, sources)}</div>
      <h3>2.3 经营规模与财务</h3><div class="metric-grid">${metricCards(report.customerInsights?.metrics, sources)}</div>
      <h3>2.4 数字化与AI/组织与采购约束</h3><div class="grid two">${evidenceCards(report.customerInsights?.digitalCards, sources)}</div>
    </section>
    <section><h2>3. 经营痛点穿透</h2><div class="pain-grid">${painCards(report.pains, sources)}</div></section>
    <section><h2>4. 初步方案建议</h2><div class="solution-grid">${solutionCards(report.solutions, sources)}</div></section>
    <section><h2>5. 前置要求</h2><div class="require-grid"><article class="card"><h3>会前尽量了解</h3>${list(report.requirements?.preMeeting)}</article><article class="card"><h3>现场顺势探问</h3>${list(report.requirements?.onSite)}</article></div></section>`;
}

export function renderReportHtml(report) {
  report = normalizeReportShape(report);
  const generated = report.generatedAt ? new Date(report.generatedAt).toLocaleString("zh-CN") : "";
  const duration = formatDuration(report.durationMs);
  const isDiagnostic = report.qualityLevel === "diagnostic";
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(report.standardName)}商机挖掘报告</title>
<style>
:root{--ink:#17212b;--muted:#5e6975;--line:#d8e0e7;--paper:#f6f8fa;--teal:#007c82;--blue:#215f9c;--green:#5f7f35;--warn:#9a5b00;--danger:#b63f35}
*{box-sizing:border-box}body{margin:0;background:#eef3f6;color:var(--ink);font-family:"Microsoft YaHei","Alibaba PuHuiTi","Noto Sans SC",Arial,sans-serif;font-size:15px;line-height:1.66}
a{color:var(--blue);text-decoration:none;border-bottom:1px solid rgba(33,95,156,.25)}.icon{width:18px;height:18px;vertical-align:-3px}.page{max-width:1120px;margin:0 auto;background:#fff;box-shadow:0 18px 50px rgba(23,33,43,.12)}
.hero{padding:42px 48px 34px;color:#fff;background:linear-gradient(135deg,#17212b 0%,#214653 62%,#f5f7fa 62%)}.kicker{display:inline-flex;padding:6px 12px;border:1px solid rgba(255,255,255,.35);border-radius:999px;color:#dfecef;font-size:13px;font-weight:700}
h1{max-width:820px;margin:22px 0 12px;font-size:35px;line-height:1.18}.hero>p{max-width:760px;margin:0;color:#e6eef1;font-size:16px}.quick{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:28px}.quick div{min-height:132px;padding:14px;border-radius:8px;background:rgba(255,255,255,.94);color:var(--ink)}.quick b{display:block;margin-bottom:6px;color:var(--teal);font-size:16px}.quick span{display:block;color:var(--muted);font-size:13px;line-height:1.45;margin-top:6px}
section{padding:30px 48px 10px}h2{margin:0 0 14px;padding-bottom:8px;border-bottom:2px solid var(--line);font-size:23px;line-height:1.25}h3{margin:0 0 8px;color:var(--blue);font-size:16px}.page>section>h3{margin:30px 0 12px}.page>section>h2+h3{margin-top:6px}.lead,.muted{margin:0 0 16px;color:var(--muted)}
.quality-banner{margin:22px 48px 0;border:1px solid var(--line);border-radius:8px;padding:13px 16px;background:#fbfcfd}.quality-banner b{display:block;margin-bottom:3px}.quality-banner span{display:block;color:var(--muted);font-size:13px}.quality-banner ul{margin-top:8px}.quality-formal{border-left:5px solid var(--teal)}.quality-brief{border-left:5px solid var(--warn);background:#fff9ef}.quality-limited{border-left:5px solid #c76b19;background:#fff7ed}.quality-diagnostic{border-left:5px solid var(--danger);background:#fff4f2}
.annual-panel{margin:22px 48px 0;border:1px solid var(--line);border-radius:10px;padding:0 18px 8px;background:linear-gradient(180deg,#fbfdfd 0%,#fff 100%)}.annual-panel summary{display:flex;justify-content:space-between;gap:16px;align-items:center;cursor:pointer;padding:16px 0 12px}.annual-panel summary h2{margin:0}.annual-panel summary span{color:var(--muted);font-size:13px}.annual-summary{display:flex;justify-content:space-between;gap:18px;align-items:start;margin-bottom:12px}.annual-summary b{display:block;color:var(--teal);font-size:16px}.annual-summary span,.annual-summary p,.annual-panel small{color:var(--muted);font-size:13px}.annual-summary p{margin:0;max-width:380px}
.rating-card{margin:18px 48px 0;border:1px solid var(--line);border-radius:10px;background:#fbfcfd;overflow:hidden}.rating-card summary{display:flex;justify-content:space-between;gap:16px;align-items:center;cursor:pointer;list-style:none;padding:16px 18px}.rating-card summary::-webkit-details-marker{display:none}.rating-score{display:grid;grid-template-columns:22px auto;gap:2px 10px;align-items:center}.rating-score .icon{grid-row:1 / span 2;color:var(--teal);margin-top:2px}.rating-score b{font-size:18px}.rating-score span{grid-column:2;color:var(--muted);font-size:13px}.rating-toggle{display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-size:13px;font-weight:800;white-space:nowrap}.rating-card[open] .rating-toggle .icon{transform:rotate(180deg)}.rating-detail{border-top:1px solid var(--line);padding:16px 18px 18px}.rating-dim-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.rating-dim{border:1px solid var(--line);border-radius:8px;background:#fff;padding:12px}.rating-dim-head{display:flex;justify-content:space-between;gap:12px}.rating-dim-head strong{color:var(--teal)}.rating-bar{height:6px;margin:8px 0 10px;border-radius:999px;background:#e5ecef;overflow:hidden}.rating-bar i{display:block;height:100%;border-radius:999px;background:var(--teal)}.rating-dim p{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.5}.rating-dim p b{display:inline-block;color:var(--ink);margin-right:6px}.risk-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.risk-tags span{border-radius:999px;padding:4px 9px;background:#fff4f2;color:var(--danger);font-size:12px;font-weight:800}.rating-guidance{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:14px}.rating-guidance article{border:1px solid var(--line);border-radius:8px;background:#fff;padding:12px}.rating-guidance b{display:block;color:var(--teal);margin-bottom:6px}.rating-guidance p,.rating-guidance ul{margin:0;color:var(--ink);font-size:13px;line-height:1.55}.rating-guidance ul{padding-left:18px}.rating-guidance li+li{margin-top:4px}.rating-a{border-left:5px solid #16885f}.rating-b{border-left:5px solid #216fa2}.rating-c{border-left:5px solid #b36b00;background:#fff9ef}.rating-d,.rating-not-rated{border-left:5px solid #8a96a3;background:#f7f9fb}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.grid.two{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}.grid.two>*:only-child{grid-column:1/-1}.card,.profile-card,.pain-card,.solution-card{border:1px solid var(--line);border-radius:8px;background:#fbfcfd;padding:15px 16px}.card p,.profile-card p,.pain-card p,.solution-card p{margin:0}.label{color:var(--teal);font-weight:800;font-size:13px;margin:9px 0 5px}ul{margin:0;padding-left:18px}li{margin:3px 0}.evidence-links{margin:0 0 9px}.evidence-links summary{display:inline-flex;align-items:center;gap:4px;width:max-content;max-width:100%;padding:2px 8px;border-radius:999px;background:#eaf7f7;color:var(--teal);font-size:12px;font-weight:800;cursor:pointer;list-style:none}.evidence-badge{color:var(--teal);font-weight:900}.evidence-badge.annual{color:#8a5a00}.evidence-links summary::-webkit-details-marker{display:none}.evidence-links div{display:grid;gap:6px;margin-top:7px}.evidence-links a,.evidence-links .evidence-item{display:block;border:1px solid var(--line);border-radius:7px;background:#fff;padding:7px 9px;color:var(--ink);font-size:12px;line-height:1.45}.evidence-links .evidence-item{border-color:#ead7aa;background:#fff8e8}.evidence-links small{display:block;color:var(--muted);margin-top:2px}.evidence-links em{display:block;margin-top:4px;color:#526070;font-style:normal}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:12px 0 16px}.metric{border:1px solid var(--line);border-radius:8px;background:#fff;padding:14px;min-height:128px;overflow:visible}.metric b{display:block;color:var(--muted);font-size:13px}.metric strong{display:block;color:var(--teal);font-size:22px;margin:4px 0;overflow-wrap:anywhere}.metric span,.solution-card small{display:block;color:var(--muted);font-size:13px;line-height:1.5}.pain-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.pain-card .entry{margin-top:10px;padding:9px 10px;border-radius:6px;background:#eef7f7;color:var(--teal);font-weight:800}.solution-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.tag{display:inline-block;padding:2px 8px;border-radius:999px;background:var(--teal);color:#fff;font-weight:800;font-size:12px;margin-bottom:8px}.require-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.source-overview{border:1px solid var(--line);border-radius:8px;background:#fbfcfd;padding:12px 14px}.source-overview summary{cursor:pointer;font-weight:800;color:var(--blue)}table{width:100%;border-collapse:collapse;table-layout:fixed;margin:12px 0 18px;font-size:14px}th{background:var(--ink);color:#fff;text-align:left;padding:10px 11px;font-weight:700}td{border:1px solid var(--line);padding:10px 11px;vertical-align:top;overflow-wrap:anywhere}tr:nth-child(even) td{background:#f8fafc}.footer{padding:18px 48px 34px;color:var(--muted);font-size:13px}
@media(max-width:850px){.hero,section,.footer{padding-left:22px;padding-right:22px}.quality-banner,.rating-card,.annual-panel{margin-left:22px;margin-right:22px}.quick,.grid,.grid.two,.metric-grid,.pain-grid,.solution-grid,.require-grid,.rating-dim-grid,.rating-guidance{grid-template-columns:1fr}.rating-card summary,.annual-summary{display:block}.rating-toggle{margin-top:8px}h1{font-size:29px}}
</style>
</head>
<body>
<main class="page">
  <header class="hero">
    <div class="kicker">销售 / 一线会前客户战报</div>
    <h1>${e(report.standardName)}：客户深度挖掘与销售准备</h1>
    <p>先判断客户为什么会买，再决定讲什么方案。</p>
    <div class="quick">${arr(report.quickCards).map((item) => `<div><b>${e(item.title)}</b>${e(item.body)}<span>${e(item.insight)}</span></div>`).join("")}</div>
  </header>
  ${qualityBanner(report)}
  ${annualReportPanel(report)}
  ${ratingPanel(report)}
  ${isDiagnostic ? renderDiagnosticSections(report) : renderNormalSections(report)}
  <section><details class="source-overview"><summary>来源总览与采集诊断</summary><table><colgroup><col style="width:24%"><col style="width:42%"><col style="width:12%"><col style="width:22%"></colgroup><thead><tr><th>资料</th><th>用于支撑的判断</th><th>置信度</th><th>链接</th></tr></thead><tbody>${sourceRows(report.sources)}</tbody></table></details></section>
  <div class="footer">生成时间：${e(generated)}｜生成耗时：${e(duration)}｜模型：${e(modelDisplay(report))}｜通道：${e(report.modelChannel)}｜质量：${e(report.qualityLabel || "正式报告")}｜来源：${e(sourceDisplay(report))}｜可读来源：${e(report.readableSourceCount ?? 0)}｜主题覆盖：${e(report.topicCoverageCount ?? 0)}</div>
</main>
</body>
</html>`;
}
