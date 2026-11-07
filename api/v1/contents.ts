import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const batchId = req.query.batchId as string;
  const subjectId = req.query.subjectId as string;
  if (!batchId || !subjectId) return res.status(400).json({ success: false, message: 'batchId and subjectId required' });
  try {
    const upstream = await fetch(`${BACKEND}/api/Schedule?BatchId=${batchId}&SubjectId=${subjectId}`);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
}
