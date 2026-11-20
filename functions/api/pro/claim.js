// Shopier order self-activation. No emails, webhooks, paid domain, or merchant intervention.
// The buyer supplies order ID + checkout email + last 6 digits of checkout phone.
// The Shopier API, not the browser, validates purchase, product, amount, and refunds.
// Do not remove the rate limit or payment validation.
const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
const reply=(data,status=200,cookie)=>{const h=new Headers(headers);if(cookie)h.set("set-cookie",cookie);return new Response(JSON.stringify(data),{status,headers:h});};
const encode=x=>new TextEncoder().encode(x);
const hex=x=>[...new Uint8Array(x)].map(v=>v.toString(16).padStart(2,"0")).join("");
const sha=async x=>hex(await crypto.subtle.digest("SHA-256",encode(x)));
function equal(a,b){const x=encode(a),y=encode(b);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);return diff===0;}
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
async function throttle(request,env){
 const ip=request.headers.get("cf-connecting-ip")||"missing";
 const key=await sha("claim:"+env.ADMIN_VERIFY_SECRET+":"+ip);
 const now=Date.now(),reset=new Date(now+15*60000).toISOString(),today=new Date(now).toISOString();
 await env.PRO_DB.prepare("CREATE TABLE IF NOT EXISTS pro_claim_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, resets_at TEXT NOT NULL)").run();
 const row=await env.PRO_DB.prepare(`INSERT INTO pro_claim_limits (key,attempts,resets_at) VALUES (?,1,?)
 ON CONFLICT(key) DO UPDATE SET
 attempts=CASE WHEN pro_claim_limits.resets_at < ? THEN 1 ELSE pro_claim_limits.attempts+1 END,
 resets_at=CASE WHEN pro_claim_limits.resets_at < ? THEN excluded.resets_at ELSE pro_claim_limits.resets_at END
 RETURNING attempts`).bind(key,reset,today,today).first();
 return Number(row?.attempts||999)<=8;
}
const orderIsValid=o=>{
 if(!o || o.paymentStatus!=="paid" || o.currency!=="TRY")return false;
 if(!/^999(?:[.,]0{1,2})?$/.test(String(o?.totals?.total??"").trim()))return false;
 const items=o.lineItems;
 if(!Array.isArray(items)||items.length!==1||String(items[0]?.productId)!=="53173649"||Number(items[0]?.quantity)!==1)return false;
 if(!Array.isArray(o.refunds)||o.refunds.length!==0||!Array.isArray(o.returns)||o.returns.length!==0)return false;
 const date=Date.parse(o.dateCreated);
 return Number.isFinite(date)&&date<=Date.now()+300000&&date>Date.now()-30*86400000;
};
export async function onRequestPost({request,env}){
 if(!env.PRO_DB||!env.SHOPIER_API_TOKEN||!env.ADMIN_VERIFY_SECRET||env.ADMIN_VERIFY_SECRET.length<32)return reply({error:"Üyelik sunucusu yapılandırması eksik."},503);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return reply({error:"Geçersiz istek kaynağı."},403);
 if(!(request.headers.get("content-type")||"").includes("application/json"))return reply({error:"JSON gerekli."},415);
 if(Number(request.headers.get("content-length")||"0")>4096)return reply({error:"İstek çok büyük."},413);
 let raw=await request.text();if(raw.length>4096)return reply({error:"İstek çok büyük."},413);
 let payload;try{payload=JSON.parse(raw)}catch{return reply({error:"Geçersiz JSON."},400);}
 const orderId=typeof payload?.orderId==="string"?payload.orderId.trim():"";
 const email=typeof payload?.email==="string"?payload.email.trim().toLowerCase():"";
 const phone6=typeof payload?.phone6==="string"?payload.phone6.trim():"";
 if(!/^[a-zA-Z0-9_-]{3,60}$/.test(orderId)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!/^\d{6}$/.test(phone6))return reply({error:"Sipariş numarasını, e-posta adresini ve telefonun son 6 rakamını kontrol edin."},400);
 try{if(!(await throttle(request,env)))return reply({error:"Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin."},429);}
 catch{return reply({error:"Güvenlik kontrolü kullanılamıyor."},503);}
 let response;
 try{response=await fetch("https://api.shopier.com/v1/orders/"+encodeURIComponent(orderId),{method:"GET",headers:{"authorization":"Bearer "+env.SHOPIER_API_TOKEN,"accept":"application/json"},signal:AbortSignal.timeout(8000)});}
 catch{return reply({error:"Shopier bağlantısı şu anda sağlanamadı."},502);}
 if(response.status===404)return reply({error:"Sipariş doğrulanamadı. Shopier sipariş numaranızı kontrol edin."},422);
 if(!response.ok)return reply({error:"Shopier sipariş kontrolü şu anda kullanılamıyor."},502);
 let order;try{order=await response.json();}catch{return reply({error:"Shopier yanıtı okunamadı."},502);}
 if(!orderIsValid(order)||String(order.id)!==orderId)return reply({error:"Sipariş doğrulanamadı. Ödeme tamamlanmadıysa Shopier'den kontrol edin."},422);
 const shopierEmail=String(order.shippingInfo?.email||"").trim().toLowerCase();
 const shopierPhone=String(order.shippingInfo?.phone||"").replace(/\D/g,"");
 if(!equal(shopierEmail,email)||!shopierPhone.endsWith(phone6))return reply({error:"Sipariş bilgileri eşleşmiyor."},422);
 const expiresAt=new Date(Date.parse(order.dateCreated)+30*86400000).toISOString();
 const session=random(),recovery=random().toUpperCase(),now=new Date().toISOString();
 // One order may be activated only once, atomically guaranteed by UNIQUE(order_id).
 let result;
 try{result=await env.PRO_DB.prepare("INSERT INTO pro_access(code_hash,order_id,expires_at,redeemed_at,session_hash) VALUES (?,?,?,?,?) ON CONFLICT(order_id) DO NOTHING").bind(await sha(recovery),orderId,expiresAt,now,await sha(session)).run();}
 catch{return reply({error:"Üyelik kaydı sırasında hata oluştu."},503);}
 if(Number(result?.meta?.changes??0)!==1)return reply({error:"Bu sipariş daha önce aktifleştirilmiş. Geri dönüş kodunuzla giriş yapın."},409);
 const cookie="st_pro="+session+"; HttpOnly; Secure; SameSite=Lax; Path=/api/pro; Max-Age=2592000";
 return reply({active:true,expiresAt,recoveryCode:recovery,
   note:"Geri dönüş kodunuzu şimdi güvenli bir yere kaydedin. Başka telefondan Pro erişimi için gerekecek."},201,cookie);
}
export async function onRequestGet(){return reply({ready:true,method:"POST required",liveSaleVerified:false},405);}
