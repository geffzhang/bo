export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function fail(message, status = 400, details = undefined) {
  return json({ ok: false, error: message, details }, status);
}

export function requireText(value, field) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`${field}不能为空`);
  }
  return text;
}
