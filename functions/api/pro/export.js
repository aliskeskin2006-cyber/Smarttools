// Downloadable Pro CSV report. Requires D1-backed Pro session; not bypassable by hiding UI controls.
const respond=(body,status=200,headers={})=>new Response(body,{status,headers:{"cache-control":"no-store","x-content-type-options":"nosniff",...headers}});
const json=(v,status=200)=>respond(JSON.stringify(v),status,{"content-type":"application/json; charset=utf-8"});
async function sha(s){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("");}
export async function onRequestPost({request,env}){
 if(!env.PRO_DB)return json({error:"Veritabanı hazır değil."},503);
 const url=new URL(request.url),origin=request.headers.get("origin");
 if(origin&&origin!==url.origin)return json({error:"Geçersiz istek kaynağı."},403);
 const t=(request.headers.get("cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("st_pro="))?.slice(7);
 if(!t||!/^[a-f0-9]{64}$/.test(t))return json({error:"Aktif Pro üyelik gerekli."},403);
 let active;
 try{active=await env.PRO_DB.prepare("SELECT order_id,expires_at FROM pro_access WHERE session_hash=? AND redeemed_at IS NOT NULL AND expires_at>?").bind(await sha(t),new Date().toISOString()).first();}
 catch{return json({error:"Kontrol hatası."},503);}
 if(!active)return json({error:"Pro üyeliğiniz bulunamadı veya süresi doldu."},403);
 if(!env.SHOPIER_API_TOKEN)return json({error:"Shopier bağlantısı hazır değil."},503);
 let paidOrder;
 try{
  const resp=await fetch("https://api.shopier.com/v1/orders/"+encodeURIComponent(active.order_id),{
   headers:{"authorization":"Bearer "+env.SHOPIER_API_TOKEN,"accept":"application/json"},signal:AbortSignal.timeout(7000)});
  if(!resp.ok)return json({error:"Shopier ödeme kontrolü başarısız."},502);
  paidOrder=await resp.json();
 }catch{return json({error:"Shopier bağlantısı sağlanamadı."},502);}
 const paidValid=String(paidOrder?.id||"")===active.order_id
  &&paidOrder?.paymentStatus==="paid"&&Array.isArray(paidOrder?.refunds)&&paidOrder.refunds.length===0
  &&Array.isArray(paidOrder?.returns)&&paidOrder.returns.length===0;
 if(!paidValid){
  try{await env.PRO_DB.prepare("UPDATE pro_access SET expires_at=? WHERE order_id=?").bind(new Date().toISOString(),active.order_id).run();}catch{}
  return json({error:"Sipariş iade edilmiş, iptal edilmiş veya artık ödenmiş değil."},403);
 }

 let body;try{body=await request.json();}catch{return json({error:"Geçersiz veri."},400);}
 if(!["instagram","x"].includes(body?.platform))return json({error:"Geçersiz platform."},400);
 const posts=body?.posts;if(!Array.isArray(posts)||posts.length<2||posts.length>100)return json({error:"2-100 kayıt gerekli."},400);
 let rows=[["Platform","Sıra","Gösterim","Beğeni","Diğer Etkileşimler","Oran (%)"]];
 for(let i=0;i<posts.length;i++){
  const p=posts[i];const x=Number(p?.impressions),y=Number(p?.likes),z=Number(p?.other);
  if(![x,y,z].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9)||y+z>x*10)return json({error:"Geçersiz satır "+(i+1)},400);
  rows.push([body.platform,i+1,x,y,z,x?((y+z)*100/x).toFixed(2):"0.00"]);
 }
 const content="\uFEFF"+rows.map(row=>row.join(";")).join("\r\n");
 return respond(content,200,{"content-type":"text/csv; charset=utf-8","content-disposition":'attachment; filename="smarttools-pro-analiz.csv"'});
}
export async function onRequestGet(){return json({method:"POST required",requiresPro:true},405);}
