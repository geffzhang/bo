import crypto from "node:crypto";

export function nowIso() {
  return new Date().toISOString();
}

export function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || "";
}

export function slugify(value) {
  return String(value || "company")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "company";
}

export function id(prefix, seed = "") {
  const hash = crypto
    .createHash("sha1")
    .update(`${seed}:${Date.now()}:${Math.random()}`)
    .digest("hex")
    .slice(0, 10);
  return `${prefix}_${hash}`;
}

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[（）()【】\[\]《》“”"']/g, "");
}

export function uniqBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function clip(text, max = 4000) {
  const value = String(text || "").replace(/\s+\n/g, "\n").trim();
  return value.length > max ? `${value.slice(0, max)}\n...` : value;
}

export function scoreMatch(report, keyword) {
  const q = normalizeText(keyword);
  if (!q) return 0;
  const haystack = normalizeText([
    report.companyName,
    report.standardName,
    report.region,
    report.industry,
    ...(report.aliases || []),
    ...(report.keywords || [])
  ].join(" "));
  if (haystack.includes(q)) return 100;
  let score = 0;
  for (const char of q) {
    if (haystack.includes(char)) score += 1;
  }
  return score;
}
