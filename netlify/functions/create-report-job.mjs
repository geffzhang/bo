import { createJob, findLatestReport } from "../lib/pipeline.mjs";
import { fail, json, readBody } from "../lib/http.mjs";

export default async function handler(request) {
  try {
    const body = await readBody(request);
    const company = body.company || {};
    const force = Boolean(body.force);
    const name = company.standardName || company.name || company.query;
    const hasUserNeeds = Boolean(String(company.aiNeeds || "").trim());
    if (!name) return fail("缺少企业主体信息", 400);

    if (!force && !hasUserNeeds) {
      const cached = await findLatestReport(company);
      if (cached) {
        return json({ ok: true, cached: true, reportId: cached.reportId, reportMeta: cached });
      }
    }

    const jobId = await createJob(company, force ? "refresh" : "generate");
    return json({ ok: true, cached: false, jobId });
  } catch (error) {
    return fail(error?.message || "创建任务失败", 500);
  }
}
