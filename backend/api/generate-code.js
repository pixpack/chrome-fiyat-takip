// Vercel Serverless Function
// Endpoint: /api/generate-code

export default function handler(req, res) {
  // Benzersiz kod üret (UUID benzeri)
  const code = 'FC' + Date.now() + Math.random().toString(36).substring(2, 9).toUpperCase();
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  res.status(200).json({
    success: true,
    code: code,
    qrUrl: `https://t.me/Fiyatci_bot?start=${code}`,
    expiresIn: 300 // 5 dakika
  });
}
