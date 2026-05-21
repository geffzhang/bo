import { fail, json } from "../lib/http.mjs";
import { readJson, readText } from "../lib/store.mjs";
import { buildOpportunityRating } from "../lib/opportunity-rating.mjs";
import { renderReportHtml } from "../lib/report.mjs";

export default async function handler(request) {
  const url = new URL(request.url);
  const reportId = url.searchParams.get("reportId");
  if (!reportId) return fail("缺少reportId", 400);
  const savedReport = await readJson("reports", `${reportId}.json`, null);
  const report = savedReport
    ? {
        ...savedReport,
        opportunityRating: savedReport.opportunityRating || buildOpportunityRating(savedReport)
      }
    : null;
  if (!report) return fail("报告不存在", 404);
  const html = renderReportHtml(report) || (await readText("reports", `${reportId}.html`, ""));
  return json({ ok: true, report, html });
}
