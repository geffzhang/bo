import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { readJson, writeJson } from "./store.mjs";
import { clip, id, nowIso, slugify } from "./util.mjs";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_PAGES = 320;
const MIN_TOTAL_TEXT = 2500;
const MIN_AVG_TEXT_PER_PAGE = 35;

function cleanText(value = "") {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/([一-龥])\s+(?=[一-龥])/g, "$1")
    .replace(/(\d)\s+(?=[\d,.，])/g, "$1")
    .replace(/([,.，])\s+(?=\d)/g, "$1")
    .replace(/([A-Za-z])\s+(?=[A-Za-z])/g, "$1")
    .replace(/\/\s*(\d)\s+(\d)\s+(\d)\b/g, "/$1$2$3")
    .replace(/[ \t]+/g, " ")
    .replace(/6\s*0\s*3\s*7\s*8\s*8/g, "603788")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanEvidenceText(value = "") {
  return cleanText(value)
    .replace(/^\d{6}\s*[\s\S]{0,80}?年度报告\s*\d+\s*\/\s*\d+\s*/g, "")
    .replace(/报告期内履行持续督导职责[\s\S]{0,260}?期间/g, "")
    .replace(/签字的保荐代表人姓名[\s\S]{0,160}?期间/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptAround(text, index, radius = 180) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return clip(cleanEvidenceText(text.slice(start, end)), 260);
}

function isBadMetricContext(context = "", label = "", value = "") {
  const text = cleanEvidenceText(context);
  if (/报告期内履行持续督导职责|保荐机构|保荐代表|签字|办公地址|持续督导的期间/.test(text)) return true;
  if (/财务顾问|履行持续督导|报告期内/.test(text) && !/营业收入|净利润|现金流|研发|员工|资产负债|毛利率/.test(text)) return true;
  if (/归母|净利润/.test(label) && /现金红利|每\s*10\s*股|派发|分红|占\s*\d{4}\s*年度归属于上市公司股东的净利润比例|净利润比例/.test(text)) return true;
  if (/员工|人数/.test(label)) {
    const num = Number(String(value || "").replace(/[^\d]/g, ""));
    if (num >= 2000 && num <= 2035 && !/在职员工的数量合计|员工总数|员工数量|专业构成/.test(text)) return true;
  }
  if (!/员工|人数|毛利率|资产负债率/.test(label) && /^\/?\d{1,3}$/.test(String(value || "").replace(/\s+/g, ""))) return true;
  return false;
}

function compactNumber(value = "", context = "") {
  const raw = String(value || "");
  const explicitUnit = raw.match(/(百万元|万元|亿元|千元|百万|元|%|人)/)?.[1] || "";
  const number = raw.replace(/[，,\s]/g, "").replace(/(百万元|万元|亿元|千元|百万|元|%|人)$/g, "");
  const unitMatch = String(context || "").match(/单位[:：]\s*(人民币)?\s*(百万元|万元|亿元|千元|百万|元)/);
  const nearbyUnit = String(context || "").match(/(百万元|万元|亿元|千元|百万|元|%|人)/);
  const unit = explicitUnit || unitMatch?.[2] || nearbyUnit?.[1] || "";
  return `${number}${unit ? ` ${unit}` : ""}`.trim();
}

function metricCandidate(pageText, page, label, patterns) {
  const normalizedPageText = pageText.replace(/\s+/g, " ");
  for (const pattern of patterns) {
    const match = pattern.exec(normalizedPageText);
    if (!match) continue;
    const index = match.index || 0;
    const context = excerptAround(pageText, index, 220);
    const value = compactNumber(match[1] || match[2] || match[0], context);
    if (!value || value.length > 80) continue;
    if (isBadMetricContext(context, label, value)) continue;
    return {
      label,
      value,
      page,
      context
    };
  }
  return null;
}

function compactChineseMetricValue(value = "", context = "", label = "") {
  const raw = String(value || "").replace(/[，,]/g, "").replace(/\s+/g, "");
  const contextText = String(context || "");
  const explicitUnit = raw.match(/(百万元|万元|亿元|千元|元|%|人)$/)?.[1] || "";
  const contextUnit = contextText.match(/单位[:：\s]*(?:人民币)?\s*(百万元|万元|亿元|千元|元)/)?.[1] || contextText.match(/(百万元|万元|亿元|千元|元|%|人)/)?.[1] || "";
  const unit = /员工|人数/.test(label) ? "人" : explicitUnit || contextUnit;
  return `${raw}${unit && !raw.endsWith(unit) ? ` ${unit}` : ""}`.trim();
}

function normalizeMetricValue(item) {
  const label = item.label || "";
  let value = String(item.value || "").replace(/\s+/g, "").replace(/，/g, ",");
  const moneyLike = /营业|收入|利润|现金流|研发|费用|资产|负债|客户|销售/.test(label);
  if (/员工|人数/.test(label)) {
    const num = value.match(/\d[\d,]*/)?.[0] || "";
    return { ...item, value: num ? `${num.replace(/,/g, "")}人` : value, context: cleanEvidenceText(item.context) };
  }
  if (/%/.test(value) && !moneyLike) {
    const percent = value.match(/[-负－]?\d{1,3}(?:\.\d{1,2})?/)?.[0] || value;
    return { ...item, value: `${percent.replace(/^负|^－/, "-")}%`, context: cleanEvidenceText(item.context) };
  }
  const unit = value.match(/(亿元|万元|千元|百万元|元)$/)?.[1] || "";
  const number = (value.match(/[-负－]?\d[\d,]*(?:\.\d{1,2})?/)?.[0] || value.replace(/(亿元|万元|千元|百万元|元|%)/g, "")).replace(/^负|^－/, "-").replace(/,/g, "");
  const numeric = Number(number);
  if (!Number.isFinite(numeric)) return { ...item, value, context: cleanEvidenceText(item.context) };
  if (unit === "元" || !unit) {
    if (Math.abs(numeric) >= 100000000) value = `${(numeric / 100000000).toFixed(2).replace(/\.00$/, "")}亿元`;
    else if (Math.abs(numeric) >= 10000) value = `${(numeric / 10000).toFixed(2).replace(/\.00$/, "")}万元`;
    else value = `${numeric}元`;
  } else if (unit === "万元" && Math.abs(numeric) >= 10000) {
    value = `${(numeric / 10000).toFixed(2).replace(/\.00$/, "")}亿元`;
  }
  return { ...item, value, context: cleanEvidenceText(item.context) };
}

function fallbackMetricCandidate(pageText, page, label, patterns) {
  const rawText = String(pageText || "");
  const normalizedPageText = rawText.replace(/\s+/g, "");
  for (const pattern of patterns) {
    const match = pattern.exec(normalizedPageText);
    if (!match) continue;
    const context = excerptAround(rawText, Math.min(rawText.length - 1, Math.max(0, match.index || 0)), 300);
    const value = compactChineseMetricValue(match[1] || match[2] || "", context, label);
    if (!value || value.length > 80) continue;
    if (isBadMetricContext(context, label, value)) continue;
    return { label, value, page, context };
  }
  return null;
}

function extractMetrics(pageTexts) {
  const money = "([\\-负亏]?\\d[\\d,，.]{2,}\\s*(?:元|万元|亿元|千元|百万)?)";
  const definitions = [
    {
      label: "营业收入",
      patterns: [
        new RegExp(`营\\s*业\\s*(?:总\\s*)?收\\s*入[^0-9负亏\\-]{0,100}${money}`),
        new RegExp(`主\\s*营\\s*业\\s*务\\s*收\\s*入[^0-9负亏\\-]{0,100}${money}`)
      ]
    },
    {
      label: "归母净利润",
      patterns: [
        new RegExp(`归\\s*属\\s*于\\s*(?:上\\s*市\\s*公\\s*司)?\\s*股\\s*东\\s*的\\s*净\\s*利\\s*润[^0-9负亏\\-]{0,140}${money}`),
        new RegExp(`归\\s*母\\s*净\\s*利\\s*润[^0-9负亏\\-]{0,100}${money}`)
      ]
    },
    {
      label: "扣非净利润",
      patterns: [
        new RegExp(`扣\\s*除\\s*非\\s*经\\s*常\\s*性\\s*损\\s*益[^0-9负亏\\-]{0,160}${money}`),
        new RegExp(`扣\\s*非\\s*净\\s*利\\s*润[^0-9负亏\\-]{0,100}${money}`)
      ]
    },
    {
      label: "毛利率",
      patterns: [
        /毛\s*利\s*率[^0-9负亏\-]{0,80}([\-负亏]?\d{1,3}(?:\.\d+)?\s*%)/,
        /综\s*合\s*毛\s*利\s*率[^0-9负亏\-]{0,80}([\-负亏]?\d{1,3}(?:\.\d+)?\s*%)/
      ]
    },
    {
      label: "经营现金流",
      patterns: [
        new RegExp(`经\\s*营\\s*活\\s*动\\s*产\\s*生\\s*的\\s*现\\s*金\\s*流\\s*量\\s*净\\s*额[^0-9负亏\\-]{0,150}${money}`),
        new RegExp(`经\\s*营\\s*现\\s*金\\s*流(?:\\s*量)?\\s*净\\s*额[^0-9负亏\\-]{0,100}${money}`)
      ]
    },
    {
      label: "资产负债率",
      patterns: [
        /资\s*产\s*负\s*债\s*率[^0-9负亏\-]{0,80}([\-负亏]?\d{1,3}(?:\.\d+)?\s*%)/,
        /负\s*债\s*率[^0-9负亏\-]{0,80}([\-负亏]?\d{1,3}(?:\.\d+)?\s*%)/
      ]
    },
    {
      label: "研发投入",
      patterns: [
        new RegExp(`研\\s*发\\s*投\\s*入(?:\\s*金\\s*额)?[^0-9负亏\\-]{0,100}${money}`),
        new RegExp(`研\\s*发\\s*费\\s*用[^0-9负亏\\-]{0,100}${money}`)
      ]
    },
    {
      label: "员工数量",
      patterns: [
        /(?:在\s*职)?员\s*工(?:总\s*数|数\s*量)?[^0-9]{0,100}(\d[\d,，]{1,}\s*(?:人)?)/,
        /员\s*工\s*总\s*数[^0-9]{0,100}(\d[\d,，]{1,}\s*(?:人)?)/
      ]
    },
    {
      label: "前五大客户/客户集中度",
      patterns: [
        new RegExp(`前\\s*五\\s*名\\s*客\\s*户(?:销\\s*售\\s*额|合\\s*计\\s*销\\s*售\\s*金\\s*额|销\\s*售\\s*金\\s*额)[^0-9负亏\\-]{0,160}${money}`),
        /前\s*五\s*大\s*客\s*户[^%]{0,180}(\d{1,3}(?:\.\d+)?\s*%)/
      ]
    }
  ];

  const out = [];
  for (const def of definitions) {
    for (let index = 0; index < pageTexts.length; index += 1) {
      const candidate = metricCandidate(pageTexts[index] || "", index + 1, def.label, def.patterns.map((pattern) => new RegExp(pattern.source, pattern.flags)));
      if (candidate) {
        out.push(candidate);
        break;
      }
    }
  }
  const existingLabels = new Set(out.map((item) => item.label));
  const moneyCn = "([-负－]?\\d[\\d,，]*(?:\\.\\d{1,2})?\\s*(?:元|万元|亿元|千元|百万元)?)";
  const percentCn = "([-负－]?\\d{1,3}(?:\\.\\d+)?\\s*%)";
  const peopleCn = "(\\d[\\d,，]*\\s*人)";
  const fallbackDefinitions = [
    { label: "营业收入", patterns: [new RegExp(`(?:营业收入|营业总收入|主营业务收入)[^0-9负－-]{0,120}${moneyCn}`)] },
    { label: "归母净利润", patterns: [new RegExp(`(?:归属于上市公司股东的净利润|归属于母公司所有者的净利润|归母净利润)[^0-9负－-]{0,160}${moneyCn}`)] },
    { label: "扣非净利润", patterns: [new RegExp(`(?:扣除非经常性损益[^\\n]{0,80}净利润|扣非净利润)[^0-9负－-]{0,180}${moneyCn}`)] },
    { label: "毛利率", patterns: [new RegExp(`(?:毛利率|综合毛利率)[^0-9负－-]{0,120}${percentCn}`)] },
    { label: "经营现金流", patterns: [new RegExp(`(?:经营活动产生的现金流量净额|经营现金流量净额|经营现金流)[^0-9负－-]{0,180}${moneyCn}`)] },
    { label: "资产负债率", patterns: [new RegExp(`(?:资产负债率|负债率)[^0-9负－-]{0,120}${percentCn}`)] },
    { label: "研发投入", patterns: [new RegExp(`(?:研发投入金额|研发投入|研发费用)[^0-9负－-]{0,160}${moneyCn}`)] },
    { label: "研发费用", patterns: [new RegExp(`(?:研发费用)[^0-9负－-]{0,160}${moneyCn}`)] },
    { label: "员工数量", patterns: [new RegExp(`(?:在职员工的数量合计|员工总数|员工数量|报告期末.*?员工)[^0-9]{0,160}${peopleCn}`), /在职员工的数量合计(\d[\d,，]*)/, /员工情况[^0-9]{0,120}母公司在职员工的数量\d[\d,，]*主要子公司在职员工的数量\d[\d,，]*在职员工的数量合计(\d[\d,，]*)/] },
    { label: "前五大客户/客户集中度", patterns: [new RegExp(`(?:前五名客户|前五大客户|客户集中度)[^%0-9]{0,220}(\\d{1,3}(?:\\.\\d+)?\\s*%)`)] }
  ];

  for (const def of fallbackDefinitions) {
    if (existingLabels.has(def.label)) continue;
    for (let index = 0; index < pageTexts.length; index += 1) {
      const candidate = fallbackMetricCandidate(pageTexts[index] || "", index + 1, def.label, def.patterns.map((pattern) => new RegExp(pattern.source, pattern.flags)));
      if (candidate) {
        out.push(candidate);
        existingLabels.add(def.label);
        break;
      }
    }
  }
  return out.map(normalizeMetricValue);
}

function findSection(pageTexts, title, keywords) {
  for (let index = 0; index < pageTexts.length; index += 1) {
    const text = pageTexts[index] || "";
    const shadowText = text.replace(/\s+/g, "");
    const hitIndex = keywords.map((keyword) => shadowText.indexOf(keyword)).find((value) => value >= 0);
    if (hitIndex == null || hitIndex < 0) continue;
    return {
      title,
      page: index + 1,
      excerpt: cleanEvidenceText(excerptAround(text, hitIndex, 280))
    };
  }
  return null;
}

function extractSections(pageTexts) {
  return [
    findSection(pageTexts, "主营业务与产品", ["主营业务", "主要业务", "主要产品", "产品结构"]),
    findSection(pageTexts, "经营情况讨论与分析", ["经营情况讨论与分析", "管理层讨论与分析", "经营情况分析"]),
    findSection(pageTexts, "研发投入", ["研发投入", "研发费用", "核心技术"]),
    findSection(pageTexts, "客户与供应商", ["前五名客户", "主要客户", "客户集中度", "主要供应商"]),
    findSection(pageTexts, "员工与组织", ["员工情况", "员工数量", "专业构成"]),
    findSection(pageTexts, "风险因素", ["风险因素", "可能面对的风险", "重大风险提示"])
  ].filter(Boolean);
}

async function parsePdf(buffer) {
  const pageTexts = [];
  let currentPage = 0;
  const options = {
    max: MAX_PAGES,
    pagerender: async (pageData) => {
      currentPage += 1;
      const content = await pageData.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false
      });
      const text = cleanText(content.items.map((item) => item.str).join(" "));
      pageTexts[currentPage - 1] = text;
      return `\n[[PAGE:${currentPage}]]\n${text}`;
    }
  };
  const data = await pdfParse(buffer, options);
  return {
    pageCount: data.numpages || pageTexts.length,
    text: cleanText(data.text || pageTexts.join("\n")),
    pageTexts
  };
}

export async function parseAnnualReportBuffer(buffer, { fileName = "annual-report.pdf", companyName = "" } = {}) {
  const size = buffer?.byteLength || buffer?.length || 0;
  if (!size) throw new Error("年报文件为空");
  if (size > MAX_PDF_BYTES) throw new Error("年报 PDF 超过 5MB，建议先压缩或上传更小版本。");

  const parsed = await parsePdf(buffer);
  if (parsed.pageCount > MAX_PAGES) throw new Error(`年报页数超过 ${MAX_PAGES} 页，当前版本暂不解析。`);

  const textLength = parsed.text.length;
  const avgText = parsed.pageCount ? textLength / parsed.pageCount : 0;
  if (textLength < MIN_TOTAL_TEXT || avgText < MIN_AVG_TEXT_PER_PAGE) {
    throw new Error("这份 PDF 可能是扫描版或不可复制文字版，当前只支持非 OCR 的文字型 PDF。");
  }

  const annualReportId = id("annual", `${companyName}:${fileName}`);
  const metrics = extractMetrics(parsed.pageTexts);
  const sections = extractSections(parsed.pageTexts);
  const now = nowIso();
  const evidence = {
    annualReportId,
    companyName,
    fileName,
    fileSlug: slugify(fileName),
    uploadedAt: now,
    parsedAt: now,
    pageCount: parsed.pageCount,
    textLength,
    avgTextPerPage: Math.round(avgText),
    sourceType: "用户上传年报",
    metrics,
    sections,
    warnings: [
      metrics.length < 5 ? "年报已解析，但自动提取出的财务指标偏少，建议在报告中人工核对关键表格。" : ""
    ].filter(Boolean)
  };
  await writeJson("annual-reports", `${annualReportId}.json`, evidence);
  return evidence;
}

export async function readAnnualReportEvidence(annualReportId) {
  const key = String(annualReportId || "").trim();
  if (!key) return null;
  return readJson("annual-reports", `${key}.json`, null);
}
