import { collectSources } from "./research.mjs";
import { generateStructuredReport, improveStructuredReport, renderReportHtml } from "./report.mjs";
import { getIndex, readJson, saveIndex, writeJson, writeText } from "./store.mjs";
import { id, normalizeText, nowIso, slugify, scoreMatch } from "./util.mjs";
import { buildOpportunityRating, ratingIndex } from "./opportunity-rating.mjs";
import {
  RECENT_REPORT_DAYS,
  buildDiagnosticReport,
  companyKey,
  evaluateSourceQuality,
  formatQualityWarnings,
  primaryCompanyName,
  withinDays
} from "./report-quality.mjs";

function sameCompany(report, company) {
  const key = companyKey(company);
  if (report.companyKey && key) return report.companyKey === key;
  const name = primaryCompanyName(company);
  if (!name) return false;
  return scoreMatch(report, name) >= 100;
}

function recentReportsForCompany(index, company, days = RECENT_REPORT_DAYS) {
  return (index.reports || [])
    .filter((report) => sameCompany(report, company))
    .filter((report) => withinDays(report.generatedAt, days))
    .sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
}

function mergeIndexReports(existingReports, entry) {
  return [
    entry,
    ...(existingReports || []).filter((report) => {
      if (!withinDays(report.generatedAt, RECENT_REPORT_DAYS)) return true;
      if (sameCompany(report, entry)) return false;
      return normalizeText(report.reportId) !== normalizeText(entry.reportId);
    })
  ];
}

export async function updateJob(jobId, patch) {
  const current = await readJson("jobs", `${jobId}.json`, {});
  const step = patch.stage
    ? {
        at: nowIso(),
        stage: patch.stage,
        progress: patch.progress ?? current.progress ?? 0,
        detail: patch.detail || "",
        foundCount: patch.foundCount,
        sourceCount: patch.sourceCount,
        qualityLevel: patch.qualityLevel
      }
    : null;

  await writeJson("jobs", `${jobId}.json`, {
    ...current,
    ...patch,
    steps: step ? [...(current.steps || []), step].slice(-60) : current.steps || [],
    updatedAt: nowIso()
  });
}

export async function createJob(company, reason = "generate") {
  const jobId = id("job", primaryCompanyName(company));
  const now = nowIso();
  const detail =
    reason === "refresh"
      ? "已确认重新生成，完成后会覆盖近7天内同企业报告入口。"
      : "已选择企业主体，等待启动深度检索。";
  await writeJson("jobs", `${jobId}.json`, {
    jobId,
    company,
    reason,
    status: "queued",
    progress: 10,
    stage: "企业核对完成",
    detail,
    steps: [
      {
        at: now,
        stage: "企业核对完成",
        progress: 10,
        detail
      }
    ],
    companyKey: companyKey(company),
    createdAt: now,
    updatedAt: now
  });
  return jobId;
}

export async function findLatestReport(company, days = RECENT_REPORT_DAYS) {
  const index = await getIndex();
  return recentReportsForCompany(index, typeof company === "string" ? { standardName: company } : company, days)[0] || null;
}

export async function runReportJob(jobId) {
  const job = await readJson("jobs", `${jobId}.json`, null);
  if (!job) throw new Error(`任务不存在：${jobId}`);
  const company = job.company;

  await updateJob(jobId, {
    status: "running",
    progress: 15,
    stage: "缓存检查",
    detail: "未命中可直接复用的近7天报告，开始公开信息检索。"
  });

  const sources = await collectSources(company, async (progress, stage, meta = {}) => {
    await updateJob(jobId, { status: "running", progress, stage, ...meta });
  });

  const quality = evaluateSourceQuality(sources);
  await updateJob(jobId, {
    status: "running",
    progress: 79,
    stage: "来源质量评估",
    detail:
      quality.qualityLevel === "diagnostic"
        ? `来源未达最低门槛：${formatQualityWarnings(quality.qualityWarnings).join("；")}`
        : `${quality.qualityLabel}：可校验来源 ${quality.verifiedSourceCount} 条，可读来源 ${quality.readableSourceCount} 条，覆盖 ${quality.topicCoverageCount} 类主题。`,
    foundCount: sources.length,
    sourceCount: quality.verifiedSourceCount,
    qualityLevel: quality.qualityLevel,
    quality
  });

  let structured;
  if (quality.qualityLevel === "diagnostic") {
    structured = {
      ...buildDiagnosticReport(company, sources, quality),
      modelName: "source-gate",
      modelChannel: "no-model"
    };
  } else {
    structured = await generateStructuredReport(company, sources, quality, async (progress, stage, meta = {}) => {
      await updateJob(jobId, { status: "running", progress, stage, ...meta });
    });
  }

  const now = nowIso();
  const durationMs = Math.max(0, Date.parse(now) - Date.parse(job.createdAt || now));
  const standardName = structured.standardName || primaryCompanyName(company);
  const reportId = `${slugify(standardName)}-${Date.now()}`;
  const baseReport = {
    ...structured,
    reportId,
    companyName: company.name || company.query || standardName,
    standardName,
    companyKey: companyKey({ ...company, standardName }),
    aiNeeds: company.aiNeeds || "",
    userContext: {
      ...(structured.userContext || {}),
      aiNeeds: company.aiNeeds || ""
    },
    generatedAt: now,
    updatedAt: now,
    durationMs,
    sourceCount: quality.verifiedSourceCount,
    rawSourceCount: sources.length,
    verifiedSourceCount: quality.verifiedSourceCount,
    readableSourceCount: quality.readableSourceCount,
    topicCoverageCount: quality.topicCoverageCount,
    coveredTopics: quality.coveredTopics,
    missingTopics: quality.missingTopics,
    qualityLevel: quality.qualityLevel,
    qualityLabel: quality.qualityLabel,
    qualityWarnings: quality.qualityWarnings
  };
  const report = {
    ...baseReport,
    opportunityRating: buildOpportunityRating(baseReport)
  };
  const html = renderReportHtml(report);

  await writeJson("reports", `${reportId}.json`, report);
  await writeText("reports", `${reportId}.html`, html);

  const index = await getIndex();
  const entry = {
    reportId,
    companyName: report.companyName,
    standardName: report.standardName,
    companyKey: report.companyKey,
    aliases: report.aliases || [],
    region: report.region || company.region || "",
    industry: report.industry || company.industry || "",
    keywords: report.keywords || [],
    sourceCount: report.sourceCount,
    verifiedSourceCount: report.verifiedSourceCount,
    readableSourceCount: report.readableSourceCount,
    topicCoverageCount: report.topicCoverageCount,
    qualityLevel: report.qualityLevel,
    qualityLabel: report.qualityLabel,
    opportunityRating: ratingIndex(report.opportunityRating),
    durationMs: report.durationMs,
    generatedAt: now,
    updatedAt: now,
    modelName: report.modelName,
    modelChannel: report.modelChannel
  };
  await saveIndex({
    reports: mergeIndexReports(index.reports || [], entry)
  });

  await updateJob(jobId, {
    status: "done",
    progress: 100,
    stage: report.qualityLevel === "diagnostic" ? "检索诊断生成" : "报告生成",
    detail:
      report.qualityLevel === "diagnostic"
        ? `来源不足，已熔断正式报告生成。可校验来源 ${report.sourceCount} 条。`
        : `${report.qualityLabel}已生成，可校验来源 ${report.sourceCount} 条。`,
    reportId,
    report,
    foundCount: sources.length,
    sourceCount: report.sourceCount,
    qualityLevel: report.qualityLevel
  });
  return report;
}

export async function improveReport(reportId, userInput) {
  const input = String(userInput || "").trim();
  if (!reportId) throw new Error("缺少报告ID");
  if (!input) throw new Error("缺少补充信息");

  const current = await readJson("reports", `${reportId}.json`, null);
  if (!current) throw new Error(`报告不存在：${reportId}`);

  const improved = await improveStructuredReport(current, input);
  const report = {
    ...improved,
    opportunityRating: buildOpportunityRating(improved)
  };
  const html = renderReportHtml(report);

  await writeJson("reports", `${reportId}.json`, report);
  await writeText("reports", `${reportId}.html`, html);

  const index = await getIndex();
  await saveIndex({
    reports: (index.reports || []).map((entry) =>
      entry.reportId === reportId
        ? {
            ...entry,
            standardName: report.standardName,
            aliases: report.aliases || [],
            region: report.region || "",
            industry: report.industry || "",
            keywords: report.keywords || [],
            sourceCount: report.sourceCount,
            verifiedSourceCount: report.verifiedSourceCount,
            readableSourceCount: report.readableSourceCount,
            topicCoverageCount: report.topicCoverageCount,
            qualityLevel: report.qualityLevel,
            qualityLabel: report.qualityLabel,
            opportunityRating: ratingIndex(report.opportunityRating),
            durationMs: report.durationMs,
            updatedAt: report.updatedAt,
            modelName: report.modelName,
            modelChannel: report.modelChannel
          }
        : entry
    )
  });

  return { report, html };
}
