// POST /api/tracker/remove
// Tracker silmek için

const fetch = require('node-fetch');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisSet(key, value) {
  const response = await fetch(`${REDIS_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(value)
  });
  return response.json();
}

async function redisGet(key) {
  const response = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`
    }
  });
  const data = await response.json();
  return data.result ? JSON.parse(data.result) : null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const body = await readBody(req);
    const { chatId, trackerId } = body;
    
    if (!chatId || !trackerId) {
      return res.status(400).json({ success: false, error: 'Missing chatId or trackerId' });
    }
    
    // Kullanıcının tracker'larını al
    const userKey = `user:${chatId}:trackers`;
    let trackers = await redisGet(userKey) || [];
    
    // Tracker'ı sil
    trackers = trackers.filter(t => t.id !== trackerId);
    
    // Redis'e kaydet
    await redisSet(userKey, trackers);
    
    console.log(`🗑️ Tracker silindi: ${chatId} → ${trackerId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Tracker removed',
      totalTrackers: trackers.length
    });
    
  } catch (error) {
    console.error('❌ Tracker silme hatası:', error);
    return res.status(500).json({ success: false, error: error.message });
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
