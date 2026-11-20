// Public readiness only: never return merchant data, tokens or customer information.
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const amount=x=>/^149(?:[.,]0{1,2})?$/.test(String(x??"").trim());
export async function onRequestGet({env}){
 if(!env.PRO_DB||!env.SHOPIER_API_TOKEN||!env.ADMIN_VERIFY_SECRET||env.ADMIN_VERIFY_SECRET.length<32)return reply({ready:false,reason:"configuration"},503);
 try{
  await env.PRO_DB.prepare("SELECT order_id FROM pro_access LIMIT 1").all();
  await env.PRO_DB.prepare("CREATE TABLE IF NOT EXISTS pro_claim_limits (key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,resets_at TEXT NOT NULL)").run();
 }catch{return reply({ready:false,reason:"database"},503);}
 let r;
 try{r=await fetch("https://api.shopier.com/v1/products/53173649",{
 headers:{"authorization":"Bearer "+env.SHOPIER_API_TOKEN,"accept":"application/json"},signal:AbortSignal.timeout(8000)
 });}catch{return reply({ready:false,reason:"shopier_connection"},503);}
 if(!r.ok)return reply({ready:false,reason:"product_not_available"},503);
 let product;try{product=await r.json();}catch{return reply({ready:false,reason:"product_response"},503);}
 const p=product?.id?product:product?.data;
 if(String(p?.id)!=="53173649"||p?.priceData?.currency!=="TRY"||!amount(p?.priceData?.price)||
 p?.priceData?.discount===true)return reply({ready:false,reason:"price_mismatch"},503);
 return reply({ready:true,price:149,currency:"TRY",durationDays:30,
   orderVerification:"server_side",fulfillment:"buyer_self_activation",
   testedWithPaidOrder:false});
}
