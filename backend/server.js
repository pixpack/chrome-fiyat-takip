// Express Server - Telegram Bot Backend
// Local çalıştırma: node server.js
// Deploy: Heroku, Railway, Render vb.

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (Production için Redis/Database kullanın)
const registrations = new Map();

// Temizlik: 10 dakikadan eski kayıtları sil
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of registrations.entries()) {
    if (now - data.timestamp > 600000) { // 10 dakika
      registrations.delete(code);
      console.log(`🗑️ Süresi doldu: ${code}`);
    }
  }
}, 60000); // Her dakika

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. Kod üret
app.get('/api/generate-code', (req, res) => {
  const code = 'FC' + Date.now() + Math.random().toString(36).substring(2, 9).toUpperCase();
  
  res.json({
    success: true,
    code: code,
    qrUrl: `https://t.me/Fiyatci_bot?start=${code}`,
    expiresIn: 600 // 10 dakika
  });
});

// 2. Kayıt (Bot'tan çağrılır)
app.post('/api/register', (req, res) => {
  const { code, chatId, botToken } = req.body;
  
  // Güvenlik kontrolü
  if (botToken !== '8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY') {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
  
  if (!code || !chatId) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }
  
  // Kaydet
  registrations.set(code, {
    chatId: chatId.toString(),
    timestamp: Date.now()
  });
  
  console.log(`✅ Kayıt başarılı: ${code} → ${chatId}`);
  
  res.json({
    success: true,
    message: 'Registration successful'
  });
});

// 3. Kod kontrolü (Extension'dan çağrılır)
app.get('/api/check-code', (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ success: false, error: 'Missing code' });
  }
  
  const registration = registrations.get(code);
  
  if (registration) {
    res.json({
      success: true,
      registered: true,
      chatId: registration.chatId
    });
  } else {
    res.json({
      success: true,
      registered: false,
      message: 'Waiting for registration...'
    });
  }
});

// 4. Stats endpoint (debug için)
app.get('/api/stats', (req, res) => {
  res.json({
    totalRegistrations: registrations.size,
    registrations: Array.from(registrations.entries()).map(([code, data]) => ({
      code,
      chatId: data.chatId,
      age: Math.floor((Date.now() - data.timestamp) / 1000) + 's'
    }))
  });
});

// ==========================================
// TELEGRAM BOT WEBHOOK
// ==========================================

// Webhook endpoint
app.post('/webhook/telegram', async (req, res) => {
  try {
    const update = req.body;
    
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
          
          // Kodu kaydet
          registrations.set(code, {
            chatId: chatId.toString(),
            timestamp: Date.now()
          });
          
          console.log(`✅ Webhook kaydı: ${code} → ${chatId}`);
          
          await sendTelegramMessage(chatId, '🎉 Kayıt başarılı!\n\n✅ Fiyat değişikliklerini buradan takip edebilirsiniz.\n📱 Chrome eklentisine geri dönün.');
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook hatası:', error);
    res.status(200).send('OK');
  }
});

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
    if (!data.ok) {
      console.error('❌ Telegram API hatası:', data);
    }
  } catch (error) {
    console.error('❌ Telegram mesaj hatası:', error);
  }
}

// ==========================================
// SERVER START
// ==========================================

app.listen(PORT, () => {
  console.log(`🚀 Backend server çalışıyor: http://localhost:${PORT}`);
  console.log(`📱 Telegram Bot: @Fiyatci_bot`);
  console.log(`\n🔗 Endpoints:`);
  console.log(`   GET  /api/generate-code`);
  console.log(`   POST /api/register`);
  console.log(`   GET  /api/check-code?code=...`);
  console.log(`   POST /webhook/telegram (Telegram webhook)`);
  console.log(`   GET  /api/stats (Debug)\n`);
});
