import { createJob, findLatestReport } from "../lib/pipeline.mjs";
import { fail, json, readBody } from "../lib/http.mjs";
import { runtimeModeFromRequest } from "../lib/runtime-mode.mjs";

export default async function handler(request) {
  try {
    const body = await readBody(request);
    const company = body.company || {};
    const force = Boolean(body.force);
    const name = company.standardName || company.name || company.query;
    const hasCustomContext = Boolean(String(company.aiNeeds || "").trim() || company.annualReportId);
    if (!name) return fail("缺少企业主体信息", 400);

    if (!force && !hasCustomContext) {
      const cached = await findLatestReport(company);
      if (cached) {
        return json({ ok: true, cached: true, reportId: cached.reportId, reportMeta: cached });
      }
    }

    const runtimeMode = runtimeModeFromRequest(request);
    const jobId = await createJob(company, force ? "refresh" : "generate", runtimeMode);
    return json({ ok: true, cached: false, jobId, runtimeMode });
  } catch (error) {
    return fail(error?.message || "创建任务失败", 500);
  }
}
