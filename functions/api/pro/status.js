// Pro session status; paid orders rechecked at source before access is granted.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const hash=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("");
export async function onRequestGet({request,env}){
 if(!env.PRO_DB)return json({active:false,ready:false},503);
 const cookie=(request.headers.get("cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("st_pro="))?.slice(7);
 if(!cookie||!/^[a-f0-9]{64}$/.test(cookie))return json({active:false});
 let row;try{row=await env.PRO_DB.prepare("SELECT order_id,expires_at FROM pro_access WHERE session_hash=? AND redeemed_at IS NOT NULL AND expires_at>?").bind(await hash(cookie),new Date().toISOString()).first();}
 catch{return json({active:false,ready:false},503);}
 if(!row)return json({active:false});
 if(!env.SHOPIER_API_TOKEN)return json({active:false,ready:false},503);
 let r;try{r=await fetch("https://api.shopier.com/v1/orders/"+encodeURIComponent(row.order_id),{headers:{"authorization":"Bearer "+env.SHOPIER_API_TOKEN,"accept":"application/json"},signal:AbortSignal.timeout(7000)});}
 catch{return json({active:false,verificationUnavailable:true},502);}
 if(!r.ok)return json({active:false,verificationUnavailable:true},502);
 let o;try{o=await r.json();}catch{return json({active:false,verificationUnavailable:true},502);}
 const valid=String(o?.id||"")===row.order_id&&o?.paymentStatus==="paid"&&Array.isArray(o?.refunds)&&o.refunds.length===0&&Array.isArray(o?.returns)&&o.returns.length===0;
 if(!valid){
  try{await env.PRO_DB.prepare("UPDATE pro_access SET expires_at=? WHERE order_id=?").bind(new Date().toISOString(),row.order_id).run();}catch{}
  return json({active:false,revoked:true});
 }
 return json({active:true,expiresAt:row.expires_at});
}
