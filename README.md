# 🏷️ Fiyat Takip Chrome Eklentisi

Web sitelerinden fiyat takibi yapmanızı sağlayan basit ve hızlı Chrome eklentisi.

## Özellikler

- ✅ Herhangi bir web sitesinden CSS seçici ile fiyat çekme
- ✅ Fiyat geçmişi tutma ve görselleştirme
- ✅ Otomatik fiyat kontrolü (Chrome açıkken her 1 dakikada)
- ✅ Fiyat değişikliğinde Chrome bildirimi
- ✅ Çoklu ürün takibi
- ✅ Sepet/indirim fiyatı tespiti (Trendyol, Hepsiburada, Amazon)
- ✅ Tamamen ücretsiz ve backend gerektirmez

## Kurulum

1. Chrome tarayıcınızda `chrome://extensions/` adresine gidin
2. Sağ üstten "Geliştirici modu"nu aktif edin
3. "Paketlenmemiş öğe yükle" butonuna tıklayın
4. Bu klasörü seçin

## Kullanım

### 1. Otomatik Fiyat Takibi (Önerilen Yöntem)

1. Takip etmek istediğiniz ürün sayfasını açın
2. Eklenti ikonuna tıklayın
3. **"🎯 Sayfadan Element Seç"** butonuna tıklayın
4. Fare ile fiyat elementinin üzerine gelin (yeşil çerçeve görünür)
5. Fiyata tıklayın
6. Sistem otomatik olarak:
   - URL'yi
   - CSS seçiciyi
   - Ürün adını
   - Ürün resmini
   - Site favicon'unu algılar ve kaydeder

**İpucu:** ESC tuşu ile seçimi iptal edebilirsiniz.

### 2. Manuel Fiyat Takibi Ekleme

Eklentide "Manuel Ekle" bölümünü açın:
1. **URL**: Takip etmek istediğiniz ürünün sayfası
2. **CSS Seçici**: Fiyatın bulunduğu HTML elementinin CSS seçicisi
3. **Ürün Adı**: Ürüne vereceğiniz isim

#### CSS Seçici Nasıl Bulunur?

**Yöntem 1: Chrome DevTools**
1. Takip edeceğiniz sayfaya gidin
2. Fiyat üzerine sağ tıklayın → "İncele" (Inspect)
3. Element üzerinde sağ tık → Copy → Copy selector

**Yöntem 2: Yaygın Örnekler**
- `.price` - "price" sınıfına sahip element
- `#product-price` - "product-price" ID'sine sahip element
- `span.price-tag` - "price-tag" sınıfına sahip span
- `[data-price]` - data-price özelliği olan element

#### Seçiciyi Test Etme

1. Takip edeceğiniz sayfayı açın
2. Eklentide CSS seçiciyi girin
3. "Seçiciyi Test Et" butonuna tıklayın
4. Bulunan fiyatı görün

### 3. Otomatik Takip

- Chrome açıkken eklenti her 1 dakikada fiyatları otomatik kontrol eder
- Fiyat değiştiğinde Chrome bildirimi gönderir
- Tüm fiyat geçmişi saklanır
- Ürün resimleri ve favicon'lar görsel takip için kullanılır
- Sepet/indirim fiyatları otomatik tespit edilir (desteklenen sitelerde)

## İkon Oluşturma

Eklenti çalışması için ikonlar gerekli. `icon.svg` dosyasını kullanarak şu sitelerden PNG'ye çevirebilirsiniz:
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/

16x16, 48x48 ve 128x128 boyutlarında `icon16.png`, `icon48.png`, `icon128.png` olarak kaydedin.

Veya bu komutu kullanın (ImageMagick gerekli):
```bash
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

## Dosya Yapısı

```
chrome-eklenti/
├── manifest.json       # Eklenti yapılandırması
├── popup.html          # Ana arayüz
├── popup.js            # Ana arayüz mantığı
├── settings.html       # Ayarlar sayfası
├── settings.js         # Ayarlar mantığı
├── content.js          # Sayfa içi script (element seçici)
├── background.js       # Arka plan işlemleri (fiyat kontrolü)
├── offscreen.html      # Offscreen document
├── offscreen.js        # Görünmez DOM parsing
├── icon16.png          # 16x16 ikon
├── icon48.png          # 48x48 ikon
└── icon128.png         # 128x128 ikon
```

## Sorun Giderme

**"Element bulunamadı" hatası:**
- CSS seçiciyi kontrol edin
- Sayfanın tam yüklendiğinden emin olun
- DevTools ile doğru seçiciyi bulun

**Fiyat yanlış çekiliyor:**
- Seçicinin doğru elementi hedeflediğinden emin olun
- Sayfada birden fazla aynı seçici varsa daha spesifik olun

**Bildirimler gelmiyor:**
- Chrome bildirim izinlerini kontrol edin
- Chrome açık olduğundan emin olun (her 1 dakikada kontrol eder)
- Settings sayfasında ürünün bildirim ayarını kontrol edin

## Geliştirme

Kodu değiştirdikten sonra:
1. `chrome://extensions/` sayfasına gidin
2. Eklentinin yanındaki yenile ikonuna tıklayın

## Desteklenen Siteler

Extension herhangi bir web sitesinde çalışır, ancak aşağıdaki sitelerde özel özellikler vardır:

- **Trendyol** - İndirimli fiyat tespiti
- **Hepsiburada** - Sepet fiyatı tespiti  
- **Amazon** - Sepet/indirim fiyatı tespiti
- **Origin PC** - Çoklu fiyat seçeneklerinde doğru fiyat seçimi

## Lisans

MIT
