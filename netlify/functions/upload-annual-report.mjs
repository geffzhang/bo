import { fail, json } from "../lib/http.mjs";
import { parseAnnualReportBuffer } from "../lib/annual-report.mjs";
import { requireRequestIdentity } from "../lib/auth.mjs";

export default async function handler(request) {
  try {
    const identity = requireRequestIdentity(request);
    if (request.method && request.method !== "POST") return fail("仅支持 POST 上传", 405);
    let form;
    try {
      form = await request.formData();
    } catch {
      return fail("请用表单方式上传 PDF 年报文件", 400);
    }
    const file = form.get("file");
    const companyName = String(form.get("companyName") || "").trim();
    if (!file || typeof file.arrayBuffer !== "function") return fail("请上传 PDF 年报文件", 400);
    const fileName = file.name || "annual-report.pdf";
    if (!/\.pdf$/i.test(fileName) && file.type !== "application/pdf") return fail("当前只支持 PDF 年报", 400);

    const arrayBuffer = await file.arrayBuffer();
    const evidence = await parseAnnualReportBuffer(Buffer.from(arrayBuffer), {
      fileName,
      companyName,
      ownerId: identity.userId,
      ownerName: identity.displayName
    });
    return json({ ok: true, annualReport: evidence });
  } catch (error) {
    return fail(error?.message || "年报解析失败", Number(error?.status) || 500);
  }
}
