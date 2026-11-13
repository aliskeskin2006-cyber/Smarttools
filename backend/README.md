# SmartTools Pro – güvenli altyapı taslağı

Mevcut GitHub Pages sitesi ücretsiz çalışmaya devam eder. Pro henüz satışta değildir.

## Kurulum sırası
1. Supabase projesi oluştur; `supabase-schema.sql` dosyasını SQL Editor'de çalıştır.
2. Supabase Auth için e-posta doğrulamasını ve site yönlendirme adreslerini yapılandır.
3. Ayrı sunucu/edge function'da giriş kontrolü ve **atomik** kota tüketimi uygula. Kullanıcı kimliği doğrulanmadan kota düşürme. Anonim ücretsiz araçları ödeme zorunluluğuna dönüştürme.
4. Seçilen ödeme sağlayıcısında satıcı hesabı açılıp doğrulandıktan sonra ödeme oturumu oluşturma ve **imza doğrulamalı webhook** fonksiyonları ekle. Yalnızca doğrulanmış webhook abonelik durumunu değiştirebilir. Tekrarlanan webhook olaylarını idempotent işle.
5. İade, iptal, yenileme, başarısız ödeme, oturum aç/kapat, farklı cihaz, eşzamanlı istek ve kota sıfırlama senaryolarını test et.
6. Pro'yu ancak bunlar geçince satışa aç. Ücretsiz plan için açık ve makul limitler belirle; ücretli özellikleri gerçekten sunmadan satış yapma.

## Güvenlik
GitHub Pages üzerinde gizli API anahtarı, ödeme sağlayıcısı secret'ı veya Supabase service_role anahtarı tutulmaz. Tarayıcıdaki localStorage/cookie sayaçları ödeme veya kota güvenliği için yeterli değildir. Ücretli erişim her istek için sunucuda doğrulanır.

## Mevcut durum
Bu klasör veritabanı şeması ve uygulama kontrol listesidir; canlı üyelik, ödeme veya kota sistemi değildir. Canlıya alma için servis hesabı ve güvenli backend kurulumu gereklidir.
