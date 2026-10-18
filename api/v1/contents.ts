import type { VercelRequest, VercelResponse } from '@vercel/node';

const DELTA_API_BASE = 'https://pw.deltaverse.site';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const batchId = req.query.batchId as string;
  const subjectId = req.query.subjectId as string;
  const page = (req.query.page as string) || '1';
  if (!batchId || !subjectId) {
    return res.status(400).json({ success: false, message: 'batchId and subjectId required' });
  }
  try {
    const res2 = await fetch(`${DELTA_API_BASE}/api/Schedule?BatchId=${batchId}&SubjectId=${subjectId}&page=${page}`);
    const data = await res2.json();
    res.status(res2.status).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
}
