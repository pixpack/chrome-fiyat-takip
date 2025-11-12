// Vercel Serverless Function
// Endpoint: /api/check-code?code=FC...
// Extension tarafından çağrılır (polling)

// NOT: Production için Vercel KV kullanın!
// Şimdilik import ediyoruz ama Vercel'da paylaşımlı state yok
// Bu yüzden aşağıda alternatif çözüm var
import { registrations } from './register.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const { code } = req.query;
  
  if (!code) {
    res.status(400).json({ success: false, error: 'Missing code' });
    return;
  }
  
  const registration = registrations.get(code);
  
  if (registration) {
    res.status(200).json({
      success: true,
      chatId: registration.chatId,
      registered: true
    });
  } else {
    res.status(200).json({
      success: true,
      registered: false,
      message: 'Waiting for registration...'
    });
  }
}
