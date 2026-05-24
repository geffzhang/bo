import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const LOCAL_ROOT = join(process.cwd(), "local-data");

async function blobStore(namespace) {
  const isNetlifyRuntime =
    process.env.NETLIFY === "true" ||
    process.env.NETLIFY_DEV === "true" ||
    Boolean(process.env.NETLIFY_BLOBS_CONTEXT);
  if (!isNetlifyRuntime) return null;

  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore(namespace);
  } catch {
    return null;
  }
}

function localPath(namespace, key) {
  return join(LOCAL_ROOT, namespace, key);
}

export async function readJson(namespace, key, fallback = null) {
  const store = await blobStore(namespace);
  if (store) {
    const value = await store.get(key, { type: "json" });
    return value ?? fallback;
  }
  try {
    const raw = await readFile(localPath(namespace, key), "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

export async function writeJson(namespace, key, value) {
  const store = await blobStore(namespace);
  if (store) {
    await store.setJSON(key, value);
    return;
  }
  const path = localPath(namespace, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

export async function readText(namespace, key, fallback = "") {
  const store = await blobStore(namespace);
  if (store) {
    const value = await store.get(key, { type: "text" });
    return value ?? fallback;
  }
  try {
    return await readFile(localPath(namespace, key), "utf8");
  } catch {
    return fallback;
  }
}

export async function writeText(namespace, key, value) {
  const store = await blobStore(namespace);
  if (store) {
    await store.set(key, value);
    return;
  }
  const path = localPath(namespace, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, "utf8");
}

export async function listJson(namespace) {
  const store = await blobStore(namespace);
  if (store) {
    try {
      const listed = await store.list();
      const rows = Array.isArray(listed?.blobs) ? listed.blobs : [];
      const out = [];
      for (const row of rows) {
        const key = row.key || row.name;
        if (!key || !String(key).endsWith(".json")) continue;
        const value = await store.get(key, { type: "json" });
        if (value) out.push({ key, value });
      }
      return out;
    } catch {
      return [];
    }
  }

  try {
    const dir = localPath(namespace, "");
    const files = await readdir(dir, { withFileTypes: true });
    const out = [];
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith(".json")) continue;
      try {
        const raw = await readFile(localPath(namespace, file.name), "utf8");
        out.push({ key: file.name, value: JSON.parse(raw.replace(/^\uFEFF/, "")) });
      } catch {
        // Ignore unreadable local cache files.
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function deleteObject(namespace, key) {
  const store = await blobStore(namespace);
  if (store) {
    await store.delete(key);
    return;
  }
  await rm(localPath(namespace, key), { force: true });
}

export async function getIndex() {
  return readJson("index", "reports.json", { reports: [] });
}

export async function saveIndex(index) {
  await writeJson("index", "reports.json", index);
}
