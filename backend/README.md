# Fiyatci Bot Backend

Fiyat Takip Chrome Extension için Telegram Bot backend servisi.

## 🚀 Hızlı Başlangıç

### 1️⃣ Kurulum

```bash
cd backend
npm install
```

### 2️⃣ Local Test

```bash
npm start
```

Server: `http://localhost:3000`

### 3️⃣ Telegram Webhook Kurulumu

**ngrok ile test (local):**

```bash
# Terminal 1
npm start

# Terminal 2
ngrok http 3000

# Terminal 3 - Webhook kaydet
curl -X POST "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://NGROK-URL.ngrok.io/webhook/telegram"}'
```

## 🌐 Production Deploy

### Railway (Önerilen - Ücretsiz)

1. https://railway.app → Sign up
2. "New Project" → "Deploy from GitHub"
3. Repository seç
4. Root directory: `/backend`
5. Deploy! 🚀
6. Domain kopyala: `https://app-name.up.railway.app`

**Webhook güncelle:**

```bash
curl -X POST "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-RAILWAY-URL.up.railway.app/webhook/telegram"}'
```

### Render (Alternatif - Ücretsiz)

1. https://render.com → Sign up
2. "New Web Service"
3. Connect GitHub
4. Root directory: `backend`
5. Build: `npm install`
6. Start: `npm start`
7. Deploy! 🚀

### Heroku (Klasik)

```bash
# Heroku CLI kur
brew install heroku/brew/heroku

# Login
heroku login

# App oluştur
heroku create fiyatci-bot

# Deploy
git subtree push --prefix backend heroku main

# Webhook güncelle
curl -X POST "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://fiyatci-bot.herokuapp.com/webhook/telegram"}'
```

## 📡 API Endpoints

### `GET /api/generate-code`

Yeni kayıt kodu üretir.

**Response:**
```json
{
  "success": true,
  "code": "FC1699887654ABC123",
  "qrUrl": "https://t.me/Fiyatci_bot?start=FC1699887654ABC123",
  "expiresIn": 600
}
```

### `GET /api/check-code?code=FC...`

Kodun kayıt durumunu kontrol eder.

**Response (Bekliyor):**
```json
{
  "success": true,
  "registered": false,
  "message": "Waiting for registration..."
}
```

**Response (Kayıtlı):**
```json
{
  "success": true,
  "registered": true,
  "chatId": "123456789"
}
```

### `POST /api/register`

Bot tarafından çağrılır (webhook).

**Body:**
```json
{
  "code": "FC1699887654ABC123",
  "chatId": "123456789",
  "botToken": "8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY"
}
```

### `GET /api/stats`

Debug için kayıt istatistikleri.

## 🔧 Webhook Kontrol

**Webhook durumunu kontrol et:**

```bash
curl "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/getWebhookInfo"
```

**Webhook'u sil (test için):**

```bash
curl -X POST "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/deleteWebhook"
```

## 📝 Notlar

- In-memory storage kullanılıyor (her restart'ta sıfırlanır)
- Production için Redis veya Database ekleyin
- Kayıtlar 10 dakika sonra otomatik silinir
- CORS tüm origin'lere açık (production'da kısıtlayın)

## 🐛 Debug

**Server logları:**
```bash
npm start
```

**Telegram bot testü:**
```bash
# Telegram'dan bota /start FC1699887654ABC123 gönder
# Server'da log görülmeli: ✅ Webhook kaydı: FC... → 123456789
```

**API testi:**
```bash
# Kod üret
curl http://localhost:3000/api/generate-code

# Kod kontrol et
curl "http://localhost:3000/api/check-code?code=FC1699887654ABC123"

# Stats
curl http://localhost:3000/api/stats
```

## 📱 Extension Entegrasyonu

Extension'ın `manifest.json` dosyasına backend URL'i ekleyin:

```javascript
// background.js veya settings.js
const BACKEND_URL = 'https://YOUR-BACKEND-URL.com';
```

## 🆘 Sorun Giderme

**Webhook çalışmıyor:**
- URL HTTPS olmalı (ngrok veya production)
- Firewall/port kontrolü
- Telegram'dan test: `/getWebhookInfo`

**Kod eşleşmiyor:**
- Backend çalışıyor mu kontrol et
- Browser console'da network tab
- Backend `/api/stats` endpoint kontrolü

## 📄 Lisans

MIT
