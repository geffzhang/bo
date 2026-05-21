import { json } from "../lib/http.mjs";
import { getIndex, readJson } from "../lib/store.mjs";
import { normalizeText, scoreMatch } from "../lib/util.mjs";
import { qualityStatusText, withinDays } from "../lib/report-quality.mjs";
import { buildOpportunityRating, ratingIndex } from "../lib/opportunity-rating.mjs";

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
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const period = url.searchParams.get("period") || "30d";
  const rating = url.searchParams.get("rating") || "all";
  const days = periodDays(period);
  const index = await getIndex();
  const enrichedReports = await Promise.all(
    (index.reports || []).map(async (report) => {
      if (report.opportunityRating) return report;
      if (report.qualityLevel !== "formal" || Number(report.verifiedSourceCount ?? report.sourceCount ?? 0) < 15) {
        return { ...report, opportunityRating: { status: "not_rated", label: "暂不评级" } };
      }
      const full = await readJson("reports", `${report.reportId}.json`, null);
      if (!full) return { ...report, opportunityRating: { status: "not_rated", label: "暂不评级" } };
      return { ...report, opportunityRating: ratingIndex(buildOpportunityRating(full)) };
    })
  );
  const reports = dedupeLatestByCompany(
    enrichedReports
      .filter((report) => (days ? withinDays(report.generatedAt, days) : true))
      .map((report) => ({
        ...report,
        opportunityRating: report.opportunityRating || { status: "not_rated", label: "暂不评级" },
        qualityText: qualityStatusText(report),
        matchScore: query ? scoreMatch(report, query) : 1
      }))
      .filter((report) => {
        if (rating === "all") return true;
        if (rating === "not_rated") return report.opportunityRating?.status !== "rated";
        return report.opportunityRating?.grade === rating;
      })
      .filter((report) => report.matchScore > 0)
      .sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)))
      .sort((a, b) => b.matchScore - a.matchScore)
  ).slice(0, 200);
  return json({ ok: true, period, rating, reports });
}
