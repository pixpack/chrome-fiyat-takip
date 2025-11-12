# Debug Talimatları

## Background Script Console Kontrolü

Background script'in loglarını görmek için:

1. `chrome://extensions/` sayfasına git
2. "Fiyat Takip" eklentisini bul
3. **"service worker"** veya **"background page"** linkine tıkla
4. Yeni bir DevTools penceresi açılacak
5. Bu pencerede Console sekmesini kontrol et

## Beklenen Log Sırası

### Content Script (Sayfa Console - F12):
```
Element seçildi: {url: "...", selector: "...", price: "..."}
Message gönderildi, yanıt: {success: true}
```

### Background Script (Extension Console):
```
Background message alındı: elementSelected
handleElementSelected çağrıldı: {...}
Tracker oluşturuldu: {...}
Storage'a kaydediliyor, toplam: 1
Storage'a kaydedildi!
```

## Yaygın Sorunlar

### 1. "Message gönderildi, yanıt: undefined"
**Çözüm:** Background script mesajı almıyor. Eklentiyi yenile.

### 2. Background console'da hiç log yok
**Çözüm:** Service worker pasif olabilir. Picker'ı başlatınca aktif olmalı.

### 3. CORS Hatası
**Çözüm:** `file://` URL'leri için eklenti ayarlarından "Allow access to file URLs" aktif et.

## Test Adımları

1. Eklentiyi yenile (chrome://extensions/)
2. Background console'u aç
3. Test sayfasını yenile
4. Picker'ı başlat
5. Element seç
6. Her iki console'u da kontrol et
