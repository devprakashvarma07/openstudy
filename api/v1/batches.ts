import type { VercelRequest, VercelResponse } from '@vercel/node';

const DELTA_API_BASE = 'https://pw.deltaverse.site';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const page = (req.query.page as string) || '1';
  const limit = (req.query.limit as string) || '50';
  try {
    const res2 = await fetch(`${DELTA_API_BASE}/api/AllBatches?page=${page}&limit=${limit}`);
    const data = await res2.json();
    res.status(res2.status).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
}
