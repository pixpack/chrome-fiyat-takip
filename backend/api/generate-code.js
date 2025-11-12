// GET /api/generate-code
// QR kod için benzersiz kod üret

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const code = 'FC' + Date.now() + Math.random().toString(36).substring(2, 9).toUpperCase();
  
  return res.status(200).json({
    success: true,
    code: code,
    qrUrl: `https://t.me/Fiyatci_bot?start=${code}`,
    expiresIn: 600 // 10 dakika
  });
};
