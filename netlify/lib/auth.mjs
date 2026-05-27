function decodeBase64Url(value) {
  const input = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = input.padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    return JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return null;
  }
}

function normalizeUserId(value) {
  return String(value || "").trim();
}

function parseBoolean(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function legacyOwnerlessCompatEnabled() {
  return parseBoolean(process.env.BO_LEGACY_OWNERLESS_COMPAT, false);
}

export function getRequestIdentity(request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const claims = bearerToken ? parseJwtPayload(bearerToken) : null;

  const userId = normalizeUserId(
    claims?.sub ||
      claims?.uid ||
      claims?.user_id ||
      request.headers.get("x-bo-user-id") ||
      request.headers.get("x-user-id")
  );

  const displayName = normalizeUserId(
    claims?.preferred_username ||
      claims?.name ||
      claims?.nickname ||
      claims?.email ||
      request.headers.get("x-bo-user-name")
  );

  return {
    userId,
    displayName,
    claims
  };
}

export function requireRequestIdentity(request) {
  const identity = getRequestIdentity(request);
  if (identity.userId) return identity;
  const error = new Error("未登录或缺少用户身份");
  error.status = 401;
  throw error;
}

export function isOwnedBy(resource, userId) {
  return normalizeUserId(resource?.ownerId) === normalizeUserId(userId);
}
