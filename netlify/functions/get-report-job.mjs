import { fail, json } from "../lib/http.mjs";
import { readJson } from "../lib/store.mjs";
import { updateJob } from "../lib/pipeline.mjs";
import { decorateJob } from "../lib/job-progress.mjs";

function isStale(job) {
  if (!["queued", "running"].includes(job?.status)) return false;
  const updated = Date.parse(job.updatedAt || job.createdAt || "");
  if (!Number.isFinite(updated)) return false;
  return Date.now() - updated > 15 * 60 * 1000;
}

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");
    if (!jobId) return fail("缺少 jobId", 400);
    let job = await readJson("jobs", `${jobId}.json`, null);
    if (!job) return fail("任务不存在", 404);
    if (isStale(job)) {
      await updateJob(jobId, {
        status: "error",
        progress: 100,
        phaseKey: job.phaseKey || "report",
        stage: "任务已停止",
        error: "该任务长时间没有进度更新，可能是本地服务或后台函数中断。请重新选择企业生成。"
      });
      job = await readJson("jobs", `${jobId}.json`, job);
    }
    return json({ ok: true, job: decorateJob(job) });
  } catch (error) {
    return fail(error?.message || "读取任务状态失败", 500);
  }
}
