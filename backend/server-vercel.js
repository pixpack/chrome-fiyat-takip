// Vercel Serverless + Upstash Redis
// Deploy: vercel --prod

const fetch = require('node-fetch');

// Upstash Redis REST API
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Redis helper fonksiyonları
async function redisSet(key, value, expirySeconds = 600) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('❌ Redis credentials missing!');
    return false;
  }
  
  try {
    const response = await fetch(`${REDIS_URL}/set/${key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(value)
    });
    
    // Expiry ayarla
    if (expirySeconds > 0) {
      await fetch(`${REDIS_URL}/expire/${key}/${expirySeconds}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REDIS_TOKEN}`
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Redis SET error:', error);
    return false;
  }
}

async function redisGet(key) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('❌ Redis credentials missing!');
    return null;
  }
  
  try {
    const response = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`
      }
    });
    
    const data = await response.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch (error) {
    console.error('❌ Redis GET error:', error);
    return null;
  }
}

// Telegram mesaj gönder
async function sendTelegramMessage(chatId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
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

// ==========================================
// MAIN HANDLER (Vercel Serverless)
// ==========================================

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { pathname, query } = new URL(req.url, `https://${req.headers.host}`);
  
  // ==========================================
  // 1. GENERATE CODE
  // ==========================================
  if (pathname === '/api/generate-code' && req.method === 'GET') {
    const code = 'FC' + Date.now() + Math.random().toString(36).substring(2, 9).toUpperCase();
    
    return res.status(200).json({
      success: true,
      code: code,
      qrUrl: `https://t.me/Fiyatci_bot?start=${code}`,
      expiresIn: 600 // 10 dakika
    });
  }
  
  // ==========================================
  // 2. CHECK CODE
  // ==========================================
  if (pathname === '/api/check-code' && req.method === 'GET') {
    const code = query.get('code');
    
    if (!code) {
      return res.status(400).json({ success: false, error: 'Missing code' });
    }
    
    const registration = await redisGet(`reg:${code}`);
    
    if (registration) {
      return res.status(200).json({
        success: true,
        registered: true,
        chatId: registration.chatId
      });
    } else {
      return res.status(200).json({
        success: true,
        registered: false,
        message: 'Waiting for registration...'
      });
    }
  }
  
  // ==========================================
  // 3. REGISTER (Bot'tan çağrılır)
  // ==========================================
  if (pathname === '/api/register' && req.method === 'POST') {
    const body = await readBody(req);
    const { code, chatId, botToken } = body;
    
    // Güvenlik
    if (botToken !== '8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    if (!code || !chatId) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }
    
    // Redis'e kaydet (10 dakika expire)
    await redisSet(`reg:${code}`, { chatId: chatId.toString(), timestamp: Date.now() }, 600);
    
    console.log(`✅ Kayıt: ${code} → ${chatId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Registration successful'
    });
  }
  
  // ==========================================
  // 4. TELEGRAM WEBHOOK
  // ==========================================
  if (pathname === '/webhook/telegram' && req.method === 'POST') {
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
  }
  
  // ==========================================
  // 5. STATS (Debug)
  // ==========================================
  if (pathname === '/api/stats' && req.method === 'GET') {
    return res.status(200).json({
      message: 'Redis-based storage. Individual stats not available in serverless.',
      uptime: 'Serverless (no persistent process)',
      redis: REDIS_URL ? 'Connected' : 'Not configured'
    });
  }
  
  // 404
  return res.status(404).json({ error: 'Not found' });
};

// Helper: Read request body
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
