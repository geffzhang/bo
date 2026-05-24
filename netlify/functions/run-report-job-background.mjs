import { readBody } from "../lib/http.mjs";
import { runReportJob, updateJob } from "../lib/pipeline.mjs";
import { JobCancelledError } from "../lib/job-progress.mjs";

export default async function handler(request) {
  const body = await readBody(request);
  const jobId = body.jobId;
  if (!jobId) {
    console.error("Missing jobId");
    return;
  }

  try {
    await runReportJob(jobId);
  } catch (error) {
    if (error instanceof JobCancelledError || error?.name === "JobCancelledError") {
      await updateJob(jobId, {
        status: "cancelled",
        stage: "任务已停止",
        detail: error.message || "用户已停止本次生成。"
      });
      return;
    }
    await updateJob(jobId, {
      status: "error",
      progress: 100,
      stage: "生成失败",
      error: error?.message || String(error)
    });
  }
}
