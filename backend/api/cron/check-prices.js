// GET /api/cron/check-prices
// Vercel Cron tarafından tetiklenecek
// Tüm kullanıcıların tracker'larını kontrol eder

const fetch = require('node-fetch');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const BOT_TOKEN = '8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY';

// Redis helper
async function redisKeys(pattern) {
  const response = await fetch(`${REDIS_URL}/keys/${pattern}`, {
    headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
  });
  const data = await response.json();
  return data.result || [];
}

async function redisGet(key) {
  const response = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
  });
  const data = await response.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function redisSet(key, value) {
  await fetch(`${REDIS_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(value)
  });
}

// Telegram bildirim
async function sendTelegram(chatId, message) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('❌ Telegram error:', error);
    return false;
  }
}

// Fiyat parse
function parsePrice(priceStr) {
  let cleaned = priceStr.replace(/[^\d.,]/g, '');
  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;
  
  if (commaCount === 0 && dotCount === 0) return parseFloat(cleaned);
  if (commaCount === 1 && dotCount === 0) {
    const afterComma = cleaned.split(',')[1];
    return parseFloat(afterComma && afterComma.length === 2 ? cleaned.replace(',', '.') : cleaned.replace(',', ''));
  }
  if (dotCount === 1 && commaCount === 0) {
    const afterDot = cleaned.split('.')[1];
    return parseFloat(afterDot && afterDot.length === 2 ? cleaned : cleaned.replace('.', ''));
  }
  if (dotCount > 0 && commaCount > 0) {
    const lastCommaPos = cleaned.lastIndexOf(',');
    const lastDotPos = cleaned.lastIndexOf('.');
    cleaned = lastCommaPos > lastDotPos ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');
  }
  return parseFloat(cleaned);
}

// Fiyat çek (fetch + parse)
async function fetchPrice(url, selector, exactValue) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Basit DOM parsing (gerçek tarayıcı değil ama çoğu site için çalışır)
    const regex = new RegExp(`<[^>]*${selector.replace('.', '\\.')}[^>]*>([^<]*)</`, 'i');
    const match = html.match(regex);
    
    if (!match || !match[1]) return null;
    
    const priceText = match[1].trim();
    const priceMatch = priceText.match(/[\d.,]+/);
    
    if (!priceMatch) return null;
    
    return parsePrice(priceMatch[0]);
  } catch (error) {
    console.error(`❌ Fetch error for ${url}:`, error.message);
    return null;
  }
}

// Ana cron fonksiyonu
module.exports = async (req, res) => {
  console.log('🚀 Cron job başladı:', new Date().toISOString());
  
  try {
    // Tüm user:*:trackers keylerini bul
    const userKeys = await redisKeys('user:*:trackers');
    console.log(`👥 ${userKeys.length} kullanıcı bulundu`);
    
    let totalChecked = 0;
    let totalChanged = 0;
    
    // Her kullanıcı için
    for (const userKey of userKeys) {
      const chatId = userKey.split(':')[1];
      const trackers = await redisGet(userKey);
      
      if (!trackers || trackers.length === 0) continue;
      
      console.log(`🔍 User ${chatId}: ${trackers.length} tracker`);
      
      // Her tracker için
      for (const tracker of trackers) {
        totalChecked++;
        
        // Fiyat çek
        const currentPrice = await fetchPrice(tracker.url, tracker.selector, tracker.exactPriceValue);
        
        if (!currentPrice) {
          console.log(`⚠️ Fiyat çekilemedi: ${tracker.productName}`);
          continue;
        }
        
        // Önceki fiyatı kontrol et
        const lastPrice = tracker.lastPrice || tracker.price;
        
        if (lastPrice && Math.abs(currentPrice - lastPrice) > 0.01) {
          // Fiyat değişti!
          totalChanged++;
          
          const change = currentPrice < lastPrice ? 'DÜŞTÜ' : 'ARTTI';
          const icon = currentPrice < lastPrice ? '📉' : '📈';
          const percentage = ((currentPrice - lastPrice) / lastPrice * 100).toFixed(1);
          
          const message = `${icon} <b>FİYAT ${change}!</b>\n\n<b>${tracker.productName}</b>\n\n💰 Eski Fiyat: ${lastPrice.toFixed(2)} ${tracker.currency || 'TL'}\n💰 Yeni Fiyat: ${currentPrice.toFixed(2)} ${tracker.currency || 'TL'}\n${icon} Değişim: ${Math.abs(percentage)}%\n\n${tracker.url}`;
          
          // Telegram'a gönder
          await sendTelegram(chatId, message);
          
          console.log(`📱 Bildirim gönderildi: ${tracker.productName} → ${lastPrice} → ${currentPrice}`);
          
          // Tracker'ı güncelle
          tracker.lastPrice = currentPrice;
          tracker.lastCheck = Date.now();
        } else {
          console.log(`✓ Fiyat aynı: ${tracker.productName} → ${currentPrice}`);
        }
      }
      
      // Güncellenmiş tracker'ları kaydet
      await redisSet(userKey, trackers);
    }
    
    console.log(`✅ Cron tamamlandı: ${totalChecked} kontrol, ${totalChanged} değişiklik`);
    
    return res.status(200).json({
      success: true,
      usersChecked: userKeys.length,
      trackersChecked: totalChecked,
      priceChanges: totalChanged
    });
    
  } catch (error) {
    console.error('❌ Cron error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
