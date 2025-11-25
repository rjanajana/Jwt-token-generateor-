// Vercel Serverless Function
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { server, tc, uid1, uid2, uid3, uid4, uid5, emote_id } = req.query;

  // Validate
  if (!server || !tc || !uid1 || !emote_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters'
    });
  }

  // Build URL
  let url = `${server}/join?tc=${encodeURIComponent(tc)}`;
  url += `&uid1=${encodeURIComponent(uid1)}`;
  
  if (uid2) url += `&uid2=${encodeURIComponent(uid2)}`;
  if (uid3) url += `&uid3=${encodeURIComponent(uid3)}`;
  if (uid4) url += `&uid4=${encodeURIComponent(uid4)}`;
  if (uid5) url += `&uid5=${encodeURIComponent(uid5)}`;
  
  url += `&emote_id=${encodeURIComponent(emote_id)}`;

  try {
    const response = await fetch(url);
    const data = await response.text();
    
    return res.status(200).json({
      success: true,
      message: 'Emote sent successfully',
      data: data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}