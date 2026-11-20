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
 let p;
 if(r.ok){
  try{const product=await r.json();p=product?.id?product:product?.data;}catch{return reply({ready:false,reason:"product_response"},503);}
 }else{
  // Some merchant accounts allow listing products but not reading one product by ID.
  let list;
  try{list=await fetch("https://api.shopier.com/v1/products?limit=100",{
   headers:{"authorization":"Bearer "+env.SHOPIER_API_TOKEN,"accept":"application/json"},signal:AbortSignal.timeout(8000)
  });}catch{return reply({ready:false,reason:"shopier_products_connection"},503);}
  if(!list.ok){
    // Product read access may be unavailable on some Shopier merchant accounts.
    // Only proceed if the ORDER API is independently working; every paid claim
    // still validates the real 149 TRY paid order, product ID and refund status.
    let orderProbe;
    try{orderProbe=await fetch("https://api.shopier.com/v1/orders/TEST-YOK-2026",{
      headers:{"authorization":"Bearer "+env.SHOPIER_API_TOKEN,"accept":"application/json"},
      signal:AbortSignal.timeout(8000)
    });}catch{return reply({ready:false,reason:"shopier_orders_connection"},503);}
    if(orderProbe.status!==404)return reply({ready:false,reason:"shopier_orders_access",orderStatus:orderProbe.status},503);
    return reply({ready:true,price:149,currency:"TRY",durationDays:30,
      productPriceVerifiedByAPI:false,orderApiAvailable:true,
      orderVerification:"verified_on_claim",fulfillment:"buyer_self_activation",
      testedWithPaidOrder:false,
      warning:"Ürün API'si erişime kapalı. Ödeme öncesi Shopier'de fiyatın 149 TL olduğunu kontrol edin."
    });
  }
  let entries;try{entries=await list.json();}catch{return reply({ready:false,reason:"shopier_list_response"},503);}
  const items=Array.isArray(entries)?entries:Array.isArray(entries?.data)?entries.data:Array.isArray(entries?.items)?entries.items:[];
  p=items.find(x=>String(x?.id)==="53173649");
  if(!p)return reply({ready:false,reason:"product_not_found_in_list",detailStatus:r.status},503);
 }
 if(String(p?.id)!=="53173649"||p?.priceData?.currency!=="TRY"||!amount(p?.priceData?.price)||
 p?.priceData?.discount===true)return reply({ready:false,reason:"price_mismatch"},503);
 return reply({ready:true,price:149,currency:"TRY",durationDays:30,productPriceVerifiedByAPI:true,
   orderVerification:"server_side",fulfillment:"buyer_self_activation",
   testedWithPaidOrder:false});
}
