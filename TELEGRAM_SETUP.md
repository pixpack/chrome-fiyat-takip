# 📱 Telegram Otomatik Bağlantı Sistemi - Kurulum

## 🎯 NE YAPACAĞIZ?

Kullanıcılar QR kod okutarak otomatik Telegram'a bağlanacak!

```
Extension → QR Kod Göster → Kullanıcı Okutir → Otomatik Bağlanır! ✅
```

---

## 📋 GEREKLİ ADIMLAR

### 1️⃣ Backend Deploy Et (Railway - Ücretsiz)

#### **Railway Kurulumu:**

1. https://railway.app → Sign up (GitHub ile)

2. "New Project" → "Empty Project" oluştur

3. "Add Service" → "GitHub Repo" seç
   - Repository seçemiyorsan: "Empty Service" oluştur
   
4. Root directory ayarla:
   ```
   Root Directory: /backend
   ```

5. Deploy! 🚀

6. URL'i kopyala:
   ```
   https://YOUR-APP-NAME.up.railway.app
   ```

---

### 2️⃣ Telegram Webhook Kur

Backend deploy olduktan sonra webhook'u ayarla:

```bash
curl -X POST "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-APP-NAME.up.railway.app/webhook/telegram"}'
```

**Webhook kontrol et:**

```bash
curl "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/getWebhookInfo"
```

**Başarılı response:**

```json
{
  "ok": true,
  "result": {
    "url": "https://YOUR-APP-NAME.up.railway.app/webhook/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

### 3️⃣ Extension'ı Güncelle

`settings.js` dosyasında backend URL'ini değiştir:

```javascript
// Satır 688
const BACKEND_URL = 'https://YOUR-APP-NAME.up.railway.app';
```

---

### 4️⃣ Extension'ı Test Et

1. **chrome://extensions/** → Yeniden yükle 🔄

2. **Ayarlar sayfasını aç** (settings.html)

3. **"📱 QR Kod Göster"** butonuna tıkla

4. **QR kodu telefonla okut** veya link'e tıkla

5. **Telegram botunda /start** butonuna bas

6. **Extension otomatik bağlanacak!** ✅

7. **Test bildirimi gönder** 🧪

---

## 🧪 LOCAL TEST (Development)

Backend'i local'de çalıştırmak için:

### **Terminal 1 - Backend Çalıştır:**

```bash
cd backend
npm install
npm start
```

Server: `http://localhost:3000`

### **Terminal 2 - ngrok ile Tunnel Aç:**

```bash
# ngrok kur (ilk sefer)
brew install ngrok

# Tunnel aç
ngrok http 3000
```

Çıktı:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### **Terminal 3 - Webhook Ayarla:**

```bash
curl -X POST "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://abc123.ngrok.io/webhook/telegram"}'
```

### **settings.js'i güncelle:**

```javascript
const BACKEND_URL = 'https://abc123.ngrok.io';
```

### **Extension'ı test et!**

---

## 🐛 Sorun Giderme

### **1. QR Kod gösterilmiyor:**

- Backend çalışıyor mu?
  ```bash
  curl http://localhost:3000/api/generate-code
  ```

- Network tab'da hata var mı?
- Console'da hata var mı?

### **2. Polling başlamıyor:**

- `settings.js` BACKEND_URL doğru mu?
- Backend CORS açık mı? (server.js'de `app.use(cors())` var)

### **3. Telegram botu cevap vermiyor:**

- Webhook doğru kuruldu mu?
  ```bash
  curl "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/getWebhookInfo"
  ```

- Backend loglarını kontrol et:
  ```bash
  # Railway'de: Deployments → Logs
  # Local'de: npm start terminaline bak
  ```

### **4. Bağlantı zaman aşımı:**

- 2 dakika içinde /start gönderilmedi mi?
- Backend `/api/check-code` endpoint'i çalışıyor mu?
  ```bash
  curl "http://localhost:3000/api/check-code?code=FC1699887654ABC123"
  ```

### **5. Backend deploy hatası (Railway):**

- `package.json` backend klasöründe mi?
- Root directory ayarı `/backend` mi?
- Node.js versiyonu uyumlu mu? (>= 14.0.0)

---

## 📊 Backend Endpoints Test

### **1. Kod üret:**

```bash
curl http://localhost:3000/api/generate-code
```

Response:
```json
{
  "success": true,
  "code": "FC1699887654ABC123",
  "qrUrl": "https://t.me/Fiyatci_bot?start=FC1699887654ABC123",
  "expiresIn": 600
}
```

### **2. Kod kontrol et:**

```bash
curl "http://localhost:3000/api/check-code?code=FC1699887654ABC123"
```

Response (Henüz kayıt yok):
```json
{
  "success": true,
  "registered": false,
  "message": "Waiting for registration..."
}
```

Response (Kayıt başarılı):
```json
{
  "success": true,
  "registered": true,
  "chatId": "123456789"
}
```

### **3. Stats (Debug):**

```bash
curl http://localhost:3000/api/stats
```

Response:
```json
{
  "totalRegistrations": 2,
  "registrations": [
    {
      "code": "FC1699887654ABC123",
      "chatId": "123456789",
      "age": "45s"
    },
    {
      "code": "FC1699887999XYZ789",
      "chatId": "987654321",
      "age": "12s"
    }
  ]
}
```

---

## 🚀 Production Checklist

- [ ] Backend Railway'e deploy edildi
- [ ] Webhook kuruldu ve çalışıyor
- [ ] `settings.js` BACKEND_URL güncellendi
- [ ] Extension test edildi (QR kod → Bağlantı)
- [ ] Test bildirimi gönderildi
- [ ] Gerçek fiyat değişikliği bildirimi test edildi

---

## 📝 Notlar

- In-memory storage kullanılıyor (her deploy'da sıfırlanır)
- Production için Redis/Database ekleyin
- Kayıtlar 10 dakika sonra otomatik silinir
- QR kod 2 dakika süreyle geçerlidir (polling timeout)

---

## 🆘 Yardım

Sorun mu yaşıyorsun?

1. Backend loglarını kontrol et
2. Browser console'u kontrol et
3. Webhook durumunu kontrol et
4. `/api/stats` endpoint'ine bak

---

## ✅ BAŞARILI KURULUM GÖRSELİ:

```
┌─────────────────────────────────────┐
│  📱 QR Kod Göster                   │
│                                     │
│  ┌─────────────────┐                │
│  │                 │                │
│  │   [QR CODE]     │                │
│  │                 │                │
│  └─────────────────┘                │
│                                     │
│  🔵 Telegram'dan QR kodu okutun...  │
│  Veya: @Fiyatci_bot                 │
│  [İptal Et]                         │
└─────────────────────────────────────┘

         ↓ (QR okutuldu)

┌─────────────────────────────────────┐
│  ✅ Telegram Bağlı!                 │
│  Chat ID: 123456789                 │
│                                     │
│  [🧪 Test Bildirimi Gönder]        │
│  [Bağlantıyı Kes]                   │
└─────────────────────────────────────┘
```

---

**İYİ ÇALIŞMALAR! 🚀**
