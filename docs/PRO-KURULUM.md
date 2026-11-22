# SmartTools Pro — canlı kurulum kontrol listesi (22 Kasım 2026)

**Shopier ürün bağlantısı:** https://www.shopier.com/smarttoolspro/53173649  
**İlan edilen erişim:** 149 TL / 30 gün, tek seferlik ödeme; otomatik yenileme yok.

## Mevcut kod
- GitHub Pages sayfaları Cloudflare ana alan adına yönlendirilir.
- Cloudflare Pages Functions: `/api/pro/sales-ready`, `/api/pro/claim`, `/api/pro/status`, `/api/pro/recover` ve sunucu tarafında korunan Pro raporları.
- Müşteri tarafından aktivasyon akışı sipariş numarasını, Shopier ödeme e-postasını ve telefondaki son 6 haneyi Shopier API'sinden doğrular; uygun sipariş 30 günlük erişim açabilir. Bu **kodun mevcut olması**, canlı Shopier siparişiyle başarıyla test edildiği anlamına gelmez.
- Ürün fiyatı API'den **149 TRY olarak doğrulanamıyorsa** `sales-ready` satın alma düğmesini kapalı tutar. Sadece Shopier sipariş API'sinin erişilebilir olması fiyat doğrulaması yerine geçmez.
- QR, PDF ve fotoğraf gibi tarayıcıda çalışan ücretsiz araçlar otomatik olarak Pro erişim denetimi altında değildir; ücretli gibi tanıtılmamalıdır.

## Canlıda doğrulanması gerekenler
1. Cloudflare Pages projesinde `PRO_DB` adlı D1 binding'i ve `schema/pro_memberships.sql` şemasının kurulu olması.
2. Cloudflare Secrets bölümünde `SHOPIER_API_TOKEN` ve en az 32 karakterlik `ADMIN_VERIFY_SECRET` bulunması. Gizli anahtarlar **GitHub'a eklenmez**.
3. `GET /api/shopier/connection` ve `GET /api/pro/sales-ready` yanıtlarının canlı Cloudflare adresinden gözlemlenmesi. `ready:true`, altyapı ön kontrolüdür; gerçek sipariş testinin kanıtı değildir.
4. Shopier ürün sayfasında fiyatın **149 TL** olduğunun ve ürünün satılabilir durumda bulunduğunun kontrol edilmesi.
5. Gerçek Shopier API yanıt alanlarının `claim.js` ile uyumu, kontrollü test siparişi, birden fazla aktivasyonun engellenmesi, geri dönüş koduyla giriş, iade/iptal süreci.
6. Cloudflare rate limiting, bot koruması, hata ve destek yollarının ayrıca incelenmesi.
7. Cloudflare dağıtımının GitHub'daki güncel sürümü içerdiğinin kontrol edilmesi; GitHub'a commit atılmış olması tek başına Cloudflare yayınını kanıtlamaz.

## Opsiyonel otomatik e-posta ve webhook teslimatı
`docs/PRO-OTOMATIK-TESLIMAT.md` e-posta/webhook üzerinden alternatif teslimat akışını açıklar. Bu parçaların kurulu olmaması Shopier API'li müşteri aktivasyon kodunun varlığını ortadan kaldırmaz; ancak canlı satışa hazır olduğunu da kanıtlamaz.

**Durum:** Kod ve güvenli ödeme kapısı var. Shopier fiyatı, Cloudflare ayarları ve ilk gerçek siparişin uçtan uca başarılı olduğu bağımsız doğrulanmadan satışın tamamen hazır olduğu söylenemez.
