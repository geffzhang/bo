import { fail, json } from "../lib/http.mjs";
import { readJson } from "../lib/store.mjs";

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");
    if (!jobId) return fail("缺少jobId", 400);
    const job = await readJson("jobs", `${jobId}.json`, null);
    if (!job) return fail("任务不存在", 404);
    return json({ ok: true, job });
  } catch (error) {
    return fail(error?.message || "读取任务状态失败", 500);
  }
}
