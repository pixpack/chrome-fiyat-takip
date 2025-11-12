// Vercel Serverless Function
// Endpoint: /api/register
// Telegram Bot tarafından çağrılır

// NOT: Production için Vercel KV, Redis veya Database kullanın!
// Şimdilik basit tutmak için geçici storage (her deploy'da sıfırlanır)
const registrations = new Map();

// Temizlik: 5 dakikadan eski kayıtları sil
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of registrations.entries()) {
    if (now - data.timestamp > 300000) { // 5 dakika
      registrations.delete(code);
    }
  }
}, 60000); // Her dakika kontrol et

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  
  const { code, chatId, botToken } = req.body;
  
  // Güvenlik: Sadece bizim botumuz çağırabilir
  if (botToken !== '8542587696:AAEOfEAL1YAUep4IoVnFzTG58bCKWiOxufY') {
    res.status(403).json({ success: false, error: 'Unauthorized' });
    return;
  }
  
  if (!code || !chatId) {
    res.status(400).json({ success: false, error: 'Missing code or chatId' });
    return;
  }
  
  // Kaydet
  registrations.set(code, {
    chatId: chatId,
    timestamp: Date.now()
  });
  
  console.log(`✅ Kayıt: ${code} → ${chatId}`);
  
  res.status(200).json({
    success: true,
    message: 'Registration successful'
  });
}

// Export registrations for check-code endpoint
export { registrations };
