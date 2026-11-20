// Shopier read-only connection test; never exposes the PAT or shop details.
// It does not enable payment or memberships.
export async function onRequestGet({ env }) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=0, s-maxage=120",
    "x-content-type-options": "nosniff"
  };
  if (!env.SHOPIER_API_TOKEN) {
    return new Response(JSON.stringify({ connected: false, reason: "token_missing" }), { status: 503, headers });
  }
  try {
    const result = await fetch("https://api.shopier.com/v1/shop/settings", {
      method: "GET",
      headers: { "Authorization": "Bearer " + env.SHOPIER_API_TOKEN, "Accept": "application/json" },
      signal: AbortSignal.timeout(8000)
    });
    if (result.ok) return new Response(JSON.stringify({ connected: true }), { status: 200, headers });
    const reason = result.status === 401 || result.status === 403 ? "auth_failed" : "upstream_unavailable";
    return new Response(JSON.stringify({ connected: false, reason }), { status: 502, headers });
  } catch {
    return new Response(JSON.stringify({ connected: false, reason: "network_error" }), { status: 502, headers });
  }
}
