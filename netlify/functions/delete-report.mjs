import { fail, json, readBody } from "../lib/http.mjs";
import { deleteObject, getIndex, readJson, saveIndex } from "../lib/store.mjs";
import { requireRequestIdentity } from "../lib/auth.mjs";

export default async function handler(request) {
  try {
    const identity = requireRequestIdentity(request);
    if (request.method && request.method !== "POST") return fail("仅支持 POST 删除", 405);
    const body = await readBody(request);
    const reportId = String(body.reportId || "").trim();
    if (!reportId) return fail("缺少 reportId", 400);

    const report = await readJson("reports", `${reportId}.json`, null);
    if (!report) return fail("报告不存在", 404);
    if (String(report.ownerId || "").trim() !== identity.userId) return fail("无权删除该报告", 403);
    const index = await getIndex();
    const nextReports = (index.reports || []).filter((item) => item.reportId !== reportId);

    await deleteObject("reports", `${reportId}.json`);
    await deleteObject("reports", `${reportId}.html`);
    await saveIndex({ ...index, reports: nextReports });

    return json({
      ok: true,
      deleted: true,
      reportId
    });
  } catch (error) {
    return fail(error?.message || "删除报告失败", Number(error?.status) || 500);
  }
}
