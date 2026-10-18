import type { VercelRequest, VercelResponse } from '@vercel/node';

const DELTA_API_BASE = 'https://pw.deltaverse.site';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { batchId } = req.query;
  try {
    const res2 = await fetch(`${DELTA_API_BASE}/api/Schedule?BatchId=${batchId}`);
    const data = await res2.json();
    res.status(res2.status).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
}
