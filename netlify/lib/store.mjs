import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const LOCAL_ROOT = join(process.cwd(), "local-data");

const MINIO_REQUIRED_ENV = ["MINIO_ENDPOINT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "MINIO_BUCKET"];

let minioClientCache;
let minioClientInitialized = false;

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

function parseBoolean(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function minioConfig() {
  const missing = MINIO_REQUIRED_ENV.some((name) => !String(process.env[name] || "").trim());
  if (missing) return null;

  const rawEndpoint = String(process.env.MINIO_ENDPOINT || "").trim();
  let endPoint = rawEndpoint;
  let inferredUseSSL;
  let inferredPort;

  if (rawEndpoint.includes("://")) {
    try {
      const parsed = new URL(rawEndpoint);
      endPoint = parsed.hostname;
      inferredUseSSL = parsed.protocol === "https:";
      inferredPort = parsed.port ? Number(parsed.port) : undefined;
    } catch {
      return null;
    }
  } else {
    endPoint = rawEndpoint.replace(/^\/+|\/+$/g, "");
  }

  if (!endPoint) return null;

  const explicitPort = Number.parseInt(String(process.env.MINIO_PORT || ""), 10);
  const port = Number.isFinite(explicitPort) ? explicitPort : inferredPort;

  return {
    endPoint,
    port,
    useSSL: parseBoolean(process.env.MINIO_USE_SSL, inferredUseSSL ?? false),
    accessKey: String(process.env.MINIO_ACCESS_KEY || ""),
    secretKey: String(process.env.MINIO_SECRET_KEY || ""),
    bucket: String(process.env.MINIO_BUCKET || ""),
    region: String(process.env.MINIO_REGION || "").trim() || undefined,
    autoCreateBucket: parseBoolean(process.env.MINIO_AUTO_CREATE_BUCKET, false),
  };
}

function minioObjectKey(namespace, key) {
  const ns = String(namespace || "default").replace(/^\/+|\/+$/g, "");
  const objectKey = String(key || "").replace(/^\/+/, "");
  return objectKey ? `${ns}/${objectKey}` : `${ns}/`;
}

async function listMinioObjects(client, bucket, prefix) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = client.listObjectsV2(bucket, prefix, true);
    stream.on("data", (row) => rows.push(row));
    stream.on("error", reject);
    stream.on("end", () => resolve(rows));
  });
}

function isObjectNotFound(error) {
  return (
    error?.code === "NoSuchKey" ||
    error?.code === "NoSuchBucket" ||
    error?.code === "NotFound" ||
    error?.statusCode === 404
  );
}

async function readStreamAsText(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function minioClient(config) {
  if (minioClientInitialized) return minioClientCache;
  minioClientInitialized = true;

  try {
    const { Client } = await import("minio");
    const client = new Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      region: config.region,
    });

    const bucketExists = await client.bucketExists(config.bucket);
    if (!bucketExists && config.autoCreateBucket) {
      await client.makeBucket(config.bucket, config.region);
    } else if (!bucketExists) {
      minioClientCache = null;
      return null;
    }

    minioClientCache = client;
    return client;
  } catch {
    minioClientCache = null;
    return null;
  }
}

async function minioStore(namespace) {
  const config = minioConfig();
  if (!config) return null;

  const client = await minioClient(config);
  if (!client) return null;

  return {
    async get(key, options = {}) {
      const type = options.type || "text";
      const objectKey = minioObjectKey(namespace, key);
      try {
        const stream = await client.getObject(config.bucket, objectKey);
        const raw = await readStreamAsText(stream);
        if (type === "json") return JSON.parse(stripBom(raw));
        return raw;
      } catch (error) {
        if (isObjectNotFound(error)) return null;
        throw error;
      }
    },
    async set(key, value) {
      const objectKey = minioObjectKey(namespace, key);
      await client.putObject(config.bucket, objectKey, String(value));
    },
    async setJSON(key, value) {
      const objectKey = minioObjectKey(namespace, key);
      await client.putObject(config.bucket, objectKey, JSON.stringify(value, null, 2));
    },
    async list() {
      const prefix = minioObjectKey(namespace, "");
      const rows = await listMinioObjects(client, config.bucket, prefix);
      return {
        blobs: rows.map((row) => ({
          key: String(row.name || "").slice(prefix.length),
        })),
      };
    },
    async delete(key) {
      const objectKey = minioObjectKey(namespace, key);
      try {
        await client.removeObject(config.bucket, objectKey);
      } catch (error) {
        if (!isObjectNotFound(error)) throw error;
      }
    },
  };
}

async function blobStore(namespace) {
  if (!isNetlifyRuntime()) return null;

  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore(namespace);
  } catch {
    return null;
  }
}

function isNetlifyRuntime() {
  return (
    process.env.NETLIFY === "true" ||
    process.env.NETLIFY_DEV === "true" ||
    Boolean(process.env.NETLIFY_BLOBS_CONTEXT)
  );
}

function preferredBackend() {
  if (minioConfig()) return "minio";
  if (isNetlifyRuntime()) return "netlify-blobs";
  return "local-file";
}

function isRemoteBackend(backend) {
  return backend === "minio" || backend === "netlify-blobs";
}

function storageError(backend, action, cause) {
  const error = new Error(`Storage backend '${backend}' failed during ${action}.`);
  error.code = "STORAGE_BACKEND_FAILURE";
  error.backend = backend;
  error.action = action;
  if (cause) error.cause = cause;
  return error;
}

async function activeStore(namespace) {
  const preferred = preferredBackend();

  if (preferred === "minio") {
    const store = await minioStore(namespace);
    return {
      preferred,
      backend: "minio",
      store,
      remoteAvailable: Boolean(store),
    };
  }

  if (preferred === "netlify-blobs") {
    const store = await blobStore(namespace);
    return {
      preferred,
      backend: "netlify-blobs",
      store,
      remoteAvailable: Boolean(store),
    };
  }

  return {
    preferred,
    backend: "local-file",
    store: null,
    remoteAvailable: null,
  };
}

export async function getStorageBackendStatus() {
  const minioConfigured = Boolean(minioConfig());
  const netlifyRuntime = isNetlifyRuntime();
  const { preferred, backend, remoteAvailable } = await activeStore("health");

  return {
    preferred,
    backend,
    remoteAvailable,
    strongConsistency: true,
    minioConfigured,
    netlifyBlobsRuntime: netlifyRuntime,
  };
}

function localPath(namespace, key) {
  return join(LOCAL_ROOT, namespace, key);
}

export async function readJson(namespace, key, fallback = null) {
  const { preferred, store } = await activeStore(namespace);
  if (isRemoteBackend(preferred) && !store) {
    throw storageError(preferred, `readJson(${namespace}/${key})`);
  }
  if (store) {
    try {
      const value = await store.get(key, { type: "json" });
      return value ?? fallback;
    } catch (error) {
      throw storageError(preferred, `readJson(${namespace}/${key})`, error);
    }
  }
  try {
    const raw = await readFile(localPath(namespace, key), "utf8");
    return JSON.parse(stripBom(raw));
  } catch {
    return fallback;
  }
}

export async function writeJson(namespace, key, value) {
  const { preferred, store } = await activeStore(namespace);
  if (isRemoteBackend(preferred) && !store) {
    throw storageError(preferred, `writeJson(${namespace}/${key})`);
  }
  if (store) {
    try {
      await store.setJSON(key, value);
      return;
    } catch (error) {
      throw storageError(preferred, `writeJson(${namespace}/${key})`, error);
    }
  }
  const path = localPath(namespace, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

export async function readText(namespace, key, fallback = "") {
  const { preferred, store } = await activeStore(namespace);
  if (isRemoteBackend(preferred) && !store) {
    throw storageError(preferred, `readText(${namespace}/${key})`);
  }
  if (store) {
    try {
      const value = await store.get(key, { type: "text" });
      return value ?? fallback;
    } catch (error) {
      throw storageError(preferred, `readText(${namespace}/${key})`, error);
    }
  }
  try {
    return await readFile(localPath(namespace, key), "utf8");
  } catch {
    return fallback;
  }
}

export async function writeText(namespace, key, value) {
  const { preferred, store } = await activeStore(namespace);
  if (isRemoteBackend(preferred) && !store) {
    throw storageError(preferred, `writeText(${namespace}/${key})`);
  }
  if (store) {
    try {
      await store.set(key, value);
      return;
    } catch (error) {
      throw storageError(preferred, `writeText(${namespace}/${key})`, error);
    }
  }
  const path = localPath(namespace, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, "utf8");
}

export async function listJson(namespace) {
  const { preferred, store } = await activeStore(namespace);
  if (isRemoteBackend(preferred) && !store) {
    throw storageError(preferred, `listJson(${namespace})`);
  }
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
    } catch (error) {
      throw storageError(preferred, `listJson(${namespace})`, error);
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
        out.push({ key: file.name, value: JSON.parse(stripBom(raw)) });
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
  const { preferred, store } = await activeStore(namespace);
  if (isRemoteBackend(preferred) && !store) {
    throw storageError(preferred, `deleteObject(${namespace}/${key})`);
  }
  if (store) {
    try {
      await store.delete(key);
      return;
    } catch (error) {
      throw storageError(preferred, `deleteObject(${namespace}/${key})`, error);
    }
  }
  await rm(localPath(namespace, key), { force: true });
}

export async function getIndex() {
  return readJson("index", "reports.json", { reports: [] });
}

export async function saveIndex(index) {
  await writeJson("index", "reports.json", index);
}
