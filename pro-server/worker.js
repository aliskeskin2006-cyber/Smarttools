// SmartTools Pro API — Cloudflare Worker + D1
// This does NOT verify Shopier payments automatically. The owner must check a completed Shopier order,
// then manually issue a code with ADMIN_TOKEN. Never publish ADMIN_TOKEN.
const headers=(origin, allowed)=>({
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store",
  "access-control-allow-origin":origin===allowed?origin:allowed,
  "access-control-allow-methods":"POST, OPTIONS",
  "access-control-allow-headers":"Content-Type, Authorization",
  "vary":"Origin"
});
const json=(data,status,origin,allowed)=>new Response(JSON.stringify(data),{status,headers:headers(origin,allowed)});
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,"0")).join("");
export default {
 async fetch(request,env){
  const allowed="https://aliskeskin2006-cyber.github.io";
  const origin=request.headers.get("origin")||"";
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin,allowed)});
  if(request.method!=="POST")return json({error:"Method not allowed"},405,origin,allowed);
  if(origin && origin!==allowed)return json({error:"Origin blocked"},403,origin,allowed);
  const path=new URL(request.url).pathname;
  let data;
  try{data=await request.json()}catch{return json({error:"Geçersiz istek"},400,origin,allowed)}
  if(path==="/api/pro/status"){
    const code=String(data.code||"").trim();
    if(!/^[a-f0-9]{48}$/.test(code))return json({active:false},200,origin,allowed);
    const digest=await hash(code);
    const record=await env.DB.prepare("SELECT expires_at,revoked FROM memberships WHERE code_hash=?").bind(digest).first();
    const expires=record?.expires_at||null;
    return json({active:!!record&&!record.revoked&&Date.parse(expires)>Date.now(),expiresAt:expires},200,origin,allowed);
  }
  if(path==="/api/admin/issue"){
    const provided=request.headers.get("Authorization")||"";
    if(!env.ADMIN_TOKEN||provided!==`Bearer ${env.ADMIN_TOKEN}`)return json({error:"Yetkisiz"},401,origin,allowed);
    const orderId=String(data.orderId||"").trim();
    if(orderId.length<4||orderId.length>100)return json({error:"Sipariş numarası gerekli"},400,origin,allowed);
    const days=30;
    const existing=await env.DB.prepare("SELECT order_id FROM memberships WHERE order_id=?").bind(orderId).first();
    if(existing)return json({error:"Bu sipariş için üyelik zaten düzenlenmiş"},409,origin,allowed);
    const bytes=crypto.getRandomValues(new Uint8Array(24));
    const code=Array.from(bytes).map(n=>n.toString(16).padStart(2,"0")).join("");
    const digest=await hash(code);
    const expiresAt=new Date(Date.now()+days*86400000).toISOString();
    await env.DB.prepare("INSERT INTO memberships (order_id,code_hash,expires_at,revoked) VALUES (?,?,?,0)").bind(orderId,digest,expiresAt).run();
    return json({code,expiresAt,note:"Kodu alıcıya güvenli biçimde iletin. Tekrar görüntülenemez."},200,origin,allowed);
  }
  if(path==="/api/admin/revoke"){
    if(!env.ADMIN_TOKEN||request.headers.get("Authorization")!==`Bearer ${env.ADMIN_TOKEN}`)return json({error:"Yetkisiz"},401,origin,allowed);
    const orderId=String(data.orderId||"").trim();
    await env.DB.prepare("UPDATE memberships SET revoked=1 WHERE order_id=?").bind(orderId).run();
    return json({ok:true},200,origin,allowed);
  }
  return json({error:"Not found"},404,origin,allowed);
 }
};