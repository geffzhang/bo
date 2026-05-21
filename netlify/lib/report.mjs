import { callModel, extractJson } from "./ai.mjs";
import { ChevronDown, CircleAlert, Trophy } from "lucide";
import { clip } from "./util.mjs";
import { buildOpportunityRating } from "./opportunity-rating.mjs";
import {
  TOPIC_NAMES,
  cleanUrl,
  formatQualityWarnings,
  isHttpUrl,
  normalizeReportSources
} from "./report-quality.mjs";

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

function list(items) {
  const values = arr(items);
  return values.length ? `<ul>${values.map((item) => `<li>${e(item)}</li>`).join("")}</ul>` : `<p class="muted">待确认</p>`;
}

function cardGrid(items, className = "card") {
  return arr(items)
    .map((item) => `<article class="${className}"><h3>${e(item.title)}</h3><p>${e(item.body || item.summary || item.insight)}</p></article>`)
    .join("") || `<article class="${className}"><h3>待补充</h3><p>当前来源不足，需补充客户信息后再判断。</p></article>`;
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
  return `${rating.grade}级｜${rating.score}分｜${rating.nextAction}`;
}

function ratingPanel(report) {
  const rating = ratingOf(report);
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
                  ${arr(item.deductions).length ? `<p><b>扣分</b>${e(arr(item.deductions).join("；"))}</p>` : ""}
                  ${arr(item.questions).length ? `<p><b>待确认</b>${e(arr(item.questions).join("；"))}</p>` : ""}
                </article>`
              )
              .join("")}
          </div>
          ${arr(rating.riskFlags).length ? `<div class="risk-tags">${arr(rating.riskFlags).map((item) => `<span>${e(item)}</span>`).join("")}</div>` : ""}
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

function evidenceCards(items) {
  return arr(items)
    .map(
      (item) => `<article class="profile-card"><h3>${e(item.title)}</h3>
        <div class="label">公开信息</div>${list(item.facts)}
        <div class="label">关键信息</div><p>${e(item.insight)}</p>
      </article>`
    )
    .join("") || `<article class="profile-card"><h3>待确认</h3><p>当前来源不足以形成稳定判断。</p></article>`;
}

function metricCards(items) {
  return arr(items)
    .map((item) => `<div class="metric"><b>${e(item.label)}</b><strong>${e(item.value)}</strong><span>${e(item.note)}</span></div>`)
    .join("") || `<div class="metric"><b>指标</b><strong>待确认</strong><span>公开来源不足。</span></div>`;
}

function painCards(items) {
  return arr(items)
    .map(
      (item) => `<article class="pain-card"><h3>${e(item.title)}</h3>
        <div class="label">依据来源</div><p>${e(item.sourceBasis)}</p>
        <div class="label">痛点推导</div><p>${e(item.reasoning)}</p>
        <div class="label">现场确认口径</div>${list(item.validationSignals)}
        <div class="entry">${e(item.aiEntry)}</div>
      </article>`
    )
    .join("") || `<article class="pain-card"><h3>暂不生成痛点判断</h3><p>来源不足时不输出经营痛点，避免把行业常识写成客户事实。</p></article>`;
}

function solutionCards(items) {
  return arr(items)
    .map(
      (item) => `<article class="solution-card"><span class="tag">${e(item.priority)}</span><h3>${e(item.title)}</h3>
        <p>${e(item.why)}</p><small>${e(item.how)}</small>
      </article>`
    )
    .join("") || `<article class="solution-card"><span class="tag">待定</span><h3>不建议直接承诺方案</h3><p>需先补齐客户场景与数据边界。</p></article>`;
}

function sourceRows(items) {
  const rows = arr(items)
    .filter((item) => isHttpUrl(item.url))
    .map((item) => {
      const url = cleanUrl(item.url);
      return `<tr><td>${e(item.title)}</td><td>${e(item.usedFor || item.query || item.topic || "")}</td><td>${e(item.confidence || "")}</td><td><a href="${e(url)}" target="_blank" rel="noreferrer">来源链接</a></td></tr>`;
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
    text: clip(source.text, textLimit)
  }));
}

async function analyzeTopic(company, topic, sources) {
  const topicSources = sources.filter((source) => source.topic === topic || source.query?.includes(topic));
  const pack = buildSourcePack(topicSources.length ? topicSources : sources, 12, 3200);
  if (!pack.length) {
    return {
      topic,
      facts: [],
      metrics: [],
      implications: [],
      painSignals: [],
      uncertainties: ["未读取到可校验来源，需重新检索或人工补充。"],
      sourceIds: []
    };
  }

  const messages = [
    {
      role: "system",
      content: "你是售前客户研究分析师。只返回严格 JSON，不要 Markdown，不要解释。所有判断必须基于给定来源；无法确认就写待确认。"
    },
    {
      role: "user",
      content: `请针对主题“${topic}”提取可用于商机判断的证据，写给一线会前准备使用，避免空话。

企业信息：
${JSON.stringify(company, null, 2)}

来源：
${JSON.stringify(pack, null, 2)}

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
    const answer = await callModel(messages, { temperature: 0.1, maxTokens: 5000, timeoutMs: 150000 });
    return extractJson(answer.content);
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
      ? "本次来源较少，仅生成有限资料版。所有结论必须写成会前参考或待确认判断；不得输出强结论、不得推断预算或真实痛点，除非来源中有明确证据。"
      : quality.qualityLevel === "brief"
      ? "本次来源达到简版报告门槛但不足正式报告门槛。结论必须更克制，所有未被来源支撑的内容放入待确认，不得写成确定事实。"
      : "本次来源达到正式报告门槛。仍需标注公开信息、第三方线索、合理推断与待确认边界。";

  return `请基于“分主题证据摘要”和“可校验来源清单”生成深度商机挖掘报告 JSON。报告给一线会前准备使用，核心是讲清楚：客户是谁、本地主体信息、集团经营压力、数字化/AI基础、潜在痛点、我方机会与前置要求。

质量约束：
${qualityInstruction}
可校验来源数：${quality.verifiedSourceCount}
可读来源数：${quality.readableSourceCount}
主题覆盖数：${quality.topicCoverageCount}
质量提醒：${formatQualityWarnings(quality.qualityWarnings).join("；") || "无"}

硬性要求：
1. 语言直接、专业、可外发；不要出现内部保护、责任归因、渠道身份标签或先免费验证等不适合外发的表达。
2. 不把推断写成事实；使用“公开信息、第三方线索、合理推断、待确认”表达置信边界。
3. 经营痛点必须写依据来源，不能只写行业常识。
4. 重点写客户深度挖掘、痛点分析、潜在需求、我们的机会；不要像通用公司简介。
5. 本地主体信息不足时，明确写“待确认”，但仍给出会前可用的判断路径。
6. 不要生成 sources 字段。附录来源由系统用真实 URL 补入。
7. 用户输入的 AI 需求属于“用户提供线索”，优先用于调整切入方向和现场确认问题，但不得写成公开事实。

企业信息：
${JSON.stringify(company, null, 2)}

用户已掌握的 AI 需求线索：
${aiNeeds || "无"}

分主题证据摘要：
${JSON.stringify(topicBriefs, null, 2)}

可校验来源清单：
${JSON.stringify(sourcePack.map(({ text, ...source }) => source), null, 2)}

必须返回以下 JSON：
{
  "standardName": "企业标准名",
  "aliases": ["别名"],
  "region": "地区",
  "industry": "行业",
  "quickCards": [{"title":"客户是谁/客户卖什么/有没有钱/先切哪里","body":"短句","insight":"关键信息：..."}],
  "conclusions": [{"title":"结论标题","body":"结论内容"}],
  "customerInsights": {
    "localCards": [{"title":"宁波/本地主体画像、园区角色、产品、产能客户、研发测试、数字化线索等","facts":["公开信息或第三方线索"],"insight":"关键信息"}],
    "groupCards": [{"title":"集团业务、客户结构、财务、行业压力、新能源方向等","facts":["公开信息或第三方线索"],"insight":"关键信息"}],
    "metrics": [{"label":"指标","value":"数值","note":"说明和来源口径"}],
    "digitalCards": [{"title":"数字化/AI线索","facts":["公开信息或第三方线索"],"insight":"关键信息"}]
  },
  "pains": [{"title":"经营痛点","sourceBasis":"具体来源和依据","reasoning":"痛点推导","validationSignals":["现场可确认的指标口径"],"aiEntry":"AI切入方向"}],
  "solutions": [{"priority":"P1/P2/P0","title":"方案","why":"优先级理由","how":"做法"}],
  "requirements": {"preMeeting":["会前尽量了解"],"onSite":["现场顺势探问"]},
  "keywords": ["用于模糊搜索的关键词"]
}`;
}

export async function generateStructuredReport(company, sources, quality, onProgress = async () => {}) {
  const sourcePack = buildSourcePack(sources, 36, 2600);
  const topicBriefs = [];

  for (let i = 0; i < TOPIC_NAMES.length; i += 1) {
    const topic = TOPIC_NAMES[i];
    await onProgress(80 + Math.round((i / TOPIC_NAMES.length) * 10), `证据整理：${topic}`, {
      detail: `正在把公开来源拆成“${topic}”证据摘要。`,
      sourceCount: sourcePack.length,
      qualityLevel: quality.qualityLevel
    });
    topicBriefs.push(await analyzeTopic(company, topic, sources));
  }

  await onProgress(92, "模型分析：整合报告", {
    detail: "正在把分主题证据整合为客户认知、痛点、方案建议和前置要求。",
    sourceCount: sourcePack.length,
    qualityLevel: quality.qualityLevel
  });

  const messages = [
    {
      role: "system",
      content: "你是售前技术的首席客户研究与解决方案顾问。只返回严格 JSON，不要 Markdown，不要解释。"
    },
    {
      role: "user",
      content: finalPrompt(company, sourcePack, topicBriefs, quality)
    }
  ];

  const answer = await callModel(messages, { temperature: 0.15, maxTokens: 16000, timeoutMs: 220000 });
  const parsed = extractJson(answer.content);
  return {
    ...parsed,
    sourceBriefs: topicBriefs,
    sources: normalizeReportSources(sources, 32).map(({ text, readable, ...source }) => ({
      ...source,
      usedFor: source.usedFor || source.topic || source.query || "公开信息核验"
    })),
    modelName: answer.model,
    modelChannel: answer.channel
  };
}

export async function improveStructuredReport(report, userInput) {
  const safeReport = {
    ...report,
    html: undefined
  };
  const messages = [
    {
      role: "system",
      content:
        "你是售前客户研究与解决方案顾问。只返回严格 JSON，不要 Markdown。必须保留证据边界：公开来源支撑的内容写公开信息，用户补充内容写用户提供线索或待确认，不得把用户补充内容伪装成公开事实。"
    },
    {
      role: "user",
      content: `请基于当前商机报告和用户补充信息，完善报告结构。用于一线会前准备，语言要直接、专业、可外发。

质量等级：${report.qualityLabel || report.qualityLevel || "未标注"}
可校验来源：${report.verifiedSourceCount ?? report.sourceCount ?? 0} 条
可读来源：${report.readableSourceCount ?? 0} 条
主题覆盖：${report.topicCoverageCount ?? 0} 类

硬性要求：
1. 不要新增或编造来源，不要生成 sources 字段。
2. 用户补充信息可以影响方案优先级、会前问题清单、AI切入方向，但必须标为“用户提供线索”或“待确认”。
3. 若当前报告是有限资料版或简版，结论必须保守，避免强判断。
4. 保持原有 JSON 字段结构：standardName、aliases、region、industry、quickCards、conclusions、customerInsights、pains、solutions、requirements、keywords。

用户补充信息：
${userInput}

当前报告：
${JSON.stringify(safeReport, null, 2)}`
    }
  ];

  const answer = await callModel(messages, { temperature: 0.12, maxTokens: 16000, timeoutMs: 220000 });
  const parsed = extractJson(answer.content);
  const now = new Date().toISOString();
  return {
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
    userSupplements: [
      ...(report.userSupplements || []),
      {
        at: now,
        text: userInput
      }
    ],
    modelName: answer.model,
    modelChannel: `${answer.channel}/refine`
  };
}

function qualityBanner(report) {
  const warnings = formatQualityWarnings(report.qualityWarnings || []);
  const title =
    report.qualityLevel === "diagnostic"
      ? "资料不足，已阻止正式报告生成"
      : report.qualityLevel === "limited"
        ? "资料有限，仅供会前参考"
      : report.qualityLevel === "brief"
        ? "来源偏少，建议谨慎使用"
        : "来源达到正式报告门槛";
  return `<div class="quality-banner quality-${e(report.qualityLevel || "formal")}">
    <b>${e(title)}</b>
    <span>质量：${e(report.qualityLabel || "正式报告")}｜可校验来源 ${e(report.verifiedSourceCount ?? report.sourceCount ?? 0)} 条｜可读来源 ${e(report.readableSourceCount ?? 0)} 条｜主题覆盖 ${e(report.topicCoverageCount ?? 0)} 类</span>
    ${warnings.length ? `<ul>${warnings.map((item) => `<li>${e(item)}</li>`).join("")}</ul>` : ""}
  </div>`;
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
  return `
    <section><h2>1. 研究结论</h2><div class="grid">${cardGrid(report.conclusions)}</div></section>
    <section>
      <h2>2. 客户认知</h2>
      <h3>2.1 本地主体画像</h3><div class="grid two">${evidenceCards(report.customerInsights?.localCards)}</div>
      <h3>2.2 集团与行业背景</h3><div class="grid two">${evidenceCards(report.customerInsights?.groupCards)}</div>
      <h3>2.3 经营规模与关键指标</h3><div class="metric-grid">${metricCards(report.customerInsights?.metrics)}</div>
      <h3>2.4 数字化与AI线索</h3><div class="grid two">${evidenceCards(report.customerInsights?.digitalCards)}</div>
    </section>
    <section><h2>3. 经营痛点穿透</h2><p class="lead">以下为基于公开信息形成的痛点推导，现场可用对应指标口径做确认。</p><div class="pain-grid">${painCards(report.pains)}</div></section>
    <section><h2>4. 初步方案建议</h2><div class="solution-grid">${solutionCards(report.solutions)}</div></section>
    <section><h2>5. 前置要求</h2><div class="require-grid"><article class="card"><h3>会前尽量了解</h3>${list(report.requirements?.preMeeting)}</article><article class="card"><h3>现场顺势探问</h3>${list(report.requirements?.onSite)}</article></div></section>`;
}

export function renderReportHtml(report) {
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
.rating-card{margin:18px 48px 0;border:1px solid var(--line);border-radius:10px;background:#fbfcfd;overflow:hidden}.rating-card summary{display:flex;justify-content:space-between;gap:16px;align-items:center;cursor:pointer;list-style:none;padding:16px 18px}.rating-card summary::-webkit-details-marker{display:none}.rating-score{display:grid;grid-template-columns:22px auto;gap:2px 10px;align-items:center}.rating-score .icon{grid-row:1 / span 2;color:var(--teal);margin-top:2px}.rating-score b{font-size:18px}.rating-score span{grid-column:2;color:var(--muted);font-size:13px}.rating-toggle{display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-size:13px;font-weight:800;white-space:nowrap}.rating-card[open] .rating-toggle .icon{transform:rotate(180deg)}.rating-detail{border-top:1px solid var(--line);padding:16px 18px 18px}.rating-dim-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.rating-dim{border:1px solid var(--line);border-radius:8px;background:#fff;padding:12px}.rating-dim-head{display:flex;justify-content:space-between;gap:12px}.rating-dim-head strong{color:var(--teal)}.rating-bar{height:6px;margin:8px 0 10px;border-radius:999px;background:#e5ecef;overflow:hidden}.rating-bar i{display:block;height:100%;border-radius:999px;background:var(--teal)}.rating-dim p{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.5}.rating-dim p b{display:inline-block;color:var(--ink);margin-right:6px}.risk-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.risk-tags span{border-radius:999px;padding:4px 9px;background:#fff4f2;color:var(--danger);font-size:12px;font-weight:800}.rating-s{border-left:5px solid #10846f}.rating-a{border-left:5px solid #16885f}.rating-b{border-left:5px solid #216fa2}.rating-c{border-left:5px solid #b36b00;background:#fff9ef}.rating-d,.rating-not-rated{border-left:5px solid #8a96a3;background:#f7f9fb}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.grid.two{grid-template-columns:repeat(2,1fr)}.card,.profile-card,.fact-card,.pain-card,.solution-card{border:1px solid var(--line);border-radius:8px;background:#fbfcfd;padding:15px 16px}.card p,.profile-card p,.fact-card p,.pain-card p,.solution-card p{margin:0}.label{color:var(--teal);font-weight:800;font-size:13px;margin:9px 0 5px}ul{margin:0;padding-left:18px}li{margin:3px 0}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:12px 0 16px}.metric{border:1px solid var(--line);border-radius:8px;background:#fff;padding:14px;min-height:128px}.metric b{display:block;color:var(--muted);font-size:13px}.metric strong{display:block;color:var(--teal);font-size:24px;margin:4px 0}.metric span,.fact-card small,.solution-card small{display:block;color:var(--muted);font-size:13px;line-height:1.5}.pain-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.pain-card .entry{margin-top:10px;padding:9px 10px;border-radius:6px;background:#eef7f7;color:var(--teal);font-weight:800}.solution-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.tag{display:inline-block;padding:2px 8px;border-radius:999px;background:var(--teal);color:#fff;font-weight:800;font-size:12px;margin-bottom:8px}.require-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}table{width:100%;border-collapse:collapse;table-layout:fixed;margin:12px 0 18px;font-size:14px}th{background:var(--ink);color:#fff;text-align:left;padding:10px 11px;font-weight:700}td{border:1px solid var(--line);padding:10px 11px;vertical-align:top;overflow-wrap:anywhere}tr:nth-child(even) td{background:#f8fafc}.footer{padding:18px 48px 34px;color:var(--muted);font-size:13px}
@media(max-width:850px){.hero,section,.footer{padding-left:22px;padding-right:22px}.quality-banner,.rating-card{margin-left:22px;margin-right:22px}.quick,.grid,.grid.two,.metric-grid,.pain-grid,.solution-grid,.require-grid,.rating-dim-grid{grid-template-columns:1fr}.rating-card summary{display:block}.rating-toggle{margin-top:8px}h1{font-size:29px}}
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
  ${ratingPanel(report)}
  ${isDiagnostic ? renderDiagnosticSections(report) : renderNormalSections(report)}
  <section><h2>附录：相关资料来源</h2><table><colgroup><col style="width:24%"><col style="width:42%"><col style="width:12%"><col style="width:22%"></colgroup><thead><tr><th>资料</th><th>用于支撑的判断</th><th>置信度</th><th>链接</th></tr></thead><tbody>${sourceRows(report.sources)}</tbody></table></section>
  <div class="footer">生成时间：${e(generated)}｜生成耗时：${e(duration)}｜模型：${e(report.modelName)}｜通道：${e(report.modelChannel)}｜质量：${e(report.qualityLabel || "正式报告")}｜可校验来源：${e(report.verifiedSourceCount ?? report.sourceCount ?? 0)}｜可读来源：${e(report.readableSourceCount ?? 0)}｜主题覆盖：${e(report.topicCoverageCount ?? 0)}</div>
</main>
</body>
</html>`;
}
