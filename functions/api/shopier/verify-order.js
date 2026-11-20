// Server-side Shopier order verification endpoint for the merchant only.
// Does not return customer PII or activate membership.
// Requires an independent ADMIN_VERIFY_SECRET (never the Shopier PAT).
const json = (body, status=200) => new Response(JSON.stringify(body), {
 status, headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}
});
function same(a,b) {
 const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
 let diff = x.length ^ y.length;
 for(let i=0;i<Math.max(x.length,y.length);i++) diff |= (x[i]||0) ^ (y[i]||0);
 return diff === 0;
}
export async function onRequestPost({ request, env }) {
 if (!env.SHOPIER_API_TOKEN || !env.ADMIN_VERIFY_SECRET || env.ADMIN_VERIFY_SECRET.length < 32)
   return json({error:"Ödeme doğrulama yapılandırması tamamlanmadı."},503);
 const presented = request.headers.get("x-smarttools-admin") || "";
 if (!same(presented,env.ADMIN_VERIFY_SECRET)) return json({error:"Yetkisiz."},401);
 if (!(request.headers.get("content-type")||"").includes("application/json")) return json({error:"JSON gerekli."},415);
 let payload;
 try { payload = await request.json(); } catch { return json({error:"Geçersiz JSON."},400); }
 const orderId = typeof payload?.orderId === "string" ? payload.orderId.trim() : "";
 if (!/^[A-Za-z0-9_-]{3,60}$/.test(orderId)) return json({error:"Geçersiz sipariş numarası."},400);
 let upstream;
 try {
   upstream = await fetch("https://api.shopier.com/v1/orders/"+encodeURIComponent(orderId), {
     headers: {"Authorization":"Bearer "+env.SHOPIER_API_TOKEN,"Accept":"application/json"},
     signal: AbortSignal.timeout(8000)
   });
 } catch { return json({error:"Shopier bağlantısı sağlanamadı."},502); }
 if (upstream.status===404) return json({exists:false, verified:false},404);
 if (!upstream.ok) return json({error:"Shopier sorgusu başarısız.",shopierStatus:upstream.status},502);
 let data;
 try { data = await upstream.json(); } catch { return json({error:"Sipariş yanıtı okunamadı."},502); }
 const order = data && typeof data==="object" && data.id ? data : data?.data;
 const matchesId = String(order?.id||"")===orderId;
 const isPaid = order?.paymentStatus==="paid";
 const currency = order?.currency;
 const refunds = Array.isArray(order?.refunds) ? order.refunds : null;
 // Refund semantics vary; flag for manual review rather than claiming sale valid.
 const noRefunds = refunds !== null && refunds.length === 0;
 const productIds = Array.isArray(order?.lineItems) ? order.lineItems.map(i=>String(i?.productId||i?.product?.id||"")).filter(Boolean) : [];
 const productMatches = productIds.includes("53173649");
 return json({
   exists:matchesId,
   paid:matchesId && isPaid,
   currency:currency==="TRY" ? "TRY" : "other",
   productMatches,
   noRefunds,
   verified:matchesId && isPaid && currency==="TRY" && productMatches && noRefunds,
   note:"Bu sadece satıcı inceleme testidir; ücret ve müşteri eşleştirmesi ayrıca doğrulanmadan erişim açılmaz."
 });
}

// Browser-safe diagnostic: this endpoint requires POST, not a navigation request.
export async function onRequestGet() {
 return json({endpoint:"shopier-order-verification",ready:true,method:"POST required",paymentActivation:false},405);
}
