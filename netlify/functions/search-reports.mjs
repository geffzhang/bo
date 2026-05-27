import { fail, json } from "../lib/http.mjs";
import { getIndex, listJson, readJson, saveIndex } from "../lib/store.mjs";
import { normalizeText, scoreMatch } from "../lib/util.mjs";
import { qualityStatusText, withinDays } from "../lib/report-quality.mjs";
import { buildOpportunityRating, ratingIndex } from "../lib/opportunity-rating.mjs";
import { auditReport } from "../lib/source-audit.mjs";
import { getRequestIdentity, legacyOwnerlessCompatEnabled } from "../lib/auth.mjs";

function periodDays(period) {
  if (period === "7d") return 7;
  if (period === "90d") return 90;
  if (period === "all") return null;
  return 30;
}

function dedupeLatestByCompany(reports) {
  const seen = new Set();
  const out = [];
  for (const report of reports) {
    const key =
      report.companyKey ||
      normalizeText(`${report.standardName || report.companyName || ""}|${report.region || ""}`);
    if (!key) {
      out.push(report);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(report);
  }
  return out;
}

export default async function handler(request) {
  const identity = getRequestIdentity(request);
  if (!identity.userId) return fail("未登录或缺少用户身份", 401);
  const legacyCompat = legacyOwnerlessCompatEnabled();
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const period = url.searchParams.get("period") || "30d";
  const rating = url.searchParams.get("rating") || "all";
  const days = periodDays(period);
  const normalizedQuery = normalizeText(query);
  const matchThreshold = normalizedQuery ? Math.max(4, Math.ceil(normalizedQuery.length * 0.9)) : 0;
  let index = await getIndex();
  if (!(index.reports || []).length) {
    const restored = (await listJson("reports"))
      .map((item) => item.value)
      .filter((report) => report?.reportId)
      .map((report) => ({
        reportId: report.reportId,
        companyName: report.companyName,
        standardName: report.standardName,
        companyKey: report.companyKey,
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
        opportunityRating: report.opportunityRating ? ratingIndex(report.opportunityRating) : undefined,
        durationMs: report.durationMs,
        generatedAt: report.generatedAt,
        updatedAt: report.updatedAt,
        modelName: report.modelName,
        modelChannel: report.modelChannel,
        modelDisplay: report.modelDisplay,
        usedModels: report.usedModels || [],
        ownerId: report.ownerId || "",
        ownerName: report.ownerName || ""
      }))
      .sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
    if (restored.length) {
      index = { reports: restored };
      await saveIndex(index);
    }
  }
  const enrichedReports = await Promise.all(
    (index.reports || [])
      .filter((report) => {
        const ownerId = String(report.ownerId || "").trim();
        if (ownerId === identity.userId) return true;
        return legacyCompat && !ownerId;
      })
      .map(async (report) => {
      const full = await readJson("reports", `${report.reportId}.json`, null);
      if (!full) return { ...report, opportunityRating: report.opportunityRating || { status: "not_rated", label: "鏆備笉璇勭骇" } };
      const audited = auditReport(full);
      const ratingValue = ratingIndex(buildOpportunityRating(audited));
      return {
        ...report,
        sourceCount: audited.sourceCount,
        verifiedSourceCount: audited.verifiedSourceCount,
        readableSourceCount: audited.readableSourceCount,
        topicCoverageCount: audited.topicCoverageCount,
        qualityLevel: audited.qualityLevel,
        qualityLabel: audited.qualityLabel,
        sourceAudit: audited.sourceAudit,
        opportunityRating: ratingValue
      };
    })
  );
  const reports = dedupeLatestByCompany(
    enrichedReports
      .filter((report) => (days ? withinDays(report.generatedAt, days) : true))
      .map((report) => ({
        ...report,
        opportunityRating: report.opportunityRating || { status: "not_rated", label: "鏆備笉璇勭骇" },
        qualityText: qualityStatusText(report),
        matchScore: query ? scoreMatch(report, query) : 1
      }))
      .filter((report) => {
        if (rating === "all") return true;
        if (rating === "not_rated") return report.opportunityRating?.status !== "rated";
        return report.opportunityRating?.grade === rating;
      })
      .filter((report) => report.matchScore >= matchThreshold)
      .sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)))
      .sort((a, b) => b.matchScore - a.matchScore)
  ).slice(0, 200);
  return json({ ok: true, period, rating, reports });
}

