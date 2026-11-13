const {test,expect}=require('@playwright/test');const {PDFDocument}=require('pdf-lib');const path=require('path');const root=path.resolve(__dirname,'..');const url=p=>'file://'+path.join(root,p);test('ana sayfa ve hesaplama',async({page})=>{await page.goto(url('index.html'));await expect(page.locator('h1')).toBeVisible();await page.locator('#sayi').fill('200');await page.locator('#yuzde').fill('10');await page.locator('#hesapla').click();await expect(page.locator('#sonuc')).toContainText('20')});test('genclik turnuva ve profil',async({page})=>{await page.goto(url('genclik.html'));await page.locator('#players').fill('Ali\\nAyşe\\nMert\\nDeniz'.replaceAll('\\n','\n'));await page.locator('#fixtures').click();await expect(page.locator('.match')).toHaveCount(6);await page.locator('#scores').click();await expect(page.locator('#standings')).toContainText('Ali');await page.locator('#nickname').fill('TestOyuncu');await page.locator('#makeprofile').click();await expect(page.locator('#profiledownload')).toBeVisible()});test('genclik video dosyasi olmadan guvenli hata',async({page})=>{await page.goto(url('genclik.html'));await page.locator('#capture').click();await expect(page.locator('#videostatus')).toContainText('Önce bir video yükle')});test('qr ve sosyal medya gorseli',async({page})=>{await page.goto(url('araclar.html'));await page.locator('#qrtext').fill('https://example.com');await page.locator('#qrmake').click();await expect(page.locator('#qrdownload')).toBeVisible();await page.locator('#socialtitle').fill('Futbol turnuvası');await page.locator('#socialmake').click();await expect(page.locator('#socialdownload')).toBeVisible()});test('fotograf duzenleme ve arka plan silme',async({page})=>{await page.goto(url('araclar.html'));const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/vQAAAABJRU5ErkJggg==','base64');await page.locator('#photo').setInputFiles({name:'test.png',mimeType:'image/png',buffer:image});await page.locator('#edit').click();await expect(page.locator('#photodownload')).toBeVisible();await page.locator('#bgphoto').setInputFiles({name:'test.png',mimeType:'image/png',buffer:image});await page.locator('#removebg').click();await expect(page.locator('#bgdownload')).toBeVisible()});test('pdf bilgi, dondur, sil ve ayir',async({page})=>{await page.goto(url('araclar.html'));const doc=await PDFDocument.create();doc.addPage([300,400]);doc.addPage([300,400]);doc.addPage([300,400]);const buffer=Buffer.from(await doc.save());await page.locator('#pdffiles').setInputFiles({name:'test.pdf',mimeType:'application/pdf',buffer});await page.locator('#pdfinfo').click();await expect(page.locator('#pdfstatus')).toContainText('3 sayfa');await page.locator('#pages').fill('2');for(const id of ['rotatepdf','deletepdf','splitpdf']){await page.locator('#'+id).click();await expect(page.locator('#pdfstatus')).not.toContainText('İşlem başarısız')}await page.locator('#pdffiles').setInputFiles([{name:'a.pdf',mimeType:'application/pdf',buffer},{name:'b.pdf',mimeType:'application/pdf',buffer}]);await page.locator('#mergepdf').click();await expect(page.locator('#pdfstatus')).toContainText('PDF indirildi')});
test('video editor controls and input validation',async({page})=>{await page.goto(url('genclik.html'));await expect(page.locator('#trimstart')).toBeVisible();await expect(page.locator('#trimend')).toBeVisible();await page.locator('#editformat').selectOption('1:1');await page.locator('#editcaption').fill('Test başlık');await page.locator('#renderclip').click();await expect(page.locator('#clipstatus')).toContainText('Önce desteklenen bir video yükle.');await expect(page.locator('#renderclip')).toBeEnabled()});


test('bilgilendirme sayfalari ve ana sayfa baglantilari',async({page})=>{
 await page.goto(url('index.html'));
 await expect(page.locator('a[href="./gizlilik.html"]')).toHaveCount(1);
 await expect(page.locator('a[href="./hakkimizda.html"]')).toHaveCount(1);
 for(const file of ['gizlilik.html','hakkimizda.html']){
  await page.goto(url(file));
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('a[href="./index.html"]')).toBeVisible();
 }
});
test('Pro onizleme sayaci sayfa yenilenince sifirlanmaz ama arac kilitlenmez',async({page})=>{
 await page.goto(url('araclar.html'));
 await page.locator('#qrmake').click();
 await expect(page.locator('aside[aria-live="polite"]')).toContainText('1 işlem');
 await page.reload();
 await page.locator('#qrmake').click();
 await expect(page.locator('aside[aria-live="polite"]')).toContainText('2 işlem');
 await expect(page.locator('#qrmake')).toBeEnabled();
 await page.evaluate(()=>localStorage.clear());
 await page.reload();
 await page.locator('#qrmake').click();
 await expect(page.locator('aside[aria-live="polite"]')).toContainText('1 işlem');
});

test('toplu QR kod olusturma ve PNG indirme',async({page})=>{await page.goto(url('toplu-qr.html'));await page.locator('#values').fill('https://example.com\\nMerhaba'.replace('\\n','\n'));await page.locator('#make').click();await expect(page.locator('#results .item')).toHaveCount(2);await expect(page.locator('#results a[download]')).toHaveCount(2);await expect(page.locator('#status')).toContainText('2 QR kod');});
