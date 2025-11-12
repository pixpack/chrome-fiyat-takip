# 🚀 Vercel Deployment - Telegram Otomatik Sistem

## ✨ NEDEN VERCEL?

✅ **Tamamen ücretsiz**  
✅ **GitHub'dan otomatik deploy**  
✅ **5 dakikada hazır**  
✅ **HTTPS otomatik**  
✅ **Global CDN**  

---

## 📋 GEREKLİ ADIMLAR

### 1️⃣ Upstash Redis Oluştur (2 dakika)

**Ücretsiz Redis database:**

1. https://upstash.com → Sign up (GitHub ile)

2. "Create Database" butonuna tıkla

3. Database oluştur:
   - **Name:** `fiyatci-bot`
   - **Type:** Regional
   - **Region:** En yakın bölge seç (Europe-West veya US-East)
   - **TLS:** Enabled ✅

4. "Create" butonuna tıkla

5. **Details** sekmesinden bilgileri kopyala:
   ```
   UPSTASH_REDIS_REST_URL=https://...upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXB0a...
   ```

   💡 **Not:** "REST API" sekmesinden kopyala (HTTP değil!)

---

### 2️⃣ GitHub'a Push (1 dakika)

Backend klasörünü GitHub'a yükle:

```bash
cd chrome-eklenti

# Git init (ilk sefer)
git init
git add .
git commit -m "Telegram bot backend added"

# GitHub'a push
git remote add origin https://github.com/USERNAME/chrome-eklenti.git
git push -u origin main
```

---

### 3️⃣ Vercel'e Deploy (2 dakika)

1. https://vercel.com → Sign up (GitHub ile)

2. **"New Project"** butonuna tıkla

3. **Repository seç:** `chrome-eklenti`

4. **Configure Project:**
   ```
   Framework Preset: Other
   Root Directory: backend
   Build Command: (boş bırak)
   Output Directory: (boş bırak)
   Install Command: npm install
   ```

5. **Environment Variables ekle:**

   Kopyala-yapıştır:
   
   | Key | Value |
   |-----|-------|
   | `UPSTASH_REDIS_REST_URL` | `https://...upstash.io` |
   | `UPSTASH_REDIS_REST_TOKEN` | `AXB0a...` |

6. **Deploy** butonuna tıkla! 🚀

7. Deploy tamamlandı! URL'i kopyala:
   ```
   https://YOUR-PROJECT.vercel.app
   ```

---

### 4️⃣ Telegram Webhook Kur (30 saniye)

Terminal'de çalıştır (URL'i değiştir):

```bash
curl -X POST "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-PROJECT.vercel.app/webhook/telegram"}'
           #       ^^^^^^^^^^^^^^^^^^^^^^^^^ Vercel URL'ini yaz!
```

**Başarılı cevap:**
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

**Kontrol et:**
```bash
curl "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/getWebhookInfo"
```

---

### 5️⃣ Extension'ı Güncelle (30 saniye)

**settings.js** dosyasını aç (satır 688):

```javascript
// ESKİ:
const BACKEND_URL = 'http://localhost:3000';

// YENİ:
const BACKEND_URL = 'https://YOUR-PROJECT.vercel.app';
                          ^^^^^^^^^^^^^^^^^ Vercel URL'ini yaz!
```

**Extension'ı yenile:**
```
chrome://extensions/ → Yeniden Yükle 🔄
```

---

### 6️⃣ TEST ET! 🎉

1. **Ayarlar sayfasını aç** (settings.html)

2. **Telegram bölümüne git**

3. **"📱 QR Kod Göster"** butonuna tıkla

4. **QR'ı okut veya link'e tıkla**

5. **Telegram'da /start** butonuna bas

6. **✅ Otomatik bağlanacak!**

7. **"🧪 Test Bildirimi Gönder"**

8. **Telegram'dan bildirim geldi! 🎉**

---

## 🔄 Otomatik Deploy (Bonus)

Her git push'ta otomatik deploy:

```bash
cd chrome-eklenti
git add .
git commit -m "Updated backend"
git push

# Vercel otomatik deploy eder! 🚀
```

**Vercel dashboard'da görebilirsin:**
- https://vercel.com/dashboard

---

## 🐛 Sorun Giderme

### **1. "Redis credentials missing" hatası:**

**Sebep:** Environment variables yanlış.

**Çözüm:**
1. Vercel → Project Settings → Environment Variables
2. `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN` kontrol et
3. "Redeploy" butonuna tıkla

### **2. Webhook çalışmıyor:**

**Kontrol et:**
```bash
curl "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/getWebhookInfo"
```

**Doğru cevap:**
```json
{
  "url": "https://YOUR-PROJECT.vercel.app/webhook/telegram",
  "has_custom_certificate": false,
  "pending_update_count": 0
}
```

**Yanlışsa tekrar kur:**
```bash
curl -X POST "https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-PROJECT.vercel.app/webhook/telegram"}'
```

### **3. Extension bağlanmıyor:**

**Kontrol et:**
1. `settings.js` BACKEND_URL doğru mu?
2. Extension yenilendi mi? (chrome://extensions/)
3. Backend çalışıyor mu?
   ```bash
   curl https://YOUR-PROJECT.vercel.app/api/generate-code
   ```

### **4. Deploy başarısız:**

**Root Directory kontrolü:**
- Vercel → Project Settings → General
- Root Directory: `backend` olmalı
- "Save" ve "Redeploy"

---

## 📊 Endpoint Test

### **1. Kod üret:**
```bash
curl https://YOUR-PROJECT.vercel.app/api/generate-code
```

**Beklenen:**
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
curl "https://YOUR-PROJECT.vercel.app/api/check-code?code=FC1699887654ABC123"
```

**Beklenen (kayıt yok):**
```json
{
  "success": true,
  "registered": false,
  "message": "Waiting for registration..."
}
```

### **3. Stats:**
```bash
curl https://YOUR-PROJECT.vercel.app/api/stats
```

---

## 🔐 Güvenlik (Production)

### **1. Bot Token'ı Environment Variable yap:**

**server-vercel.js güncellemesi:**
```javascript
// Satır 7 civarı
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
```

**Vercel Environment Variables:**
```
TELEGRAM_BOT_TOKEN=8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY
```

### **2. CORS kısıtla:**

**server-vercel.js güncellemesi:**
```javascript
// Satır 90 civarı
res.setHeader('Access-Control-Allow-Origin', 'chrome-extension://*');
```

---

## 📈 Monitoring

### **Vercel Dashboard:**
https://vercel.com/dashboard

**Görebilirsin:**
- Deployment logs
- Function invocations
- Error rates
- Response times

### **Upstash Dashboard:**
https://console.upstash.com

**Görebilirsin:**
- Redis memory usage
- Command statistics
- Key count

---

## 💰 Ücretsiz Limitler

### **Vercel (Hobby):**
- ✅ 100 GB bandwidth/ay
- ✅ 100 serverless invocations/gün
- ✅ Unlimited domains
- ✅ Automatic HTTPS

### **Upstash (Free):**
- ✅ 10,000 commands/gün
- ✅ 256 MB storage
- ✅ Global replication

**Bu limitler 1000+ kullanıcı için yeterli! ✅**

---

## ✅ Production Checklist

- [ ] Upstash Redis oluşturuldu
- [ ] Backend Vercel'e deploy edildi
- [ ] Environment variables eklendi
- [ ] Telegram webhook kuruldu
- [ ] Extension BACKEND_URL güncellendi
- [ ] QR kod testi yapıldı
- [ ] Test bildirimi gönderildi
- [ ] Gerçek fiyat değişikliği test edildi

---

## 🎯 Sonuç

**Vercel + Upstash = Mükemmel! 🚀**

- Tamamen ücretsiz
- Otomatik scale
- Zero maintenance
- Global performance

**Başarılar! 🎉**

---

## 📞 Yardım

**Vercel Docs:** https://vercel.com/docs  
**Upstash Docs:** https://docs.upstash.com  
**Telegram Bot API:** https://core.telegram.org/bots/api
