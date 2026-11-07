import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const upstream = await fetch(`${BACKEND}/api/ban-status`);
    const data = await upstream.json();
    res.status(200).json({ status: 'ok', service: 'OpenStudy API', version: 'v1', backend: data, timestamp: new Date().toISOString() });
  } catch {
    res.status(200).json({ status: 'ok', service: 'OpenStudy API', version: 'v1', timestamp: new Date().toISOString() });
  }
}
