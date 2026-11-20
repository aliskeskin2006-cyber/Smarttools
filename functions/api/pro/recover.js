// Recover Pro login using the one-time-displayed high-entropy recovery code.
// Used when a member switches browser or clears cookies.
const reply=(data,status=200,cookie)=>{const h=new Headers({"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});if(cookie)h.set("set-cookie",cookie);return new Response(JSON.stringify(data),{status,headers:h});};
const hash=async x=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(x))),b=>b.toString(16).padStart(2,"0")).join("");
export async function onRequestPost({request,env}){
 if(!env.PRO_DB)return reply({error:"Üyelik sistemi kullanılamıyor."},503);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return reply({error:"Geçersiz kaynak."},403);
 if(!(request.headers.get("content-type")||"").includes("application/json"))return reply({error:"JSON gerekli."},415);
 let b;try{b=await request.json();}catch{return reply({error:"Geçersiz JSON."},400);}
 const code=typeof b?.code==="string"?b.code.trim().toUpperCase():"";
 if(!/^[A-F0-9]{64}$/.test(code))return reply({error:"Geri dönüş kodu geçersiz."},400);
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,"0")).join("");
 let result;const now=new Date().toISOString();
 try{result=await env.PRO_DB.prepare("UPDATE pro_access SET session_hash=? WHERE code_hash=? AND redeemed_at IS NOT NULL AND expires_at>? RETURNING expires_at").bind(await hash(token),await hash(code),now).first();}
 catch{return reply({error:"Üyelik veritabanına ulaşılamadı."},503);}
 if(!result)return reply({error:"Kod bulunamadı veya süresi doldu."},400);
 return reply({active:true,expiresAt:result.expires_at},200,"st_pro="+token+"; HttpOnly; Secure; SameSite=Lax; Path=/api/pro; Max-Age=2592000");
}
export async function onRequestGet(){return reply({method:"POST required"},405);}
