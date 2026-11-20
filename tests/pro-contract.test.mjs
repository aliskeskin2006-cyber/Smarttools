import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as claim } from "../functions/api/pro/claim.js";
import { onRequestPost as recover } from "../functions/api/pro/recover.js";
import { onRequestPost as report } from "../functions/api/pro/report.js";
import { onRequestGet as ready } from "../functions/api/pro/sales-ready.js";

const oid="TEST-ORDER-001",email="paid@example.com",phone="05321234567";
const validOrder=()=>({
 id:oid,paymentStatus:"paid",currency:"TRY",
 dateCreated:new Date().toISOString(),
 totals:{total:"149.00"},
 lineItems:[{productId:"53173649",quantity:1}],
 refunds:[],returns:[],shippingInfo:{email,phone}
});
function database(){
 const orders=new Map();
 return {
  orders,
  prepare(sql){
   const q={args:[],bind(...args){this.args=args;return this},
     async all(){return {results:[]}},
     async run(){
      if(sql.includes("INSERT INTO pro_access")){
       const [code_hash,order_id,expires_at,redeemed_at,session_hash]=q.args;
       if(orders.has(order_id))return {meta:{changes:0}};
       orders.set(order_id,{code_hash,order_id,expires_at,redeemed_at,session_hash});return {meta:{changes:1}};
      }
      return {meta:{changes:0}};
     },
     async first(){
      if(sql.includes("INSERT INTO pro_claim_limits"))return {attempts:1};
      if(sql.includes("UPDATE pro_access SET session_hash")){
       const [session_hash,code_hash]=q.args;
       const row=[...orders.values()].find(x=>x.code_hash===code_hash);
       if(!row)return null;
       row.session_hash=session_hash;return {expires_at:row.expires_at};
      }
      if(sql.includes("SELECT order_id,expires_at FROM pro_access")){
       const [session_hash]=q.args;return [...orders.values()].find(x=>x.session_hash===session_hash)??null;
      }
      return null;
     }
   };return q;
  }
 };
}
const env=()=>({PRO_DB:database(),SHOPIER_API_TOKEN:"test_shopier_token",ADMIN_VERIFY_SECRET:"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"});
const req=(endpoint,body,options={})=>new Request("https://smarttools-cgv.pages.dev"+endpoint,{
 method:"POST",headers:{"content-type":"application/json","cf-connecting-ip":"192.0.2.1",...options.headers},body:JSON.stringify(body)
});
function mockFetch(order=validOrder()){
 const previous=globalThis.fetch;
 globalThis.fetch=async url=>{
  const path=String(url);
  if(path.includes("/products/53173649"))return Response.json({id:"53173649",priceData:{currency:"TRY",price:"149.00",discount:false}});
  if(path.includes("/orders/"))return Response.json(order);
  throw new Error("Unexpected URL: "+path);
 };
 return ()=>{globalThis.fetch=previous};
}
test("Pro report denies anonymous users",async()=>{
 const r=await report({request:req("/api/pro/report",{platform:"x",posts:[]}),env:env()});
 assert.equal(r.status,403);
});
test("Unpaid Shopier orders never activate membership",async()=>{
 const e=env();const restore=mockFetch({...validOrder(),paymentStatus:"unpaid"});
 try{const r=await claim({request:req("/api/pro/claim",{orderId:oid,email,phone6:"234567"}),env:e});
 assert.equal(r.status,422);assert.equal(e.PRO_DB.orders.size,0);}
 finally{restore();}
});
test("Price mismatch never activates membership",async()=>{
 const e=env();const restore=mockFetch({...validOrder(),totals:{total:"148.00"}});
 try{const r=await claim({request:req("/api/pro/claim",{orderId:oid,email,phone6:"234567"}),env:e});
 assert.equal(r.status,422);assert.equal(e.PRO_DB.orders.size,0);}
 finally{restore();}
});
test("Buyer proof must match Shopier order",async()=>{
 const e=env();const restore=mockFetch();
 try{const r=await claim({request:req("/api/pro/claim",{orderId:oid,email,phone6:"000000"}),env:e});
 assert.equal(r.status,422);assert.equal(e.PRO_DB.orders.size,0);}
 finally{restore();}
});
test("Paid order can be claimed once and later recovered",async()=>{
 const e=env();const restore=mockFetch();
 try{
  const first=await claim({request:req("/api/pro/claim",{orderId:oid,email,phone6:"234567"}),env:e});
  assert.equal(first.status,201);const result=await first.json();
  assert.equal(result.active,true);assert.match(result.recoveryCode,/^[A-F0-9]{64}$/);
  assert.match(first.headers.get("set-cookie"),/HttpOnly; Secure/);
  const row=e.PRO_DB.orders.get(oid);
  assert.ok(row);assert.ok(!JSON.stringify(row).includes(email));assert.ok(!JSON.stringify(row).includes(phone));
  const second=await claim({request:req("/api/pro/claim",{orderId:oid,email,phone6:"234567"}),env:e});
  assert.equal(second.status,409);
  const back=await recover({request:req("/api/pro/recover",{code:result.recoveryCode}),env:e});
  assert.equal(back.status,200);assert.equal((await back.json()).active,true);
 }finally{restore();}
});
test("Checkout readiness checks existing product and database",async()=>{
 const e=env();const restore=mockFetch();
 try{const r=await ready({env:e});assert.equal(r.status,200);assert.equal((await r.json()).ready,true);}
 finally{restore();}
});
