# GitHub Actions - Saatlik Fiyat Kontrolü

## 🎯 Neden GitHub Actions?

Vercel Hobby planı günde sadece 1 cron job'a izin veriyor. GitHub Actions ile **saatte 1 kere ücretsiz** kontrol yapabiliyoruz!

## 📊 Nasıl Çalışıyor?

```
GitHub Actions (Ücretsiz)
   ↓ Her saat başı (0. dakika)
   HTTP GET → Vercel API
   ↓
Vercel Backend
   ↓
Redis → Tracker kontrolü
   ↓
Telegram → Bildirim
```

## ⏰ Çalışma Sıklığı

- **GitHub Actions:** Her saat başı (00. dakika)
- **Vercel Cron:** Günlük 12:00 (yedek)

## 🔍 Manuel Test

GitHub reposunda:
1. **Actions** sekmesine git
2. **Hourly Price Check** workflow'u seç
3. **Run workflow** butonuna tıkla
4. Manuel tetikleme!

## 📈 Limitler

- **GitHub Actions:** 2,000 dakika/ay (ücretsiz)
- **Kullanım:** ~1 dakika/ay (çok az!)
- **Vercel Function:** 1,000,000 invocation/ay

## ✅ Avantajlar

- ✅ Tamamen ücretsiz
- ✅ Saatlik kontrol
- ✅ Otomatik
- ✅ Güvenilir
- ✅ Vercel Pro gerekmez
