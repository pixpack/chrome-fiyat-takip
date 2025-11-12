# 🚀 Hızlı Başlangıç - Telegram Sistemi

## 5 Dakikada Test Et!

### **1️⃣ Backend'i Çalıştır (1 dakika)**

```bash
cd backend
npm install
npm start
```

Çıktı:
```
🚀 Backend server çalışıyor: http://localhost:3000
📱 Telegram Bot: @Fiyatci_bot
```

---

### **2️⃣ ngrok ile Tunnel Aç (1 dakika)**

**Yeni terminal:**

```bash
# ngrok yoksa kur
brew install ngrok

# Tunnel aç
ngrok http 3000
```

Çıktı:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
                 ^^^^^^^^^^^^^^^^^^^ (Bu URL'i kopyala!)
```

---

### **3️⃣ Webhook Kur (30 saniye)**

**URL'i değiştir ve çalıştır:**

```bash
curl -X POST "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://ABC123.ngrok.io/webhook/telegram"}'
             #      ^^^^^^^^^ BURAYA NGROK URL'İNİ YAZ!
```

**Başarılı cevap:**
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

---

### **4️⃣ Extension'ı Güncelle (1 dakika)**

**settings.js dosyasını aç ve satır 688'i değiştir:**

```javascript
// ESKİ:
const BACKEND_URL = 'http://localhost:3000';

// YENİ:
const BACKEND_URL = 'https://ABC123.ngrok.io';
                          ^^^^^^^^^ NGROK URL'İNİ YAZ!
```

**Extension'ı yenile:**
```
chrome://extensions/ → Yeniden Yükle 🔄
```

---

### **5️⃣ TEST ET! (2 dakika)**

1. **Ayarlar sayfasını aç** (chrome-eklenti/settings.html)

2. **Telegram bölümüne git**

3. **"📱 QR Kod Göster"** butonuna tıkla

4. **Telefonunla QR'ı okut** veya link'e tıkla

5. **Telegram botunda /start** butonuna bas

6. **Extension otomatik bağlanacak!** ✅

   Göreceksin:
   ```
   ✅ Telegram Bağlı!
   Chat ID: 123456789
   ```

7. **"🧪 Test Bildirimi Gönder"** butonuna bas

8. **Telegram'dan bildirim gelecek!** 🎉

---

## 🎯 Başarı Kontrolü:

### **Backend Terminali:**
```
✅ Webhook kaydı: FC1699887654ABC123 → 123456789
✅ Telegram bildirimi gönderildi
```

### **Extension Console:**
```
✅ Telegram bağlantısı başarılı!
```

### **Telegram:**
```
🎉 Kayıt başarılı!

✅ Fiyat değişikliklerini buradan takip edebilirsiniz.
📱 Chrome eklentisine geri dönün.
```

---

## 🐛 Sorun mu var?

### **Backend başlamıyor:**
```bash
cd backend
npm install  # Tekrar dene
```

### **ngrok açılmıyor:**
```bash
brew install ngrok  # Kur
ngrok http 3000     # Çalıştır
```

### **Webhook hatası:**
```bash
# URL'i kontrol et
curl "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/getWebhookInfo"
```

### **Extension bağlanmıyor:**
- Backend çalışıyor mu? (`npm start`)
- `settings.js` URL'i doğru mu?
- Extension yenilendi mi? (chrome://extensions/)

---

## ✅ BAŞARILI OLDU MU?

Şimdi gerçek bir ürün takip et ve fiyat değişikliğini bekle!

Telegram'dan bildirim gelecek! 🚀📱

---

## 📦 Production'a Geç:

Çalıştı mı? Şimdi Railway'e deploy et:

**TELEGRAM_SETUP.md** dosyasını oku! ⬆️
