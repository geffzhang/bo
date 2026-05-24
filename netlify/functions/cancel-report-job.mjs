import { fail, json, readBody } from "../lib/http.mjs";
import { cancelJob } from "../lib/pipeline.mjs";

export default async function handler(request) {
  try {
    const body = await readBody(request);
    const jobId = String(body.jobId || "").trim();
    if (!jobId) return fail("缺少 jobId", 400);
    const job = await cancelJob(jobId);
    return json({ ok: true, job });
  } catch (error) {
    return fail(error?.message || "停止任务失败", 500);
  }
}
