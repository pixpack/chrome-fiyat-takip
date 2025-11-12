# 🧪 Test Talimatları

## Adım 1: Eklentiyi Yükle/Yenile

1. Chrome'da bu adresi aç: `chrome://extensions/`
2. Sağ üstten **"Geliştirici modu"** aktif olmalı
3. **"Fiyat Takip"** eklentisini bul
4. Yenile ikonuna (↻) tıkla

## Adım 2: Background Console'u Aç

1. `chrome://extensions/` sayfasında
2. "Fiyat Takip" eklentisini bul
3. **"service worker"** linkine tıkla (sağ tarafta)
4. Yeni bir DevTools penceresi açılır
5. **BU PENCEREYI AÇIK BIRAK!**

**Görmeli:**
```
🚀 Background script başlatıldı!
```

## Adım 3: Test Sayfasını Aç

1. `test.html` dosyasını Chrome'da aç
2. F12 bas (DevTools aç)
3. Console sekmesine geç

**Görmeli:**
```
💉 Content script yüklendi: file:///.../test.html
Test sayfası yüklendi
```

## Adım 4: Eklenti Popup'ını Test Et

1. Eklenti ikonuna tıkla
2. Popup açılır
3. Popup üzerinde sağ tık → "İncele" (Inspect)
4. Popup DevTools açılır

**Popup Console'da görmeli:**
```
Background script aktif: {status: 'alive', timestamp: '...'}
```

## Adım 5: Element Picker'ı Kullan

### A) Picker'ı Başlat:
1. Eklenti popup'ında "🎯 Sayfadan Element Seç" butonuna tıkla
2. Popup kapanır
3. Test sayfasında yeşil overlay görünür

### B) Element Seç:
1. Fiyat üzerine fare götür (yeşil çerçeve görünür)
2. Fiyata tıkla
3. Yeşil bildirim çıkar: "✅ Takip Eklendi!"

### C) Console Kontrolü:

**Test Sayfası Console'unda:**
```
Element seçildi: {url: '...', selector: '#product-price', price: '11.999', ...}
Message gönderildi, yanıt: {success: true, message: 'Ürün eklendi!'}
```

**Background Console'unda:**
```
📨 Background message alındı: elementSelected {...}
✅ elementSelected action tespit edildi
handleElementSelected çağrıldı: {...}
Tracker oluşturuldu: {...}
Storage'a kaydediliyor, toplam: 1
Storage'a kaydedildi!
```

## Adım 6: Ürünü Kontrol Et

1. Eklenti ikonuna tekrar tıkla
2. "Takip Edilen Ürünler" bölümünde ürün görünmeli
3. Ürün kartında olmalı:
   - Ürün resmi (telefon emoji 📱)
   - Site ikonu
   - Ürün adı: "Süper Akıllı Telefon X Pro"
   - Fiyat: "11.999 TL"

---

## ❌ Sorun Giderme

### Background Console'da log yok:
- Eklentiyi tekrar yenile
- Service worker linkine tekrar tıkla
- Popup'ı aç (background'ı uyandırır)

### "Message gönderildi, yanıt: undefined":
- Background console'u kontrol et
- Hata mesajı var mı?

### Ürün popup'da görünmüyor:
Popup console'unda şunu çalıştır:
```javascript
chrome.storage.local.get(['trackers'], (result) => {
  console.log('Storage:', result.trackers);
});
```

---

## 📸 Bana Göster:

1. **Background Console ekran görüntüsü** (loglar görünmeli)
2. **Test sayfası console ekran görüntüsü** (element seçildi mesajı)
3. **Popup açıkken "Takip Edilen Ürünler"** bölümü

Ya da sadece **console'larda gördüğün tüm mesajları** buraya yapıştır!
