import { readBody } from "../lib/http.mjs";
import { runReportJob, updateJob } from "../lib/pipeline.mjs";

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
    await updateJob(jobId, {
      status: "error",
      progress: 100,
      stage: "生成失败",
      error: error?.message || String(error)
    });
  }
}
