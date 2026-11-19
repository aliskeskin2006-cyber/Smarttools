// SmartTools Pro access service - Cloudflare Worker + D1.
// NO payment webhook is handled here. An administrator must independently verify
// an actual Shopier order before issuing an access code.
// Set ADMIN_KEY as a Worker SECRET, never in this repository or browser.
const SITE = "https://aliskeskin2006-cyber.github.io";
function response(data,status=200,origin=SITE) {
  return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":origin,"vary":"Origin","cache-control":"no-store","x-content-type-options":"nosniff"}});
}
function hex(bytes){return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function hash(value){return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))}
function randomCode(){const bytes=crypto.getRandomValues(new Uint8Array(24));return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("")}
function validOrigin(req){const origin=req.headers.get("Origin");return !origin || origin===SITE}
async function json(req){if(Number(req.headers.get("content-length")||0)>4096)throw Error("İstek fazla büyük");return await req.json()}
const now=()=>Math.floor(Date.now()/1000);
export default {
 async fetch(req,env) {
  const origin=req.headers.get("Origin");
  if(!validOrigin(req))return response({error:"Origin kabul edilmedi"},403);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":SITE,"access-control-allow-methods":"POST,GET,OPTIONS","access-control-allow-headers":"content-type,authorization,x-admin-key","access-control-max-age":"600","vary":"Origin"}});
  if(!env.DB)return response({error:"Veritabanı yapılandırılmamış"},503);
  const path=new URL(req.url).pathname;
  try{
   if(path==="/api/health"&&req.method==="GET")return response({ok:true,service:"SmartTools Pro"});
   if(path==="/api/admin/issue"&&req.method==="POST"){
    // Secret must be sent from a trusted admin console, never a public web page.
    if(!env.ADMIN_KEY || req.headers.get("x-admin-key")!==env.ADMIN_KEY)return response({error:"Yetkisiz"},401);
    const body=await json(req);const ref=String(body.order_reference||"").trim();
    const days=Number(body.days||30);
    if(!/^[a-zA-Z0-9._-]{5,100}$/.test(ref)||!Number.isInteger(days)||days<1||days>365)return response({error:"Sipariş referansı veya süre geçersiz"},400);
    const code=randomCode(),codeHash=await hash(code),expires=now()+days*86400;
    await env.DB.prepare("INSERT INTO licenses (code_hash,created_at,expires_at,order_reference) VALUES (?,?,?,?)").bind(codeHash,now(),expires,ref).run();
    return response({code,expires_at:expires,order_reference:ref});
   }
   if(path==="/api/redeem"&&req.method==="POST"){
    const body=await json(req),code=String(body.code||"").trim().toLowerCase();
    if(!/^[a-f0-9]{48}$/.test(code))return response({error:"Geçerli erişim kodu gir"},400);
    const ch=await hash(code);
    const license=await env.DB.prepare("SELECT expires_at,redeemed_at FROM licenses WHERE code_hash=?").bind(ch).first();
    if(!license||license.redeemed_at!==null||license.expires_at<=now())return response({error:"Kod geçersiz, kullanılmış veya süresi dolmuş"},403);
    const token=randomCode(),th=await hash(token);
    const result=await env.DB.prepare("UPDATE licenses SET redeemed_at=? WHERE code_hash=? AND redeemed_at IS NULL AND expires_at>?").bind(now(),ch,now()).run();
    if(result.meta.changes!==1)return response({error:"Kod daha önce kullanılmış"},409);
    await env.DB.prepare("INSERT INTO sessions (token_hash,code_hash,expires_at) VALUES (?,?,?)").bind(th,ch,license.expires_at).run();
    return response({token,expires_at:license.expires_at});
   }
   if((path==="/api/session"&&req.method==="GET")||(path==="/api/pro/report"&&req.method==="POST")){
    const match=/^Bearer ([a-f0-9]{48})$/.exec(req.headers.get("authorization")||"");
    if(!match)return response({error:"Erişim anahtarı gerekli"},401);
    const th=await hash(match[1]);
    const session=await env.DB.prepare("SELECT s.expires_at FROM sessions s JOIN licenses l ON s.code_hash=l.code_hash WHERE s.token_hash=? AND s.expires_at>? AND l.expires_at>?").bind(th,now(),now()).first();
    if(!session)return response({error:"Pro erişimi geçersiz veya süresi dolmuş"},403);
    if(path==="/api/session")return response({active:true,expires_at:session.expires_at});
    const body=await json(req);const list=body.posts;
    if(!Array.isArray(list)||list.length>200)return response({error:"En fazla 200 gönderi"},400);
    let views=0,actions=0;
    for(const post of list){
      const v=Number(post.views),a=Number(post.actions);
      if(!Number.isSafeInteger(v)||!Number.isSafeInteger(a)||v<0||a<0||v>1e10||a>1e10)return response({error:"Geçersiz veri"},400);
      views+=v;actions+=a;
    }
    const rate=views>0?Number((actions/views*100).toFixed(2)):null;
    return response({posts:list.length,total_views:views,total_interactions:actions,interaction_rate_percent:rate,calculation:"Kullanıcının gönderdiği veriler üzerinden hesaplandı; X veya Instagram API verisi değildir"});
   }
   return response({error:"Bulunamadı"},404);
  }catch(error){
    if(String(error).includes("UNIQUE"))return response({error:"Bu sipariş referansı zaten kayıtlı"},409);
    if(error instanceof SyntaxError)return response({error:"Geçersiz JSON"},400);
    return response({error:"İşlem tamamlanamadı"},500);
  }
 }
};
