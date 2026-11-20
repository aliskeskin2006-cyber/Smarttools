# SmartTools Pro — güvenli üyelik altyapısı (hazır kod, henüz devrede değil)

Bu taslak Cloudflare Worker + D1 üzerinde 30 günlük erişim kodları oluşturur, sürelerini kontrol eder ve iptal eder.

**ÖNEMLİ:** Shopier satışı bu kod ile kendiliğinden üyelik başlatmaz. Satıcı, Shopier panelinde ödemenin gerçekten tamamlandığını kontrol edip yönetici endpoint'i üzerinden kod oluşturmalı, müşteriye iletmelidir. Şu an satın alma otomasyonu yoktur. `ADMIN_TOKEN` hiçbir zaman GitHub'a ya da ziyaretçinin tarayıcısına konulmamalıdır.

Kurulum:
1. Cloudflare hesabında bir D1 veritabanı oluşturup `schema.sql` sorgusunu çalıştırın.
2. `worker.js` dosyasını Cloudflare Worker olarak yayımlayın, `DB` D1 binding'i ekleyin.
3. Worker'a gizli environment secret olarak uzun, rastgele `ADMIN_TOKEN` tanımlayın.
4. Satın alma sonrası Shopier sipariş numarasını kontrol edip, yalnızca **satıcı tarafında** `POST /api/admin/issue` (Authorization: Bearer ADMIN_TOKEN, JSON: {"orderId":"SHOPIER_ORDER_ID"}) çağırın.
5. Dönen erişim kodunu müşteriye güvenli biçimde verin.
6. Müşteri `POST /api/pro/status` ile kendi kodunun son kullanma tarihini kontrol edebilir. İadede `POST /api/admin/revoke` ile üyeliği kapatın.

**Güvenlik sınırı:** Mevcut ücretsiz araçlar GitHub Pages üzerinde herkese açık kalır. Bu API sadece üyelik durumunu doğrular; Pro özelliklerini gerçekten kısıtlamak için ücretli özelliklerin işlemleri de sunucuya taşınmalı veya ayrı sunucu kontrollü servis olarak yapılmalıdır. Bu yapılmadan 'güvenli Pro kilidi' diye tanıtılmamalıdır.

Shopier API erişimi, ödeme bildirimi doğrulama, webhook/PAT entegrasyonu ve sunucu dağıtımı ayrıca gereklidir.