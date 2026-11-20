// Shopier signed webhooks -> server-verified order -> email activation via Resend.
// Fail closed until SHOPIER_WEBHOOK_TOKEN, DELIVERY_SECRET, RESEND_API_KEY,
// RESEND_FROM, SHOPIER_API_TOKEN and PRO_DB are configured.
// No secrets or customer information are sent back to webhook caller.
const send=(message,status=200)=>new Response(JSON.stringify({message}),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const bytes=x=>new TextEncoder().encode(x);
const tohex=x=>[...x].map(b=>b.toString(16).padStart(2,"0")).join("");
async function sha(s){return tohex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes(s))));}
function same(a,b){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a[i]||0)^(b[i]||0);return diff===0;}
async function mac(secret,message){const key=await crypto.subtle.importKey("raw",bytes(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return new Uint8Array(await crypto.subtle.sign("HMAC",key,bytes(message)));}
function sigMatch(expected,raw){
 const signature=raw.trim().replace(/^sha256=/i,"");
 if(/^[a-f0-9]{64}$/i.test(signature))return same(tohex(expected).split("").map(x=>x.charCodeAt(0)),signature.toLowerCase().split("").map(x=>x.charCodeAt(0)));
 try{const binary=atob(signature);return same(expected,[...binary].map(c=>c.charCodeAt(0)));}catch{return false;}
}
async function loadOrder(id,env){
 const r=await fetch("https://api.shopier.com/v1/orders/"+encodeURIComponent(id),{headers:{"Authorization":"Bearer "+env.SHOPIER_API_TOKEN,"Accept":"application/json"},signal:AbortSignal.timeout(6500)});
 if(!r.ok)throw new Error("Order fetch failed");
 const d=await r.json();return d&&typeof d==="object"&&d.id?d:d?.data;
}
function validOrder(o,id){
 const items=Array.isArray(o?.lineItems)?o.lineItems:[];
 return String(o?.id||"")===id && o?.paymentStatus==="paid" && o.currency==="TRY"
 && /^149(?:\.0{1,2})?$/.test(String(o?.totals?.total??"").trim().replace(",","."))
 && items.length===1 && String(items[0]?.productId)==="53173649"
 && (items[0]?.quantity===1||items[0]?.quantity==="1")
 && Array.isArray(o?.refunds)&&o.refunds.length===0
 && Array.isArray(o?.returns)&&o.returns.length===0;
}
function buyerEmail(o){
 const mail=String(o?.shippingInfo?.email||"").trim().toLowerCase();
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)&&mail.length<255?mail:null;
}
async function sendActivation(email,code,env){
 const sender=String(env.RESEND_FROM||"");
 if(!/^.+@[^\s@]+\.[^\s@]+$/.test(sender))throw new Error("Sender missing");
 const r=await fetch("https://api.resend.com/emails",{
  method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},
  body:JSON.stringify({
   from:sender,to:[email],subject:"SmartTools Pro aktivasyon kodunuz",
   text:"SmartTools Pro 30 günlük üyelik kodunuz: "+code+"\n\nKodu şu adreste etkinleştirin:\nhttps://smarttools-cgv.pages.dev/pro-aktivasyon.html\n\nBu kodu başkalarıyla paylaşmayın."
  }),signal:AbortSignal.timeout(6500)
 });
 if(!r.ok)throw new Error("Delivery failed");
}
async function processOrder(id,env){
 const o=await loadOrder(id,env);
 if(!validOrder(o,id))return;
 const email=buyerEmail(o);if(!email)return;
 const rawCode=await mac(env.DELIVERY_SECRET,"smarttools-pro:"+id);
 const code=tohex(rawCode).toUpperCase();
 const codeHash=await sha(code);
 const expiration=new Date(Date.now()+30*86400000).toISOString();
 const existing=await env.PRO_DB.prepare("SELECT session_hash,expires_at FROM pro_access WHERE order_id=?").bind(id).first();
 if(existing?.session_hash)return;
 if(existing && existing.expires_at<=new Date().toISOString())return;
 if(!existing){
   try{await env.PRO_DB.prepare("INSERT INTO pro_access(code_hash,order_id,expires_at) VALUES(?,?,?)").bind(codeHash,id,expiration).run();}
   catch {return;}
 }
 await sendActivation(email,code,env);
}
async function revokeRefund(id,env){
 if(!/^[a-zA-Z0-9_-]{3,60}$/.test(id))return;
 const o=await loadOrder(id,env);
 if(Array.isArray(o?.refunds)&&o.refunds.length>0){
  await env.PRO_DB.prepare("UPDATE pro_access SET expires_at=? WHERE order_id=?").bind(new Date().toISOString(),id).run();
 }
}
export async function onRequestPost({request,env,context}){
 if(!env.PRO_DB||!env.SHOPIER_API_TOKEN||!env.SHOPIER_WEBHOOK_TOKEN||!env.DELIVERY_SECRET
 ||env.DELIVERY_SECRET.length<32||!env.RESEND_API_KEY||!env.RESEND_FROM)return send("Webhook not configured",503);
 const len=Number(request.headers.get("content-length")||"0");
 if(len>64000)return send("Payload too large",413);
 const raw=await request.text();if(raw.length>64000)return send("Payload too large",413);
 const signature=request.headers.get("shopier-signature")||request.headers.get("x-shopier-signature")||"";
 if(!sigMatch(await mac(env.SHOPIER_WEBHOOK_TOKEN,raw),signature))return send("Invalid signature",401);
 const event=request.headers.get("shopier-event")||request.headers.get("x-shopier-event")||"";
 let data;try{data=JSON.parse(raw);}catch{return send("Invalid JSON",400);}
 const id=String(data?.id||data?.data?.id||data?.orderId||"");
 if(!/^[a-zA-Z0-9_-]{3,60}$/.test(id))return send("No order ID",400);
 if(event==="order.created"){
   context.waitUntil(processOrder(id,env).catch(()=>{}));
 }else if(event==="refund.updated"){
   context.waitUntil(revokeRefund(id,env).catch(()=>{}));
 }
 return send("Accepted",200);
}
export async function onRequestGet(){return send("POST required",405);}
