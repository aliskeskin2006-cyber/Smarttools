/* SmartTools Pro preview: local, informational only. No paywall or entitlement. */
(()=>{'use strict';
const tools={qrmake:['QR kod',1],edit:['Fotoğraf düzenleme',2],removebg:['Arka plan silme',2],mergepdf:['PDF birleştirme',2],splitpdf:['PDF ayırma',2],rotatepdf:['PDF döndürme',2],deletepdf:['PDF sayfa silme',2],imgpdf:['Fotoğraftan PDF',2],socialmake:['Sosyal medya görseli',2],renderclip:['Video dışa aktarma',1],capture:['Video kapağı',2],makeprofile:['Profil kartı',2]};
const key='smarttools_pro_preview_v1';
function read(){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}}
function save(v){try{localStorage.setItem(key,JSON.stringify(v))}catch{}}
function init(){const ids=Object.keys(tools).filter(id=>document.getElementById(id));if(!ids.length)return;
const box=document.createElement('aside');box.setAttribute('aria-live','polite');box.style.cssText='position:fixed;bottom:12px;left:12px;right:12px;max-width:520px;margin:auto;z-index:999;background:#13263e;color:#f1f7ff;border:1px solid #67e8f9;border-radius:14px;padding:16px;box-shadow:0 10px 35px #0009;display:none;font:14px/1.5 system-ui';
box.innerHTML='<button type="button" aria-label="Bildirimi kapat" style="float:right;margin:0 0 5px 12px;padding:4px 10px">×</button><strong>SmartTools Pro ön izlemesi</strong><p style="margin:8px 0;color:#d4e6f8"></p><a href="./fiyatlandirma.html" style="color:#67e8f9;font-weight:700">Paketleri incele →</a>';
document.body.appendChild(box);box.querySelector('button').addEventListener('click',()=>box.style.display='none');
ids.forEach(id=>{const el=document.getElementById(id);el.addEventListener('click',()=>{const [name,limit]=tools[id];const data=read();const n=(Number(data[id])||0)+1;data[id]=n;save(data);const p=box.querySelector('p');p.textContent=n>=limit?name+' için planlanan ücretsiz deneme sınırına ulaştın ('+limit+' işlem). Şimdilik tüm araçları ücretsiz kullanmaya devam edebilirsin; Pro satışı açık değil.':name+': '+n+'/'+limit+' deneme işlemi kaydedildi. Bu sayaç yalnızca ön izleme amaçlıdır.';box.style.display='block';},{capture:true})});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();