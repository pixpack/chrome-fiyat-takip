// POST /api/webhook/telegram
// Telegram bot webhook

const fetch = require('node-fetch');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const BOT_TOKEN = '8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY';

async function redisSet(key, value, expirySeconds = 600) {
  await fetch(`${REDIS_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(value)
  });
  
  if (expirySeconds > 0) {
    await fetch(`${REDIS_URL}/expire/${key}/${expirySeconds}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });
  }
}

async function sendTelegramMessage(chatId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    return await response.json();
  } catch (error) {
    console.error('❌ Telegram error:', error);
    return null;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = await readBody(req);
    const update = body;
    
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      // /start komutunu işle
      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        
        if (parts.length === 1) {
          // Sadece /start
          await sendTelegramMessage(chatId, '👋 Merhaba! Fiyat takip botuna hoş geldiniz!\n\n✅ Kayıt olmak için Chrome eklentisinden QR kodu okutun.');
        } else {
          // /start CODE
          const code = parts[1];
          
          // Redis'e kaydet
          await redisSet(`reg:${code}`, { chatId: chatId.toString(), timestamp: Date.now() }, 600);
          
          console.log(`✅ Webhook kaydı: ${code} → ${chatId}`);
          
          await sendTelegramMessage(chatId, '🎉 Kayıt başarılı!\n\n✅ Fiyat değişikliklerini buradan takip edebilirsiniz.\n📱 Chrome eklentisine geri dönün.');
        }
      }
    }
    
    return res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook hatası:', error);
    return res.status(200).send('OK');
  }
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}
