import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { videoId } = req.query;
  try {
    const upstream = await fetch(`${BACKEND}/api/Schedule?ContentId=${videoId}`);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
}
