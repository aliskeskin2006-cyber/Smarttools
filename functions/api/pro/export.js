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
 try{active=await env.PRO_DB.prepare("SELECT expires_at FROM pro_access WHERE session_hash=? AND redeemed_at IS NOT NULL AND expires_at>?").bind(await sha(t),new Date().toISOString()).first();}
 catch{return json({error:"Kontrol hatası."},503);}
 if(!active)return json({error:"Pro üyeliğiniz bulunamadı veya süresi doldu."},403);
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
