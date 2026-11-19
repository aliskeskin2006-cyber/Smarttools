# SmartTools Pro — ödeme sonrası erişim için sunucu taslağı

Bu klasör **henüz yayına alınmamış** bir Cloudflare Worker + D1 projesidir.
GitHub Pages tek başına sunucu tarafı ödeme doğrulaması veya güvenli üyelik sunamaz.

## Güvenli aşamalar
1. Shopier mağaza başvurusu onaylanır ve satıcı koşulları doğrulanır.
2. D1 veritabanı oluşturulur, `schema.sql` çalıştırılır; `wrangler.toml` içindeki gerçek D1 ID tanımlanır.
3. Cloudflare Worker dağıtılır; `ADMIN_KEY` yalnızca Cloudflare secret olarak atanır. GitHub'a / tarayıcıya yazılmaz.
4. Gerçek Shopier siparişi **satıcı panelinden ayrı olarak doğrulandıktan sonra**, yönetici `POST /api/admin/issue` ile tek kullanımlık kod üretir. Sipariş referansı yinelenemez.
5. Müşteri kodu `POST /api/redeem` ile etkinleştirir; token `GET /api/session` ile kontrol edilir. `POST /api/pro/report` erişimi sunucuda kontrol edilen örnek ücretli uç noktadır.
6. İade, destek, gizlilik/aydınlatma metinleri, kod teslimi, hesap kurtarma, kötüye kullanım sınırları, abonelik yenilemesi ve iptali **gerçek lansmandan önce** tamamlanmalıdır.

**ÖNEMLİ:** Bu sistem henüz Shopier siparişlerini otomatik doğrulamaz; ayrıca otomatik yenilenen abonelik altyapısı değildir. Kullanıcıya bunun otomatik abonelik olduğu söylenmemelidir.

## Güvenlik notları
- API anahtarı, admin sırrı veya kişisel veri asla statik GitHub Pages kaynağına eklenmez.
- Ücretli işlevler yalnızca Worker sunucusunda kontrol edilmelidir; istemci tarafında düğme gizlemek gerçek erişim kontrolü değildir.
- Canlı kullanım için oran sınırı, kaynak izleme, kimlik doğrulama, hesap kurtarma, iade ve kötüye kullanım testleri eklenmelidir.
- Ücretli erişim kodları kendiliğinden ödeme kanıtı değildir: sipariş doğrulaması sunucu tarafında / satıcı panelinde yapılmalıdır.
