import { fail, json, readBody, requireText } from "../lib/http.mjs";
import { getIndex } from "../lib/store.mjs";
import { normalizeText, scoreMatch } from "../lib/util.mjs";
import { qualityStatusText } from "../lib/report-quality.mjs";

function dedupeLatest(reports) {
  const seen = new Set();
  const out = [];
  for (const report of reports) {
    const key =
      report.companyKey ||
      normalizeText(`${report.standardName || report.companyName || ""}|${report.region || ""}`);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(report);
  }
  return out;
}

function candidateFromReport(report) {
  return {
    name: report.companyName || report.standardName,
    standardName: report.standardName || report.companyName,
    region: report.region || "",
    industry: report.industry || "",
    website: "",
    confidence: Math.min(95, Math.max(70, Number(report.matchScore || 0))),
    reason: "已命中历史报告，可直接复用或重新生成。",
    sourceUrls: []
  };
}

export default async function handler(request) {
  try {
    const body = await readBody(request);
    const query = requireText(body.query, "企业名称");
    const region = String(body.region || "").trim();
    const industry = String(body.industry || "").trim();

    const index = await getIndex();
    const cached = dedupeLatest(
      (index.reports || [])
        .map((report) => ({
          ...report,
          opportunityRating: report.opportunityRating || { status: "not_rated", label: "暂不评级" },
          qualityText: qualityStatusText(report),
          matchScore: scoreMatch(report, query)
        }))
        .filter((report) => report.matchScore > 0)
        .sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)))
        .sort((a, b) => b.matchScore - a.matchScore)
    ).slice(0, 8);

    const exactCached = cached.filter((report) => Number(report.matchScore || 0) >= 100);
    if (exactCached.length) {
      return json({
        ok: true,
        candidates: exactCached.slice(0, 3).map(candidateFromReport),
        cached,
        model: "cache",
        channel: "cache"
      });
    }

    return json({
      ok: true,
      candidates: [
        {
          name: query,
          standardName: query,
          region,
          industry,
          website: "",
          confidence: cached.length ? 75 : 65,
          reason: cached.length
            ? "未完全命中历史主体，先按输入名称作为候选；可结合下方历史报告判断是否复用。"
            : "先按输入名称作为候选主体，深度生成阶段会继续检索公开信息并校验主体。",
          sourceUrls: []
        }
      ],
      cached,
      model: "fast-resolve",
      channel: "fast-resolve"
    });
  } catch (error) {
    return fail(error?.message || "主体核对失败", 500);
  }
}
