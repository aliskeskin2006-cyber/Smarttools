# SmartTools Pro — son entegrasyon durumu (20 Kasım 2026)

## Eklenen
- Sipariş doğrulama API'si: `/api/shopier/verify-order`
- Shopier webhook alıcısı: `/api/shopier/webhook`
- D1 tabanlı, tek kullanımlık Pro kodu / 30 günlük erişim: `/api/pro/redeem`, `/api/pro/status`
- Sunucu tarafında gerçek üyelik denetimiyle çalışan Pro sosyal raporu: `/api/pro/report`
- Yönetici sipariş inceleme ve manuel kod verme ekranı
- `order.created` bildiriminde Shopier API ile yeniden sipariş ve **999 TL**, ürün, miktar, para birimi, ödeme ve iade doğrulaması
- Doğrulama geçerse yalnızca müşterinin sipariş e-posta adresine aktivasyon e-postası gönderme hazırlığı. Kod veritabanında açık tutulmaz.

## Otomatik teslimatın devreye alınması için eksikler
1. Ücretli olmayan / uygun planlı bir e-posta sağlayıcısında doğrulanmış gönderici domaini ve e-posta gönderme API anahtarı gerekir. Bu kod **Resend** `POST https://api.resend.com/emails` kullanır; kullanıcı kendisi Resend hesabını ve domain doğrulamasını tamamlamalıdır.
2. Cloudflare Pages Secret olarak `RESEND_API_KEY`, `RESEND_FROM` ve rastgele en az 32 karakterlik `DELIVERY_SECRET` kaydedilmeli. `RESEND_FROM` doğrulanmış göndericinin adresidir. **Asla bir gizli anahtarı GitHub'a eklemeyin.**
3. Shopier `POST /webhooks` API'sinden `order.created` aboneliği oluşturulmalı. Bildirim URL'si `https://smarttools-cgv.pages.dev/api/shopier/webhook`. Shopier'in döndürdüğü tek seferlik `token` Cloudflare Secret `SHOPIER_WEBHOOK_TOKEN` olarak saklanmalı. Webhook aboneliği şimdilik **oluşturulmadı**. Shopier PAT hesap sahibi tarafından önceki adımda Cloudflare'a kaydedildi.
4. Webhook imzası `Shopier-Signature` üzerinden HMAC SHA-256 ile kontrol edilir. Olay gövdesi ancak doğrulamadan sonra işlenir. Kod hiçbir zaman istemciye bildirimden dönmez.
5. **Gerçek sipariş yanıtında** `lineItems[0].productId`, `quantity`, `totals.total`, `shippingInfo.email`, `returns`, `refunds` alanları uygulamadaki varsayımla karşılaştırılmalı. Herhangi biri yoksa fail-closed davranır ve kod göndermez.
6. Sipariş kaydı ve e-posta gönderme arasında hata yaşanırsa Shopier webhook'u tekrar gönderdiğinde aynı deterministik kod oluşturularak tekrar denenebilir. Etkinleştirilmiş bir kod e-posta ile tekrar gönderilmez.
7. Satış öncesi gerçek örnek sipariş, iade, yeniden deneme ve bir başka alıcıya kod teslim edilmeme testleri yapılmalı. Test siparişinde ücret tahsil edilebileceğinden önceden belirlenmiş test yöntemi kullanılmalı.
8. Cloudflare rate-limit, bot koruması, sipariş eşleştirme ve müşteri hizmetleri/iade prosedürü de doğrulanmalı.

## Ücretli araç koruması
- `/api/pro/report` **sunucu tarafında** Pro oturumunu ve bitiş zamanını D1'den kontrol eder.
- Eski X/Instagram analiz panelleri kasıtlı şekilde **ücretsiz ön izleme** olarak kalır.
- Tamamı tarayıcıda çalışan statik QR/PDF/fotoğraf araçları sunucu koruması olmadan ücretli ilan edilmemeli. Bu araçların gerçekten ücretli versiyonları ayrı sunucu işlevlerine taşınmalı.
- Otomatik olarak yenilenen abonelik yoktur; fiyat 999 TL / 30 gün tek ödemedir.

**Durum:** GitHub kodu eklendi, fakat e-posta servisi ve webhook aboneliği bağlanmadan otomatik teslimat ÇALIŞMAZ. Henüz gerçek siparişle uçtan uca doğrulanmamıştır. Satışı açmayın.
