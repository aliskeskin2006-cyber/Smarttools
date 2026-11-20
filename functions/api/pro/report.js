// Pro-only server-side report; static UI cannot bypass this membership check.
const send=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const hash=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("");
export async function onRequestPost({request,env}){
  if(!env.PRO_DB)return send({error:"Üyelik sistemi hazır değil."},503);
  const site=new URL(request.url);
  const origin=request.headers.get("origin");
  if(origin && origin!==site.origin)return send({error:"Geçersiz kaynak."},403);
  const c=request.headers.get("cookie")||"";
  const token=c.split(";").map(x=>x.trim()).find(x=>x.startsWith("st_pro="))?.slice(7);
  if(!token||!/^[a-f0-9]{64}$/.test(token))return send({error:"Bu rapor yalnızca aktif Pro üyeler içindir.",requiresPro:true},403);
  let row;
  try{row=await env.PRO_DB.prepare("SELECT expires_at FROM pro_access WHERE session_hash = ? AND redeemed_at IS NOT NULL AND expires_at > ?").bind(await hash(token),new Date().toISOString()).first();}
  catch{return send({error:"Üyelik kontrolüne ulaşılamadı."},503);}
  if(!row)return send({error:"Pro üyeliği bulunamadı veya sona erdi.",requiresPro:true},403);
  if(!(request.headers.get("content-type")||"").includes("application/json"))return send({error:"JSON gerekli."},415);
  let input;try{input=await request.json();}catch{return send({error:"Geçersiz veri."},400);}
  const platform=input?.platform;
  if(!["x","instagram"].includes(platform))return send({error:"Platform X veya Instagram olmalı."},400);
  if(!Array.isArray(input.posts)||input.posts.length<2||input.posts.length>100)return send({error:"2–100 gönderi girilmelidir."},400);
  const posts=[];
  for(let i=0;i<input.posts.length;i++){
    const p=input.posts[i]||{};
    const impressions=Number(p.impressions),likes=Number(p.likes),other=Number(p.other);
    if(![impressions,likes,other].every(x=>Number.isSafeInteger(x)&&x>=0&&x<=1e9)||likes+other>impressions*10)return send({error:"Geçersiz gönderi verisi: "+(i+1)},400);
    const engagement=likes+other;
    posts.push({impressions,engagement,rate:impressions?engagement/impressions*100:0});
  }
  const impressions=posts.reduce((s,p)=>s+p.impressions,0),engagements=posts.reduce((s,p)=>s+p.engagement,0);
  const averageRate=posts.reduce((s,p)=>s+p.rate,0)/posts.length;
  const totalRate=impressions?engagements/impressions*100:0;
  const ranked=posts.map((p,i)=>({post:i+1,...p})).sort((a,b)=>b.rate-a.rate);
  return send({
    platform,postCount:posts.length,totalImpressions:impressions,totalEngagements:engagements,
    overallEngagementRate:Math.round(totalRate*100)/100,averagePostRate:Math.round(averageRate*100)/100,
    topPosts:ranked.slice(0,5).map(p=>({post:p.post,rate:Math.round(p.rate*100)/100,impressions:p.impressions})),
    expiresAt:row.expires_at,
    explanation:"Kullanıcının manuel girdiği verilere göre hesaplanmıştır. Resmî X/Instagram API bağlantısı yoktur."
  });
}
export async function onRequestGet(){return send({method:"POST required",requiresPro:true},405);}
