import { createJob } from "../lib/pipeline.mjs";
import { fail, json, readBody } from "../lib/http.mjs";
import { requireRequestIdentity } from "../lib/auth.mjs";

export default async function handler(request) {
  try {
    const identity = requireRequestIdentity(request);
    const body = await readBody(request);
    const company = body.company || {};
    const name = company.standardName || company.name || company.query;
    if (!name) return fail("缺少企业主体信息", 400);

    const jobId = await createJob(company, "refresh", null, identity);
    return json({ ok: true, jobId });
  } catch (error) {
    return fail(error?.message || "刷新任务创建失败", Number(error?.status) || 500);
  }
}
