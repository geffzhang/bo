import { collectSources } from "./research.mjs";
import { generateStructuredReport, improveStructuredReport, renderReportHtml } from "./report.mjs";
import { getIndex, readJson, saveIndex, writeJson, writeText } from "./store.mjs";
import { id, normalizeText, nowIso, slugify, scoreMatch } from "./util.mjs";
import { buildOpportunityRating, ratingIndex } from "./opportunity-rating.mjs";
import { JobCancelledError, decorateJob, normalizePhase } from "./job-progress.mjs";
import { auditReport, auditSources } from "./source-audit.mjs";
import { readAnnualReportEvidence } from "./annual-report.mjs";
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

function qualityWithAnnualEvidence(quality, annualReportEvidence) {
  if (!annualReportEvidence) return quality;
  const metricCount = Array.isArray(annualReportEvidence.metrics) ? annualReportEvidence.metrics.length : 0;
  const sectionCount = Array.isArray(annualReportEvidence.sections) ? annualReportEvidence.sections.length : 0;
  const textLength = Number(annualReportEvidence.textLength || 0);
  const strongAnnual = textLength >= 10000 || (textLength >= 2500 && (metricCount >= 2 || sectionCount >= 2));
  if (!strongAnnual) {
    return {
      ...quality,
      qualityWarnings: [
        ...quality.qualityWarnings,
        "已上传年报，但自动提取出的指标或章节偏少；报告仍需谨慎使用。"
      ]
    };
  }
  const coveredTopics = Array.from(new Set([...(quality.coveredTopics || []), "经营规模与财务", "企业主体与本地信息"]));
  const missingTopics = (quality.missingTopics || []).filter((topic) => !coveredTopics.includes(topic));
  const topicCoverageCount = Math.max(quality.topicCoverageCount, coveredTopics.length);
  const canBeFormal = textLength >= 10000 || metricCount >= 4 || sectionCount >= 4;
  return {
    ...quality,
    qualityLevel: canBeFormal ? "formal" : "brief",
    qualityLabel: canBeFormal ? "年报增强正式报告" : "年报增强简版报告",
    topicCoverageCount,
    coveredTopics,
    missingTopics,
    qualityWarnings: [
      ...quality.qualityWarnings.filter((item) => !/来源|可校验|可读|主题覆盖|缺少主题/.test(item)),
      `已接入用户上传年报《${annualReportEvidence.fileName || "年报 PDF"}》，作为财务与经营强证据。外部公开链接数量不虚增，仍按审计结果展示。`
    ],
    canGenerateReport: true,
    annualReportEvidenceCount: 1
  };
}

export async function updateJob(jobId, patch) {
  const current = await readJson("jobs", `${jobId}.json`, {});
  const phase = normalizePhase({ ...current, ...patch });
  const step = patch.stage
    ? {
        at: nowIso(),
        phaseKey: patch.phaseKey || phase.key,
        phaseLabel: patch.phaseLabel || phase.label,
        stage: patch.stage,
        progress: patch.progress ?? current.progress ?? 0,
        detail: patch.detail || "",
        completed: patch.completed,
        total: patch.total,
        foundCount: patch.foundCount,
        sourceCount: patch.sourceCount,
        currentModel: patch.currentModel,
        qualityLevel: patch.qualityLevel
      }
    : null;

  const next = decorateJob({
    ...current,
    ...patch,
    phaseKey: patch.phaseKey || phase.key,
    phaseLabel: patch.phaseLabel || phase.label,
    steps: step ? [...(current.steps || []), step].slice(-80) : current.steps || [],
    updatedAt: nowIso()
  });
  await writeJson("jobs", `${jobId}.json`, next);
  return next;
}

async function assertJobNotCancelled(jobId) {
  const current = await readJson("jobs", `${jobId}.json`, null);
  if (current?.cancelRequested || current?.status === "cancelled") {
    throw new JobCancelledError("任务已停止，未生成正式报告。");
  }
}

export async function createJob(company, reason = "generate", runtimeMode = null) {
  const jobId = id("job", primaryCompanyName(company));
  const now = nowIso();
  const jobCompany = {
    ...company,
    runtimeMode
  };
  const detail =
    reason === "refresh"
      ? `已确认重新生成，完成后会覆盖近 ${RECENT_REPORT_DAYS} 天内同企业报告入口。`
      : "已选择企业主体，等待启动深度检索。";
  await writeJson(
    "jobs",
    `${jobId}.json`,
    decorateJob({
      jobId,
      company: jobCompany,
      companyName: jobCompany.name || jobCompany.companyName || jobCompany.standardName || jobCompany.query || "",
      standardName: jobCompany.standardName || jobCompany.name || jobCompany.companyName || jobCompany.query || "",
      region: jobCompany.region || "",
      industry: jobCompany.industry || "",
      reason,
      status: "queued",
      progress: 10,
      runtimeMode,
      phaseKey: "resolve",
      phaseLabel: "主体核对",
      stage: "企业核对完成",
      detail,
      steps: [
        {
          at: now,
          phaseKey: "resolve",
          phaseLabel: "主体核对",
          stage: "企业核对完成",
          progress: 10,
          detail
        }
      ],
      companyKey: companyKey(jobCompany),
      createdAt: now,
      updatedAt: now
    })
  );
  return jobId;
}

export async function findLatestReport(company, days = RECENT_REPORT_DAYS) {
  const index = await getIndex();
  return recentReportsForCompany(index, typeof company === "string" ? { standardName: company } : company, days)[0] || null;
}

export async function runReportJob(jobId) {
  const job = await readJson("jobs", `${jobId}.json`, null);
  if (!job) throw new Error(`任务不存在：${jobId}`);
  const runtimeMode = job.runtimeMode || job.company?.runtimeMode || null;
  const annualReportEvidence = await readAnnualReportEvidence(job.company?.annualReportId);
  const company = annualReportEvidence
    ? {
        ...job.company,
        runtimeMode,
        annualReportEvidence,
        annualReportSummary: {
          annualReportId: annualReportEvidence.annualReportId,
          fileName: annualReportEvidence.fileName,
          pageCount: annualReportEvidence.pageCount,
          metrics: annualReportEvidence.metrics,
          sections: annualReportEvidence.sections,
          warnings: annualReportEvidence.warnings
        }
      }
    : { ...job.company, runtimeMode };

  await updateJob(jobId, {
    status: "running",
    progress: 15,
    phaseKey: "cache",
    stage: "缓存检查",
    detail: annualReportEvidence
      ? `已接入用户上传年报《${annualReportEvidence.fileName}》，将优先用于财务与经营证据。`
      : "未命中可直接复用的近 7 天报告，开始公开信息检索。"
  });

  await assertJobNotCancelled(jobId);
  const collectedSources = await collectSources(
    company,
    async (progress, stage, meta = {}) => {
      await updateJob(jobId, { status: "running", progress, stage, ...meta });
      await assertJobNotCancelled(jobId);
    },
    {
      runtimeMode,
      shouldCancel: async () => {
        const current = await readJson("jobs", `${jobId}.json`, {});
        return Boolean(current?.cancelRequested || current?.status === "cancelled");
      }
    }
  );
  const sourceAudit = auditSources(collectedSources, { company, max: 200, min: 15 });
  const sources = sourceAudit.sources;
  Object.defineProperty(sources, "usedModels", {
    value: collectedSources.usedModels || [],
    enumerable: false
  });

  await assertJobNotCancelled(jobId);
  const quality = qualityWithAnnualEvidence(evaluateSourceQuality(sources), annualReportEvidence);
  await updateJob(jobId, {
    status: "running",
    progress: 79,
    phaseKey: "quality",
    stage: "证据质检",
    foundCount: collectedSources.length,
    sourceCount: quality.verifiedSourceCount,
    qualityLevel: quality.qualityLevel,
    quality,
    detail:
      sourceAudit.removedCount > 0
        ? `来源审计已隐藏/合并 ${sourceAudit.removedCount} 条低相关、重复或错误来源；${quality.qualityLabel}：可校验来源 ${quality.verifiedSourceCount} 条，可读来源 ${quality.readableSourceCount} 条，覆盖 ${quality.topicCoverageCount} 类主题。`
        : quality.qualityLevel === "diagnostic"
          ? `来源未达最低门槛：${formatQualityWarnings(quality.qualityWarnings).join("；")}`
          : `${quality.qualityLabel}：可校验来源 ${quality.verifiedSourceCount} 条，可读来源 ${quality.readableSourceCount} 条，覆盖 ${quality.topicCoverageCount} 类主题。`
  });

  let structured;
  if (quality.qualityLevel === "diagnostic") {
    structured = {
      ...buildDiagnosticReport(company, sources, quality),
      modelName: "source-gate",
      modelChannel: "no-model",
      usedModels: sources.usedModels || []
    };
  } else {
    await assertJobNotCancelled(jobId);
    structured = await generateStructuredReport(company, sources, quality, async (progress, stage, meta = {}) => {
      await updateJob(jobId, { status: "running", progress, stage, ...meta });
      await assertJobNotCancelled(jobId);
    });
  }

  await assertJobNotCancelled(jobId);
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
    runtimeMode,
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
    qualityWarnings: [...quality.qualityWarnings, ...sourceAudit.warnings],
    sourceAudit: {
      removedCount: sourceAudit.removedCount,
      removed: sourceAudit.removed.slice(0, 20),
      warnings: sourceAudit.warnings
    },
    usedModels: structured.usedModels || sources.usedModels || [],
    modelDisplay: structured.modelDisplay || structured.modelName
  };
  if (annualReportEvidence) {
    baseReport.annualReportEvidence = annualReportEvidence;
    baseReport.qualityWarnings = [...baseReport.qualityWarnings, ...(annualReportEvidence.warnings || [])];
  }
  const auditedBaseReport = auditReport(baseReport);
  const report = {
    ...auditedBaseReport,
    opportunityRating: buildOpportunityRating(auditedBaseReport)
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
    modelChannel: report.modelChannel,
    modelDisplay: report.modelDisplay,
    usedModels: report.usedModels || []
  };
  await saveIndex({
    reports: mergeIndexReports(index.reports || [], entry)
  });

  await updateJob(jobId, {
    status: "done",
    progress: 100,
    phaseKey: "report",
    stage: report.qualityLevel === "diagnostic" ? "检索诊断生成" : "报告生成",
    detail:
      report.qualityLevel === "diagnostic"
        ? `证据不足，已生成检索诊断。可校验来源 ${report.sourceCount} 条。`
        : `${report.qualityLabel}已生成，可校验来源 ${report.sourceCount} 条。`,
    reportId,
    report,
    foundCount: sources.length,
    sourceCount: report.sourceCount,
    qualityLevel: report.qualityLevel
  });
  return report;
}

export async function cancelJob(jobId) {
  const current = await readJson("jobs", `${jobId}.json`, null);
  if (!current) throw new Error(`任务不存在：${jobId}`);
  if (["done", "error", "cancelled"].includes(current.status)) return decorateJob(current);
  await updateJob(jobId, {
    cancelRequested: true,
    status: "cancelled",
    progress: current.progress || 100,
    phaseKey: current.phaseKey || normalizePhase(current).key,
    stage: "任务已停止",
    detail: "用户已确认停止本次生成。系统不会生成正式报告，也不会写入历史报告。"
  });
  return readJson("jobs", `${jobId}.json`, null);
}

export async function improveReport(reportId, userInput) {
  const input = String(userInput || "").trim();
  if (!reportId) throw new Error("缺少报告ID");
  if (!input) throw new Error("缺少补充信息");

  const current = await readJson("reports", `${reportId}.json`, null);
  if (!current) throw new Error(`报告不存在：${reportId}`);

  const improved = await improveStructuredReport(current, input);
  const auditedImproved = auditReport(improved);
  const report = {
    ...auditedImproved,
    opportunityRating: buildOpportunityRating(auditedImproved)
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
            modelChannel: report.modelChannel,
            modelDisplay: report.modelDisplay,
            usedModels: report.usedModels || []
          }
        : entry
    )
  });

  return {
    report,
    html,
    changeSummary: report.changeSummary || [],
    updatedSections: report.updatedSections || []
  };
}
