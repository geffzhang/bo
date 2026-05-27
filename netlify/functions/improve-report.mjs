import { fail, json, readBody } from "../lib/http.mjs";
import { improveReport } from "../lib/pipeline.mjs";
import { requireRequestIdentity } from "../lib/auth.mjs";

export default async function handler(request) {
  try {
    const identity = requireRequestIdentity(request);
    const body = await readBody(request);
    const reportId = String(body.reportId || "").trim();
    const instruction = String(body.instruction || "").trim();
    if (!reportId) return fail("缺少报告ID", 400);
    if (!instruction) return fail("缺少补充信息", 400);

    const result = await improveReport(reportId, instruction, identity.userId);
    return json({ ok: true, ...result });
  } catch (error) {
    return fail(error?.message || "完善报告失败", Number(error?.status) || 500);
  }
}
