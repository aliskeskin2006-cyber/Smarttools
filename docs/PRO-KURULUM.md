# SmartTools Pro — kurulum ve güvenlik durumu

Bu kod **ödeme kabul etmez** ve Shopier ödemelerini henüz otomatik doğrulamaz.
Fiyat: Shopier ürününde 999 TL / 30 günlük tek seferlik erişim; otomatik yenileme yoktur.

## Hazır olan parçalar
- `schema/pro_memberships.sql`: D1 tablosu (kodun SHA-256 özeti ve tek seferlik oturum).
- `POST /api/pro/redeem`: yalnızca önceden *doğrulanarak* veritabanına kaydedilmiş kodu tek seferlik etkinleştirir.
- `GET /api/pro/status`: HttpOnly oturum çerezine göre güncel 30 günlük erişimi kontrol eder.
- Kod ve oturum anahtarı veritabanında açık hâliyle saklanmaz.

## Canlıya almadan önce
1. Cloudflare D1 veritabanı oluşturun; SQL dosyasını D1 Console'da çalıştırın.
2. Pages > Settings > Bindings üzerinden **PRO_DB** adlı D1 binding oluşturun; yeniden deploy edin.
3. Shopier PAT'yi **henüz** oluşturmayın. Onaylı API ile satın alma ve alıcı eşleştirmesi ayrı bir sunucu işlevinde geliştirilmeli; fiyat/ürün/sipariş durumu sunucu tarafından doğrulanmalı. Shopier'in gerçek yanıt şeması kontrol edilmeden siparişleri otomatik etkinleştirmeyin.
4. Ödeme güvenle doğrulandıktan sonra rastgele ve uzun aktivasyon kodu oluşturup **yalnızca hash'ini** `pro_access` tablosuna, eşsiz Shopier sipariş kimliği ve doğrulanan ödeme tarihinden itibaren 30 günlük `expires_at` ile girin. Kodun açık hâlini sadece doğru müşteriye iletin.
5. Pro araçlarını yalnızca ekranda gizlemek yetmez: ücretli işlemleri sunucu tarafında `/api/pro/status` mantığıyla korunan endpointlere taşıyın.
6. Kaba kuvvet denemelerine karşı Cloudflare rate limiting ve bot koruması ekleyin. İade ve iptal sonrası oturumu iptal etme işlemini tamamlayın.
7. Ödeme otomasyonu, D1 bağlantısı, güvenli aktivasyon, iptal ve kullanım limitleri test edilmeden satış açmayın.

**Dikkat:** `st_pro` çerezi sadece `/api/pro` altında gönderilir. Buradaki durumu denetlemek, bütün statik HTML araçlarını otomatik olarak korumaz.
