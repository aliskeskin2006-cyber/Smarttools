const response = (data, status = 200, cookie = null) => {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  if (cookie) headers.set("set-cookie", cookie);
  return new Response(JSON.stringify(data), { status, headers });
};
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, "0")).join("");
}
export async function onRequestPost({ request, env }) {
  if (!env.PRO_DB) return response({ error: "Üyelik sistemi henüz etkin değil." }, 503);
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) return response({ error: "JSON gerekli." }, 415);
  let body;
  try { body = await request.json(); } catch { return response({ error: "Geçersiz istek." }, 400); }
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!/^[A-Z0-9-]{24,80}$/.test(code)) return response({ error: "Geçersiz aktivasyon kodu." }, 400);
  const codeHash = await sha256(code);
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(tokenBytes, x => x.toString(16).padStart(2, "0")).join("");
  const sessionHash = await sha256(token);
  const now = new Date().toISOString();
  const result = await env.PRO_DB.prepare(
    "UPDATE pro_access SET session_hash = ?, redeemed_at = ? WHERE code_hash = ? AND session_hash IS NULL AND expires_at > ? RETURNING expires_at"
  ).bind(sessionHash, now, codeHash, now).first();
  if (!result) return response({ error: "Kod geçersiz, kullanılmış veya süresi dolmuş." }, 400);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return response({ active: true, expiresAt: result.expires_at }, 200,
    "st_pro=" + token + "; HttpOnly; SameSite=Lax; Path=/api/pro; Max-Age=2592000" + secure);
}
