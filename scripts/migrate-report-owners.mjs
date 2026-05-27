import { getIndex, listJson, saveIndex, writeJson } from "../netlify/lib/store.mjs";

function parseArgs(argv = []) {
  const parsed = {
    ownerId: "",
    ownerName: "",
    accessToken: "",
    accessTokenEnv: "BO_ACCESS_TOKEN",
    apply: false,
    reportIds: []
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = String(argv[i] || "");
    if (token === "--owner-id") {
      parsed.ownerId = String(argv[i + 1] || "").trim();
      i += 1;
      continue;
    }
    if (token === "--owner-name") {
      parsed.ownerName = String(argv[i + 1] || "").trim();
      i += 1;
      continue;
    }
    if (token === "--access-token") {
      parsed.accessToken = String(argv[i + 1] || "").trim();
      i += 1;
      continue;
    }
    if (token === "--access-token-env") {
      parsed.accessTokenEnv = String(argv[i + 1] || "").trim() || "BO_ACCESS_TOKEN";
      i += 1;
      continue;
    }
    if (token === "--report-id") {
      const value = String(argv[i + 1] || "").trim();
      if (value) parsed.reportIds.push(value);
      i += 1;
      continue;
    }
    if (token === "--report-ids") {
      const value = String(argv[i + 1] || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      parsed.reportIds.push(...value);
      i += 1;
      continue;
    }
    if (token === "--apply") {
      parsed.apply = true;
      continue;
    }
  }

  return parsed;
}

function decodeBase64Url(value) {
  const input = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = input.padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    return JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return null;
  }
}

function asSet(values = []) {
  return new Set(values.map((value) => String(value || "").trim()).filter(Boolean));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.accessToken) {
    args.accessToken = String(process.env[args.accessTokenEnv] || "").trim();
  }

  if (!args.ownerId && args.accessToken) {
    const payload = parseJwtPayload(args.accessToken);
    args.ownerId = String(payload?.sub || payload?.uid || payload?.user_id || "").trim();
    if (!args.ownerName) {
      args.ownerName = String(
        payload?.preferred_username || payload?.nickname || payload?.name || payload?.email || ""
      ).trim();
    }
  }

  if (!args.ownerId) {
    console.error(
      `Missing required argument: --owner-id <user-id> (or provide --access-token <jwt>, or set ${args.accessTokenEnv})`
    );
    process.exitCode = 1;
    return;
  }

  const selectedIds = asSet(args.reportIds);
  const rows = await listJson("reports");

  const candidates = rows
    .map((row) => row?.value)
    .filter((report) => report?.reportId)
    .filter((report) => !String(report.ownerId || "").trim())
    .filter((report) => (selectedIds.size ? selectedIds.has(report.reportId) : true));

  if (!candidates.length) {
    console.log("No legacy reports without ownerId were found.");
    return;
  }

  const patchedReports = candidates.map((report) => ({
    ...report,
    ownerId: args.ownerId,
    ownerName: args.ownerName || ""
  }));

  const annualRows = await listJson("annual-reports");
  const annualMap = new Map(
    annualRows
      .map((row) => row?.value)
      .filter((item) => item?.annualReportId)
      .map((item) => [item.annualReportId, item])
  );

  const patchedAnnualReports = patchedReports
    .map((report) => report?.annualReportEvidence?.annualReportId || report?.annualReportId)
    .filter(Boolean)
    .map((annualReportId) => annualMap.get(annualReportId))
    .filter((annual) => annual && !String(annual.ownerId || "").trim())
    .map((annual) => ({
      ...annual,
      ownerId: args.ownerId,
      ownerName: args.ownerName || ""
    }));

  const patchedIds = new Set(patchedReports.map((report) => report.reportId));
  const index = await getIndex();
  const nextIndex = {
    ...index,
    reports: (index.reports || []).map((entry) => {
      if (!patchedIds.has(entry.reportId)) return entry;
      if (String(entry.ownerId || "").trim()) return entry;
      return {
        ...entry,
        ownerId: args.ownerId,
        ownerName: args.ownerName || ""
      };
    })
  };

  console.log(`Found ${patchedReports.length} report(s) without ownerId.`);
  console.log(`Found ${patchedAnnualReports.length} annual-report evidence item(s) to align.`);
  console.log(`Mode: ${args.apply ? "apply" : "dry-run"}`);
  console.log(`Target ownerId: ${args.ownerId}`);
  if (args.ownerName) {
    console.log(`Target ownerName: ${args.ownerName}`);
  }

  if (!args.apply) {
    console.log("Sample reportIds:", patchedReports.slice(0, 10).map((report) => report.reportId));
    console.log("Dry-run complete. Add --apply to persist changes.");
    return;
  }

  for (const report of patchedReports) {
    await writeJson("reports", `${report.reportId}.json`, report);
  }
  for (const annual of patchedAnnualReports) {
    await writeJson("annual-reports", `${annual.annualReportId}.json`, annual);
  }
  await saveIndex(nextIndex);

  console.log(
    `Migration complete. Updated ${patchedReports.length} report file(s) and ${patchedAnnualReports.length} annual-report file(s).`
  );
}

main().catch((error) => {
  console.error("Migration failed:", error?.message || error);
  process.exitCode = 1;
});
