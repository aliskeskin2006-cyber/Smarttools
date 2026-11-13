/* SmartTools browser-only trial gate. NOT secure billing or account entitlement. */
(()=>{'use strict';
const tools={qrmake:['QR kod oluşturma',1],edit:['Fotoğraf düzenleme',2],removebg:['Arka plan silme',2],mergepdf:['PDF birleştirme',2],splitpdf:['PDF ayırma',2],rotatepdf:['PDF döndürme',2],deletepdf:['PDF sayfa silme',2],imgpdf:['Fotoğraftan PDF',2],socialmake:['Sosyal medya görseli',2],renderclip:['Video dışa aktarma',1],capture:['Video kapağı',2],makeprofile:['Profil kartı',2]};
const key='smarttools_trial_gate_v1';
function read(){try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'?v:{}}catch{return {}}}
function save(v){try{localStorage.setItem(key,JSON.stringify(v));return true}catch{return false}}
function init(){const ids=Object.keys(tools).filter(id=>document.getElementById(id));if(!ids.length)return;
const box=document.createElement('aside');box.setAttribute('role','alertdialog');box.setAttribute('aria-label','Ücretsiz kullanım sınırı');box.style.cssText='position:fixed;bottom:12px;left:12px;right:12px;max-width:520px;margin:auto;z-index:999;background:#13263e;color:#f1f7ff;border:1px solid #67e8f9;border-radius:14px;padding:16px;box-shadow:0 10px 35px #0009;display:none;font:14px/1.5 system-ui';
box.innerHTML='<button type="button" aria-label="Bildirimi kapat" style="float:right;margin:0 0 5px 12px;padding:4px 10px">×</button><strong>SmartTools ücretsiz kullanım hakkı</strong><p style="margin:8px 0;color:#d4e6f8"></p><a href="./fiyatlandirma.html" style="color:#67e8f9;font-weight:700">Pro planını incele →</a><small style="display:block;color:#aabbd1;margin-top:9px">Pro ödemeleri henüz açık değil. Bu sınır yalnızca bu tarayıcıda uygulanır; hesap tabanlı güvenli kota sistemi henüz kurulmadı.</small>';
document.body.appendChild(box);box.querySelector('button').addEventListener('click',()=>box.style.display='none');
function notice(message){box.querySelector('p').textContent=message;box.style.display='block'}
ids.forEach(id=>{const el=document.getElementById(id);const [name,limit]=tools[id];el.addEventListener('click',event=>{const data=read(),n=Math.max(0,Number(data[id])||0);
if(n>=limit){event.preventDefault();event.stopImmediatePropagation();notice(name+' için '+limit+' ücretsiz kullanım hakkın doldu. Yeni işlem için Pro gerekecek; ancak ödeme sistemi henüz aktif değil.');return}
data[id]=n+1;if(!save(data)){event.preventDefault();event.stopImmediatePropagation();notice('Kullanım hakkı kaydedilemedi. Tarayıcı depolama iznini kontrol et.');return}
if(n+1===limit)notice(name+' için son ücretsiz hakkını kullanıyorsun ('+(n+1)+'/'+limit+'). Bir sonraki işlem sınırlandırılacak.');
},{capture:true})});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();