// GET /api/check-code?code=XXX
// Kod kaydedilmiş mi kontrol et

const fetch = require('node-fetch');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisGet(key) {
  const response = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
  });
  const data = await response.json();
  return data.result ? JSON.parse(data.result) : null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const code = req.query.code || new URL(req.url, `https://${req.headers.host}`).searchParams.get('code');
  
  if (!code) {
    return res.status(400).json({ success: false, error: 'Missing code' });
  }
  
  try {
    console.log(`🔍 Checking code: ${code}`);
    
    const registration = await redisGet(`reg:${code}`);
    
    console.log(`📊 Redis result for reg:${code}:`, registration);
    
    if (registration) {
      console.log(`✅ Registration found: ${registration.chatId}`);
      return res.status(200).json({
        success: true,
        registered: true,
        chatId: registration.chatId
      });
    } else {
      console.log(`⏳ Registration not found yet for: ${code}`);
      return res.status(200).json({
        success: true,
        registered: false,
        message: 'Waiting for registration...'
      });
    }
  } catch (error) {
    console.error('❌ Check code error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
