// Merchant-only Shopier order lookup. No automatic activation.
const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{
 "content-type":"application/json; charset=utf-8", "cache-control":"no-store","x-content-type-options":"nosniff"
}});
function equalConstantTime(a,b) {
 const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);
 let d=x.length^y.length;
 for(let i=0;i<Math.max(x.length,y.length);i++) d|=(x[i]||0)^(y[i]||0);
 return d===0;
}
export async function onRequestPost({request,env}) {
 if(!env.SHOPIER_API_TOKEN || !env.ADMIN_VERIFY_SECRET || env.ADMIN_VERIFY_SECRET.length<32)
   return json({error:"Sunucu ayarları henüz tamamlanmadı."},503);
 const secret=request.headers.get("x-smarttools-admin")||"";
 if(!equalConstantTime(secret,env.ADMIN_VERIFY_SECRET)) return json({error:"Yönetici anahtarı yanlış."},401);
 if(!(request.headers.get("content-type")||"").includes("application/json"))
   return json({error:"JSON içerik bekleniyor."},415);
 let body;
 try {body=await request.json();}catch{return json({error:"JSON okunamadı."},400);}
 const orderId=typeof body?.orderId==="string"?body.orderId.trim():"";
 if(!/^[a-zA-Z0-9_-]{3,60}$/.test(orderId)) return json({error:"Sipariş numarası geçersiz."},400);
 let response;
 try {
   response=await fetch("https://api.shopier.com/v1/orders/"+encodeURIComponent(orderId),{
     method:"GET",headers:{"Authorization":"Bearer "+env.SHOPIER_API_TOKEN,"Accept":"application/json"},
     signal:AbortSignal.timeout(8000)
   });
 }catch{return json({error:"Shopier sorgusuna ulaşılamadı."},502);}
 if(response.status===404) return json({exists:false,eligibleForReview:false,note:"Sipariş bulunamadı; ödeme yapılmadı."},404);
 if(!response.ok) return json({error:"Shopier sipariş servisi hata verdi.",status:response.status},502);
 let raw;
 try {raw=await response.json();}catch{return json({error:"Shopier yanıtı okunamadı."},502);}
 const order=raw && typeof raw==="object" && raw.id ? raw : raw?.data;
 const idMatches=order && String(order.id)===orderId;
 const paid=order?.paymentStatus==="paid";
 const currencyMatches=order?.currency==="TRY";
 const refundsClear=Array.isArray(order?.refunds) && order.refunds.length===0;
 const lineItems=Array.isArray(order?.lineItems)?order.lineItems:[];
 // Reject multi-product purchases until there is an explicit fulfillment policy.
 const productMatches=lineItems.length===1 && String(lineItems[0]?.productId)==="53173649";
 const totalString=String(order?.totals?.total??"").trim().replace(",",".");
 const amountMatches=/^999(?:\.0{1,2})?$/.test(totalString);
 const checks={idMatches:!!idMatches,paid,currencyMatches,productMatches,amountMatches,refundsClear};
 return json({
   exists:!!idMatches,checks,
   eligibleForReview:Object.values(checks).every(Boolean),
   paymentActivation:false,
   note:"Yalnızca satıcı incelemesi içindir. Sipariş ve alıcı eşleştirmesi tamamlanmadan Pro erişim açılmaz."
 });
}
export async function onRequestGet() {
 return json({endpoint:"shopier-order-verification",ready:true,method:"POST required",paymentActivation:false},405);
}
