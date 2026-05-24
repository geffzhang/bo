import { fail, json } from "../lib/http.mjs";
import { readJson, readText } from "../lib/store.mjs";
import { buildOpportunityRating, OPPORTUNITY_RATING_VERSION } from "../lib/opportunity-rating.mjs";
import { normalizeReportShape, renderReportHtml } from "../lib/report.mjs";
import { auditReport } from "../lib/source-audit.mjs";

export default async function handler(request) {
  const url = new URL(request.url);
  const reportId = url.searchParams.get("reportId");
  if (!reportId) return fail("缺少reportId", 400);
  const savedReport = await readJson("reports", `${reportId}.json`, null);
  const audited = savedReport ? auditReport(savedReport) : null;
  const shouldRecomputeRating =
    Boolean(audited?.annualReportEvidence) ||
    audited?.sourceAudit?.removedCount ||
    !savedReport?.opportunityRating ||
    savedReport?.opportunityRating?.version !== OPPORTUNITY_RATING_VERSION ||
    savedReport?.opportunityRating?.status !== "rated" ||
    audited?.qualityLevel !== savedReport?.qualityLevel ||
    audited?.qualityLabel !== savedReport?.qualityLabel;
  const report = audited
    ? normalizeReportShape({
        ...audited,
        opportunityRating: shouldRecomputeRating ? buildOpportunityRating(audited) : savedReport.opportunityRating
      })
    : null;
  if (!report) return fail("报告不存在", 404);
  const html = renderReportHtml(report) || (await readText("reports", `${reportId}.html`, ""));
  return json({ ok: true, report, html });
}
