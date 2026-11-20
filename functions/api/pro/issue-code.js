// Merchant-only code issuance. Strictly fail-closed; no code without a verified paid order.
const reply=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
function eq(a,b){const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let z=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)z|=(x[i]||0)^(y[i]||0);return z===0;}
async function hash(x){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(x));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("");}
export async function onRequestPost({request,env}) {
 if(!env.PRO_DB||!env.SHOPIER_API_TOKEN||!env.ADMIN_VERIFY_SECRET||env.ADMIN_VERIFY_SECRET.length<32) return reply({error:"Altyapı eksik."},503);
 if(!eq(request.headers.get("x-smarttools-admin")||"",env.ADMIN_VERIFY_SECRET)) return reply({error:"Yetkisiz."},401);
 if(!(request.headers.get("content-type")||"").includes("application/json")) return reply({error:"JSON gerekli."},415);
 let b;try{b=await request.json();}catch{return reply({error:"Geçersiz JSON."},400);}
 const id=typeof b?.orderId==="string"?b.orderId.trim():"";
 if(!/^[a-zA-Z0-9_-]{3,60}$/.test(id))return reply({error:"Geçersiz sipariş numarası."},400);
 // Reject duplicate orders. DB also has a UNIQUE constraint for race protection.
 const old=await env.PRO_DB.prepare("SELECT order_id FROM pro_access WHERE order_id=?").bind(id).first();
 if(old)return reply({error:"Bu sipariş için daha önce kod oluşturulmuş. Tekrar kod verilmez."},409);
 let resp;try{resp=await fetch("https://api.shopier.com/v1/orders/"+encodeURIComponent(id),{headers:{"Authorization":"Bearer "+env.SHOPIER_API_TOKEN,"Accept":"application/json"},signal:AbortSignal.timeout(9000)});}catch{return reply({error:"Shopier bağlantı hatası."},502);}
 if(!resp.ok)return reply({error:"Shopier siparişi doğrulanamadı.",shopierStatus:resp.status},resp.status===404?404:502);
 let data;try{data=await resp.json();}catch{return reply({error:"Shopier yanıtı geçersiz."},502);}
 const o=data&&typeof data==="object"&&data.id?data:data?.data;
 const amount=String(o?.totals?.total??"").trim().replace(",",".");
 const items=Array.isArray(o?.lineItems)?o.lineItems:[];
 // Reject any unexpected response; never guess prices, order status or product IDs.
 const valid=String(o?.id||"")===id &&
 o?.paymentStatus==="paid" && o?.currency==="TRY" &&
 /^999(?:\.0{1,2})?$/.test(amount) &&
 items.length===1 && String(items[0]?.productId)==="53173649" &&
 (items[0]?.quantity===1 || items[0]?.quantity==="1") &&
 Array.isArray(o?.refunds) && o.refunds.length===0 &&
 Array.isArray(o?.returns) && o.returns.length===0;
 if(!valid)return reply({error:"Sipariş ödeme, ürün, tutar veya iade kontrollerini geçmedi. Kod oluşturulmadı."},422);
 const code=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase();
 const expiresAt=new Date(Date.now()+30*24*60*60*1000).toISOString();
 try{
 await env.PRO_DB.prepare("INSERT INTO pro_access(code_hash,order_id,expires_at) VALUES(?,?,?)").bind(await hash(code),id,expiresAt).run();
 }catch{return reply({error:"Kod kaydedilemedi veya sipariş daha önce kullanıldı."},409);}
 // Returned only once to the authenticated merchant. Never logged or stored in plaintext.
 return reply({created:true,activationCode:code,orderId:id,expiresAt,
 note:"Kodu yalnızca doğru ödeme yapan müşteriye güvenli kanaldan iletin. Otomatik teslimat henüz yok."},201);
}
export async function onRequestGet(){return reply({method:"POST required",activation:"merchant-only"},405);}
