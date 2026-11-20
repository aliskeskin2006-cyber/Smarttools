/* SmartTools browser-only usage indicator. Does NOT block free tools. */
(()=>{"use strict";
 const tools={
  qrmake:"QR kod oluşturma",edit:"Fotoğraf düzenleme",removebg:"Arka plan silme",
  mergepdf:"PDF birleştirme",splitpdf:"PDF ayırma",rotatepdf:"PDF döndürme",deletepdf:"PDF sayfa silme",
  imgpdf:"Fotoğraftan PDF",socialmake:"Sosyal medya görseli",
  renderclip:"Video dışa aktarma",capture:"Video kapağı",makeprofile:"Profil kartı"
 };
 const key="smarttools_free_usage_v2";
 function read(){try{return JSON.parse(localStorage.getItem(key)||"{}")||{}}catch{return {}}}
 function save(value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
 function init(){
  const ids=Object.keys(tools).filter(id=>document.getElementById(id));
  if(!ids.length)return;
  const box=document.createElement("aside");box.setAttribute("aria-live","polite");
  box.setAttribute("aria-label","Kullanım bilgisi");
  box.style.cssText="position:fixed;bottom:8px;left:8px;right:8px;max-width:450px;margin:auto;z-index:90;background:#183148;color:#e9faff;border:1px solid #67e8f9;border-radius:12px;padding:12px;font:13px/1.5 system-ui;box-shadow:0 6px 22px #0007;display:none";
  const label=document.createElement("span"),close=document.createElement("button");
  close.textContent="Kapat";close.setAttribute("aria-label","Kullanım bilgisini kapat");
  close.type="button";close.style.cssText="float:right;background:transparent;color:#e9faff;border:0;text-decoration:underline;cursor:pointer";
  close.addEventListener("click",()=>box.style.display="none");
  box.append(close,label);document.body.append(box);
  for(const id of ids)document.getElementById(id).addEventListener("click",()=>{
   const data=read(),count=Math.max(0,Number(data[id])||0)+1;data[id]=count;save(data);
   label.textContent=tools[id]+": "+count+" işlem. Ücretsiz araç kullanılabilir; Pro raporları ayrı üyelikle korunur.";
   box.style.display="block";
  },{capture:false});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();