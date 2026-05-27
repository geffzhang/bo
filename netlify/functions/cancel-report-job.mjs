import { fail, json, readBody } from "../lib/http.mjs";
import { cancelJob } from "../lib/pipeline.mjs";
import { requireRequestIdentity } from "../lib/auth.mjs";

export default async function handler(request) {
  try {
    const identity = requireRequestIdentity(request);
    const body = await readBody(request);
    const jobId = String(body.jobId || "").trim();
    if (!jobId) return fail("缺少 jobId", 400);
    const job = await cancelJob(jobId, identity.userId);
    return json({ ok: true, job });
  } catch (error) {
    return fail(error?.message || "停止任务失败", Number(error?.status) || 500);
  }
}
