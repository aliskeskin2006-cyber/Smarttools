const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
async function hash(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function onRequestGet({ request, env }) {
  if (!env.PRO_DB) return json({ active: false, ready: false }, 503);
  const cookie = request.headers.get("cookie") || "";
  const token = cookie.split(";").map(x => x.trim()).find(x => x.startsWith("st_pro="))?.slice(7);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return json({ active: false });
  const row = await env.PRO_DB.prepare("SELECT expires_at FROM pro_access WHERE session_hash = ? AND redeemed_at IS NOT NULL AND expires_at > ?").bind(await hash(token), new Date().toISOString()).first();
  return json(row ? { active: true, expiresAt: row.expires_at } : { active: false });
}
